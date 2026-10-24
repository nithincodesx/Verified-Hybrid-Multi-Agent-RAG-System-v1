import { cn } from "@/lib/utils";
import { ShieldCheck, Check, X, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

export default function AIApproval({
  title = "Verify Hallucination Correction",
  claim = "Theo filtered 1 unsupported claim from the raw draft response.",
  onApprove,
  onReject,
  className,
}) {
  const [decided, setDecided] = useState(null);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "w-full rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-white/15 p-4 backdrop-blur-2xl shadow-lg space-y-3",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 flex items-center justify-center text-white shadow-[0_0_12px_rgba(236,72,153,0.5)]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white tracking-tight">{title}</h4>
            <p className="text-[11px] text-slate-400">Human-In-The-Loop Agent Gate</p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-pink-300 border border-white/10 flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-pink-400" />
          Apple Trust Layer
        </span>
      </div>

      <p className="text-xs text-slate-200 bg-white/5 p-3 rounded-xl border border-white/10 font-sans leading-relaxed">
        "{claim}"
      </p>

      {decided ? (
        <div className="text-xs font-mono text-center py-1 text-slate-300">
          {decided === "approved" ? (
            <span className="text-emerald-400 font-semibold">✓ Action Approved & Published</span>
          ) : (
            <span className="text-rose-400 font-semibold">✕ Action Suppressed & Logged</span>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={() => {
              setDecided("rejected");
              onReject?.();
            }}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 border border-white/10 transition flex items-center gap-1.5 active:scale-95"
          >
            <X className="w-3.5 h-3.5 text-rose-400" />
            <span>Reject Claim</span>
          </button>
          <button
            onClick={() => {
              setDecided("approved");
              onApprove?.();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-500 text-white text-xs font-semibold shadow-md hover:opacity-90 transition flex items-center gap-1.5 active:scale-95"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Approve & Verify</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}
