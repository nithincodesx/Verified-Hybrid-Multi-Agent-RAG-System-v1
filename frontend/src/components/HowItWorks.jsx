import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const spring = { type: "spring", stiffness: 220, damping: 24, mass: 0.85 };
const springBouncy = { type: "spring", stiffness: 380, damping: 14, mass: 0.6 };

export default function HowItWorks({ onSelectQuery }) {
  const [showDeepDive, setShowDeepDive] = useState(false);

  const steps = [
    {
      id: "ask",
      title: "Ask",
      desc: "Ask a question in natural language.",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      id: "retrieve",
      title: "Retrieve",
      desc: "Find relevant information from your documents.",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      ),
    },
    {
      id: "draft",
      title: "Draft",
      desc: "Generate a grounded response with context.",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      id: "verify",
      title: "Verify",
      desc: "Check claims and surface sources for transparency.",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      ),
    },
  ];

  const exampleQuery = "What are the key findings from the Q2 2025 product report?";
  const exampleAnswer =
    "The Q2 2025 product report highlights a 28% increase in user adoption, with strongest growth in the APAC region. Revenue grew by 18% quarter-over-quarter, driven by enterprise demand and new feature launches.";

  const exampleSources = [
    { num: 1, file: "product_report_q2_2025.pdf", page: "p. 12" },
    { num: 2, file: "market_analysis.pdf", page: "p. 4" },
  ];

  return (
    <div className="w-full max-w-5xl">
      {/* ── Section Header (CellCarta Editorial Aesthetics - Image 2) ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="mb-10 relative"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="badge-editorial-explore">
              Explore
            </span>
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-400">
              Verified Multi-Agent RAG
            </span>
          </div>

          <div className="flex items-center gap-6 text-[11px] text-slate-500 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="text-pink-500 font-bold">∫∫</span> Dense Semantic
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-cyan-400">✛</span> Sparse BM25
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Atomic Verifier
            </span>
          </div>
        </div>

        <h1 className="font-editorial text-[44px] md:text-[58px] font-normal leading-[1.05] text-white tracking-[-0.025em] mb-3">
          VERIFIED VISION.<br />
          <span className="text-slate-400 italic font-serif">Every claim grounded in evidence.</span>
        </h1>
        <p className="text-[15px] text-slate-400 max-w-xl leading-relaxed">
          Rune Studio fuses neural dense vector embeddings with lexical BM25 retrieval, context-bound drafting, and multi-agent claim verification for transparent, hallucination-free generation.
        </p>
      </motion.div>

      {/* ── 4 Process Steps ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch mb-6 relative"
      >
        {steps.map((step, idx) => (
          <div key={step.id} className="relative flex items-center">
            <div className="card-studio w-full p-5 bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl flex flex-col justify-between h-full hover:shadow-md transition-shadow duration-200">
              <div>
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center mb-3.5">
                  {step.icon}
                </div>
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  {step.title}
                </h3>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>

            {/* Connecting chevron arrow between steps on desktop */}
            {idx < steps.length - 1 && (
              <div className="hidden lg:flex absolute -right-3.5 z-10 w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 items-center justify-center text-slate-400 text-xs shadow-xs pointer-events-none">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </motion.div>

      {/* ── Example Answer Card ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.2 }}
        className="card-studio p-6 bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm"
      >
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-[0.14em] uppercase font-sans">
            Example Answer
          </span>
          {onSelectQuery && (
            <button
              onClick={() => onSelectQuery(exampleQuery)}
              className="text-xs font-medium text-slate-900 dark:text-slate-100 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              Run in Pipeline
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          )}
        </div>

        {/* Question bubble */}
        <div className="inline-block bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-xl px-4 py-2 text-[13px] font-medium mb-3">
          {exampleQuery}
        </div>

        {/* Answer body */}
        <p className="text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed font-sans mb-4">
          {exampleAnswer}
        </p>

        {/* Sources */}
        <div>
          <span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-2">
            Sources
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {exampleSources.map((source) => (
              <div
                key={source.num}
                className="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 font-sans"
              >
                <span className="w-4 h-4 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-mono text-slate-600 dark:text-slate-300 flex items-center justify-center font-medium">
                  {source.num}
                </span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {source.file}
                </span>
                <span className="text-slate-400 text-[11px]">
                  ({source.page})
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Optional Architecture Deep-Dive Toggle ─────────────── */}
      <div className="mt-8 pt-4 border-t border-slate-200/60 dark:border-slate-800 flex justify-between items-center">
        <span className="text-xs text-slate-400">
          Want to inspect the underlying multi-agent architecture?
        </span>
        <button
          onClick={() => setShowDeepDive(!showDeepDive)}
          className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors"
        >
          {showDeepDive ? "Hide details" : "Explore architecture details"}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${showDeepDive ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {showDeepDive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mt-4"
          >
            <div className="card-studio p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 text-xs text-slate-600 dark:text-slate-400">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="font-semibold text-slate-900 dark:text-slate-200 block mb-1">
                    1. Hybrid Retrieval & RRF
                  </span>
                  Vector search (ChromaDB cosine) + sparse BM25 keyword matching fused using Reciprocal Rank Fusion, followed by cross-encoder reranking.
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="font-semibold text-slate-900 dark:text-slate-200 block mb-1">
                    2. Context-Bound Drafter
                  </span>
                  Strict zero-shot generation enforcing that all claims must originate strictly from retrieved text context without external hallucinations.
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="font-semibold text-slate-900 dark:text-slate-200 block mb-1">
                    3. Atomic Claim Verification
                  </span>
                  Independent verifier isolates discrete factual assertions and cross-references them against retrieved evidence, pruning unsupported claims.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
