import { motion } from "framer-motion";

/* ── Spring presets ─────────────────────────────────────────────── */
const springBouncy = { type: "spring", stiffness: 420, damping: 12, mass: 0.5 };

/**
 * Render text with [Source N] citation markers as spring-animated badges
 * that scroll to the matching chunk in the RetrievalCard panel.
 */
export function renderWithCitations(text) {
  if (!text) return null;

  const parts = text.split(/(\[Source \d+\])/g);

  return parts.map((part, i) => {
    const match = part.match(/^\[Source (\d+)\]$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return (
        <motion.button
          key={i}
          onClick={() => {
            const el = document.getElementById(`chunk-${num}`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            el?.classList.add(
              "ring-1", "ring-accent-ring",
              "bg-accent-soft-xs",
              "transition-all", "duration-700"
            );
            setTimeout(() => {
              el?.classList.remove(
                "ring-1", "ring-accent-ring",
                "bg-accent-soft-xs"
              );
            }, 1500);
          }}
          whileHover={{ scale: 1.1, y: -1 }}
          whileTap={{ scale: 0.9 }}
          transition={springBouncy}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5
            rounded-md text-[11px] font-mono font-semibold
            bg-accent-soft text-accent
            hover:bg-accent-soft-lg
            active:scale-95 cursor-pointer align-baseline
            border border-accent-border-soft
            shadow-sm"
          title={`Scroll to source chunk ${num}`}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {num}
        </motion.button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
