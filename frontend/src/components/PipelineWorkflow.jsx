import { motion } from "framer-motion";
import GlowingEffect from "./GlowingEffect";

/* ── Spring presets ─────────────────────────────────────────────── */
const spring = { type: "spring", stiffness: 220, damping: 24, mass: 0.85 };
const springReveal = { type: "spring", stiffness: 200, damping: 22, mass: 0.9 };
const springBouncy = { type: "spring", stiffness: 400, damping: 14, mass: 0.6 };

const NEON = "#1AE210";
const NEON_FAINT = "rgba(26, 226, 16, 0.08)";

/* ── Advanced pipeline stages ──────────────────────────────────── */
const STAGES = [
  {
    id: "retrieval",
    title: "Retrieval Engine",
    color: "#60a5fa",
    layers: [
      { label: "Query Embedding", detail: "text → 768-d vector via nomic-embed-text" },
      { label: "Vector Search", detail: "Cosine similarity in ChromaDB" },
      { label: "BM25 Search", detail: "Term-frequency keyword matching" },
      { label: "RRF Fusion", detail: "k=60 reciprocal rank fusion" },
      { label: "Confidence Gate", detail: "Threshold = 0.35 — skip LLM if below" },
    ],
  },
  {
    id: "draft",
    title: "Draft Agent",
    color: "#34d399",
    layers: [
      { label: "Context Injection", detail: "Top-K chunks → system prompt" },
      { label: "LLM Generation", detail: "Answer using ONLY retrieved context" },
      { label: "Rate Limit Guard", detail: "0.3s sleep between API calls" },
      { label: "Retry on Failure", detail: "3 attempts with exponential backoff" },
    ],
  },
  {
    id: "verify",
    title: "Verifier Agent",
    color: "#fbbf24",
    layers: [
      { label: "Claim Extraction", detail: "Split draft into individual claims" },
      { label: "Source Matching", detail: "Check each claim vs source chunks" },
      { label: "Verdict Output", detail: "supported / unsupported per claim" },
      { label: "Answer Cleanup", detail: "Remove unsupported claims" },
    ],
  },
  {
    id: "output",
    title: "Output Layer",
    color: NEON,
    layers: [
      { label: "Pipeline Response", detail: "Full trace: retrieval + draft + verification" },
      { label: "Latency Tracking", detail: "End-to-end timing in milliseconds" },
      { label: "Trace Log", detail: "Raw JSON for debugging and transparency" },
    ],
  },
];

/* ── Animated stage card ────────────────────────────────────────── */
function StageCard({ stage, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, x: -10 }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ ...springReveal, delay: index * 0.1 }}
      className="relative"
    >
      {/* Connector line */}
      {index < STAGES.length - 1 && (
        <div className="absolute -bottom-4 left-8 w-px h-4 z-0"
          style={{ background: `linear-gradient(to bottom, ${stage.color}30, transparent)` }}
        />
      )}

      <motion.div
        whileHover={{ scale: 1.01, x: 4 }}
        transition={springBouncy}
        className="glass relative overflow-hidden rounded-2xl"
        style={{ border: `1px solid ${stage.color}15` }}
      >
        <GlowingEffect spread={28} glow proximity={52} inactiveZone={0.03} borderWidth={0.75} />

        {/* Stage header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b"
          style={{ borderColor: `${stage.color}10` }}
        >
          <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold"
            style={{ background: `${stage.color}15`, color: stage.color }}
          >
            {index + 1}
          </span>
          <h4 className="text-[13px] font-bold text-primary">{stage.title}</h4>
          <span className="ml-auto text-[10px] font-mono text-dim">{stage.layers.length} steps</span>
        </div>

        {/* Internal layers */}
        <div className="px-5 py-3">
          {stage.layers.map((layer, i) => (
            <div
              key={layer.label}
              className="flex items-start gap-3 py-2 relative"
            >
              {/* Layer connector dot */}
              <div className="relative flex flex-col items-center mt-1.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: stage.color, boxShadow: `0 0 8px ${stage.color}30` }}
                />
                {i < stage.layers.length - 1 && (
                  <div className="w-px h-4 mt-0.5" style={{ background: `${stage.color}15` }} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] font-semibold text-primary">{layer.label}</span>
                </div>
                <span className="text-[11px] text-dim font-mono">{layer.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export default function PipelineWorkflow() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={spring}
      className="w-full max-w-4xl mx-auto px-4"
    >
      {/* ── Section header ─────────────────────────────────────── */}
      <div className="text-center mb-8">
        <motion.span
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springBouncy}
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 text-[10px] font-mono font-bold tracking-[0.15em] uppercase"
          style={{ color: NEON, background: NEON_FAINT, border: `1px solid ${NEON}20` }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Advanced Workflow
        </motion.span>
        <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-primary tracking-[-0.03em] leading-tight mb-3">
          Pipeline{" "}
          <span style={{ color: NEON }}>Internals</span>
        </h2>
        <p className="text-[14px] text-muted max-w-lg mx-auto leading-relaxed">
          A deep look at each pipeline stage — the hybrid search mechanics, confidence gating,
          LLM orchestration, and verification loop.
        </p>
      </div>

      {/* ── Hybrid Search Diagram ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={springReveal}
        className="glass relative overflow-hidden rounded-2xl p-6 mb-8"
      >
        <GlowingEffect spread={36} glow proximity={60} inactiveZone={0.01} />
        <h3 className="text-[13px] font-mono font-bold text-dim tracking-[0.15em] uppercase text-center mb-5">
          Hybrid Search — How It Finds the Best Chunks
        </h3>

        {/* Diagram */}
        <div className="flex flex-col items-center gap-0 max-w-lg mx-auto">
          {/* Query */}
          <Pill label="User Query" color="#60a5fa" />

          {/* Split into two paths */}
          <div className="w-px h-4" style={{ background: "linear-gradient(to bottom, #60a5fa30, transparent)" }} />
          <div className="flex items-start gap-6 w-full justify-center">
            {/* Left path */}
            <div className="flex flex-col items-center gap-0">
              <Pill label="Embedding" color="#a78bfa" small />
              <div className="w-px h-3" style={{ background: "#a78bfa20" }} />
              <Pill label="Vector Search" color="#a78bfa" small />
              <div className="w-px h-3" style={{ background: "#a78bfa20" }} />
              <Pill label="Cosine Sim." color="#a78bfa" small />
            </div>

            {/* Right path */}
            <div className="flex flex-col items-center gap-0">
              <Pill label="Tokenize" color="#60a5fa" small />
              <div className="w-px h-3" style={{ background: "#60a5fa20" }} />
              <Pill label="BM25 Search" color="#60a5fa" small />
              <div className="w-px h-3" style={{ background: "#60a5fa20" }} />
              <Pill label="Term Freq." color="#60a5fa" small />
            </div>
          </div>

          {/* Merge arrow */}
          <div className="w-px h-4" style={{ background: "linear-gradient(to bottom, #34d39930, transparent)" }} />

          {/* RRF fusion */}
          <Pill label="RRF Fusion (k=60)" color="#34d399" glow />
          <div className="w-px h-4" style={{ background: "linear-gradient(to bottom, #34d39930, transparent)" }} />

          {/* Top K */}
          <Pill label="Top-K Chunks (k=5)" color={NEON} />
          <div className="w-px h-4" style={{ background: `linear-gradient(to bottom, ${NEON}30, transparent)` }} />

          {/* Confidence gate */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            transition={springBouncy}
            className="relative rounded-xl px-5 py-2.5 text-center font-mono text-[12px] font-semibold"
            style={{
              color: "#fbbf24",
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.2)",
            }}
          >
            ◆ Confidence Gate (≥ 0.35)
            <span className="block text-[10px] font-normal text-dim mt-0.5">
              Below threshold → skip LLM → "No relevant context"
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Stage-by-stage breakdown ────────────────────────────── */}
      <motion.h3
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-[13px] font-mono font-bold text-dim tracking-[0.15em] uppercase text-center mb-6"
      >
        Stage-by-Stage Breakdown
      </motion.h3>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {STAGES.map((stage, i) => (
          <StageCard key={stage.id} stage={stage} index={i} />
        ))}
      </div>

      {/* ── Configuration panel ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="glass relative overflow-hidden rounded-2xl p-6 mb-8"
      >
        <GlowingEffect spread={28} glow proximity={48} inactiveZone={0.03} borderWidth={0.75} />
        <h3 className="text-[13px] font-mono font-bold text-dim tracking-[0.15em] uppercase mb-4">
          Tunable Parameters
        </h3>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
          {[
            { param: "TOP_K", val: "5", desc: "Number of chunks retrieved per query" },
            { param: "CHUNK_SIZE", val: "800", desc: "Characters per document chunk" },
            { param: "CHUNK_OVERLAP", val: "150", desc: "Overlap between consecutive chunks" },
            { param: "CONFIDENCE_THRESHOLD", val: "0.35", desc: "Minimum similarity to trigger LLM" },
            { param: "RRF_K", val: "60", desc: "Reciprocal rank fusion constant" },
            { param: "BM25_K1", val: "1.5", desc: "Term frequency saturation parameter" },
            { param: "BM25_B", val: "0.75", desc: "Length normalization factor" },
            { param: "RATE_LIMIT_SLEEP", val: "0.3s", desc: "Pause between LLM API calls" },
          ].map(({ param, val, desc }) => (
            <div key={param} className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: NEON }} />
              <span>
                <code className="text-[12px] font-mono font-bold" style={{ color: NEON }}>{param}</code>
                <span className="text-[11px] text-dim font-mono ml-1.5">= {val}</span>
                <span className="text-[12px] text-muted ml-1.5">— {desc}</span>
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Agent communication diagram ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="glass relative overflow-hidden rounded-2xl p-6 mb-10"
      >
        <GlowingEffect spread={32} glow proximity={56} inactiveZone={0.02} borderWidth={0.75} />
        <h3 className="text-[13px] font-mono font-bold text-dim tracking-[0.15em] uppercase text-center mb-5">
          Agent Communication Flow
        </h3>

        <div className="flex flex-col items-center max-w-lg mx-auto">
          {/* User */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            className="rounded-xl px-5 py-2.5 text-[12px] font-mono font-bold text-center"
            style={{ color: "#60a5fa", background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.15)" }}
          >
            👤 User sends query
          </motion.div>
          <Arrow />

          {/* Retriever */}
          <AgentBox
            name="Retriever Agent"
            role="Embeds query → searches ChromaDB → returns top-5 chunks"
            color="#60a5fa"
            tools="nomic-embed-text · ChromaDB · BM25"
          />
          <Arrow />

          {/* Drafter */}
          <AgentBox
            name="Draft Agent"
            role="Generates answer using ONLY the retrieved chunks"
            color="#34d399"
            tools="openai/gpt-4o-mini (OpenRouter) · 1024 max tokens"
          />
          <Arrow />

          {/* Verifier */}
          <AgentBox
            name="Verifier Agent"
            role="Checks every claim against source chunks"
            color="#fbbf24"
            tools="openai/gpt-4o-mini (OpenRouter) · JSON output"
          />
          <Arrow />

          {/* Response */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            className="rounded-xl px-5 py-2.5 text-[12px] font-mono font-bold text-center"
            style={{ color: NEON, background: NEON_FAINT, border: `1px solid ${NEON}20`, boxShadow: `0 0 24px ${NEON_FAINT}` }}
          >
            ✅ Verified answer + full trace returned
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Helper components ───────────────────────────────────────────── */
function Pill({ label, color, small = false, glow = false }) {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      transition={springBouncy}
      className={`
        relative rounded-xl text-center font-mono font-semibold
        ${small ? "px-3 py-1.5 text-[10px]" : "px-4 py-2 text-[11px]"}
      `}
      style={{
        color,
        background: `${color}10`,
        border: `1px solid ${color}20`,
        boxShadow: glow ? `0 0 24px ${color}12` : undefined,
      }}
    >
      {label}
    </motion.div>
  );
}

function Arrow() {
  return (
    <div className="w-px h-4 flex items-center justify-center">
      <div className="w-px h-full" style={{ background: `linear-gradient(to bottom, rgba(26,226,16,0.2), transparent)` }} />
    </div>
  );
}

function AgentBox({ name, role, color, tools }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, x: 4 }}
      transition={springBouncy}
      className="glass relative overflow-hidden rounded-2xl w-full max-w-md"
      style={{ border: `1px solid ${color}15` }}
    >
      <GlowingEffect spread={24} glow proximity={44} inactiveZone={0.04} borderWidth={0.75} />
      <div className="px-5 py-3.5">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold"
            style={{ background: `${color}15`, color }}
          >
            {name.charAt(0)}
          </span>
          <span className="text-[13px] font-bold text-primary">{name}</span>
        </div>
        <p className="text-[12px] text-muted leading-relaxed mb-1.5">{role}</p>
        <p className="text-[10px] text-dim font-mono">{tools}</p>
      </div>
    </motion.div>
  );
}
