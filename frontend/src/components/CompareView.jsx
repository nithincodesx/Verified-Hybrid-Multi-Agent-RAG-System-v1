import { motion } from "framer-motion";
import { renderWithCitations } from "../utils";
import GlowingEffect from "./GlowingEffect";

/* ── Spring presets ─────────────────────────────────────────────── */
const spring = { type: "spring", stiffness: 240, damping: 24, mass: 0.85 };
const springBouncy = { type: "spring", stiffness: 420, damping: 12, mass: 0.5 };
const springReveal = { type: "spring", stiffness: 200, damping: 22, mass: 0.8 };

function highlightFlaggedClaims(draftText, unsupportedClaims) {
  if (!unsupportedClaims.length || !draftText) {
    return <span>{draftText}</span>;
  }

  const escaped = unsupportedClaims.map((c) =>
    c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");

  const parts = draftText.split(pattern);
  return parts.map((part, i) => {
    const isFlagged = unsupportedClaims.some(
      (c) => part.toLowerCase() === c.toLowerCase()
    );
    if (isFlagged) {
      return (
        <span
          key={i}
          className="bg-[var(--danger-border-faint)] text-danger line-through decoration-2 decoration-[var(--danger-border-focus)] rounded-sm px-0.5"
          title="Flagged as unsupported by the verifier"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function CompareView({ result }) {
  if (!result) return null;
  const { draft, verification } = result;
  const draftAnswer = draft?.answer || "";
  const verifiedAnswer = verification?.verified_answer || "";
  const unsupportedClaims = (verification?.verdicts || [])
    .filter((v) => !v.supported)
    .map((v) => v.claim);
  const supportedClaims = (verification?.verdicts || [])
    .filter((v) => v.supported);
  const hasComparison = draftAnswer && verifiedAnswer;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={spring}
        className="flex items-center gap-3 mb-5"
      >
        <div className="flex items-center gap-2 glass rounded-full px-3.5 py-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span className="text-[11px] font-semibold text-muted uppercase tracking-wider font-mono">
            A/B Comparison
          </span>
          {verification && (
            <motion.span
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={springBouncy}
              className={`mono-metric font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                verification.passed ? "badge-pass" : "badge-fail"
              }`}
            >
              {verification.passed
                ? "ALL CLAIMS VERIFIED"
                : `${unsupportedClaims.length} FLAGGED`}
            </motion.span>
          )}
        </div>
      </motion.div>

      {!hasComparison ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
          className="glass rounded-2xl p-8 text-center"
        >
          <p className="text-[13px] text-muted font-mono">
            The pipeline must complete before a comparison is available.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LEFT: Raw Draft */}
          <motion.div
            initial={{ opacity: 0, x: -24, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={spring}
            className="glass-strong relative overflow-hidden rounded-2xl p-5"
          >
            <GlowingEffect spread={36} glow proximity={60} inactiveZone={0.01} />
            <div className="flex items-center gap-2 mb-3">
              <motion.div
                whileHover={{ rotate: -5 }}
                className="w-6 h-6 rounded-lg bg-accent-tint flex items-center justify-center"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </motion.div>
              <span className="text-[13px] font-semibold text-accent-deep tracking-wide uppercase font-mono">Raw Draft</span>
              {unsupportedClaims.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={springBouncy}
                  className="badge-fail mono-metric px-1.5 py-0.5 rounded-md ml-auto"
                >
                  {unsupportedClaims.length} flagged
                </motion.span>
              )}
            </div>
            <div className="text-[14px] leading-relaxed text-secondary whitespace-pre-wrap font-sans">
              {highlightFlaggedClaims(draftAnswer, unsupportedClaims)}
            </div>
            {unsupportedClaims.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-3 pt-3 border-t border-separator"
              >
                <div className="flex items-center gap-2 text-[11px] text-muted font-mono">
                  <span className="inline-block w-3 h-3 rounded bg-[var(--danger-border-faint)] border border-[var(--danger-border)]" />
                  <span>Flagged claim — not supported by source documents</span>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* RIGHT: Verified Answer */}
          <motion.div
            initial={{ opacity: 0, x: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{ ...spring, delay: 0.06 }}
            className="glass-strong relative overflow-hidden rounded-2xl p-5 border border-[var(--success-border-faint)]"
          >
            <GlowingEffect spread={36} glow proximity={60} inactiveZone={0.01} />
            <div className="flex items-center gap-2 mb-3">
              <motion.div
                whileHover={{ rotate: 5 }}
                className="w-6 h-6 rounded-lg bg-success-soft flex items-center justify-center"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </motion.div>
              <span className="text-[13px] font-semibold text-success tracking-wide uppercase font-mono">Verified Answer</span>
              {supportedClaims.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...springBouncy, delay: 0.08 }}
                  className="badge-pass mono-metric px-1.5 py-0.5 rounded-md ml-auto"
                >
                  {supportedClaims.length} verified
                </motion.span>
              )}
            </div>
            <div className="text-[14px] leading-relaxed text-secondary whitespace-pre-wrap font-sans">
              {renderWithCitations(verifiedAnswer)}
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mt-3 pt-3 border-t border-separator"
            >
              <div className="flex items-center gap-2 text-[11px] text-muted font-mono">
                <span className="inline-block w-3 h-3 rounded bg-[var(--success-border-faint)] border border-[var(--success-border)]" />
                <span>Every claim backed by source text</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* Verdict summary */}
      {verification?.verdicts?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ ...spring, delay: 0.15 }}
          className="glass relative overflow-hidden rounded-2xl p-4 mt-4"
        >
          <GlowingEffect spread={32} proximity={56} inactiveZone={0.02} />
          <span className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2.5 block font-mono">
            Per-Claim Verdicts
          </span>
          <div className="space-y-1.5">
            {verification.verdicts.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8, filter: "blur(3px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                transition={{ ...springReveal, delay: i * 0.03 }}
                className={`flex items-start gap-2.5 rounded-lg px-3 py-2 ${
                  v.supported
                    ? "bg-success-faintest"
                    : "bg-danger-faintest"
                }`}
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...springBouncy, delay: i * 0.03 }}
                  className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    v.supported
                      ? "bg-success-soft text-success"
                      : "bg-danger-soft text-danger"
                  }`}
                >
                  {v.supported ? "✓" : "✗"}
                </motion.span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] leading-relaxed font-mono ${
                    v.supported ? "text-dim" : "text-danger"
                  }`}>
                    {v.claim}
                  </p>
                  {v.explanation && (
                    <p className="text-[11px] text-muted mt-0.5 italic font-mono leading-relaxed">
                      {v.explanation}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
