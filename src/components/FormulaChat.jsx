import { useState } from "react";
import { Send, Sparkles, Download, AlertTriangle, Lightbulb } from "lucide-react";
import { suggestFormula } from "../utils/claudeApi";
import { exportWithFormula } from "../utils/excelExporter";

export default function FormulaChat({ fileA, fileB, onNeedApiKey }) {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    if (!instruction.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await suggestFormula({
        instruction,
        fileAHeaders: fileA?.headers || [],
        fileBHeaders: fileB?.headers || [],
        fileAName: fileA?.fileName || "archivo",
        fileBName: fileB?.fileName,
        sampleA: fileA?.rows,
        sampleB: fileB?.rows,
      });
      setResult(res);
    } catch (e) {
      if (e.message === "NO_API_KEY") {
        onNeedApiKey();
      } else {
        setError("No pude procesar el pedido. Probá reformularlo de forma más simple.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    if (!result || !fileA) return;
    await exportWithFormula({
      headers: fileA.headers,
      rows: fileA.rows,
      formulaTemplate: result.formula_excel.replace(/^=/, "=").includes("{ROW}")
        ? result.formula_excel
        : buildRowTemplate(result.formula_excel, fileA.headers),
      newColumnName: result.columna_resultado_nombre || "Resultado",
      fileName: `analisis_${fileA.fileName.replace(/\.[^.]+$/, "")}.xlsx`,
      secondSheetHeaders: fileB?.headers,
      secondSheetRows: fileB?.rows,
      secondSheetName: fileB ? "Hoja2" : undefined,
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={18} className="text-orange-500" />
        <h3 className="text-sm font-semibold text-slate-800">Pedí un cruce en lenguaje natural</h3>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Ej: "si el Cliente del Archivo A está en el Archivo B, traeme el Monto y decime si hay coincidencia"
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Escribí acá tu pedido..."
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          disabled={loading}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !instruction.trim()}
          className="bg-[#0f2540] hover:bg-[#1a3a5c] disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1.5"
        >
          {loading ? "Pensando..." : <><Send size={14} /> Analizar</>}
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

      {result && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-700">{result.explicacion}</p>

          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">Fórmula elegida: <span className="font-semibold text-slate-600">{result.formula_elegida}</span></p>
            <code className="text-xs text-[#0f2540] font-mono break-all">{result.formula_excel}</code>
          </div>

          <p className="text-xs text-slate-500 italic">{result.por_que_esta_formula}</p>

          {result.sugerencia_limpieza && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">{result.sugerencia_limpieza}</p>
            </div>
          )}

          {result.alternativa_mejor && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Lightbulb size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">{result.alternativa_mejor}</p>
            </div>
          )}

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg mt-2"
          >
            <Download size={14} /> Descargar Excel con la fórmula aplicada
          </button>
        </div>
      )}
    </div>
  );
}

// Si la IA no incluyó {ROW} explícito, intentamos convertir referencias de fila 2 a plantilla
function buildRowTemplate(formula, headers) {
  // Reemplaza referencias tipo A2, B2, C2... por A{ROW}, B{ROW}, etc.
  return formula.replace(/([A-Z]{1,3})2\b/g, "$1{ROW}");
}
