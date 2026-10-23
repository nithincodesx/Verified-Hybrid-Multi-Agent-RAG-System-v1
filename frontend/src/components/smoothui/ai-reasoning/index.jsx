import { cn } from "@/lib/utils";
import { ChevronRight, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const SPRING_DEFAULT = {
  bounce: 0.1,
  duration: 0.25,
  type: "spring",
};
const EASE_OUT = [0.23, 1, 0.32, 1];
const AUTO_COLLAPSE_DELAY_MS = 600;
const MS_PER_SECOND = 1000;
const SHIMMER_SECONDS = 1.8;

const AIReasoning = ({
  children,
  className,
  collapseWhenDone = true,
  defaultOpen,
  duration,
  isStreaming = false,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(defaultOpen ?? isStreaming);
  const [isUserControlled, setIsUserControlled] = useState(false);

  const startedAtRef = useRef(null);
  const [measuredSeconds, setMeasuredSeconds] = useState(null);

  useEffect(() => {
    if (isStreaming) {
      startedAtRef.current = Date.now();
      setMeasuredSeconds(null);
      if (!isUserControlled) {
        setIsOpen(true);
      }
      return;
    }
    if (startedAtRef.current !== null) {
      setMeasuredSeconds((Date.now() - startedAtRef.current) / MS_PER_SECOND);
      startedAtRef.current = null;
    }
  }, [isStreaming, isUserControlled]);

  useEffect(() => {
    if (isStreaming || !collapseWhenDone || isUserControlled) {
      return;
    }
    const timeout = setTimeout(() => setIsOpen(false), AUTO_COLLAPSE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [collapseWhenDone, isStreaming, isUserControlled]);

  const seconds = duration ?? measuredSeconds;
  const summary = (() => {
    if (isStreaming) {
      return "Thinking & Verifying...";
    }
    if (seconds !== null) {
      return `Thought for ${seconds.toFixed(1)}s`;
    }
    return "Verification & Reasoning Trace";
  })();

  return (
    <div className={cn("w-full overflow-hidden rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-3 shadow-sm", className)}>
      <button
        aria-expanded={isOpen}
        className="group flex w-full cursor-pointer items-center justify-between gap-2 text-left text-xs transition-colors hover:text-white"
        onClick={() => {
          setIsUserControlled(true);
          setIsOpen((current) => !current);
        }}
        type="button"
      >
        <div className="flex items-center gap-2">
          <motion.span
            animate={{ rotate: isOpen ? 90 : 0 }}
            className="flex size-4 items-center justify-center text-slate-400 group-hover:text-white"
            transition={shouldReduceMotion ? { duration: 0 } : SPRING_DEFAULT}
          >
            <ChevronRight size={14} />
          </motion.span>

          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            {isStreaming && !shouldReduceMotion ? (
              <span
                className="bg-[length:200%_100%] bg-clip-text text-transparent font-semibold"
                style={{
                  animation: `ai-reasoning-shimmer ${SHIMMER_SECONDS}s linear infinite`,
                  backgroundImage:
                    "linear-gradient(90deg, #ec4899 0%, #a855f7 35%, #38bdf8 50%, #ec4899 65%, #a855f7 100%)",
                }}
              >
                {summary}
              </span>
            ) : (
              <span className="text-slate-300 group-hover:text-white font-medium">{summary}</span>
            )}
          </span>
        </div>

        {seconds !== null && !isStreaming && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
            {seconds.toFixed(1)}s
          </span>
        )}
      </button>

      <style>{`
        @keyframes ai-reasoning-shimmer {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }
      `}</style>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={
              shouldReduceMotion
                ? { opacity: 0, transition: { duration: 0 } }
                : { height: 0, opacity: 0 }
            }
            initial={
              shouldReduceMotion
                ? { height: "auto", opacity: 1 }
                : { height: 0, opacity: 0 }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    height: SPRING_DEFAULT,
                    opacity: { duration: 0.18, ease: EASE_OUT },
                  }
            }
          >
            <div className="mt-3 border-l-2 border-pink-500/30 pl-3.5 text-xs text-slate-300 leading-relaxed font-sans space-y-1">
              {children}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default AIReasoning;
