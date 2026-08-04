import { motion } from "framer-motion";
import { renderWithCitations } from "../utils";
import GlowingEffect from "./GlowingEffect";

/* ── Spring presets ─────────────────────────────────────────────── */
const spring = { type: "spring", stiffness: 240, damping: 24, mass: 0.85 };
const springBouncy = { type: "spring", stiffness: 420, damping: 12, mass: 0.5 };
const springReveal = { type: "spring", stiffness: 200, damping: 22, mass: 0.8 };

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
  },
};

const claimItem = {
  hidden: { opacity: 0, x: -16, filter: "blur(6px)" },
  show: { opacity: 1, x: 0, filter: "blur(0px)", transition: spring },
};

export default function VerificationCard({ verification, index }) {
  const { verdicts, passed, verified_answer } = verification ?? {};
  if (!verdicts || verdicts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ ...spring, delay: index * 0.1 }}
      className="glass-strong relative overflow-hidden rounded-2xl p-5"
    >
      <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} />
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="flex items-center justify-between mb-5"
      >
        <div className="flex items-center gap-2.5">
          <motion.div
            whileHover={{ rotate: [0, -12, 12, 0] }}
            transition={{ duration: 0.4 }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              passed ? "bg-[rgba(52,211,153,0.08)]" : "bg-[rgba(251,113,133,0.08)]"
            }`}
          >
            {passed ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </motion.div>
          <span className="text-sm font-semibold text-primary tracking-wide uppercase">Verification</span>
        </div>

        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...springBouncy, delay: 0.12 }}
          className="flex items-center gap-2.5"
        >
          <span className="mono-metric text-muted">
            {verdicts.length} claim{verdicts.length > 1 ? "s" : ""}
          </span>
          <motion.span
            whileHover={{ scale: 1.04 }}
            className={`mono-metric font-semibold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
              passed ? "badge-pass" : "badge-fail"
            }`}
          >
            {passed ? "PASSED" : "FLAGGED"}
          </motion.span>
        </motion.div>
      </motion.div>

      {/* Verdicts */}
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-2.5 mb-4">
        {verdicts.map((v, i) => (
          <motion.div
            key={i}
            variants={claimItem}
            whileHover={{ x: 2, transition: { type: "spring", stiffness: 200, damping: 20 } }}
            className={`relative overflow-hidden rounded-xl p-3.5 border ${
              v.supported
                ? "border-[rgba(52,211,153,0.05)] bg-[rgba(52,211,153,0.015)]"
                : "border-[rgba(251,113,133,0.06)] bg-[rgba(251,113,133,0.02)]"
            }`}
          >
            <GlowingEffect spread={24} proximity={40} inactiveZone={0.02} borderWidth={0.75} />
            <div className="flex items-start gap-3">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...springBouncy, delay: i * 0.015 }}
                className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  v.supported
                    ? "bg-[rgba(52,211,153,0.1)] text-[#34d399]"
                    : "bg-[rgba(251,113,133,0.1)] text-[#fb7185]"
                }`}
              >
                {v.supported ? "✓" : "✗"}
              </motion.span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] leading-relaxed text-secondary mb-1 font-sans">{v.claim}</p>
                {v.source_chunk && (
                  <details className="mt-1.5 group">
                    <summary className="text-[11px] text-muted cursor-pointer hover:text-[#8a8ea0] transition-colors font-mono list-none flex items-center gap-1.5">                    <svg
                        className="w-3 h-3 text-dim transition-transform duration-300 group-open:rotate-90"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      Source evidence
                    </summary>
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={springReveal}
                      className="text-[12px] text-muted mt-1.5 leading-relaxed bg-elevated rounded-lg p-2.5 font-mono"
                    >
                      {v.source_chunk}
                    </motion.p>
                  </details>
                )}
                {v.explanation && (
                  <p className="text-[11px] text-muted mt-1 italic font-mono leading-relaxed">{v.explanation}</p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Verified answer */}
      {verified_answer && (
        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ ...spring, delay: 0.35 }}
          className="glass-light relative overflow-hidden rounded-xl p-4 border border-[rgba(26,226,16,0.06)]"
        >
          <GlowingEffect spread={30} glow proximity={52} inactiveZone={0.02} borderWidth={0.75} />
          <div className="flex items-center gap-2 mb-2.5">
            <motion.svg
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1AE210" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </motion.svg>
            <span className="text-[11px] font-semibold text-[#1AE210] uppercase tracking-wider font-mono">
              Verified Answer
            </span>
          </div>
          <div className="text-[14px] leading-relaxed text-secondary whitespace-pre-wrap font-sans">
            {renderWithCitations(verified_answer)}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
