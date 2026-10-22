/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Newsreader", "Georgia", "serif"],
        mono: ["JetBrains Mono", "SF Mono", "Fira Code", "Consolas", "monospace"],
      },
      colors: {
        glass: {
          light: "var(--bg-card-light)",
          medium: "var(--bg-card-medium)",
          heavy: "var(--bg-card-strong)",
          border: "var(--border-glass)",
          "border-hover": "var(--border-glass-strong)",
        },
        surface: {
          DEFAULT: "var(--bg-body)",
          dark: "var(--bg-canvas)",
          elevated: "var(--bg-elevated)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          dim: "var(--accent-dim)",
          deep: "var(--accent-deep)",
          glow: "var(--accent-glow)",
          soft: "var(--accent-soft)",
          "soft-xs": "var(--accent-soft-xs)",
          "soft-lg": "var(--accent-soft-lg)",
          strong: "var(--accent-strong)",
          border: "var(--accent-border)",
          "border-soft": "var(--accent-border-soft)",
          "border-focus": "var(--accent-border-focus)",
          ring: "var(--accent-ring)",
          "ring-hover": "var(--accent-ring-hover)",
        },
        success: {
          DEFAULT: "var(--success)",
          dim: "var(--success-dim)",
          soft: "var(--success-soft)",
          faint: "var(--success-faint)",
          glow: "var(--success-glow)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          dim: "var(--danger-dim)",
          soft: "var(--danger-soft)",
          faint: "var(--danger-faint)",
          glow: "var(--danger-glow)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          dim: "var(--warning-dim)",
          soft: "var(--warning-soft)",
          faint: "var(--warning-faint)",
          border: "var(--warning-border)",
          glow: "var(--warning-glow)",
        },
        violet: {
          DEFAULT: "var(--violet)",
          dim: "var(--violet-dim)",
          soft: "var(--violet-soft)",
          faint: "var(--violet-faint)",
          border: "var(--violet-border)",
        },
        provider: {
          openai: "var(--provider-openai)",
          openrouter: "var(--provider-openrouter)",
          ollama: "var(--provider-ollama)",
        },
        overlay: {
          1: "var(--overlay-1)",
          2: "var(--overlay-2)",
          3: "var(--overlay-3)",
          4: "var(--overlay-4)",
          border: "var(--overlay-border)",
          "border-soft": "var(--overlay-border-soft)",
        },
        code: {
          DEFAULT: "var(--bg-code)",
          border: "var(--border-code)",
        },
        "on-accent": "var(--on-accent)",
      },
      backdropBlur: {
        glass: "20px",
        "glass-heavy": "28px",
        "glass-light": "16px",
      },
      animation: {
        "fade-slide-up": "fadeSlideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "fade-slide-down": "fadeSlideDown 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2.5s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "orbit": "orbit 12s linear infinite",
        "shimmer": "shimmer 3s ease-in-out infinite",
        "scale-in": "scaleIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "rotate-glow": "rotateGlow 8s linear infinite",
      },
      keyframes: {
        fadeSlideUp: {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.99)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        fadeSlideDown: {
          "0%": { opacity: "0", transform: "translateY(-12px) scale(0.99)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "0.6" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 10px var(--glow-accent)" },
          "50%": { boxShadow: "0 0 18px var(--accent-soft-xs)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        orbit: {
          "0%": { transform: "rotate(0deg) translateX(8px) rotate(0deg)" },
          "100%": { transform: "rotate(360deg) translateX(8px) rotate(-360deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        rotateGlow: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
    },
  },
  plugins: [],
};
