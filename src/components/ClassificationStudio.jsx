import { useMemo, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import { Sparkles, Send, AlertTriangle, Download, Loader2, CheckCircle2, X, MousePointerClick } from "lucide-react";
import { generateClassification } from "../utils/claudeApi";
import { PALETTE } from "../utils/chartSetup";
import KpiCard from "./KpiCard";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

function parseDate(v) {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") {
    // Excel serial date
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + v * 86400000);
  }
  if (typeof v === "string") {
    const s = v.trim();
    let m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export default function ClassificationStudio({ fileData, onNeedApiKey }) {
  const { headers, rows, fileName } = fileData;

  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState(null);
  const [results, setResults] = useState(null);
  const [secondaryCol, setSecondaryCol] = useState(headers[0]);
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().slice(0, 10));
  const [drillDown, setDrillDown] = useState(null); // { categoria, secundario? }

  async function handleGenerate() {
    if (!instruction.trim()) return;
    setLoading(true);
    setError(null);
    setPlan(null);
    setResults(null);
    try {
      const plan = await generateClassification({
        instruction,
        headers,
        sample: rows,
        referenceDateISO: referenceDate,
      });
      setPlan(plan);
      runClassification(plan);
    } catch (e) {
      if (e.message === "NO_API_KEY") {
        onNeedApiKey();
      } else {
        setError(e.message || "No pude generar la clasificación.");
      }
    } finally {
      setLoading(false);
    }
  }

  function runClassification(planToRun) {
    try {
      // eslint-disable-next-line no-new-func
      const classifyFn = new Function("rows", "ctx", planToRun.js_function_body);
      const ctx = { parseDate, referenceDate: new Date(referenceDate) };

      let groups;
      if (planToRun.id_columna) {
        const map = new Map();
        rows.forEach((r) => {
          const key = r[planToRun.id_columna];
          if (!map.has(key)) map.set(key, []);
          map.get(key).push(r);
        });
        groups = [...map.values()];
      } else {
        groups = rows.map((r) => [r]);
      }

      let errorCount = 0;
      const classified = groups.map((groupRows) => {
        let cat;
        try {
          cat = classifyFn(groupRows, ctx);
        } catch (e) {
          cat = "Error de clasificación";
          errorCount++;
        }
        return { rows: groupRows, categoria: cat };
      });

      setResults({ classified, errorCount });
    } catch (e) {
      setError("La función generada tiene un error de sintaxis. Probá reformular el pedido de forma más simple.");
    }
  }

  const categoryCounts = useMemo(() => {
    if (!results) return {};
    const counts = {};
    results.classified.forEach((c) => {
      counts[c.categoria] = (counts[c.categoria] || 0) + 1;
    });
    return counts;
  }, [results]);

  const crossTabData = useMemo(() => {
    if (!results || !secondaryCol) return {};
    const table = {};
    results.classified.forEach((c) => {
      const secVal = String(c.rows[0][secondaryCol] ?? "(vacío)").trim() || "(vacío)";
      if (!table[secVal]) table[secVal] = {};
      table[secVal][c.categoria] = (table[secVal][c.categoria] || 0) + 1;
    });
    return table;
  }, [results, secondaryCol]);

  const totalRegistros = results?.classified.length || 0;

  const barData = {
    labels: Object.keys(categoryCounts),
    datasets: [
      {
        label: "Cantidad",
        data: Object.values(categoryCounts),
        backgroundColor: PALETTE[0],
        borderRadius: 6,
      },
    ],
  };

  const doughnutData = {
    labels: Object.keys(categoryCounts),
    datasets: [
      {
        data: Object.values(categoryCounts),
        backgroundColor: PALETTE,
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };

  const crossLabels = Object.keys(crossTabData);
  const categories = Object.keys(categoryCounts);
  const stackedData = {
    labels: crossLabels,
    datasets: categories.map((cat, i) => ({
      label: cat,
      data: crossLabels.map((sec) => crossTabData[sec]?.[cat] || 0),
      backgroundColor: PALETTE[i % PALETTE.length],
      borderRadius: 4,
    })),
  };

  const chartOptions = {
    responsive: true,
    onClick: (evt, elements, chart) => {
      if (!elements.length) return;
      const idx = elements[0].index;
      const label = chart.data.labels[idx];
      setDrillDown({ categoria: label });
    },
    plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 10 } } } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };
  const stackedOptions = {
    ...chartOptions,
    onClick: (evt, elements, chart) => {
      if (!elements.length) return;
      const el = elements[0];
      const secVal = chart.data.labels[el.index];
      const cat = chart.data.datasets[el.datasetIndex].label;
      setDrillDown({ categoria: cat, secundario: secVal });
    },
    scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
  };

  const drillDownRows = useMemo(() => {
    if (!drillDown || !results) return [];
    return results.classified.filter((c) => {
      if (c.categoria !== drillDown.categoria) return false;
      if (drillDown.secundario !== undefined) {
        const secVal = String(c.rows[0][secondaryCol] ?? "(vacío)").trim() || "(vacío)";
        if (secVal !== drillDown.secundario) return false;
      }
      return true;
    });
  }, [drillDown, results, secondaryCol]);

  const drillDownCols = useMemo(() => {
    if (!drillDownRows.length) return [];
    const idCol = plan?.id_columna;
    const priority = [idCol, ...headers.filter((h) => /descrip|nombre|titulo|título/i.test(h))].filter(Boolean);
    const rest = headers.filter((h) => !priority.includes(h));
    return [...new Set([...priority, secondaryCol, ...rest])].slice(0, 6);
  }, [drillDownRows, plan, headers, secondaryCol]);

  async function handleExportDrillDown() {
    if (!drillDownRows.length) return;
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Detalle");
    ws.addRow(headers);
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2540" } };
    drillDownRows.forEach((c) => ws.addRow(headers.map((h) => c.rows[0][h] ?? "")));
    ws.columns.forEach((col) => (col.width = 18));
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `detalle_${drillDown.categoria}.xlsx`);
  }

  async function handleExport() {
    if (!results || !plan) return;
    const workbook = new ExcelJS.Workbook();

    const wsResumen = workbook.addWorksheet("Resumen Ejecutivo");
    wsResumen.addRow(["Clasificación:", instruction]);
    wsResumen.addRow(["Fecha de referencia:", referenceDate]);
    wsResumen.addRow([]);
    wsResumen.addRow(["Categoría", "Registros", "% del total"]);
    wsResumen.getRow(4).font = { bold: true };
    Object.entries(categoryCounts).forEach(([cat, n]) => {
      wsResumen.addRow([cat, n, n / totalRegistros]);
    });
    wsResumen.getColumn(3).numFmt = "0.0%";
    wsResumen.columns.forEach((c) => (c.width = 40));

    if (plan.supuestos_o_limitaciones) {
      const wsNotas = workbook.addWorksheet("Notas y Supuestos");
      wsNotas.addRow(["Explicación:", plan.explicacion]);
      wsNotas.addRow([]);
      wsNotas.addRow(["Limitaciones detectadas:"]);
      wsNotas.addRow([plan.supuestos_o_limitaciones]);
      wsNotas.columns.forEach((c) => (c.width = 90));
    }

    const wsDetalle = workbook.addWorksheet("Detalle");
    const idCol = plan.id_columna;
    const detHeaders = idCol ? [idCol, ...headers.filter((h) => h !== idCol), "Categoría"] : [...headers, "Categoría"];
    wsDetalle.addRow(detHeaders);
    wsDetalle.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    wsDetalle.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2540" } };
    results.classified.forEach((c) => {
      const r = c.rows[0];
      wsDetalle.addRow(detHeaders.map((h) => (h === "Categoría" ? c.categoria : r[h] ?? "")));
    });
    wsDetalle.autoFilter = { from: "A1", to: `${String.fromCharCode(65 + detHeaders.length - 1)}1` };
    wsDetalle.views = [{ state: "frozen", ySplit: 1 }];
    wsDetalle.columns.forEach((c) => (c.width = 18));

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `clasificacion_${fileName.replace(/\.[^.]+$/, "")}.xlsx`);
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-orange-500" />
          <h3 className="text-sm font-semibold text-slate-800">Describí tus reglas de clasificación</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Ej: "Agrupá por COD_OBRA. Si ESTADO_OBRA es EN EJECUCION o PDTE. EJECUCION y hay un pedido con FECHA_FIN_PEDIDO
          futura, es Migra ahora. Si no tiene pedido activo, es Depurar. Si ESTADO_OBRA es RECEPCIONADA, es Cerrada."
        </p>

        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Escribí tus reglas de negocio acá, con el detalle que quieras..."
          rows={4}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          disabled={loading}
        />

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <label className="text-xs text-slate-500">Fecha de referencia (para cálculos de antigüedad):</label>
          <input
            type="date"
            value={referenceDate}
            onChange={(e) => setReferenceDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !instruction.trim()}
            className="ml-auto flex items-center gap-1.5 bg-[#0f2540] hover:bg-[#1a3a5c] disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Analizando...</> : <><Send size={14} /> Generar clasificación</>}
          </button>
        </div>

        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
      </div>

      {plan && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-700">{plan.explicacion}</p>
          </div>
          {plan.id_columna && (
            <p className="text-xs text-slate-500">Agrupando registros por: <span className="font-medium text-slate-700">{plan.id_columna}</span></p>
          )}
          {plan.supuestos_o_limitaciones && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">{plan.supuestos_o_limitaciones}</p>
            </div>
          )}
          {results?.errorCount > 0 && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-800">{results.errorCount} registros no pudieron clasificarse (quedaron como "Error de clasificación"). Puede que falte una columna esperada en esos casos.</p>
            </div>
          )}
        </div>
      )}

      {results && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Total registros" value={totalRegistros} accent="navy" />
            {Object.entries(categoryCounts).slice(0, 3).map(([cat, n], i) => (
              <KpiCard
                key={cat}
                title={cat}
                value={n}
                subtitle={`${((n / totalRegistros) * 100).toFixed(1)}% del total`}
                accent={["orange", "green", "red"][i % 3]}
              />
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-3">
            <span className="text-sm text-slate-500">Cruzar categorías con:</span>
            <select
              value={secondaryCol}
              onChange={(e) => setSecondaryCol(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-slate-50"
            >
              {headers.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <button
              onClick={handleExport}
              className="ml-auto flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg"
            >
              <Download size={14} /> Descargar reporte Excel
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Total por categoría</h3>
              <p className="text-xs text-slate-400 mb-3 flex items-center gap-1"><MousePointerClick size={12} /> Tocá una barra para ver el detalle</p>
              <Bar data={barData} options={chartOptions} />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Distribución de categorías</h3>
              <p className="text-xs text-slate-400 mb-3 flex items-center gap-1"><MousePointerClick size={12} /> Tocá una porción para ver el detalle</p>
              <Doughnut data={doughnutData} options={chartOptions} />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 lg:col-span-2">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Categoría × {secondaryCol}</h3>
              <p className="text-xs text-slate-400 mb-3 flex items-center gap-1"><MousePointerClick size={12} /> Tocá un segmento para ver el detalle</p>
              <Bar data={stackedData} options={stackedOptions} />
            </div>
          </div>

          {drillDown && (
            <div className="bg-white rounded-xl shadow-sm border-2 border-orange-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Detalle: {drillDown.categoria}
                    {drillDown.secundario !== undefined && ` — ${secondaryCol}: ${drillDown.secundario}`}
                  </h3>
                  <p className="text-xs text-slate-500">{drillDownRows.length} registros encontrados</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportDrillDown}
                    className="flex items-center gap-1.5 bg-[#0f2540] hover:bg-[#1a3a5c] text-white text-xs px-3 py-1.5 rounded-lg"
                  >
                    <Download size={12} /> Exportar este grupo
                  </button>
                  <button onClick={() => setDrillDown(null)} className="text-slate-400 hover:text-red-500">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-80 overflow-y-auto border border-slate-100 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {drillDownCols.map((col) => (
                        <th key={col} className="text-left px-3 py-2 font-medium text-slate-500 whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drillDownRows.slice(0, 200).map((c, i) => (
                      <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                        {drillDownCols.map((col) => (
                          <td key={col} className="px-3 py-2 text-slate-700 whitespace-nowrap max-w-[220px] truncate">
                            {String(c.rows[0][col] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {drillDownRows.length > 200 && (
                <p className="text-xs text-slate-400 mt-2">Mostrando los primeros 200 de {drillDownRows.length}. Exportá para ver todos.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
