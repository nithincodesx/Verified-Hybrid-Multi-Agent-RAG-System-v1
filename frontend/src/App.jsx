import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QueryInput from "./components/QueryInput";
import PipelineView from "./components/PipelineView";
import PipelineProgress from "./components/PipelineProgress";
import DocumentUpload from "./components/DocumentUpload";
import DocumentDashboard from "./components/DocumentDashboard";
import ThemeToggle from "./components/ThemeToggle";
import ProviderSettings from "./components/ProviderSettings";
import GlowingEffect from "./components/GlowingEffect";
import HowItWorks from "./components/HowItWorks";
import PipelineWorkflow from "./components/PipelineWorkflow";
import { runPipeline, getProviderSettings, streamPipeline } from "./api";

/* ═══════════════════════════════════════════════════════════════════
   SPRING PHYSICS PRESETS
   ═══════════════════════════════════════════════════════════════════ */
const springFloat = { type: "spring", stiffness: 180, damping: 26, mass: 0.9 };
const springBouncy = { type: "spring", stiffness: 420, damping: 12, mass: 0.5 };
const springSnappy = { type: "spring", stiffness: 600, damping: 28, mass: 0.6 };
const springReveal = { type: "spring", stiffness: 240, damping: 24, mass: 0.85 };
const springLiquid = { type: "spring", stiffness: 160, damping: 28, mass: 1.1 };

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
};

const slideUpBlur = (delay = 0) => ({
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { ...springFloat, delay },
  },
});

/* ── Provider metadata ──────────────────────────────────────────── */
const PROVIDER_META = {
  openai: { label: "OpenAI", color: "var(--provider-openai)" },
  openrouter: { label: "OpenRouter", color: "var(--provider-openrouter)" },
  ollama: { label: "Ollama", color: "var(--provider-ollama)" },
};

/* ── Blue accent constants ──────────────────────────────────────── */
const NEON = "var(--accent)";
const NEON_DIM = "var(--accent-dim)";
const NEON_FAINT = "var(--accent-soft-xs)";
const NEON_GLOW = "var(--accent-soft)";

/* ── Navigation sections ────────────────────────────────────────── */
const SECTIONS = [
  { id: "how-it-works", label: "How It Works" },
  { id: "pipeline",      label: "Pipeline" },
  { id: "documents",     label: "Documents" },
];

/* ═══════════════════════════════════════════════════════════════════
   APP
   ═══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [activeSection, setActiveSection] = useState("pipeline");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [dashRefresh, setDashRefresh] = useState(0);
  const [filterSource, setFilterSource] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [provider, setProvider] = useState("ollama");
  const [enableQueryExpansion, setEnableQueryExpansion] = useState(false);
  const [queryExpansionStrategy, setQueryExpansionStrategy] = useState("llm");
  const [enableReranking, setEnableReranking] = useState(false);
  const [theme, setTheme] = useState(() => {
    return typeof window !== "undefined"
      ? localStorage.getItem("rag-theme") || "light"
      : "light";
  });
  const abortRef = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("rag-theme", theme);
  }, [theme]);

  useEffect(() => {
    getProviderSettings()
      .then((s) => s?.provider && setProvider(s.provider))
      .catch(() => {});
  }, []);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const handleQuery = async (query, opts = {}) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(null);
    try {
      const data = await streamPipeline(query, {
        filterSource: opts.filterSource || filterSource || undefined,
        enableQueryExpansion: opts.enableQueryExpansion ?? enableQueryExpansion,
        queryExpansionStrategy: opts.queryExpansionStrategy ?? queryExpansionStrategy,
        enableReranking: opts.enableReranking ?? enableReranking,
        signal: controller.signal,
        onStage: (evt) => {
          setProgress((prev) => ({ ...(prev ?? {}), [evt.stage]: evt }));
        },
      });
      setResult(data);
      if (data.error) setError(data.error);
    } catch (err) {
      if (err?.name === "AbortError") return; // cancelled — stay quiet
      // SSE stream unavailable (proxy / network) — fall back to blocking call
      if (String(err?.message ?? "").includes("Pipeline stream")) {
        try {
          const data = await runPipeline(query, {
            filterSource: opts.filterSource || filterSource || undefined,
            enableQueryExpansion: opts.enableQueryExpansion ?? enableQueryExpansion,
            queryExpansionStrategy: opts.queryExpansionStrategy ?? queryExpansionStrategy,
            enableReranking: opts.enableReranking ?? enableReranking,
          });
          setResult(data);
          if (data.error) setError(data.error);
          return;
        } catch (fallbackErr) {
          setError(fallbackErr.message ?? "An unexpected error occurred.");
          return;
        }
      }
      setError(err.message ?? "An unexpected error occurred.");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden selection-accent selection-on-accent">
      {/* ══════════════════════════════════════════════════════════
         AMBIENT BACKGROUND
         ══════════════════════════════════════════════════════════ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-[-22%] left-1/2 -translate-x-1/2 w-[900px] h-[650px] rounded-full"
          style={{ background: "radial-gradient(circle, var(--orb-accent-1) 0%, var(--orb-accent-2) 35%, transparent 65%)", filter: "blur(90px)" }}
        />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, var(--orb-accent-3) 0%, transparent 60%)", filter: "blur(60px)" }}
        />
        <div className="orbital-ring w-[640px] h-[640px] -top-48 -right-48" />
        <div className="orbital-ring w-[420px] h-[420px] -bottom-36 -left-24" />
        <div className="orbital-ring w-[320px] h-[320px] top-1/3 left-1/4" />
        <div className="orbital-ring w-[180px] h-[180px] top-[15%] right-[20%]" />
        <motion.div className="orbital-dot" style={{ top: "12%", left: "78%" }}
          animate={{ y: [0, -4, 0], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="orbital-dot" style={{ top: "68%", left: "12%" }}
          animate={{ y: [0, 4, 0], opacity: [0.2, 0.7, 0.2] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1 }} />
        <motion.div className="orbital-dot" style={{ top: "82%", left: "75%" }}
          animate={{ y: [0, -3, 0], opacity: [0.25, 0.65, 0.25] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }} />
        <motion.div className="orbital-dot" style={{ top: "25%", left: "35%" }}
          animate={{ y: [0, -5, 0], opacity: [0.15, 0.5, 0.15] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} />
      </div>

      {/* ══════════════════════════════════════════════════════════
         TOP-RIGHT CONTROLS
         ══════════════════════════════════════════════════════════ */}
      <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5">
        <motion.button
          onClick={() => setShowSettings(true)}
          initial={{ opacity: 0, scale: 0.8, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          whileHover={{ scale: 1.06, rotate: 45 }}
          whileTap={{ scale: 0.9 }}
          transition={springBouncy}
          className="glass rounded-full p-2 flex items-center gap-2 cursor-pointer glass-glow"
          aria-label="Model provider settings"
          title="Model provider settings"
        >
          <motion.span className="relative flex w-1.5 h-1.5"
            style={{ color: PROVIDER_META[provider]?.color || NEON }}>
            <span className="absolute inset-0 rounded-full"
              style={{ background: PROVIDER_META[provider]?.color || NEON }}
              animate={{ scale: [1, 1.7, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} />
            <span className="relative inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: PROVIDER_META[provider]?.color || NEON }} />
          </motion.span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </motion.button>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      {/* ══════════════════════════════════════════════════════════
         MAIN CONTAINER
         ══════════════════════════════════════════════════════════ */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger}
        className="relative z-10 max-w-5xl mx-auto px-4 pt-12 md:pt-20"
      >
        {/* ── HEADER BAR ────────────────────────────────────────── */}
        <motion.header
          variants={slideUpBlur(0)}
          className="flex items-center justify-between mb-6 md:mb-10"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...springFloat, delay: 0.1 }}
            className="flex items-center gap-2.5"
          >
            <div className="relative w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--accent-tint)", border: "1px solid var(--accent-tint-border)" }}>
              <span className="text-[16px] font-black tracking-tight" style={{ color: NEON }}>R</span>
            </div>
            <span className="text-[17px] font-bold text-primary tracking-tight hidden sm:block">
              Verified <span style={{ color: NEON }}>RAG</span>
            </span>
          </motion.div>

          {/* Nav pills — clickable */}
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springFloat, delay: 0.2 }}
            className="hidden md:flex items-center gap-1 glass rounded-full px-1.5 py-1"
          >
            {SECTIONS.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <motion.button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    setResult(null);
                    setError(null);
                  }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  transition={springSnappy}
                  className="px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all duration-300 cursor-pointer relative"
                  style={
                    isActive
                      ? { color: NEON, background: NEON_FAINT }
                      : { color: "var(--text-muted)", background: "transparent" }
                  }
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full"
                      style={{ background: NEON_FAINT, border: `1px solid ${NEON}15` }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{section.label}</span>
                </motion.button>
              );
            })}
          </motion.nav>

          {/* Spacer */}
          <div className="w-[120px] md:w-[160px]" />
        </motion.header>

        {/* ══════════════════════════════════════════════════════════
           SECTION CONTENT — switches based on activeSection
           ══════════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {/* ── HOW IT WORKS SECTION ────────────────────────────── */}
          {activeSection === "how-it-works" && (
            <motion.div
              key="how-it-works"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ ...springFloat, duration: 0.3 }}
            >
              <HowItWorks />

              {/* Advanced workflow */}
              <div className="mt-10">
                <PipelineWorkflow />
              </div>
            </motion.div>
          )}

          {/* ── PIPELINE SECTION (main interactive view) ─────────── */}
          {activeSection === "pipeline" && (
            <motion.div
              key="pipeline"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ ...springFloat, duration: 0.3 }}
              className="w-full max-w-3xl mx-auto"
            >
              {/* ── Hero ──────────────────────────────────────────── */}
              <div className="text-center mb-8">
                {/* Status pill */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...springBouncy, delay: 0.15 }}
                  className="inline-flex items-center gap-2.5 glass relative overflow-hidden rounded-full px-4 py-1.5 mb-6 glass-glow"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <GlowingEffect spread={30} glow proximity={48} inactiveZone={0.02} borderWidth={0.75} />
                  <span className="relative flex w-2 h-2">
                    <motion.span className="absolute inset-0 rounded-full" style={{ background: NEON }}
                      animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} />
                    <span className="relative inline-block w-2 h-2 rounded-full" style={{ background: NEON }} />
                  </span>
                  <span className="text-[10px] font-semibold tracking-[0.12em] uppercase font-mono" style={{ color: NEON }}>
                    Verified RAG System
                  </span>
                  <span className="w-1 h-1 rounded-full bg-overlay-4" />
                  <span className="text-[10px] text-dim font-mono tracking-wide">v2.0</span>
                  <span className="w-1 h-1 rounded-full bg-overlay-4" />
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold font-mono tracking-wide uppercase"
                    style={{ color: PROVIDER_META[provider]?.color || NEON }}>
                    <span className="w-1.5 h-1.5 rounded-full"
                      style={{ background: PROVIDER_META[provider]?.color || NEON, boxShadow: `0 0 8px ${PROVIDER_META[provider]?.color || NEON}60` }} />
                    {PROVIDER_META[provider]?.label || "Ollama"}
                  </span>
                </motion.div>

                {/* Title */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springFloat, delay: 0.2 }}
                  className="text-[2.25rem] md:text-[3.5rem] font-extrabold text-primary tracking-[-0.035em] leading-[1.1] mb-4"
                >
                  Ask with{" "}
                  <span className="text-transparent bg-clip-text"
                    style={{ backgroundImage: `linear-gradient(135deg, ${NEON} 0%, ${NEON_DIM} 50%, ${NEON} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    confidence
                  </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springFloat, delay: 0.3 }}
                  className="text-[15px] text-muted max-w-lg mx-auto leading-relaxed mb-5"
                >
                  Every answer is grounded in your documents and verified against
                  the source material — no hallucinations, no guesswork.
                </motion.p>

                {/* Feature badges — inline below subtitle */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springFloat, delay: 0.45 }}
                  className="flex items-center justify-center gap-3 flex-wrap"
                >
                  <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-mono font-semibold"
                    style={{ color: NEON, background: "var(--accent-tint)", border: "1px solid var(--accent-border-soft)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                    RAG Verified
                  </div>
                  <span className="w-1 h-1 rounded-full hidden sm:block" style={{ background: `${NEON}30` }} />
                  <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-mono font-semibold"
                    style={{ color: NEON, background: "var(--accent-tint)", border: "1px solid var(--accent-border-soft)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Grounded Answers
                  </div>
                </motion.div>
              </div>

              {/* ── Green glowing divider ─────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ ...springFloat, delay: 0.4, duration: 0.8 }}
                className="w-full max-w-xl mx-auto mb-7"
              >
                <div className="h-px w-full rounded-full"
                  style={{ background: `linear-gradient(90deg, transparent 0%, ${NEON}40 30%, ${NEON} 50%, ${NEON}40 70%, transparent 100%)`, boxShadow: `0 0 20px ${NEON_GLOW}, 0 0 60px ${NEON_FAINT}` }} />
              </motion.div>

              {/* ── Category chips ────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springFloat, delay: 0.45 }}
                className="flex items-center justify-center gap-2 mb-5 flex-wrap"
              >
                {[
                  { label: "All Documents", active: !filterSource },
                  { label: "PDFs", filter: ".pdf" },
                  { label: "Markdown", filter: ".md" },
                  { label: "Text Files", filter: ".txt" },
                ].map((chip) => {
                  const isActive = chip.active || filterSource === chip.filter;
                  return (
                    <motion.button
                      key={chip.label}
                      onClick={() => setFilterSource(chip.filter || "")}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      transition={springSnappy}
                      className="rounded-full px-4 py-2 text-[12px] font-semibold font-mono tracking-wide transition-all duration-300"
                      style={
                        isActive
                          ? { color: "var(--on-accent)", background: NEON, boxShadow: `0 0 24px ${NEON_GLOW}, 0 0 8px ${NEON_FAINT}` }
                          : { color: "var(--text-muted)", background: "var(--bg-card)", border: "1px solid var(--border-glass)" }
                      }
                    >
                      {chip.label}
                    </motion.button>
                  );
                })}
              </motion.div>

              {/* ── Upload toggle (centered) ──────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springFloat, delay: 0.48 }}
                className="flex flex-col items-center mb-5"
              >
                <InlineUploadButton dashRefresh={dashRefresh} setDashRefresh={setDashRefresh} />
              </motion.div>

              {/* ── Query Input ───────────────────────────────────── */}
              <QueryInput
                onSubmit={handleQuery}
                loading={loading}
                filterSource={filterSource}
                onFilterSourceChange={setFilterSource}
                enableQueryExpansion={enableQueryExpansion}
                setEnableQueryExpansion={setEnableQueryExpansion}
                queryExpansionStrategy={queryExpansionStrategy}
                setQueryExpansionStrategy={setQueryExpansionStrategy}
                enableReranking={enableReranking}
                setEnableReranking={setEnableReranking}
              />

              {/* ── Loading State ─────────────────────────────────── */}
              <AnimatePresence mode="wait">
                {loading && (
                  <motion.div key="loader"
                    initial={{ opacity: 0, scale: 0.94, filter: "blur(6px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.94, filter: "blur(6px)" }}
                    transition={springFloat}
                    className="mb-6">
                    <PipelineProgress progress={progress ?? {
                      retrieval: { stage: "retrieval", status: "started" },
                    }} />
                    <div className="glass-strong relative overflow-hidden rounded-2xl p-5 flex items-center justify-center gap-4">
                      <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} />
                      <span className="text-[12px] text-muted font-mono">Running pipeline&hellip;</span>
                      <motion.button
                        onClick={handleCancel}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.96 }}
                        transition={springSnappy}
                        className="rounded-lg px-3.5 py-1.5 text-[11px] font-mono text-muted border border-glass hover:text-primary hover:border-danger-focus transition-colors"
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Results ───────────────────────────────────────── */}
              <div ref={resultRef}>
                <AnimatePresence mode="wait">
                  {result && !loading && <PipelineView key="pipeline-result" result={result} />}
                </AnimatePresence>
              </div>

              {/* ── Error Display ─────────────────────────────────── */}
              <AnimatePresence>
                {error && !loading && (
                  <motion.div key="error"
                    initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                    transition={springFloat}
                    className="mt-6">
                    <div className="glass-strong relative overflow-hidden rounded-2xl p-5 border border-danger-faint">
                      <GlowingEffect spread={36} glow proximity={56} inactiveZone={0.02} />
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-overlay-2 flex items-center justify-center shrink-0">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-danger">Connection Error</p>
                          <p className="text-[12px] text-muted mt-0.5 leading-relaxed break-words">{error}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-dim font-mono bg-elevated rounded-lg px-3 py-2">
                        <span className="text-subtle">$</span>
                        <span>python -m uvicorn backend.main:app</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Empty State ───────────────────────────────────── */}
              {!result && !loading && !error && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springFloat, delay: 0.5 }}
                  className="text-center mt-4">
                  <motion.div
                    whileHover={{ scale: 1.005, transition: { type: "spring", stiffness: 200, damping: 20 } }}
                    className="glass relative overflow-hidden rounded-2xl p-10 glass-glow">
                    <GlowingEffect spread={44} glow proximity={68} inactiveZone={0.01} />
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      transition={{ ...springBouncy, delay: 0.7 }}
                      className="w-14 h-14 mx-auto mb-5 rounded-2xl glass-strong flex items-center justify-center"
                      style={{ boxShadow: `0 0 32px ${NEON_FAINT}`, border: `1px solid ${NEON}1f` }}>
                      <motion.svg animate={{ rotate: [0, 6, -6, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={NEON_DIM} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </motion.svg>
                    </motion.div>
                    <h3 className="heading-md text-[16px] mb-2">Ready to verify</h3>
                    <p className="text-[13px] text-muted leading-relaxed max-w-xs mx-auto">
                      Type a question above and watch the pipeline retrieve, draft, and verify
                      each claim against your documents in real time.
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-5 text-[10px] text-dim font-mono">
                      <span className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 rounded bg-overlay-1 border border-overlay-soft text-subtle text-[9px]">⏎</kbd>
                        <span>to submit</span>
                      </span>
                      <span className="w-px h-3 bg-separator" />
                      <span className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 rounded bg-overlay-1 border border-overlay-soft text-subtle text-[9px]">⇧⏎</kbd>
                        <span>new line</span>
                      </span>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── DOCUMENTS SECTION ───────────────────────────────── */}
          {activeSection === "documents" && (
            <motion.div
              key="documents"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ ...springFloat, duration: 0.3 }}
            >
              {/* Section header */}
              <div className="text-center mb-8">
                <motion.span
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={springBouncy}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 text-[10px] font-mono font-bold tracking-[0.15em] uppercase"
                  style={{ color: NEON, background: NEON_FAINT, border: `1px solid ${NEON}20` }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Document Management
                </motion.span>
                <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-primary tracking-[-0.03em] leading-tight mb-3">
                  Your{" "}
                  <span style={{ color: NEON }}>Documents</span>
                </h2>
                <p className="text-[14px] text-muted max-w-lg mx-auto leading-relaxed">
                  Upload files to ingest into the vector database, or manage the documents already stored.
                  Supported formats: <span className="font-mono text-primary">.txt .md .pdf .csv .json</span>
                </p>
              </div>

              {/* Upload area */}
              <div className="max-w-3xl mx-auto">
                <DocumentUpload onUploaded={() => setDashRefresh((n) => n + 1)} />
              </div>

              {/* Dashboard */}
              <div className="max-w-3xl mx-auto mt-6">
                <DocumentDashboard refreshKey={dashRefresh} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="mt-20 text-center pb-10"
        >
          <p className="text-[10px] text-subtle font-mono tracking-[0.15em] uppercase transition-colors duration-300">
            FastAPI · ChromaDB · Ollama · React · Tailwind · Framer Motion
          </p>
        </motion.footer>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════
         PROVIDER SETTINGS MODAL
         ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showSettings && (
          <ProviderSettings onClose={() => setShowSettings(false)} onSaved={(p) => setProvider(p)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Inline upload button (used inside Pipeline section) ─────────── */
function InlineUploadButton({ dashRefresh, setDashRefresh }) {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setShowUpload((o) => !o)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        transition={springSnappy}
        className="glass relative overflow-hidden rounded-xl px-4 py-2 text-[11px] font-medium text-muted flex items-center gap-2 glass-glow font-mono tracking-wide"
      >
        <GlowingEffect spread={26} proximity={44} inactiveZone={0.02} borderWidth={0.75} />
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span>{showUpload ? "Close panel" : "Upload documents"}</span>
      </motion.button>

      <AnimatePresence mode="sync">
        {showUpload && (
          <motion.div
            key="inline-upload"
            initial={{ opacity: 0, height: 0, filter: "blur(8px)" }}
            animate={{ opacity: 1, height: "auto", filter: "blur(0px)" }}
            exit={{ opacity: 0, height: 0, filter: "blur(8px)" }}
            transition={springLiquid}
            className="overflow-hidden"
          >
            <DocumentUpload onUploaded={() => setDashRefresh((n) => n + 1)} />
            <DocumentDashboard refreshKey={dashRefresh} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
