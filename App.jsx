import { useState } from "react";
import { KeyRound, BarChart3, GitCompare } from "lucide-react";
import "./utils/chartSetup";
import FileUpload from "./components/FileUpload";
import Dashboard from "./components/Dashboard";
import FormulaChat from "./components/FormulaChat";
import ApiKeyModal from "./components/ApiKeyModal";
import { hasApiKey } from "./utils/claudeApi";

function App() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(hasApiKey());
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      {/* Header */}
      <header className="bg-[#0f2540] text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 p-1.5 rounded-lg">
              <BarChart3 size={20} />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">Analizador de Obras</h1>
              <p className="text-xs text-slate-300 leading-tight">Dashboard dinámico + cruces con fórmulas de Excel</p>
            </div>
          </div>
          <button
            onClick={() => setShowApiModal(true)}
            className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            <KeyRound size={14} />
            {apiKeySet ? "API Key configurada" : "Configurar API Key"}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Carga de archivos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FileUpload
            label="Archivo principal (obligatorio)"
            file={fileA}
            onFileLoaded={setFileA}
            onClear={() => setFileA(null)}
          />
          <FileUpload
            label="Segundo archivo (opcional, para cruces entre archivos)"
            file={fileB}
            onFileLoaded={setFileB}
            onClear={() => setFileB(null)}
          />
        </div>

        {fileA && (
          <>
            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
              <button
                onClick={() => setTab("dashboard")}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === "dashboard" ? "border-orange-500 text-[#0f2540]" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <BarChart3 size={16} /> Dashboard
              </button>
              <button
                onClick={() => setTab("cruces")}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === "cruces" ? "border-orange-500 text-[#0f2540]" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <GitCompare size={16} /> Cruces con fórmulas (IA)
              </button>
            </div>

            {tab === "dashboard" && <Dashboard fileData={fileA} />}
            {tab === "cruces" && (
              <FormulaChat fileA={fileA} fileB={fileB} onNeedApiKey={() => setShowApiModal(true)} />
            )}
          </>
        )}

        {!fileA && (
          <div className="text-center py-16 text-slate-400">
            <BarChart3 size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Subí un archivo Excel para empezar el análisis.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
