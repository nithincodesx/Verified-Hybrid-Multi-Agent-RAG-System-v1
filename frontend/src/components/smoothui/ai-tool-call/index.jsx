import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

const SPRING_DEFAULT = {
  bounce: 0.1,
  duration: 0.25,
  type: "spring",
};
const EASE_OUT = [0.23, 1, 0.32, 1];
const BADGE_VIEWBOX = 24;
const BADGE_CENTER = BADGE_VIEWBOX / 2;
const RING_RADIUS = 8;
const CHECK_PATH = "M 8.5 12.2 L 11 14.8 L 15.8 9.6";
const CROSS_PATHS = ["M 9 9 L 15 15", "M 15 9 L 9 15"];
const SPIN_SECONDS = 0.9;
const PENDING_PULSE_SECONDS = 1.6;

const STATUS_LABEL = {
  error: "Failed",
  pending: "Queued",
  running: "Running",
  success: "Done",
};

const AIToolCallBadge = ({
  status,
  shouldReduceMotion,
}) => {
  const isRunning = status === "running";
  const isPending = status === "pending";

  const ringColor = (() => {
    if (status === "success") return "#10B981";
    if (status === "error") return "#EF4444";
    if (status === "running") return "#38BDF8";
    return "#94A3B8";
  })();

  return (
    <span className="relative flex size-5 shrink-0 items-center justify-center text-slate-400">
      <svg
        aria-hidden="true"
        className="size-5 overflow-visible"
        viewBox={`0 0 ${BADGE_VIEWBOX} ${BADGE_VIEWBOX}`}
      >
        <motion.g
          animate={
            shouldReduceMotion || !isRunning ? undefined : { rotate: 360 }
          }
          style={{ transformBox: "view-box", transformOrigin: "center" }}
          transition={{
            duration: SPIN_SECONDS,
            ease: "linear",
            repeat: Number.POSITIVE_INFINITY,
          }}
        >
          <motion.circle
            animate={{
              stroke: ringColor,
              strokeDasharray: isRunning ? "0.68 0.32" : "1 0",
              strokeOpacity:
                isPending && !shouldReduceMotion ? [0.35, 1, 0.35] : 1,
            }}
            cx={BADGE_CENTER}
            cy={BADGE_CENTER}
            fill="none"
            pathLength={1}
            r={RING_RADIUS}
            strokeLinecap="round"
            strokeWidth={2}
            transition={{
              stroke: shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.25, ease: EASE_OUT },
              strokeDasharray: shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.25, ease: EASE_OUT },
              strokeOpacity: shouldReduceMotion
                ? { duration: 0 }
                : {
                    duration: PENDING_PULSE_SECONDS,
                    repeat: Number.POSITIVE_INFINITY,
                  },
            }}
          />
        </motion.g>

        <AnimatePresence initial={false}>
          {status === "success" && (
            <motion.path
              animate={{ opacity: 1, pathLength: 1 }}
              d={CHECK_PATH}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              fill="none"
              initial={
                shouldReduceMotion
                  ? { opacity: 1, pathLength: 1 }
                  : { opacity: 1, pathLength: 0 }
              }
              key="check"
              stroke={ringColor}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.2}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: 0.22, ease: EASE_OUT }
              }
            />
          )}
          {status === "error" &&
            CROSS_PATHS.map((path, index) => (
              <motion.path
                animate={{ opacity: 1, pathLength: 1 }}
                d={path}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                fill="none"
                initial={
                  shouldReduceMotion
                    ? { opacity: 1, pathLength: 1 }
                    : { opacity: 1, pathLength: 0 }
                }
                key={path}
                stroke={ringColor}
                strokeLinecap="round"
                strokeWidth={2.2}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { delay: index * 0.06, duration: 0.16, ease: EASE_OUT }
                }
              />
            ))}
        </AnimatePresence>
      </svg>
    </span>
  );
};

const AIToolCall = ({
  args,
  className,
  defaultOpen = false,
  name,
  result,
  status = "pending",
  summary,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasDetail = Boolean(args || result);

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl transition hover:border-white/20",
        className
      )}
    >
      <button
        aria-expanded={hasDetail ? isOpen : undefined}
        className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left"
        disabled={!hasDetail}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <AIToolCallBadge
          shouldReduceMotion={Boolean(shouldReduceMotion)}
          status={status}
        />

        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-xs font-semibold text-slate-200">
            {name}
          </span>
        </span>

        {summary ? (
          <span className="shrink-0 text-slate-400 font-mono text-[11px] bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
            {summary}
          </span>
        ) : null}
        <span className="sr-only">{STATUS_LABEL[status]}</span>

        {hasDetail && (
          <motion.span
            animate={{ rotate: isOpen ? 90 : 0 }}
            className="flex size-4 shrink-0 items-center justify-center text-slate-400"
            transition={shouldReduceMotion ? { duration: 0 } : SPRING_DEFAULT}
          >
            <ChevronRight size={14} />
          </motion.span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && hasDetail ? (
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
            <div className="space-y-2 border-t border-white/10 px-3 py-2.5 text-xs bg-black/20">
              {args ? (
                <div>
                  <p className="mb-1 text-[10px] text-slate-500 uppercase tracking-wide font-mono">
                    Parameters
                  </p>
                  <div className="overflow-x-auto font-mono text-slate-300 text-[11px] bg-white/5 p-2 rounded-xl">
                    {args}
                  </div>
                </div>
              ) : null}
              {result ? (
                <div>
                  <p className="mb-1 text-[10px] text-slate-500 uppercase tracking-wide font-mono">
                    Returned Evidence
                  </p>
                  <div className="overflow-x-auto text-slate-300 text-[11px] bg-white/5 p-2 rounded-xl">
                    {result}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default AIToolCall;
