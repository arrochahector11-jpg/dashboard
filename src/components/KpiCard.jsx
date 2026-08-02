import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function KpiCard({ title, value, subtitle, breakdown, accent = "orange" }) {
  const [open, setOpen] = useState(false);

  const accentClasses = {
    orange: "border-l-orange-500 text-orange-600",
    navy: "border-l-[#0f2540] text-[#0f2540]",
    green: "border-l-emerald-500 text-emerald-600",
    red: "border-l-rose-500 text-rose-600",
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-100 border-l-4 ${accentClasses[accent].split(" ")[0]} p-4`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${accentClasses[accent].split(" ")[1]}`}>{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}

      {breakdown && breakdown.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
          >
            Ver detalle <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto pr-1">
              {breakdown.map((b, i) => (
                <li key={i} className="flex justify-between text-xs text-slate-600 border-b border-slate-50 pb-1">
                  <span className="truncate pr-2">{b.label}</span>
                  <span className="font-medium shrink-0">{b.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
