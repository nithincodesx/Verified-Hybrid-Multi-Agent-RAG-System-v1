import { cn } from "@/lib/utils";
import { ChevronRight, FileText, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useId, useState } from "react";

const SPRING_DEFAULT = {
  bounce: 0.1,
  duration: 0.25,
  type: "spring",
};
const EASE_OUT = [0.23, 1, 0.32, 1];
const STACK_LIMIT = 4;
const STACK_OVERLAP_PX = 8;
const FAN_GAP_PX = 4;
const ROW_STAGGER = 0.035;

const Favicon = ({ size = 20, source }) => (
  <span
    className="flex items-center justify-center overflow-hidden rounded-full border border-white/20 bg-indigo-950/80 text-pink-300 shadow-sm"
    style={{ height: size, width: size }}
  >
    {source.favicon ? (
      <span className="flex size-full items-center justify-center">
        {source.favicon}
      </span>
    ) : (
      <FileText size={size * 0.6} className="text-cyan-400" />
    )}
  </span>
);

const AISources = ({
  className,
  defaultOpen = false,
  label = "Verified Sources",
  sources = [],
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isHovered, setIsHovered] = useState(false);
  const layoutPrefix = useId();

  if (!sources || sources.length === 0) return null;

  const stacked = sources.slice(0, STACK_LIMIT);
  const overflow = sources.length - stacked.length;
  const fanned = isHovered && !isOpen && !shouldReduceMotion;

  return (
    <div className={cn("w-full", className)}>
      <button
        aria-expanded={isOpen}
        className="flex cursor-pointer items-center gap-2.5 rounded-full px-3 py-1.5 text-slate-300 text-xs transition-all hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md shadow-sm"
        onBlur={() => setIsHovered(false)}
        onClick={() => setIsOpen((current) => !current)}
        onFocus={() => setIsHovered(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        type="button"
      >
        <span className="flex items-center">
          {stacked.map((source, index) => (
            <motion.span
              animate={{
                marginLeft:
                  index === 0 ? 0 : fanned ? FAN_GAP_PX : -STACK_OVERLAP_PX,
              }}
              className="relative block"
              key={source.id || index}
              layoutId={isOpen ? undefined : `${layoutPrefix}-${source.id || index}`}
              style={{ zIndex: stacked.length - index }}
              transition={shouldReduceMotion ? { duration: 0 } : SPRING_DEFAULT}
            >
              <Favicon size={20} source={source} />
            </motion.span>
          ))}
          {overflow > 0 && (
            <span className="ml-1.5 font-mono text-[10px] text-pink-400 font-bold">
              +{overflow}
            </span>
          )}
        </span>

        <span className="font-medium tracking-tight flex items-center gap-1.5">
          <span>{label}</span>
          <span className="text-[10px] font-mono text-slate-400">({sources.length})</span>
        </span>

        <motion.span
          animate={{ rotate: isOpen ? 90 : 0 }}
          className="flex size-4 items-center justify-center text-slate-400"
          transition={shouldReduceMotion ? { duration: 0 } : SPRING_DEFAULT}
        >
          <ChevronRight size={14} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.ul
            animate={{ height: "auto", opacity: 1 }}
            className="mt-3 list-none overflow-hidden space-y-2 rounded-2xl bg-white/[0.03] border border-white/10 p-3 backdrop-blur-xl"
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
            {sources.map((source, index) => (
              <motion.li
                animate={{ opacity: 1, y: 0 }}
                initial={
                  shouldReduceMotion
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 4 }
                }
                key={source.id || index}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { ...SPRING_DEFAULT, delay: index * ROW_STAGGER }
                }
              >
                <div className="flex items-start gap-3 rounded-xl p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 transition">
                  <motion.span
                    className="mt-0.5 block shrink-0"
                    layoutId={`${layoutPrefix}-${source.id || index}`}
                    transition={
                      shouldReduceMotion ? { duration: 0 } : SPRING_DEFAULT
                    }
                  >
                    <Favicon size={22} source={source} />
                  </motion.span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="block truncate font-semibold text-slate-200 text-xs">
                        {source.title || `Source ${index + 1}`}
                      </span>
                      {source.score != null && (
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {(source.score * 100).toFixed(0)}% match
                        </span>
                      )}
                    </div>
                    {source.snippet && (
                      <p className="mt-1 text-slate-400 text-[11px] leading-relaxed line-clamp-2 font-mono">
                        {source.snippet}
                      </p>
                    )}
                  </div>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default AISources;
