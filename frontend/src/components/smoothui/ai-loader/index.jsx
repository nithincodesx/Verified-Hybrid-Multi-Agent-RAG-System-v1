import { cn } from "@/lib/utils";
import { motion, useAnimationFrame, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";

export const AI_LOADER_CYCLE_SECONDS = 1.2;

const DOT_COUNT = 3;
const GRID_SIZE = 3;
const GRID_CELLS = GRID_SIZE * GRID_SIZE;
const GRID_DELAYS = [0, 1, 2, 1, 2, 3, 2, 3, 4];
const EASE_IN_OUT = [0.645, 0.045, 0.355, 1];
const MS_PER_SECOND = 1000;
const ELAPSED_DECIMALS = 1;

const Dots = ({ reduced }) => (
  <span className="flex items-center gap-1.5">
    {Array.from({ length: DOT_COUNT }, (_, index) => (
      <motion.span
        animate={reduced ? { opacity: 0.5 } : { opacity: [0.25, 1, 0.25], scale: [0.85, 1.15, 0.85] }}
        className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-indigo-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]"
        key={index}
        transition={
          reduced
            ? { duration: 0 }
            : {
                delay: (index * AI_LOADER_CYCLE_SECONDS) / (DOT_COUNT * 2),
                duration: AI_LOADER_CYCLE_SECONDS,
                ease: EASE_IN_OUT,
                repeat: Number.POSITIVE_INFINITY,
              }
        }
      />
    ))}
  </span>
);

const Bar = ({ reduced }) => (
  <span className="relative block h-1.5 w-28 overflow-hidden rounded-full bg-white/10 border border-white/10 shadow-inner">
    <motion.span
      animate={reduced ? { x: "0%" } : { x: ["-100%", "200%"] }}
      className="absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-pink-500 via-indigo-400 to-cyan-400 shadow-[0_0_12px_rgba(236,72,153,0.8)]"
      transition={
        reduced
          ? { duration: 0 }
          : {
              duration: AI_LOADER_CYCLE_SECONDS * 1.4,
              ease: EASE_IN_OUT,
              repeat: Number.POSITIVE_INFINITY,
            }
      }
    />
  </span>
);

const Grid = ({ reduced }) => (
  <span className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
    {Array.from({ length: GRID_CELLS }, (_, index) => (
      <motion.span
        animate={reduced ? { opacity: 0.45 } : { opacity: [0.2, 1, 0.2], scale: [0.85, 1.1, 0.85] }}
        className="w-1.5 h-1.5 rounded-[2px] bg-gradient-to-tr from-pink-400 to-indigo-400"
        key={index}
        transition={
          reduced
            ? { duration: 0 }
            : {
                delay:
                  ((GRID_DELAYS[index] ?? 0) * AI_LOADER_CYCLE_SECONDS) / 8,
                duration: AI_LOADER_CYCLE_SECONDS,
                ease: EASE_IN_OUT,
                repeat: Number.POSITIVE_INFINITY,
              }
        }
      />
    ))}
  </span>
);

const Elapsed = () => {
  const startRef = useRef(null);
  const [seconds, setSeconds] = useState(0);

  useAnimationFrame((time) => {
    const start = startRef.current ?? time;
    startRef.current = start;
    const next = (time - start) / MS_PER_SECOND;
    setSeconds((current) =>
      next.toFixed(ELAPSED_DECIMALS) === current.toFixed(ELAPSED_DECIMALS)
        ? current
        : next
    );
  });

  return (
    <span className="tabular-nums font-mono text-[11px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-slate-300">
      {seconds.toFixed(ELAPSED_DECIMALS)}s
    </span>
  );
};

const AILoader = ({
  className,
  label,
  showElapsed = false,
  variant = "dots",
}) => {
  const reduced = Boolean(useReducedMotion());

  return (
    <span
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2.5 text-xs text-slate-300 backdrop-blur-md px-3 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-sm",
        className
      )}
      role="status"
    >
      {label ? <span className="font-medium tracking-tight">{label}</span> : null}
      {variant === "dots" && <Dots reduced={reduced} />}
      {variant === "bar" && <Bar reduced={reduced} />}
      {variant === "grid" && <Grid reduced={reduced} />}
      {showElapsed ? <Elapsed /> : null}
      <span className="sr-only">{label ?? "Loading"}</span>
    </span>
  );
};

export default AILoader;
