import { memo, useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";

/* ── Spring presets ─────────────────────────────────────────────── */
const EASE = [0.22, 1, 0.36, 1];

/**
 * Build a rounded-rectangle SVG path that traces a container's border.
 * Mirrors the path used by Aceternity's GlowingEffect.
 */
function createPath({ width, height, borderRadius }) {
  const r = Math.min(borderRadius, width / 2, height / 2);
  return [
    `M ${r} 0`,
    `L ${width - r} 0`,
    `Q ${width} 0 ${width} ${r}`,
    `L ${width} ${height - r}`,
    `Q ${width} ${height} ${width - r} ${height}`,
    `L ${r} ${height}`,
    `Q 0 ${height} 0 ${height - r}`,
    `L 0 ${r}`,
    `Q 0 0 ${r} 0`,
    "Z",
  ].join(" ");
}

/**
 * GlowingEffect — an animated, pointer-reactive glowing border.
 *
 * Drop it as the first child of any `relative` card:
 *
 *   <div className="glass relative rounded-2xl ...">
 *     <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} />
 *     ...content...
 *   </div>
 *
 * Props mirror Aceternity's glowing-effect.tsx:
 *   - spread: radial glow radius (px) that follows the cursor
 *   - proximity: how far away the cursor can be and still trigger the glow
 *   - inactiveZone: proximity threshold (0..1) below which the glow hides
 *   - glow: render a second, blurred border pass
 *   - blur: blur radius (px) for the glow pass
 *   - borderWidth: stroke width of the crisp border pass
 *   - movementDuration: seconds for the border draw animation
 *   - variant: "default" | "reverse" (mirrored path)
 *   - disabled: fully disable
 *   - className: extra classes for the (absolute inset-0) wrapper
 */
const GlowingEffect = memo(function GlowingEffect({
  blur = 0,
  inactiveZone = 0.7,
  proximity = 64,
  spread = 20,
  variant = "default",
  glow = false,
  className = "",
  disabled = false,
  movementDuration = 2,
  borderWidth = 1,
}) {
  const ref = useRef(null);
  const uid = useId().replace(/[:]/g, "");
  const [path, setPath] = useState("");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [active, setActive] = useState(false);
  const [prox, setProx] = useState(0);
  const activeRef = useRef(false);
  const proxRef = useRef(0);

  /* ── Measure the container (re-measure on any resize) ───────────── */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        if (!w || !h) return;
        setSize({ w, h });
        const radius = Math.min(24, h / 2, w / 2);
        setPath(createPath({ width: w, height: h, borderRadius: radius }));
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* ── Global pointer tracking → proximity + hover state ─────────────
     Throttled to one pass per animation frame; ``setProx`` only fires
     when the value actually moves, so a dozen effects don't re-render
     the whole app on every mousemove. The visual wash is driven
     imperatively via CSS vars, not React state. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e) => {
      if (disabled) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        const maxDist = Math.max(rect.width, rect.height) / 2;
        const ratio = maxDist > 0 ? Math.max(0, Math.min(1, 1 - dist / maxDist)) : 0;
        const inside =
          e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top && e.clientY <= rect.bottom;
        if (Math.abs(proxRef.current - ratio) > 0.02) {
          proxRef.current = ratio;
          setProx(ratio);
        }
        if (inside !== activeRef.current) {
          activeRef.current = inside;
          setActive(inside);
        }
        // Push pointer-relative coords into the radial glow layer
        const g = el.querySelector("[data-glow-layer]");
        if (g) {
          g.style.setProperty("--gx", `${e.clientX - rect.left}px`);
          g.style.setProperty("--gy", `${e.clientY - rect.top}px`);
          g.style.setProperty("--prox", String(ratio));
        }
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [disabled, proximity]);

  const isActive = active && prox >= inactiveZone;
  const pathLength = isActive ? 1 : 0.25;
  const opacity = isActive ? 1 : 0.3;
  const glowBlur = Math.max(blur, glow ? 8 : 0);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`}
      style={{ opacity: disabled ? 0 : 1 }}
    >
      {/* Cursor-following radial glow — deliberately faint so it never
          washes out the card content underneath (content paints above
          this absolute z-0 layer). */}
      <div
        data-glow-layer
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(${spread}px circle at var(--gx, 50%) var(--gy, 50%), color-mix(in srgb, var(--glow-color, #1AE210) 18%, transparent) 0%, transparent 70%)`,
          opacity: "calc(var(--prox, 0) * 0.5)",
          filter: `blur(${blur}px)`,
          mixBlendMode: "screen",
        }}
      />

      {/* Animated border — path drawn in measured pixel coordinates */}
      <motion.svg
        className="absolute inset-0 h-full w-full"
        fill="none"
        style={variant === "reverse" ? { transform: "scaleX(-1)" } : undefined}
      >
        <defs>
          <linearGradient id={`glow-stroke-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {glow && (
          <motion.path
            d={path}
            stroke="currentColor"
            strokeWidth={borderWidth * 3}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: "var(--glow-color, #1AE210)",
              filter: `blur(${glowBlur}px)`,
            }}
            initial={false}
            animate={{ pathLength, opacity: opacity * 0.55 }}
            transition={{ duration: movementDuration, ease: EASE }}
          />
        )}

        <motion.path
          d={path}
          stroke={`url(#glow-stroke-${uid})`}
          strokeWidth={borderWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--glow-color, #1AE210)" }}
          initial={false}
          animate={{ pathLength, opacity }}
          transition={{ duration: movementDuration, ease: EASE }}
        />
      </motion.svg>
    </div>
  );
});

export default GlowingEffect;
