import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlowingEffect from "./GlowingEffect";

const spring = { type: "spring", stiffness: 240, damping: 24, mass: 0.85 };
const springReveal = { type: "spring", stiffness: 160, damping: 26, mass: 1 };

export default function TraceLog({ data }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ ...spring, delay: 0.5 }}
      className="glass relative overflow-hidden rounded-2xl p-4"
    >
      <GlowingEffect spread={34} glow proximity={56} inactiveZone={0.01} />
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ x: 2 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="flex items-center gap-2 w-full text-left group"
      >
        <motion.svg
          animate={{ rotate: open ? 90 : 0 }}
          transition={spring}
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </motion.svg>
        <span className="mono-metric font-semibold text-muted uppercase tracking-wider">
          Pipeline Trace Log
        </span>
        {data.pipeline_latency_ms != null && (
          <span className="mono-metric text-dim ml-auto">
            {(data.pipeline_latency_ms / 1000).toFixed(2)}s total
          </span>
        )}
        <motion.span
          animate={{ opacity: open ? 0.4 : 1 }}
          className="text-[10px] text-muted font-mono ml-1"
        >
          {open ? "collapse" : "expand"}
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0, filter: "blur(6px)" }}
            animate={{ height: "auto", opacity: 1, filter: "blur(0px)" }}
            exit={{ height: 0, opacity: 0, filter: "blur(6px)" }}
            transition={springReveal}
            className="overflow-hidden"
          >
            <pre className="mt-3 p-4 rounded-xl bg-code border border-code-border overflow-hidden">
              <code className="block text-[11px] leading-relaxed mono-code text-muted whitespace-pre-wrap overflow-x-auto max-h-[380px] overflow-y-auto">
                {JSON.stringify(data, null, 2)}
              </code>
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
