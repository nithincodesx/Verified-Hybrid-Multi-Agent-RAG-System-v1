/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Fira Code", "Consolas", "monospace"],
      },
      colors: {
        glass: {
          light: "rgba(255, 255, 255, 0.04)",
          medium: "rgba(255, 255, 255, 0.08)",
          heavy: "rgba(255, 255, 255, 0.12)",
          border: "rgba(255, 255, 255, 0.06)",
          "border-hover": "rgba(255, 255, 255, 0.1)",
        },
        surface: {
          DEFAULT: "#07080d",
          dark: "#030408",
          elevated: "#0b0d16",
        },
        accent: {
          DEFAULT: "#1AE210",
          dim: "#6C9964",
          deep: "#275223",
          glow: "rgba(26, 226, 16, 0.15)",
        },
      },
      backdropBlur: {
        glass: "32px",
        "glass-heavy": "48px",
        "glass-light": "20px",
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
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        fadeSlideDown: {
          "0%": { opacity: "0", transform: "translateY(-20px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "0.7" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(26, 226, 16, 0.03)" },
          "50%": { boxShadow: "0 0 40px rgba(26, 226, 16, 0.08)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
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
          "0%": { opacity: "0", transform: "scale(0.92)" },
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
