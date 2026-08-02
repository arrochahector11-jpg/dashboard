import { useMemo, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import { Download, SlidersHorizontal } from "lucide-react";
import { detectColumnTypes, countByColumn, crossTab } from "../utils/columnDetector";
import { PALETTE, NAVY, ORANGE } from "../utils/chartSetup";
import KpiCard from "./KpiCard";
import { exportSimple } from "../utils/excelExporter";

export default function Dashboard({ fileData }) {
  const { headers, rows, fileName } = fileData;

  const columnTypes = useMemo(() => detectColumnTypes(headers, rows), [headers, rows]);

  const categoryCols = columnTypes.filter((c) => c.type === "category");
  const statusCols = columnTypes.filter((c) => c.type === "status");
  const numericCols = columnTypes.filter((c) => c.type === "numeric");

  const [selectedCategory, setSelectedCategory] = useState(categoryCols[0]?.name || headers[0]);
  const [selectedStatus, setSelectedStatus] = useState(statusCols[0]?.name || headers[Math.min(1, headers.length - 1)]);
  const [selectedFilter, setSelectedFilter] = useState("Todos");

  const filterOptions = useMemo(() => {
    if (!selectedCategory) return [];
    return ["Todos", ...Object.keys(countByColumn(rows, selectedCategory))];
  }, [rows, selectedCategory]);

  const filteredRows = useMemo(() => {
    if (selectedFilter === "Todos") return rows;
    return rows.filter((r) => String(r[selectedCategory] ?? "").trim() === selectedFilter);
  }, [rows, selectedFilter, selectedCategory]);

  // KPI 1: total de registros por categoría principal
  const totalPorCategoria = useMemo(() => countByColumn(rows, selectedCategory), [rows, selectedCategory]);
  const totalCategorias = Object.keys(totalPorCategoria).length;

  // KPI 2: distribución de estados
  const totalPorEstado = useMemo(() => selectedStatus ? countByColumn(filteredRows, selectedStatus) : {}, [filteredRows, selectedStatus]);

  // KPI 3: cruce categoría x estado (tabla de contingencia)
  const cross = useMemo(
    () => (selectedCategory && selectedStatus ? crossTab(rows, selectedCategory, selectedStatus) : {}),
    [rows, selectedCategory, selectedStatus]
  );

  // Detección de un grupo "estrella" tipo DESARROLLO METRO: la categoría con más registros
  const topGroup = useMemo(() => {
    const entries = Object.entries(totalPorCategoria).sort((a, b) => b[1] - a[1]);
    return entries[0]?.[0];
  }, [totalPorCategoria]);

  const topGroupBreakdown = useMemo(() => {
    if (!topGroup || !selectedStatus) return {};
    const groupRows = rows.filter((r) => String(r[selectedCategory] ?? "").trim() === topGroup);
    return countByColumn(groupRows, selectedStatus);
  }, [rows, topGroup, selectedCategory, selectedStatus]);

  // Chart data: barras (categoría vs total)
  const barChartData = {
    labels: Object.keys(totalPorCategoria),
    datasets: [
      {
        label: `Cantidad por ${selectedCategory}`,
        data: Object.values(totalPorCategoria),
        backgroundColor: PALETTE[0],
        borderRadius: 6,
      },
    ],
  };

  // Chart data: dona (distribución de estados, filtrado)
  const doughnutData = {
    labels: Object.keys(totalPorEstado),
    datasets: [
      {
        data: Object.values(totalPorEstado),
        backgroundColor: PALETTE,
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };

  // Chart data: cruce apilado (categoría x estado)
  const statusValues = selectedStatus ? [...new Set(rows.map((r) => String(r[selectedStatus] ?? "").trim() || "(vacío)"))] : [];
  const crossLabels = Object.keys(cross);
  const stackedData = {
    labels: crossLabels,
    datasets: statusValues.map((statusVal, i) => ({
      label: statusVal,
      data: crossLabels.map((cat) => cross[cat]?.[statusVal] || 0),
      backgroundColor: PALETTE[i % PALETTE.length],
      borderRadius: 4,
    })),
  };

  // Chart data: top grupo desglosado
  const topGroupChartData = {
    labels: Object.keys(topGroupBreakdown),
    datasets: [
      {
        label: `${topGroup} por ${selectedStatus}`,
        data: Object.values(topGroupBreakdown),
        backgroundColor: PALETTE[1],
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  const stackedOptions = {
    ...chartOptions,
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header con selectores dinámicos */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
          <SlidersHorizontal size={16} /> Analizar por:
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-slate-50"
        >
          {headers.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-slate-400 text-sm">cruzado con</span>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-slate-50"
        >
          {headers.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-slate-50"
          >
            {filterOptions.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <button
            onClick={() => exportSimple({ headers, rows: filteredRows, fileName: `export_${fileName}` })}
            className="flex items-center gap-1.5 bg-[#0f2540] hover:bg-[#1a3a5c] text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download size={14} /> Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={`Total registros (${selectedCategory})`}
          value={rows.length}
          subtitle={`${totalCategorias} valores distintos de ${selectedCategory}`}
          accent="navy"
        />
        <KpiCard
          title={`Grupos en ${selectedCategory}`}
          value={totalCategorias}
          breakdown={Object.entries(totalPorCategoria).map(([label, value]) => ({ label, value }))}
          accent="orange"
        />
        <KpiCard
          title={`Distribución de ${selectedStatus}`}
          value={Object.keys(totalPorEstado).length}
          subtitle="estados distintos detectados"
          breakdown={Object.entries(totalPorEstado).map(([label, value]) => ({ label, value }))}
          accent="green"
        />
        <KpiCard
          title={`Foco: ${topGroup || "-"}`}
          value={Object.values(topGroupBreakdown).reduce((a, b) => a + b, 0)}
          subtitle={`registros de ${selectedStatus} en el grupo principal`}
          breakdown={Object.entries(topGroupBreakdown).map(([label, value]) => ({ label, value }))}
          accent="red"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Total por {selectedCategory}</h3>
          <Bar data={barChartData} options={chartOptions} />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Distribución de {selectedStatus}{selectedFilter !== "Todos" ? ` (${selectedFilter})` : ""}</h3>
          <Doughnut data={doughnutData} options={chartOptions} />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Cruce: {selectedCategory} × {selectedStatus}</h3>
          <Bar data={stackedData} options={stackedOptions} />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Análisis enfocado: {topGroup} por {selectedStatus}
          </h3>
          <Bar data={topGroupChartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
