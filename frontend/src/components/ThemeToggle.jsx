import { motion, AnimatePresence } from "framer-motion";
import GlowingEffect from "./GlowingEffect";

/* ── Spring presets ─────────────────────────────────────────────── */
const springBouncy = { type: "spring", stiffness: 420, damping: 10, mass: 0.5 };
const springRotate = { type: "spring", stiffness: 200, damping: 16, mass: 0.7 };
const springThumb = { type: "spring", stiffness: 600, damping: 22, mass: 0.4 };

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";

  return (
    <motion.button
      onClick={onToggle}
      initial={{ opacity: 0, scale: 0.8, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.9 }}
      transition={springBouncy}
      className="glass relative overflow-hidden rounded-full p-2 flex items-center gap-2 cursor-pointer glass-glow"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <GlowingEffect spread={24} proximity={40} inactiveZone={0.02} borderWidth={0.75} />
      {/* Track */}
      <motion.div
        animate={{
          background: isDark ? "var(--track-accent)" : "var(--track-light)",
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-[44px] h-[22px] rounded-full overflow-hidden"
        style={{
          border: "1px solid var(--border-glass-strong)",
          boxShadow: "inset 0 1px 3px var(--control-inset-shadow)",
        }}
      >
        {/* Sliding thumb */}
        <motion.div
          layout
          transition={springThumb}
          className="absolute top-[2px] w-[16px] h-[16px] rounded-full shadow-lg flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, var(--control-thumb), var(--control-thumb-hi))",
            left: isDark ? "2px" : "24px",
          }}
        >
          <AnimatePresence mode="wait">
            {isDark ? (
              <motion.svg
                key="moon"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={springRotate}
                width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--icon-moon)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </motion.svg>
            ) : (
              <motion.svg
                key="sun"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={springRotate}
                width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--icon-sun)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Label */}
      <motion.span
        animate={{ opacity: 1 }}
        className="text-[11px] font-mono font-medium tracking-wide text-muted"
      >
        {isDark ? "Dark" : "Light"}
      </motion.span>
    </motion.button>
  );
}
