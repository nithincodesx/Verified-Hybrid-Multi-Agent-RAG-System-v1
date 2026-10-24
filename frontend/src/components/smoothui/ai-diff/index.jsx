import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function AIDiff({
  draftText = "Acme Corp reported $4.2M recurring revenue in Q3, with 94.2% retention. They also projected $20M revenue in 2026 without documented backing.",
  verifiedText = "Acme Corp delivered $4.2M in recurring revenue for Q3, demonstrating a 94.2% net retention rate across enterprise contracts. [Projected $20M revenue claim removed due to lack of ground-truth evidence].",
  verdicts = [],
  className,
}) {
  const [viewMode, setViewMode] = useState("split");

  return (
    <div className={cn("w-full rounded-2xl bg-white/[0.03] border border-white/10 p-4 backdrop-blur-xl space-y-4", className)}>
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-white tracking-tight">Hallucination Diff Inspector</span>
        </div>

        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setViewMode("split")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition ${
              viewMode === "split" ? "bg-white/15 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Split View
          </button>
          <button
            onClick={() => setViewMode("verified")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition ${
              viewMode === "verified" ? "bg-emerald-500/20 text-emerald-300 shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Verified Only
          </button>
        </div>
      </div>

      {viewMode === "split" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Draft */}
          <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-rose-300 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                Raw Draft Model
              </span>
              <span className="text-[10px] font-mono text-rose-400/80">Unverified</span>
            </div>
            <p className="text-xs text-rose-100/90 leading-relaxed font-sans">
              {draftText}
            </p>
          </div>

          {/* Verified */}
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-emerald-300 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Theo Verifier Polish
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">100% Grounded</span>
            </div>
            <p className="text-xs text-emerald-100/90 leading-relaxed font-sans">
              {verifiedText}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-emerald-300 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Final Ground-Truth Verified Response
            </span>
          </div>
          <p className="text-xs text-slate-100 leading-relaxed font-sans">
            {verifiedText}
          </p>
        </div>
      )}
    </div>
  );
}
