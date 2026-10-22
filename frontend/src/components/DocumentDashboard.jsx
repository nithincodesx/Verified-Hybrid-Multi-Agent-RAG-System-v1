import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { listDocuments, deleteDocument } from "../api";
import GlowingEffect from "./GlowingEffect";

/* ── Spring presets ─────────────────────────────────────────────── */
const spring = { type: "spring", stiffness: 240, damping: 24, mass: 0.85 };
const springBouncy = { type: "spring", stiffness: 420, damping: 12, mass: 0.5 };
const springSnappy = { type: "spring", stiffness: 500, damping: 26, mass: 0.6 };

const docItem = {
  hidden: { opacity: 0, x: -16, filter: "blur(4px)" },
  show: (i) => ({
    opacity: 1, x: 0, filter: "blur(0px)",
    transition: { ...spring, delay: i * 0.04 },
  }),
  exit: { opacity: 0, x: 16, filter: "blur(4px)", transition: { duration: 0.15 } },
};

export default function DocumentDashboard({ refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listDocuments();
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs, refreshKey]);

  const handleDelete = async (filename) => {
    setDeleting(filename);
    setDeleteError(null);
    try {
      const res = await deleteDocument(filename);
      if (!res.success) setDeleteError(res.error || `Failed to delete ${filename}`);
      await fetchDocs();
    } catch (err) {
      setDeleteError(err.message || "Delete failed.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
      transition={spring}
      className="w-full max-w-3xl mx-auto mb-6"
    >
      {/* Stats card */}
      <div className="glass relative overflow-hidden rounded-2xl p-4 mb-3">
        <GlowingEffect spread={36} glow proximity={64} inactiveZone={0.01} />
        <div className="flex items-center gap-2 mb-3">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="mono-metric font-semibold text-muted uppercase tracking-wider">Documents</span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]"
                animate={{ opacity: [0.15, 0.6, 0.15] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
            <span className="mono-metric text-muted ml-1">Loading…</span>
          </div>
        ) : data && data.total_docs > 0 ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springBouncy}
            className="flex items-center gap-6"
          >
            <div className="flex items-center gap-2">
              <motion.span
                key={data.total_docs}
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={springBouncy}
                className="text-[22px] font-semibold text-primary font-mono tracking-tight"
              >
                {data.total_docs}
              </motion.span>
              <span className="mono-metric text-muted">
                doc{data.total_docs !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="w-px h-8 bg-separator" />
            <div className="flex items-center gap-2">
              <motion.span
                key={data.total_chunks}
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ ...springBouncy, delay: 0.04 }}
                className="text-[22px] font-semibold text-primary font-mono tracking-tight"
              >
                {data.total_chunks}
              </motion.span>
              <span className="mono-metric text-muted">
                chunk{data.total_chunks !== 1 ? "s" : ""}
              </span>
            </div>
          </motion.div>
        ) : (
          <p className="mono-metric text-muted py-2">
            No documents uploaded yet. Use the upload panel above to add documents.
          </p>
        )}
      </div>

      {/* Delete error */}
      <AnimatePresence>
        {deleteError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={spring}
            className="mono-metric text-danger mb-2 px-1"
          >
            {deleteError}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Document list */}
      <AnimatePresence mode="popLayout">
        {data?.documents?.length > 0 && (
          <motion.div initial="hidden" animate="show" className="space-y-1.5">
            {data.documents.map((doc, i) => (
              <motion.div
                key={doc.filename}
                custom={i}
                variants={docItem}
                layout
                exit="exit"
                whileHover={{
                  x: 3,
                  transition: { type: "spring", stiffness: 200, damping: 20 },
                }}
                className="glass-light relative overflow-hidden rounded-xl px-3.5 py-2.5 flex items-center gap-3 group"
              >
                <GlowingEffect spread={28} proximity={48} inactiveZone={0.02} borderWidth={0.75} />
                <motion.svg
                  whileHover={{ rotate: 5 }}
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </motion.svg>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-secondary truncate font-mono">{doc.filename}</p>
                  <p className="mono-metric text-muted">
                    {doc.chunk_count} chunk{doc.chunk_count !== 1 ? "s" : ""}
                  </p>
                </div>

                <motion.button
                  onClick={() => handleDelete(doc.filename)}
                  disabled={deleting === doc.filename}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  transition={springSnappy}
                  className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-mono font-medium
                    text-muted hover:text-danger hover:bg-danger-faint
                    transition-all duration-150
                    opacity-50 group-hover:opacity-100 focus-visible:opacity-100
                    disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {deleting === doc.filename ? (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-1"
                    >
                      <motion.svg
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-3 h-3"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" strokeDasharray="30 10" />
                      </motion.svg>
                      Deleting…
                    </motion.span>
                  ) : (
                    "Delete"
                  )}
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
