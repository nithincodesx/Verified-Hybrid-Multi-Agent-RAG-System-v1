import { motion } from "framer-motion";
import GlowingEffect from "./GlowingEffect";

/* ── Spring presets ─────────────────────────────────────────────── */
const spring = { type: "spring", stiffness: 220, damping: 24, mass: 0.85 };
const springBouncy = { type: "spring", stiffness: 380, damping: 14, mass: 0.6 };
const springReveal = { type: "spring", stiffness: 200, damping: 22, mass: 0.9 };

const NEON = "#3b82f6";
const NEON_DIM = "#60a5fa";
const NEON_FAINT = "rgba(59, 130, 246, 0.08)";
const NEON_GLOW = "rgba(59, 130, 246, 0.12)";

/* ── Pipeline steps for the flowchart ──────────────────────────── */
const STEPS = [
  {
    num: "01",
    title: "Your Question",
    subtitle: "Query Input",
    desc: "You type a natural-language question about your documents. It can be anything — factual, comparative, or exploratory.",
    color: "#60a5fa",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Embedding",
    subtitle: "Vector Encoding",
    desc: "Your question is converted into a numerical vector (768 dimensions) using an embedding model. This captures its semantic meaning.",
    color: "#a78bfa",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Search",
    subtitle: "Vector + BM25 Retrieval",
    desc: "The system searches your document chunks using both semantic similarity (vector) and keyword matching (BM25), then fuses results with RRF ranking.",
    color: NEON,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <path d="M8 11h6" />
      </svg>
    ),
  },
  {
    num: "04",
    title: "Draft",
    subtitle: "Answer Generation",
    desc: "An LLM generates an answer using ONLY the retrieved chunks as context. It is instructed to refuse outside knowledge.",
    color: "#34d399",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    num: "05",
    title: "Verify",
    subtitle: "Claim-Level Check",
    desc: "Every factual claim in the draft is compared against the original source chunks. Unsupported claims are flagged and removed.",
    color: "#fbbf24",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    num: "06",
    title: "Result",
    subtitle: "Verified Answer",
    desc: "You see the final verified answer with full traceability — which chunks were used, what claims passed, and what was flagged.",
    color: NEON,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

/* ── Architecture diagram node ─────────────────────────────────── */
function FlowNode({ step, index, total }) {
  const isLast = index === total - 1;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ ...springReveal, delay: index * 0.08 }}
      className="flex flex-col items-center relative"
    >
      {/* Connector line to next */}
      {!isLast && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-6 md:h-4"
          style={{ background: `linear-gradient(to bottom, ${step.color}30, transparent)` }}
        />
      )}

      {/* Node card */}
      <motion.div
        whileHover={{ scale: 1.04, y: -3 }}
        transition={springBouncy}
        className="glass relative overflow-hidden rounded-2xl p-5 w-full text-center"
        style={{ boxShadow: `0 0 28px ${step.color}10`, border: `1px solid ${step.color}18` }}
      >
        <GlowingEffect spread={28} glow proximity={48} inactiveZone={0.03} borderWidth={0.75} />

        {/* Step number */}
        <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase mb-3 block" style={{ color: step.color }}>
          Step {step.num}
        </span>

        {/* Icon */}
        <div className="w-11 h-11 mx-auto mb-3 rounded-xl flex items-center justify-center"
          style={{ background: `${step.color}12`, color: step.color }}
        >
          {step.icon}
        </div>

        {/* Title */}
        <h4 className="text-[14px] font-bold text-primary mb-1">{step.title}</h4>
        <span className="text-[10px] font-mono text-dim tracking-wide uppercase">{step.subtitle}</span>

        {/* Description */}
        <p className="text-[12px] text-muted leading-relaxed mt-3">{step.desc}</p>
      </motion.div>
    </motion.div>
  );
}

/* ── Info card ─────────────────────────────────────────────────── */
function InfoCard({ icon, title, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...springReveal, delay }}
      whileHover={{ y: -2, transition: { type: "spring", stiffness: 200, damping: 20 } }}
      className="glass relative overflow-hidden rounded-2xl p-6"
    >
      <GlowingEffect spread={32} glow proximity={56} inactiveZone={0.02} borderWidth={0.75} />
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${NEON}10`, color: NEON }}
        >
          {icon}
        </div>
        <h3 className="text-[15px] font-bold text-primary leading-snug">{title}</h3>
      </div>
      <div className="text-[13px] text-muted leading-relaxed space-y-2">
        {children}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export default function HowItWorks() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={spring}
      className="w-full max-w-4xl mx-auto px-4"
    >
      {/* ── Section header ─────────────────────────────────────── */}
      <div className="text-center mb-10">
        <motion.span
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springBouncy}
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 text-[10px] font-mono font-bold tracking-[0.15em] uppercase"
          style={{ color: NEON, background: NEON_FAINT, border: `1px solid ${NEON}20` }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={NEON} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Beginner Friendly
        </motion.span>
        <h2 className="text-[1.75rem] md:text-[2.25rem] font-extrabold text-primary tracking-[-0.03em] leading-tight mb-3">
          How the{" "}
          <span style={{ color: NEON }}>Verified RAG</span>{" "}
          Pipeline Works
        </h2>
        <p className="text-[14px] text-muted max-w-lg mx-auto leading-relaxed">
          A step-by-step walkthrough of what happens from the moment you type a question
          to when you receive a verified, source-grounded answer.
        </p>
      </div>

      {/* ── Visual flowchart ───────────────────────────────────── */}
      <div className="mb-12">
        <motion.h3
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-[13px] font-mono font-bold text-dim tracking-[0.15em] uppercase text-center mb-6"
        >
          Pipeline Flow
        </motion.h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {STEPS.map((step, i) => (
            <FlowNode key={step.num} step={step} index={i} total={STEPS.length} />
          ))}
        </div>
      </div>

      {/* ── Detailed explanation cards ─────────────────────────── */}
      <motion.h3
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-[13px] font-mono font-bold text-dim tracking-[0.15em] uppercase text-center mb-6"
      >
        Deep Dive — What Each Step Does
      </motion.h3>

      <div className="grid md:grid-cols-2 gap-4 mb-10">
        {/* 1. Retrieval */}
        <InfoCard
          delay={0}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>}
          title="Step 1 — Retrieval (Finding Relevant Chunks)"
        >
          <p>
            Your documents are broken into small chunks (≈800 characters each) and stored in a
            <strong className="text-primary"> vector database</strong> (ChromaDB). Each chunk gets a
            numerical fingerprint (embedding) that captures its meaning.
          </p>
          <p>
            When you ask a question, the system finds the <strong className="text-primary">top-5 most
            similar chunks</strong> using two methods:
          </p>
          <ul className="list-none space-y-1.5 pl-1">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: "#60a5fa" }} />
              <span><strong className="text-[#60a5fa]">Vector Search</strong> — finds chunks that are semantically similar (same meaning, even if different words)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: "#a78bfa" }} />
              <span><strong className="text-[#a78bfa]">BM25 Search</strong> — finds chunks that contain the exact keywords you used</span>
            </li>
          </ul>
          <p>
            Both results are merged using <strong className="text-primary">Reciprocal Rank Fusion (RRF)</strong> to
            produce the best combined ranking.
          </p>
        </InfoCard>

        {/* 2. Drafting */}
        <InfoCard
          delay={0.08}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
          title="Step 2 — Draft (Generating the Answer)"
        >
          <p>
            The top retrieved chunks are injected into the LLM's prompt as <strong className="text-primary">context</strong>.
            The model is specifically instructed to:
          </p>
          <ul className="list-none space-y-1.5 pl-1">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: NEON }} />
              <span>Answer using <strong className="text-primary">only</strong> the provided context</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: NEON }} />
              <span>Say "I don't have enough information" if the context doesn't cover the question</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: NEON }} />
              <span>Reference specific chunks when possible</span>
            </li>
          </ul>
          <p>
            This is what makes RAG different from a regular chatbot — the answer is
            <strong className="text-primary"> grounded in your actual documents</strong>.
          </p>
        </InfoCard>

        {/* 3. Verification */}
        <InfoCard
          delay={0.16}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}
          title="Step 3 — Verify (Checking Every Claim)"
        >
          <p>
            This is what makes this system <strong className="text-primary">unique</strong>. Before you see
            the answer, a separate <strong className="text-primary">Verifier Agent</strong> reads every
            factual claim and checks it against the source chunks.
          </p>
          <p>For each claim, the verifier outputs:</p>
          <ul className="list-none space-y-1.5 pl-1">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: NEON }} />
              <span><strong className="text-primary">✅ Supported</strong> — the claim is directly backed by a source chunk</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "#fb7185" }} />
              <span><strong className="text-[#fb7185]">❌ Unsupported</strong> — the claim is not found in the source (hallucination)</span>
            </li>
          </ul>
          <p>
            Unsupported claims are flagged and removed from the final answer, leaving you with
            a clean, trustworthy response.
          </p>
        </InfoCard>

        {/* 4. Why this matters */}
        <InfoCard
          delay={0.24}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>}
          title="Why This Matters"
        >
          <p>
            Most AI systems give you answers but you have no idea if they're accurate.
            With <strong className="text-primary">Verified RAG</strong>:
          </p>
          <ul className="list-none space-y-1.5 pl-1">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: NEON }} />
              <span>Every answer traces back to your actual documents</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: NEON }} />
              <span>Hallucinated claims are automatically caught and removed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: NEON }} />
              <span>You see the full trace — what was retrieved, drafted, and verified</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: NEON }} />
              <span>It works with your own documents, not just internet data</span>
            </li>
          </ul>
        </InfoCard>
      </div>

      {/* ── Visual Architecture Diagram ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={springReveal}
        className="glass relative overflow-hidden rounded-2xl p-6 md:p-8 mb-8"
      >
        <GlowingEffect spread={36} glow proximity={64} inactiveZone={0.01} />
        <h3 className="text-[13px] font-mono font-bold text-dim tracking-[0.15em] uppercase text-center mb-6">
          Architecture Diagram
        </h3>

        {/* Diagram */}
        <div className="flex flex-col items-center gap-0">
          {/* User query */}
          <DiagramBox label="User Query" color="#60a5fa" />
          <DiagramArrow />

          {/* Embedding */}
          <DiagramBox label="Embedding (text → vector)" color="#a78bfa" />
          <DiagramArrow />

          {/* Split */}
          <div className="flex items-center gap-3 w-full max-w-md justify-center">
            <DiagramBox label="Vector Search" color={NEON} small />
            <span className="text-[10px] text-dim font-mono font-bold">+</span>
            <DiagramBox label="BM25 Search" color="#a78bfa" small />
          </div>
          <DiagramArrow />

          {/* RRF */}
          <DiagramBox label="RRF Fusion (ranking)" color="#34d399" />
          <DiagramArrow />

          {/* Top-K */}
          <DiagramBox label="Top-K Chunks" color="#60a5fa" />
          <DiagramArrow />

          {/* Draft */}
          <DiagramBox label="Draft Agent (LLM)" color="#34d399" />
          <DiagramArrow />

          {/* Verify */}
          <DiagramBox label="Verifier Agent (LLM)" color="#fbbf24" />
          <DiagramArrow />

          {/* Result */}
          <DiagramBox label="Verified Answer" color={NEON} glow />
        </div>

        <p className="text-center text-[11px] text-dim font-mono mt-6">
          ← Full pipeline runs in under a few seconds →
        </p>
      </motion.div>

      {/* ── Key concepts glossary ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="glass relative overflow-hidden rounded-2xl p-6 mb-8"
      >
        <GlowingEffect spread={28} glow proximity={48} inactiveZone={0.03} borderWidth={0.75} />
        <h3 className="text-[13px] font-mono font-bold text-dim tracking-[0.15em] uppercase mb-4">
          Key Concepts — Glossary
        </h3>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
          {[
            { term: "RAG", def: "Retrieval-Augmented Generation — combining search with LLM generation for grounded answers." },
            { term: "Vector Embedding", def: "A numerical representation (array of numbers) that captures the meaning of text." },
            { term: "ChromaDB", def: "A local vector database that stores document embeddings for fast similarity search." },
            { term: "BM25", def: "A classic keyword-based search algorithm (like what powers traditional search engines)." },
            { term: "RRF", def: "Reciprocal Rank Fusion — a math formula to merge results from multiple search methods." },
            { term: "Chunking", def: "Breaking long documents into smaller overlapping pieces for better retrieval." },
            { term: "Hallucination", def: "When an LLM generates plausible-sounding but factually incorrect information." },
            { term: "Grounding", def: "Anchoring AI responses to actual source documents rather than training data." },
          ].map(({ term, def }) => (
            <div key={term} className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: NEON }} />
              <span>
                <strong className="text-primary text-[13px]">{term}:</strong>{" "}
                <span className="text-muted text-[12px]">{def}</span>
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Diagram building blocks ────────────────────────────────────── */
function DiagramBox({ label, color, small = false, glow = false }) {
  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      transition={springBouncy}
      className={`
        relative rounded-xl text-center font-mono font-semibold
        ${small ? "px-3 py-2 text-[11px]" : "px-5 py-2.5 text-[12px]"}
      `}
      style={{
        background: `${color}10`,
        color: color,
        border: `1px solid ${color}25`,
        boxShadow: glow ? `0 0 28px ${color}15` : undefined,
      }}
    >
      {label}
    </motion.div>
  );
}

function DiagramArrow() {
  return (
    <div className="w-px h-5 flex items-center justify-center">
      <div
        className="w-px h-full"
        style={{ background: "linear-gradient(to bottom, rgba(59,130,246,0.25), transparent)" }}
      />
    </div>
  );
}
