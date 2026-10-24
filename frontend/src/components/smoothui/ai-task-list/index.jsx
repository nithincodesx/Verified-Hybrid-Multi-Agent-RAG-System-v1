import { cn } from "@/lib/utils";
import { Check, Loader2, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function AITaskList({
  tasks = [
    { id: 1, title: "Semantic Retrieval across Corpus", status: "done", time: "180ms" },
    { id: 2, title: "Cross-Encoder Re-Ranking & Filtering", status: "done", time: "240ms" },
    { id: 3, title: "Atomic Claim Extraction & Deconstruction", status: "done", time: "310ms" },
    { id: 4, title: "Natural Language Inference (NLI) Verification", status: "running", time: "in progress" },
    { id: 5, title: "Synthesis of Verified Briefing", status: "pending", time: "queued" },
  ],
  className,
}) {
  return (
    <div className={cn("w-full rounded-2xl bg-white/[0.03] border border-white/10 p-4 backdrop-blur-xl shadow-sm space-y-3", className)}>
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Multi-Agent Task Plan</span>
        <span className="text-[10px] font-mono text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20">
          Autonomous
        </span>
      </div>

      <div className="space-y-2">
        {tasks.map((task, idx) => {
          const isDone = task.status === "done";
          const isRunning = task.status === "running";
          const isError = task.status === "error";

          return (
            <motion.div
              key={task.id || idx}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                isRunning
                  ? "bg-pink-500/10 border-pink-500/30 text-white shadow-[0_0_12px_rgba(236,72,153,0.15)]"
                  : isDone
                  ? "bg-white/[0.02] border-white/5 text-slate-300"
                  : "bg-transparent border-transparent text-slate-500"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    isDone
                      ? "bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      : isRunning
                      ? "bg-pink-500 text-white shadow-[0_0_8px_rgba(236,72,153,0.7)]"
                      : isError
                      ? "bg-rose-500 text-white"
                      : "bg-white/10 text-slate-400"
                  }`}
                >
                  {isDone ? (
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  ) : isRunning ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : isError ? (
                    <AlertCircle className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                </span>
                <span className="text-xs font-medium tracking-tight truncate">
                  {task.title}
                </span>
              </div>

              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                {task.time}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
