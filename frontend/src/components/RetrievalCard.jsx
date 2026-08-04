import { motion } from "framer-motion";
import GlowingEffect from "./GlowingEffect";

/* ── Spring presets ─────────────────────────────────────────────── */
const spring = { type: "spring", stiffness: 240, damping: 24, mass: 0.85 };
const springChunk = { type: "spring", stiffness: 200, damping: 20, mass: 0.75 };
const springBouncy = { type: "spring", stiffness: 400, damping: 14, mass: 0.5 };

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: springChunk },
};

/* ── Helpers ────────────────────────────────────────────────────── */
function heatmapStyle(score) {
  const s = Math.max(0, Math.min(1, score));
  const intensity = Math.max(0, (s - 0.3) / 0.7);
  const alpha = intensity * 0.07;
  const hue = 220 + intensity * 40;
  return {
    background: `linear-gradient(135deg,
      hsla(${hue}, 65%, 65%, ${alpha}) 0%,
      hsla(${hue + 10}, 55%, 55%, ${alpha * 0.5}) 100%
    )`,
    boxShadow: s > 0.7 ? `inset 0 0 24px hsla(${hue}, 65%, 65%, ${alpha * 0.4})` : "none",
  };
}

function scoreBadgeClass(score) {
  if (score >= 0.7) return "badge-pass";
  if (score >= 0.5) return "badge-warn";
  return "bg-[rgba(148,163,184,0.06)] text-[#94a3b8] border border-[rgba(148,163,184,0.12)]";
}

export default function RetrievalCard({ retrieval, index }) {
  const { chunks, latency_ms, hybrid_used } = retrieval ?? {};
  if (!chunks || chunks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ ...spring, delay: index * 0.1 }}
      className="glass-strong relative overflow-hidden rounded-2xl p-5"
    >
      <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} />
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <motion.div
          initial={{ x: -8, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ ...spring, delay: 0.08 }}
          className="flex items-center gap-2.5"
        >
          <motion.div
            whileHover={{ rotate: 12, scale: 1.05 }}
            transition={springBouncy}
            className="w-7 h-7 rounded-lg bg-[rgba(96,165,250,0.08)] flex items-center justify-center"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </motion.div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#93c5fd] tracking-wide uppercase">
              Retrieval
            </span>
            {hybrid_used && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...springBouncy, delay: 0.25 }}
                className="mono-metric px-1.5 py-0.5 rounded bg-[rgba(96,165,250,0.06)] text-[#60a5fa] border border-[rgba(96,165,250,0.1)]"
              >
                hybrid
              </motion.span>
            )}
          </div>
        </motion.div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mono-metric text-muted"
        >
          {latency_ms.toFixed(0)} ms · {chunks.length} chunk{chunks.length > 1 ? "s" : ""}
        </motion.span>
      </div>

      {/* Heatmap legend */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ ...spring, delay: 0.12 }}
        className="flex items-center gap-2 mb-4 px-1 origin-left"
      >
        <span className="text-[10px] text-muted font-mono shrink-0">low</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-[rgba(255,255,255,0.03)]">
          <div
            className="h-full w-full rounded-full"
            style={{
              background: "linear-gradient(90deg, rgba(96,165,250,0.08) 0%, rgba(26,226,16,0.15) 50%, rgba(52,211,153,0.2) 100%)",
            }}
          />
        </div>
        <span className="text-[10px] text-muted font-mono shrink-0">high</span>
      </motion.div>

      {/* Chunks */}
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-2.5">
        {chunks.map((chunk, i) => (
          <motion.div
            key={chunk.chunk_id ?? i}
            id={`chunk-${i + 1}`}
            variants={item}
            style={heatmapStyle(chunk.score)}
            whileHover={{
              scale: 1.005,
              y: -1,
              transition: { type: "spring", stiffness: 300, damping: 20 },
            }}
            className="glass-light relative overflow-hidden rounded-xl p-3.5 scroll-mt-24 cursor-default"
          >
            <GlowingEffect spread={26} proximity={44} inactiveZone={0.02} borderWidth={0.75} />
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <span className="text-[11px] font-semibold text-muted tracking-wider font-mono">
                [{i + 1}]
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {chunk.source && (
                  <span className="text-[10px] font-medium text-muted truncate max-w-[140px] font-mono">
                    {chunk.source}
                  </span>
                )}
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  className={`mono-metric px-2 py-0.5 rounded-md ${scoreBadgeClass(chunk.score)}`}
                >
                  {chunk.score.toFixed(3)}
                </motion.span>
              </div>
            </div>
            <p className="text-[13px] leading-relaxed text-secondary line-clamp-4 font-sans">
              {chunk.text}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
