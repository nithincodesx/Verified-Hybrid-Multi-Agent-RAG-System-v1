import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadDocument, getUploadStatus } from "../api";
import GlowingEffect from "./GlowingEffect";

/* ── Spring presets ─────────────────────────────────────────────── */
const spring = { type: "spring", stiffness: 240, damping: 24, mass: 0.85 };
const springBouncy = { type: "spring", stiffness: 420, damping: 12, mass: 0.5 };
const springLiquid = { type: "spring", stiffness: 140, damping: 28, mass: 1.1 };

export default function DocumentUpload({ onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [statusText, setStatusText] = useState("");
  const inputRef = useRef(null);
  const pollRef = useRef(null);
  const pollAttemptsRef = useRef(0);

  const pollStatus = useCallback(async (taskId) => {
    try {
      const status = await getUploadStatus(taskId);
      if (status.status === "completed") {
        setResult({ success: true, filename: status.filename, chunks: status.chunks });
        setUploading(false);
        if (onUploaded) onUploaded();
        return;
      }
      if (status.status === "error") {
        setError(status.error || "Upload processing failed.");
        setResult({ success: false });
        setUploading(false);
        setStatusText("");
        return;
      }
      if (status.status === "not_found") {
        // Server restarted or the task expired — stop polling instead of
        // hanging on "Processing…" forever.
        setError("Upload task no longer exists — the server may have restarted. Please try again.");
        setResult({ success: false });
        setUploading(false);
        setStatusText("");
        return;
      }
      pollAttemptsRef.current += 1;
      if (pollAttemptsRef.current > 120) {
        // ~2 minute cap — give up with a clear message
        setError("Upload is taking too long. Check that your LLM provider (Ollama / OpenAI / OpenRouter) is running and reachable.");
        setResult({ success: false });
        setUploading(false);
        setStatusText("");
        return;
      }
      const labels = { queued: "Queued…", processing: "Chunking…", embedding: "Embedding…", storing: "Storing…" };
      setStatusText(labels[status.status] || "Processing…");
      pollRef.current = setTimeout(() => pollStatus(taskId), 1000);
    } catch (err) {
      setError(err.message || "Status check failed.");
      setResult({ success: false });
      setUploading(false);
    }
  }, [onUploaded]);

  useEffect(() => () => pollRef.current && clearTimeout(pollRef.current), []);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    setError(null);
    setStatusText("Uploading…");
    pollAttemptsRef.current = 0;
    try {
      const res = await uploadDocument(file);
      if (res.task_id) {
        setStatusText("Queued…");
        pollRef.current = setTimeout(() => pollStatus(res.task_id), 1000);
      } else {
        setError(res.error || "Upload rejected.");
        setUploading(false);
        setStatusText("");
      }
    } catch (err) {
      setError(err.message ?? "Upload failed.");
      setResult({ success: false });
      setUploading(false);
      setStatusText("");
    }
  }, [pollStatus]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    handleFile(file);
  }, [handleFile]);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setDragging(false); };
  const onClick = () => inputRef.current?.click();
  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ ...spring, delay: 0.08 }}
      className="w-full max-w-3xl mx-auto mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <motion.svg
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </motion.svg>
        <span className="mono-metric font-semibold text-muted uppercase tracking-wider">Upload Document</span>
      </div>

      {/* Drop zone */}
      <motion.div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={onClick}
        animate={{
          scale: dragging ? 1.005 : 1,
          borderColor: dragging
            ? "rgba(26,226,16,0.35)"
            : "var(--border-glass)",
          background: dragging
            ? "rgba(26,226,16,0.03)"
            : "var(--bg-card)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`glass relative overflow-hidden rounded-2xl p-5 text-center cursor-pointer ${
          uploading ? "pointer-events-none" : ""
        }`}
        whileHover={!uploading ? { scale: 1.002 } : {}}
      >
        <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} />
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,.pdf,.csv,.json"
          className="hidden"
          onChange={onInputChange}
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="relative w-8 h-8"
            >
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#1AE210] border-r-[rgba(26,226,16,0.25)]" />
              <div className="absolute inset-[2px] rounded-full border-2 border-transparent border-b-[rgba(26,226,16,0.15)] border-l-[rgba(26,226,16,0.1)]" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-[13px] text-muted font-mono">{statusText || "Processing…"}</span>
              <span className="text-[10px] text-dim font-mono">Please wait while we process your file</span>
            </motion.div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-4"
          >
            <motion.svg
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </motion.svg>
            <span className="text-[13px] text-muted font-mono">
              <span className="text-[#1AE210] underline underline-offset-2 decoration-dashed decoration-[rgba(26,226,16,0.3)]">
                Click to upload
              </span>{" "}or drag and drop
            </span>
            <span className="mono-metric text-dim">.txt · .md · .pdf · .csv</span>
          </motion.div>
        )}
      </motion.div>

      {/* Result feedback */}
      <AnimatePresence>
        {result && !uploading && (
          <motion.div
            initial={{ opacity: 0, height: 0, filter: "blur(6px)" }}
            animate={{ opacity: 1, height: "auto", filter: "blur(0px)" }}
            exit={{ opacity: 0, height: 0, filter: "blur(6px)" }}
            transition={springLiquid}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ y: -8 }}
              animate={{ y: 0 }}
              className={`mt-2 glass-light rounded-xl px-4 py-3 flex items-center gap-3 ${
                result.success ? "border border-[rgba(52,211,153,0.06)]" : "border border-[rgba(251,113,133,0.06)]"
              }`}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={springBouncy}
              >
                {result.success ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-mono font-medium ${result.success ? "text-[#34d399]" : "text-[#fb7185]"}`}>
                  {result.success
                    ? `${result.filename} — ${result.chunks} chunk${result.chunks !== 1 ? "s" : ""} ingested`
                    : "Upload failed"}
                </p>
                {error && (
                  <p className="mono-metric text-muted mt-0.5 leading-relaxed break-words">{error}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
