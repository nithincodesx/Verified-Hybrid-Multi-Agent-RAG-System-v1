import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  AtSign,
  Sliders,
  Sparkles,
  Mic,
  ArrowUp,
  Globe,
  Code2,
  Brain,
  Layers,
  FileText,
  Mail,
  MessageSquare,
  Upload,
  Check,
  ChevronDown,
  X,
  Cpu,
  ShieldCheck,
} from "lucide-react";
import GlowingEffect from "./GlowingEffect";
import { uploadDocument, getUploadStatus } from "../api";

export default function QueryInput({
  onSubmit,
  loading,
  filterSource,
  onFilterSourceChange,
  enableQueryExpansion,
  setEnableQueryExpansion,
  queryExpansionStrategy,
  setQueryExpansionStrategy,
  enableReranking,
  setEnableReranking,
  sources = [],
  initialQuery = "",
  placeholder = "Example: Summarise my latest customer contract with James Wick...",
  activeAgent = "Rune",
  onUploadSuccess,
}) {
  const [query, setQuery] = useState(initialQuery || "");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [modelFusionOpen, setModelFusionOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedBanner, setUploadedBanner] = useState(null);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const toolsMenuRef = useRef(null);
  const modelMenuRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialQuery !== undefined) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Dynamic auto-expansion for prompt textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 180)}px`;
    }
  }, [query]);

  // Click outside listener for popovers
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSourcesOpen(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target)) {
        setToolsOpen(false);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target)) {
        setModelFusionOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed, {
      filterSource: filterSource || undefined,
      enableQueryExpansion,
      queryExpansionStrategy,
      enableReranking,
    });
  };

  const handleKeyDown = (e) => {
    if (e.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Quick prompt pills for Verified RAG retrieval & verification
  const quickPills = [
    {
      id: "summarise",
      label: "Summarise contract",
      icon: <FileText className="w-3.5 h-3.5 text-pink-400" />,
      text: "Summarise the core obligations, indemnity provisions, and termination notice covenants in the agreement with James Wick.",
    },
    {
      id: "verify-sla",
      label: "Verify SLA & liability",
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
      text: "Verify service level agreements (SLAs), penalty thresholds, and aggregate liability caps across customer contracts.",
    },
    {
      id: "extract-financials",
      label: "Extract financial metrics",
      icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />,
      text: "Extract quarterly recurring revenue, gross margins, and dollar-based retention metrics with exact source citations.",
    },
    {
      id: "compliance",
      label: "Cross-check compliance",
      icon: <Search className="w-3.5 h-3.5 text-cyan-400" />,
      text: "Cross-reference data protection, SOC 2 compliance, and confidentiality requirements across all uploaded documents.",
    },
    {
      id: "upload",
      label: "Upload new document",
      icon: <Upload className="w-3.5 h-3.5 text-indigo-400" />,
      action: () => fileInputRef.current?.click(),
    },
  ];

  // Handle direct file upload via '+' button
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setUploadedBanner(`Uploading "${file.name}"…`);
    try {
      const res = await uploadDocument(file);
      if (res?.task_id) {
        setUploadedBanner(`Chunking & embedding "${file.name}"…`);
        let attempts = 0;
        const poll = async () => {
          try {
            const status = await getUploadStatus(res.task_id);
            if (status.status === "completed") {
              setUploadedBanner(`Indexed "${file.name}" (${status.chunks || 0} chunks)`);
              setUploadingFile(false);
              if (onUploadSuccess) onUploadSuccess();
              setTimeout(() => setUploadedBanner(null), 4000);
            } else if (status.status === "error") {
              setUploadedBanner(`Indexing failed: ${status.error || "Unknown error"}`);
              setUploadingFile(false);
              setTimeout(() => setUploadedBanner(null), 5000);
            } else if (attempts++ < 60) {
              setUploadedBanner(`Processing "${file.name}" (${status.status}…)`);
              setTimeout(poll, 1000);
            } else {
              setUploadedBanner(`Uploaded "${file.name}" (processing in background)`);
              setUploadingFile(false);
              if (onUploadSuccess) onUploadSuccess();
              setTimeout(() => setUploadedBanner(null), 4000);
            }
          } catch {
            setUploadedBanner(`Uploaded "${file.name}".`);
            setUploadingFile(false);
            if (onUploadSuccess) onUploadSuccess();
            setTimeout(() => setUploadedBanner(null), 4000);
          }
        };
        poll();
      } else {
        setUploadedBanner(`Indexed "${file.name}" successfully.`);
        setUploadingFile(false);
        if (onUploadSuccess) onUploadSuccess();
        setTimeout(() => setUploadedBanner(null), 4000);
      }
    } catch (err) {
      setUploadedBanner(`Upload failed: ${err.message}`);
      setUploadingFile(false);
      setTimeout(() => setUploadedBanner(null), 5000);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Simulated Voice / Speech toggle
  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser. Please type your query.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    if (!isRecording) {
      setIsRecording(true);
      recognition.start();
      recognition.onresult = (evt) => {
        const transcript = evt.results[0][0].transcript;
        setQuery((prev) => (prev ? prev + " " + transcript : transcript));
        setIsRecording(false);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
    } else {
      setIsRecording(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Upload Notification Banner */}
      <AnimatePresence>
        {uploadedBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-3 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{uploadedBanner}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".txt,.md,.pdf,.csv,.json"
      />

      {/* ══════════════════════════════════════════════════════════
         MAIN HERO PROMPT CONTAINER (Image 1 & Image 3)
         ══════════════════════════════════════════════════════════ */}
      <form onSubmit={handleSubmit} className="w-full relative group">
        <div className="rune-card relative w-full p-4 md:p-5 rounded-2xl md:rounded-3xl border border-white/10 group-focus-within:border-white/20 transition-all bg-[#12141a]/95 backdrop-blur-xl shadow-2xl">
          <GlowingEffect spread={35} glow proximity={80} inactiveZone={0.01} />

          {/* Text Input Area */}
          <div className="relative z-10 w-full mb-3">
            <textarea
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={2}
              disabled={loading}
              aria-label="Ask a question about your documents"
              className="w-full bg-transparent border-0 outline-none text-[15px] md:text-[16px] text-slate-100 placeholder:text-slate-500 resize-none leading-relaxed min-h-[50px] max-h-[180px] font-sans"
            />
          </div>

          {/* ══════════════════════════════════════════════════════════
             INNER ACTION SHELF (Matching Image 1 & 3)
             ══════════════════════════════════════════════════════════ */}
          <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
            {/* Left Controls: Plus, @ Mention, Skills/Tools, Model Fusion */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {/* '+' Upload / Attach Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                title="Attach & index document into ChromaDB"
                aria-label="Upload document"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition"
              >
                {uploadingFile ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>

              {/* '@' Source Mention Filter */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setSourcesOpen(!sourcesOpen)}
                  aria-label="Filter by source document"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition active:scale-95 border ${
                    filterSource
                      ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                      : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                  }`}
                >
                  <AtSign className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[120px]">
                    {filterSource || "All Sources"}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                <AnimatePresence>
                  {sourcesOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      className="absolute left-0 bottom-full mb-2 z-40 w-64 rune-popover p-2 shadow-2xl"
                    >
                      <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                        Target Evidence Source
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onFilterSourceChange("");
                          setSourcesOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition flex items-center justify-between ${
                          !filterSource
                            ? "bg-indigo-500/20 text-indigo-300 font-medium"
                            : "text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          <span>All Documents (Dense + BM25)</span>
                        </div>
                        {!filterSource && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </button>
                      <div className="my-1 border-t border-white/5" />
                      {sources.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-500 italic">
                          No uploaded documents yet
                        </div>
                      ) : (
                        sources.map((src) => (
                          <button
                            key={src}
                            type="button"
                            onClick={() => {
                              onFilterSourceChange(src);
                              setSourcesOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs transition flex items-center justify-between ${
                              filterSource === src
                                ? "bg-indigo-500/20 text-indigo-300 font-medium"
                                : "text-slate-300 hover:bg-white/5"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{src}</span>
                            </div>
                            {filterSource === src && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 'Skills' / 'Tools' Button with Image 3 Floating Popover */}
              <div className="relative" ref={toolsMenuRef}>
                <button
                  type="button"
                  onClick={() => setToolsOpen(!toolsOpen)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition active:scale-95 border ${
                    enableQueryExpansion || enableReranking
                      ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                      : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Tools</span>
                  {(enableQueryExpansion || enableReranking) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  )}
                </button>

                {/* Floating Frosted Tool Menu (Image 3) */}
                <AnimatePresence>
                  {toolsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="absolute left-0 bottom-full mb-3 z-40 w-56 rune-popover p-1.5 shadow-2xl"
                    >
                      <div className="space-y-0.5">
                        {/* 1. Search the web / Corpus */}
                        <button
                          type="button"
                          onClick={() => {
                            setEnableQueryExpansion(!enableQueryExpansion);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 transition"
                        >
                          <div className="flex items-center gap-2.5">
                            <Globe className="w-4 h-4 text-cyan-400" />
                            <span>Search Corpus & Expand</span>
                          </div>
                          <span
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] ${
                              enableQueryExpansion
                                ? "bg-indigo-600 border-indigo-500 text-white"
                                : "border-white/20"
                            }`}
                          >
                            {enableQueryExpansion && "✓"}
                          </span>
                        </button>

                        {/* 2. Run deep research */}
                        <button
                          type="button"
                          onClick={() => {
                            setEnableQueryExpansion(true);
                            setQueryExpansionStrategy("hybrid");
                            setToolsOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 transition text-left"
                        >
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <span>Run deep research</span>
                        </button>

                        {/* 3. Cross-Encoder Reranking */}
                        <button
                          type="button"
                          onClick={() => {
                            setEnableReranking(!enableReranking);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 transition"
                        >
                          <div className="flex items-center gap-2.5">
                            <Brain className="w-4 h-4 text-emerald-400" />
                            <span>Rerank Chunks</span>
                          </div>
                          <span
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] ${
                              enableReranking
                                ? "bg-indigo-600 border-indigo-500 text-white"
                                : "border-white/20"
                            }`}
                          >
                            {enableReranking && "✓"}
                          </span>
                        </button>

                        {/* 4. Write code / logic test */}
                        <button
                          type="button"
                          onClick={() => {
                            setQuery((q) => q + " Please include reproducible code and step-by-step logic.");
                            setToolsOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 transition text-left"
                        >
                          <Code2 className="w-4 h-4 text-amber-400" />
                          <span>Write code & logic</span>
                        </button>

                        {/* 5. Think longer */}
                        <button
                          type="button"
                          onClick={() => {
                            setEnableQueryExpansion(true);
                            setEnableReranking(true);
                            setToolsOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/10 transition text-left"
                        >
                          <ShieldCheck className="w-4 h-4 text-rose-400" />
                          <span>Think longer (Verified)</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 'Model Fusion' Pill Button (Image 1 & 3) */}
              <div className="relative" ref={modelMenuRef}>
                <button
                  type="button"
                  onClick={() => setModelFusionOpen(!modelFusionOpen)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition active:scale-95"
                >
                  {/* Multi-avatar Bubble Stack */}
                  <div className="flex -space-x-1.5 items-center">
                    <div className="w-3.5 h-3.5 rounded-full avatar-bubble-1 border border-[#13141a]" />
                    <div className="w-3.5 h-3.5 rounded-full avatar-bubble-2 border border-[#13141a]" />
                    <div className="w-3.5 h-3.5 rounded-full avatar-bubble-3 border border-[#13141a]" />
                    <div className="w-3.5 h-3.5 rounded-full avatar-bubble-4 border border-[#13141a]" />
                  </div>
                  <span>Model Fusion</span>
                </button>

                <AnimatePresence>
                  {modelFusionOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 bottom-full mb-3 z-40 w-64 rune-popover p-3 shadow-2xl space-y-2 text-xs"
                    >
                      <div className="font-semibold text-slate-300 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-indigo-400" />
                        <span>Active Ensemble Architecture</span>
                      </div>
                      <div className="text-[11px] text-slate-400 space-y-1">
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-slate-500">Draft Agent</span>
                          <span className="text-slate-300 font-mono">LLM (Ollama / GPT)</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-slate-500">Fact Verifier</span>
                          <span className="text-emerald-400 font-mono">Verifier Engine</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Embeddings</span>
                          <span className="text-cyan-400 font-mono">nomic-embed-text</span>
                        </div>
                      </div>
                      <div className="pt-2 text-[10px] text-slate-500">
                        Multi-agent voting verifies every claim before presenting final results.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Controls: Voice Mic + Send Button */}
            <div className="flex items-center gap-2">
              {/* Mic / Voice Button */}
              <button
                type="button"
                onClick={toggleVoice}
                title={isRecording ? "Listening... click to stop" : "Voice input"}
                aria-label={isRecording ? "Stop voice listening" : "Start voice listening"}
                className={`p-2 rounded-full border transition active:scale-95 ${
                  isRecording
                    ? "bg-rose-500 text-white border-rose-400 animate-pulse"
                    : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border-white/10"
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* High-Contrast Send Button (Image 1 Arrow Button) */}
              <button
                type="submit"
                disabled={!query.trim() || loading}
                title="Send query (Enter)"
                aria-label="Send query"
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  query.trim() && !loading
                    ? "bg-white text-black hover:bg-slate-200 active:scale-95 shadow-lg shadow-white/10"
                    : "bg-white/10 text-slate-500 cursor-not-allowed"
                }`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ══════════════════════════════════════════════════════════
         QUICK PROMPT PILLS (Image 1)
         ══════════════════════════════════════════════════════════ */}
      <div className="w-full flex flex-wrap items-center justify-center gap-2 md:gap-3 mt-4">
        {quickPills.map((pill) => (
          <button
            key={pill.id}
            type="button"
            onClick={() => {
              if (pill.action) {
                pill.action();
              } else if (pill.text) {
                setQuery(pill.text);
                onSubmit(pill.text, {
                  filterSource: filterSource || undefined,
                  enableQueryExpansion,
                  queryExpansionStrategy,
                  enableReranking,
                });
              }
            }}
            className="rune-pill inline-flex items-center gap-2 px-3.5 py-1.5 text-xs text-slate-300 hover:text-white active:scale-95 transition"
          >
            <span className="text-slate-400">{pill.icon}</span>
            <span>{pill.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
