import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RetrievalCard from "./RetrievalCard";
import GlowingEffect from "./GlowingEffect";
import DraftCard from "./DraftCard";
import VerificationCard from "./VerificationCard";
import CompareView from "./CompareView";
import TraceLog from "./TraceLog";

/* ── Spring presets ─────────────────────────────────────────────── */
const spring = { type: "spring", stiffness: 260, damping: 24, mass: 0.85 };
const springBouncy = { type: "spring", stiffness: 420, damping: 12, mass: 0.5 };
const springReveal = { type: "spring", stiffness: 220, damping: 22, mass: 0.8 };

const badgeVariant = {
  hidden: { opacity: 0, scale: 0.8, filter: "blur(6px)" },
  show: (i) => ({
    opacity: 1, scale: 1, filter: "blur(0px)",
    transition: { ...spring, delay: 0.06 * i },
  }),
};

const tabVariants = {
  inactive: { background: "transparent", color: "var(--text-muted)" },
  active: { background: "rgba(59,130,246,0.1)", color: "#3b82f6" },
};

export default function PipelineView({ result }) {
  const [view, setView] = useState("trace");
  if (!result) return null;

  const { retrieval, draft, verification, query, error, skipped_llm, filter_source } = result;
  const hasVerdicts = verification?.verdicts?.length > 0;
  const isHybrid = retrieval?.hybrid_used;
  const isBelowThreshold = retrieval?.below_threshold;
  const expansionApplied = retrieval?.expansion_applied;
  const rerankingApplied = retrieval?.reranking_applied;
  const rerankerFallback = retrieval?.reranker_fallback_used;

  const badges = [];
  if (isHybrid) badges.push({ label: "Hybrid Search", color: "#60a5fa", icon: "polyline" });
  if (expansionApplied) badges.push({ label: "Query Expanded", color: "#3b82f6", icon: "polyline" });
  if (rerankingApplied) badges.push({ label: rerankerFallback ? "Rerank (fallback)" : "Reranked", color: rerankerFallback ? "#fbbf24" : "#60a5fa", icon: "polyline" });
  if (skipped_llm) badges.push({ label: "LLM Bypassed (low confidence)", color: "#fbbf24", icon: "clock" });
  if (filter_source) badges.push({ label: `Filter: ${filter_source}`, color: "#3b82f6", icon: "filter" });

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={query}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        {/* ── View Toggle ────────────────────────────────────────── */}
        {draft?.answer && (
          <motion.div
            initial={{ opacity: 0, y: -12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={spring}
            className="flex items-center gap-1 mb-6 glass relative overflow-hidden rounded-xl p-1 w-fit"
          >
            <GlowingEffect spread={30} glow proximity={52} inactiveZone={0.02} borderWidth={0.75} />
            {[
              { id: "trace", label: "Pipeline Trace", icon: "polyline" },
              { id: "compare", label: "A/B Compare", icon: "chart" },
            ].map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setView(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                animate={view === tab.id ? "active" : "inactive"}
                variants={tabVariants}
                transition={{ type: "spring", stiffness: 400, damping: 26 }}
                className="px-3.5 py-1.5 rounded-lg text-[11px] font-medium tracking-wide"
              >
                <span className="flex items-center gap-1.5">
                  {tab.id === "trace" ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  )}
                  {tab.label}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* ── Feature Badges ──────────────────────────────────────── */}
        {badges.length > 0 && (
          <motion.div
            initial="hidden"
            animate="show"
            className="flex items-center gap-2 mb-5 flex-wrap"
          >
            {badges.map((b, i) => (
              <motion.span
                key={b.label}
                custom={i}
                variants={badgeVariant}
                whileHover={{ scale: 1.04 }}
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full glass-glow relative overflow-hidden"
                style={{
                  background: `${b.color}0d`,
                  color: b.color,
                  border: `1px solid ${b.color}15`,
                }}
              >
                <GlowingEffect spread={22} proximity={38} inactiveZone={0.03} borderWidth={0.75} />
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {b.icon === "polyline" && <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />}
                  {b.icon === "clock" && <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>}
                  {b.icon === "filter" && <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />}
                </svg>
                {b.label}
              </motion.span>
            ))}
          </motion.div>
        )}

        {/* ── Error Banner ───────────────────────────────────────── */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={spring}
            className="glass-strong relative overflow-hidden rounded-2xl p-4 mb-6 border border-[rgba(251,113,133,0.08)]"
          >
            <GlowingEffect spread={36} glow proximity={56} inactiveZone={0.02} />
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-lg bg-[rgba(251,113,133,0.08)] flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <span className="text-sm font-medium text-[#fb7185]">Pipeline error</span>
            </div>
            <p className="text-[13px] text-muted ml-7 font-mono leading-relaxed">{error}</p>
          </motion.div>
        )}

        {/* ── TRACE VIEW ──────────────────────────────────────────── */}
        {view === "trace" && (
          <div className="space-y-1">
            <RetrievalCard retrieval={retrieval} index={1} />
            {draft?.answer && <DraftCard draft={draft} index={2} />}
            {hasVerdicts && <VerificationCard verification={verification} index={3} />}
            <TraceLog data={result} />
          </div>
        )}

        {/* ── COMPARE VIEW ────────────────────────────────────────── */}
        {view === "compare" && <CompareView result={result} />}
      </motion.div>
    </AnimatePresence>
  );
}
