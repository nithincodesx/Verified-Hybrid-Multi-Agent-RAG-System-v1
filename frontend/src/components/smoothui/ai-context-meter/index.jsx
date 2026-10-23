import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

const SPRING_DEFAULT = {
  bounce: 0.1,
  duration: 0.25,
  type: "spring",
};
const EASE_OUT = [0.23, 1, 0.32, 1];
const VIEWBOX = 32;
const CENTER = VIEWBOX / 2;
const RADIUS = 13;
const STROKE_WIDTH = 3;
const DEFAULT_WARNING_AT = 0.8;
const DEFAULT_DANGER_AT = 0.95;
const WARNING_COLOR = "#F59E0B";
const DANGER_COLOR = "#EF4444";
const NORMAL_COLOR = "#38BDF8";

const COMPACT_THRESHOLD = 1000;
const MILLION = 1_000_000;
const DECIMAL_BELOW = 10 * COMPACT_THRESHOLD;

const formatTokens = (tokens) => {
  if (tokens >= MILLION) {
    return `${(tokens / MILLION).toFixed(1)}M`;
  }
  if (tokens >= DECIMAL_BELOW) {
    return `${Math.round(tokens / COMPACT_THRESHOLD)}k`;
  }
  if (tokens >= COMPACT_THRESHOLD) {
    return `${(tokens / COMPACT_THRESHOLD).toFixed(1)}k`;
  }
  return String(tokens);
};

const AIContextMeter = ({
  breakdown = [
    { label: "System & Verifier Prompt", tokens: 1200 },
    { label: "Ground-Truth Chunks", tokens: 2850 },
    { label: "User Query & History", tokens: 420 },
    { label: "Output Allocation", tokens: 1530 },
  ],
  className,
  dangerAt = DEFAULT_DANGER_AT,
  limit = 16384,
  used = 6000,
  warningAt = DEFAULT_WARNING_AT,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);

  const fraction = limit > 0 ? Math.min(1, Math.max(0, used / limit)) : 0;
  const percent = Math.round(fraction * 100);

  const color = (() => {
    if (fraction >= dangerAt) return DANGER_COLOR;
    if (fraction >= warningAt) return WARNING_COLOR;
    return NORMAL_COLOR;
  })();

  const hasBreakdown = Boolean(breakdown?.length);

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        aria-expanded={hasBreakdown ? isOpen : undefined}
        aria-label={`Context window ${percent}% used, ${formatTokens(used)} of ${formatTokens(limit)} tokens`}
        className="flex cursor-pointer items-center gap-2 rounded-full px-2.5 py-1 text-slate-300 text-xs transition-all bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md shadow-sm"
        onBlur={() => setIsOpen(false)}
        onClick={() => setIsOpen((current) => !current)}
        onFocus={() => hasBreakdown && setIsOpen(true)}
        onMouseEnter={() => hasBreakdown && setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="size-4 -rotate-90 shrink-0"
          viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        >
          <circle
            cx={CENTER}
            cy={CENTER}
            fill="none"
            r={RADIUS}
            stroke="currentColor"
            strokeOpacity={0.2}
            strokeWidth={STROKE_WIDTH}
          />
          <motion.circle
            animate={{
              stroke: color,
              strokeDasharray: `${fraction} ${1 - fraction}`,
            }}
            cx={CENTER}
            cy={CENTER}
            fill="none"
            pathLength={1}
            r={RADIUS}
            strokeLinecap="round"
            strokeWidth={STROKE_WIDTH}
            transition={shouldReduceMotion ? { duration: 0 } : SPRING_DEFAULT}
          />
        </svg>

        <span className="tabular-nums font-mono text-[11px] text-slate-300">
          {formatTokens(used)}/{formatTokens(limit)}
        </span>
        <span className="text-[10px] text-slate-400 font-mono">({percent}%)</span>
      </button>

      <AnimatePresence>
        {isOpen && hasBreakdown ? (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-2xl border border-white/15 bg-[#12131a]/95 backdrop-blur-2xl p-3 shadow-2xl"
            exit={
              shouldReduceMotion
                ? { opacity: 0, transition: { duration: 0 } }
                : { opacity: 0, scale: 0.96, y: 4 }
            }
            initial={
              shouldReduceMotion
                ? { opacity: 1, scale: 1, y: 0 }
                : { opacity: 0, scale: 0.96, y: 4 }
            }
            style={{ transformOrigin: "bottom left" }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.18, ease: EASE_OUT }
            }
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Context Window</span>
              <span className="text-[11px] font-bold text-emerald-400 font-mono">{percent}% utilized</span>
            </div>
            <ul className="list-none space-y-1.5">
              {breakdown?.map((item) => (
                <li
                  className="flex items-baseline justify-between gap-3 text-xs"
                  key={item.label}
                >
                  <span className="truncate text-slate-400">
                    {item.label}
                  </span>
                  <span className="shrink-0 text-slate-200 tabular-nums font-mono text-[11px]">
                    {formatTokens(item.tokens)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>Token Budget: {formatTokens(limit)}</span>
              <span>Available: {formatTokens(Math.max(0, limit - used))}</span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default AIContextMeter;
