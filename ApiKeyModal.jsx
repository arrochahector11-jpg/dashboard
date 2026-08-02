import { useState } from "react";
import { KeyRound, X } from "lucide-react";
import { setApiKey } from "../utils/claudeApi";

export default function ApiKeyModal({ onClose, onSaved }) {
  const [key, setKey] = useState("");

  function handleSave() {
    if (!key.trim().startsWith("sk-ant-")) {
      alert("Esa no parece una API key válida de Anthropic (empieza con sk-ant-).");
      return;
    }
    setApiKey(key.trim());
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-orange-100 p-2 rounded-lg">
            <KeyRound size={20} className="text-orange-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Configurar API Key</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Necesitás tu propia API key de Anthropic para usar el analizador de cruces con fórmulas.
          Se guarda solo en tu navegador, nunca se envía a ningún servidor propio.
        </p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-ant-..."
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-orange-600 hover:underline"
        >
          ¿No tenés una? Generala acá →
        </a>
        <button
          onClick={handleSave}
          className="w-full mt-4 bg-[#0f2540] hover:bg-[#1a3a5c] text-white font-medium py-2 rounded-lg transition-colors"
        >
          Guardar y continuar
        </button>
      </div>
    </div>
  );
}
