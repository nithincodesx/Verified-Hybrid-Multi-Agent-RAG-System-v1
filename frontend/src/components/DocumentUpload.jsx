import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadDocument, getUploadStatus } from "../api";

export default function DocumentUpload({ onUploaded, compact = false }) {
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
        setError("Upload task no longer exists. Please try again.");
        setResult({ success: false });
        setUploading(false);
        setStatusText("");
        return;
      }
      pollAttemptsRef.current += 1;
      if (pollAttemptsRef.current > 120) {
        setError("Upload is taking too long. Check that your LLM provider is running.");
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
    if (!file || uploading) return;
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
  }, [pollStatus, uploading]);

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
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.pdf,.csv,.json,.docx"
        onChange={onInputChange}
        className="hidden"
      />

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={onClick}
        className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 select-none ${
          dragging
            ? "border-slate-800 dark:border-slate-200 bg-slate-100/90 dark:bg-slate-800/80"
            : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/50"
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center py-2">
            <svg className="animate-spin h-6 w-6 text-slate-700 dark:text-slate-300 mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{statusText}</span>
          </div>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
              Drag & drop files here, or click to upload
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              PDF, DOCX, TXT, MD (up to 50MB)
            </span>
          </>
        )}
      </div>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-2 rounded-xl text-center"
          >
            {error}
          </motion.div>
        )}
        {result?.success && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 p-2 rounded-xl text-center"
          >
            Successfully indexed <span className="font-semibold">{result.filename}</span> ({result.chunks} chunks)
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
