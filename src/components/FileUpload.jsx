import { useState, useCallback } from "react";
import { UploadCloud, FileSpreadsheet, X, Layers } from "lucide-react";
import { readExcelFile } from "../utils/excelReader";

export default function FileUpload({ label, file, onFileLoaded, onClear }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = useCallback(async (f) => {
    if (!f) return;
    const validExt = /\.(xlsx|xls|csv)$/i.test(f.name);
    if (!validExt) {
      setError("Solo se aceptan archivos .xlsx, .xls o .csv");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await readExcelFile(f);
      onFileLoaded(data);
    } catch (e) {
      setError("No pude leer el archivo. ¿Está bien formado?");
    } finally {
      setLoading(false);
    }
  }, [onFileLoaded]);

  async function handleSheetChange(sheetName) {
    if (!file?._file) return;
    setLoading(true);
    try {
      const data = await readExcelFile(file._file, sheetName);
      onFileLoaded(data);
    } catch (e) {
      setError("No pude leer esa hoja.");
    } finally {
      setLoading(false);
    }
  }

  if (file) {
    return (
      <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-green-100 p-2 rounded-lg shrink-0">
              <FileSpreadsheet size={20} className="text-green-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{file.fileName}</p>
              <p className="text-xs text-slate-500">{file.rows.length} filas · {file.headers.length} columnas</p>
            </div>
          </div>
          <button onClick={onClear} className="text-slate-400 hover:text-red-500 shrink-0">
            <X size={18} />
          </button>
        </div>
        {file.sheetNames && file.sheetNames.length > 1 && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <Layers size={14} className="text-slate-400 shrink-0" />
            <span className="text-xs text-slate-400 shrink-0">Hoja:</span>
            <select
              value={file.sheetName}
              onChange={(e) => handleSheetChange(e.target.value)}
              disabled={loading}
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-slate-50 flex-1 min-w-0"
            >
              {file.sheetNames.map((name) => (
                <option key={name} value={name}>
                  {name} ({file.sheetRowCounts?.[name] ?? 0} filas)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
          dragging ? "border-orange-400 bg-orange-50" : "border-slate-300 bg-white hover:border-slate-400"
        }`}
      >
        <UploadCloud size={28} className={dragging ? "text-orange-500" : "text-slate-400"} />
        <p className="text-sm text-slate-600 mt-2 font-medium">{label}</p>
        <p className="text-xs text-slate-400 mt-1">Arrastrá el archivo acá o hacé clic ({loading ? "cargando..." : ".xlsx, .xls, .csv"})</p>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </label>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
