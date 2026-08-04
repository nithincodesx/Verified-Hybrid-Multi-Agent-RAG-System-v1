import { motion } from "framer-motion";
import GlowingEffect from "./GlowingEffect";

/* ── Spring presets ─────────────────────────────────────────────── */
const spring = { type: "spring", stiffness: 240, damping: 24, mass: 0.85 };
const springBouncy = { type: "spring", stiffness: 400, damping: 14, mass: 0.5 };

export default function DraftCard({ draft, index }) {
  const { answer } = draft ?? {};
  if (!answer) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ ...spring, delay: index * 0.1 }}
      className="glass relative overflow-hidden rounded-2xl p-5"
    >
      <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} />
      {/* Header */}
      <motion.div
        initial={{ x: -8, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ ...spring, delay: 0.08 }}
        className="flex items-center gap-2.5 mb-4"
      >
        <motion.div
          whileHover={{ rotate: -8, scale: 1.05 }}
          transition={springBouncy}
          className="w-7 h-7 rounded-lg bg-[rgba(26,226,16,0.08)] flex items-center justify-center"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1AE210" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </motion.div>
        <span className="text-sm font-semibold text-[#1AE210] tracking-wide uppercase">Draft</span>
      </motion.div>

      {/* Answer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
      >
        <p className="text-[14px] leading-relaxed text-secondary whitespace-pre-wrap font-sans">
          {answer}
        </p>
      </motion.div>
    </motion.div>
  );
}
