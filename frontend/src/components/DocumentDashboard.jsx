import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { listDocuments, deleteDocument, getDocumentDetails } from "../api";
import DocumentUpload from "./DocumentUpload";

const spring = { type: "spring", stiffness: 240, damping: 24, mass: 0.85 };

export default function DocumentDashboard({ refreshKey, onUploadSuccess }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [detailsTab, setDetailsTab] = useState("preview"); // "preview" | "chunks" | "metadata"
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [activeMenuDoc, setActiveMenuDoc] = useState(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listDocuments();
      setData(res);
      // Select the first document by default if none selected
      if (res?.documents?.length > 0 && !selectedDoc) {
        setSelectedDoc(res.documents[0]);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedDoc]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs, refreshKey]);

  // When selectedDoc changes, fetch its chunk details from the backend
  useEffect(() => {
    if (!selectedDoc?.filename) {
      setSelectedDetails(null);
      return;
    }
    let isCancelled = false;
    setLoadingDetails(true);
    getDocumentDetails(selectedDoc.filename)
      .then((details) => {
        if (!isCancelled) {
          setSelectedDetails(details);
        }
      })
      .catch(() => {
        if (!isCancelled) setSelectedDetails(null);
      })
      .finally(() => {
        if (!isCancelled) setLoadingDetails(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedDoc?.filename]);

  const handleDelete = async (filename, e) => {
    if (e) e.stopPropagation();
    if (!confirm(`Delete "${filename}" and all its indexed chunks?`)) return;
    setDeleting(filename);
    try {
      await deleteDocument(filename);
      if (selectedDoc?.filename === filename) {
        setSelectedDoc(null);
        setSelectedDetails(null);
      }
      await fetchDocs();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(null);
      setActiveMenuDoc(null);
    }
  };

  // Real metadata computed from actual document info
  const getDocMeta = (doc) => {
    const ext = doc.filename.split(".").pop()?.toLowerCase() || "doc";
    return {
      ext: ext.toUpperCase(),
      status: doc.chunk_count > 0 ? "Indexed" : "Empty",
    };
  };

  // Filter and sort
  const filteredDocs = (data?.documents || []).filter((doc) => {
    const matchesSearch = doc.filename.toLowerCase().includes(search.toLowerCase());
    const ext = doc.filename.split(".").pop()?.toLowerCase();
    const matchesType = typeFilter === "all" || ext === typeFilter;
    return matchesSearch && matchesType;
  });

  const displayDocs = [...filteredDocs].sort((a, b) => {
    if (sortOrder === "name") {
      return a.filename.localeCompare(b.filename);
    }
    if (sortOrder === "chunks") {
      return (b.chunk_count || 0) - (a.chunk_count || 0);
    }
    return 0;
  });

  return (
    <div className="w-full max-w-6xl space-y-6">
      {/* ── Top Header Section (Title + Drag&Drop Upload) ───────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="max-w-xl"
        >
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-[0.14em] uppercase font-sans">
            Documents
          </span>
          <h1 className="font-editorial text-[38px] md:text-[44px] font-normal leading-[1.12] text-slate-900 dark:text-slate-100 mt-2 mb-3">
            Your knowledge base.
          </h1>
          <p className="text-[15px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Upload, manage, and search your documents. RAG Studio will automatically chunk and index them for fast, accurate retrieval.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring, delay: 0.1 }}
          className="w-full lg:w-[380px] shrink-0"
        >
          <DocumentUpload
            onUploaded={() => {
              fetchDocs();
              if (onUploadSuccess) onUploadSuccess();
            }}
          />
        </motion.div>
      </div>

      {/* ── Search & Filter Toolbar ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          {/* Search bar */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents…"
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="pdf">PDF</option>
            <option value="docx">DOCX</option>
            <option value="txt">TXT</option>
            <option value="md">MD</option>
          </select>

          {/* Last Updated Sort */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="newest">Last Updated</option>
            <option value="name">Name (A-Z)</option>
            <option value="chunks">Chunks (High-Low)</option>
          </select>
        </div>

        {/* Stats count */}
        <div className="text-xs text-slate-400 font-mono">
          {filteredDocs.length} documents · {data?.total_chunks || 0} chunks indexed
        </div>
      </div>

      {/* ── Two-Column Main Content (Table + Detail Panel) ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT: Documents Table ─────────────────────────────── */}
        <div className="lg:col-span-7 card-studio bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-3">Chunks</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-sans">
                {displayDocs.map((doc) => {
                  const meta = getDocMeta(doc);
                  const isSelected = selectedDoc?.filename === doc.filename;
                  return (
                    <tr
                      key={doc.filename}
                      onClick={() => setSelectedDoc(doc)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {/* Name with File Icon */}
                      <td className="py-3.5 px-4 font-medium flex items-center gap-2.5 truncate max-w-[200px]">
                        <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-500 shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </span>
                        <span className="truncate" title={doc.filename}>
                          {doc.filename}
                        </span>
                      </td>

                      {/* Chunks count */}
                      <td className="py-3.5 px-3 font-mono text-slate-500 dark:text-slate-400">
                        {doc.chunk_count}
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                        {meta.ext}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {meta.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuDoc(activeMenuDoc === doc.filename ? null : doc.filename);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="19" cy="12" r="1" />
                            <circle cx="5" cy="12" r="1" />
                          </svg>
                        </button>

                        {activeMenuDoc === doc.filename && (
                          <div className="absolute right-2 top-8 z-20 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1">
                            <button
                              onClick={(e) => handleDelete(doc.filename, e)}
                              className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 flex items-center gap-2"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredDocs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                      No documents found in knowledge base.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT: Document Preview & Details Panel ────────────── */}
        <div className="lg:col-span-5 card-studio bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm min-h-[460px] flex flex-col justify-between">
          {selectedDoc ? (
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-500 flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[220px]">
                      {selectedDoc.filename}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {selectedDoc.chunk_count} chunks indexed
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDelete(selectedDoc.filename, e)}
                  title="Delete document"
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>

              {/* Tabs: Preview / Chunks / Metadata */}
              <div className="flex items-center gap-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                {["preview", "chunks", "metadata"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setDetailsTab(t)}
                    className={`capitalize font-medium pb-1 border-b-2 transition ${
                      detailsTab === t
                        ? "border-blue-600 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="pt-4 max-h-[340px] overflow-y-auto text-xs pr-1">
                {/* 1. Preview Tab */}
                {detailsTab === "preview" && (
                  <div className="space-y-3">
                    {loadingDetails ? (
                      <div className="text-slate-400 py-6 text-center italic">Loading preview…</div>
                    ) : selectedDetails?.chunks?.[0] ? (
                      <div>
                        <span className="text-[10px] uppercase font-mono font-semibold text-slate-400 block mb-1">
                          Document Sample
                        </span>
                        <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 leading-relaxed font-sans text-[12px] space-y-2">
                          <p>{selectedDetails.chunks[0].text}</p>
                          {selectedDetails.chunks[1] && (
                            <p className="text-slate-500 dark:text-slate-400 border-t border-slate-200/50 dark:border-slate-700/50 pt-2">
                              {selectedDetails.chunks[1].text}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400 italic py-6 text-center">No preview available for this document.</p>
                    )}
                  </div>
                )}

                {/* 2. Chunks Tab */}
                {detailsTab === "chunks" && (
                  <div className="space-y-2">
                    {loadingDetails ? (
                      <div className="text-slate-400 py-6 text-center italic">
                        Loading chunks…
                      </div>
                    ) : (
                      (selectedDetails?.chunks || []).map((c, i) => (
                        <div
                          key={c.id || i}
                          className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                            <span>Chunk #{i + 1}</span>
                            <span>{c.text?.length || 0} chars</span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3">
                            {c.text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 3. Metadata Tab */}
                {detailsTab === "metadata" && (
                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">Updated</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">May 8, 2025</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">File type</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 font-mono uppercase">
                        {selectedDoc.filename.split(".").pop()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">Source</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">Upload</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">Total Chunks</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 font-mono">
                        {selectedDoc.chunk_count}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom full document link */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => alert(`Document "${selectedDoc.filename}" is active in the vector store.`)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition"
                >
                  <span>View full document</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-16 text-slate-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-50">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-xs">Select a document from the table to preview details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
