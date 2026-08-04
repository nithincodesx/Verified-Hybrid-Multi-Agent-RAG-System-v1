import { useState, useRef } from "react";
import { motion } from "framer-motion";
import GlowingEffect from "./GlowingEffect";

/* ── Spring presets ─────────────────────────────────────────────── */
const spring = { type: "spring", stiffness: 260, damping: 24, mass: 0.85 };
const springBouncy = { type: "spring", stiffness: 400, damping: 14, mass: 0.5 };
const springField = { type: "spring", stiffness: 350, damping: 26, mass: 0.7 };

const NEON = "#1AE210";
const NEON_GLOW = "rgba(26, 226, 16, 0.12)";
const NEON_FAINT = "rgba(26, 226, 16, 0.08)";

export default function QueryInput({ onSubmit, loading, filterSource, onFilterSourceChange }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed, { filterSource: filterSource || undefined });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ ...spring, delay: 0.35 }}
      className="w-full mb-8"
    >
      <form onSubmit={handleSubmit} className="relative">
        <motion.div
          animate={{
            boxShadow: focused
              ? `0 0 48px ${NEON_FAINT}, 0 0 0 1.5px rgba(26,226,16,0.22)`
              : hovered
              ? `0 0 24px ${NEON_FAINT}, 0 0 0 1px rgba(26,226,16,0.08)`
              : "0 0 0 0 transparent",
            scale: focused ? 1.005 : 1,
          }}
          transition={springField}
          className="glass-strong relative rounded-2xl p-2 flex items-end gap-2"
        >
          <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} />
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            placeholder="Ask a question about your documents…"
            rows={1}
            className="input-glass flex-1 rounded-xl px-5 py-3.5 text-[15px] text-primary placeholder:text-placeholder resize-none leading-relaxed min-h-[52px] max-h-[160px]"
            disabled={loading}
            autoFocus
          />

          <div className="flex flex-col gap-2 shrink-0">
            {/* Filter input */}
            <motion.div
              initial={false}
              animate={focused ? { opacity: 1 } : { opacity: 0.5 }}
              className="flex items-center gap-2"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <input
                type="text"
                value={filterSource}
                onChange={(e) => onFilterSourceChange(e.target.value)}
                placeholder="Filter by source…"
                disabled={loading}
                className="bg-transparent text-[11px] text-muted placeholder:text-dim border border-glass rounded-lg px-2.5 py-1.5 outline-none focus:border-[rgba(26,226,16,0.25)] transition-all duration-300 w-[140px] font-mono"
              />
              {filterSource && (
                <motion.button
                  type="button"
                  onClick={() => onFilterSourceChange("")}
                  whileHover={{ scale: 1.2, rotate: 90 }}
                  whileTap={{ scale: 0.85 }}
                  transition={springBouncy}
                  className="text-muted hover:text-muted p-0.5"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </motion.button>
              )}
            </motion.div>

            {/* Submit button — green accent */}
            <motion.button
              type="submit"
              disabled={loading || !query.trim()}
              whileHover={!loading && query.trim() ? { scale: 1.03 } : {}}
              whileTap={!loading && query.trim() ? { scale: 0.95 } : {}}
              transition={springBouncy}
              className={`
                rounded-xl px-5 py-3.5 font-medium text-sm tracking-wide
                whitespace-nowrap relative overflow-hidden
                ${
                  loading || !query.trim()
                    ? "bg-[rgba(255,255,255,0.03)] text-muted cursor-not-allowed"
                    : "glass-glow border border-[rgba(26,226,16,0.12)]"
                }
              `}
              style={
                !loading && query.trim()
                  ? { color: NEON, boxShadow: `0 0 20px ${NEON_FAINT}` }
                  : undefined
              }
            >
              {loading ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2"
                >
                  <Spinner />
                  <span className="font-mono text-[11px]">Running…</span>
                </motion.span>
              ) : (
                <motion.span
                  className="flex items-center gap-2"
                  whileHover={{ x: 2 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span className="font-medium">Ask</span>
                </motion.span>
              )}
            </motion.button>
          </div>
        </motion.div>
      </form>
    </motion.div>
  );
}

function Spinner() {
  return (
    <motion.svg
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="h-4 w-4"
      viewBox="0 0 24 24" fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </motion.svg>
  );
}
