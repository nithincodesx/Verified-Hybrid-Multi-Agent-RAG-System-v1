import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  FileText,
  Play,
  Layers,
  Settings,
  Bot,
  Sparkles,
  Command,
  ArrowRight,
  Database,
  ExternalLink,
  X,
} from "lucide-react";

export default function CommandPalette({
  isOpen,
  onClose,
  onSelectAction,
  sources = [],
  onSelectQuery,
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const defaultActions = [
    {
      id: "run-pipeline",
      label: "Ask Rune (Execute Pipeline)",
      category: "Actions",
      icon: <Play className="w-4 h-4 text-emerald-400" />,
      action: () => onSelectAction("pipeline"),
    },
    {
      id: "corpus",
      label: "Explore Document Corpus",
      category: "Navigation",
      icon: <FileText className="w-4 h-4 text-blue-400" />,
      action: () => onSelectAction("documents"),
    },
    {
      id: "settings",
      label: "Open Provider & Model Settings",
      category: "Navigation",
      icon: <Settings className="w-4 h-4 text-purple-400" />,
      action: () => onSelectAction("settings"),
    },
    {
      id: "how-it-works",
      label: "How Verification Works",
      category: "Navigation",
      icon: <Layers className="w-4 h-4 text-amber-400" />,
      action: () => onSelectAction("how-it-works"),
    },
  ];

  // Document items
  const docItems = sources.map((src) => ({
    id: `doc-${src}`,
    label: `Filter by: ${src}`,
    category: "Documents",
    icon: <Database className="w-4 h-4 text-cyan-400" />,
    action: () => onSelectAction("filter-source", src),
  }));

  // Example past queries
  const exampleQueries = [
    {
      id: "q-1",
      label: "Summarise latest customer contract with key terms",
      category: "Quick Prompts",
      icon: <Sparkles className="w-4 h-4 text-pink-400" />,
      action: () => onSelectQuery("Summarise our latest customer contract terms, SLA obligations, and penalty clauses."),
    },
    {
      id: "q-2",
      label: "Verify factual claims against technical specifications",
      category: "Quick Prompts",
      icon: <Bot className="w-4 h-4 text-indigo-400" />,
      action: () => onSelectQuery("Extract and verify all quantitative latency and throughput claims from the architecture paper."),
    },
    {
      id: "q-3",
      label: "Analyze Q2 financial report revenue growth metrics",
      category: "Quick Prompts",
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      action: () => onSelectQuery("What was the percentage revenue growth and operating margin from the Q2 financial disclosure?"),
    },
  ];

  const allItems = [...defaultActions, ...docItems, ...exampleQueries];

  const filteredItems = allItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item) => {
    item.action();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="w-full max-w-2xl bg-[#13141b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200"
        >
          {/* Search Header */}
          <div className="flex items-center px-4 py-3.5 border-b border-white/10 gap-3">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Type a command, query, or document name..."
              className="w-full bg-transparent border-0 outline-none text-sm md:text-base text-slate-100 placeholder:text-slate-500 font-sans"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-slate-400">
                ESC
              </span>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            {filteredItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No matching commands or documents found.
              </div>
            ) : (
              filteredItems.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-sm transition-all ${
                    idx === selectedIndex
                      ? "bg-white/10 text-white"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-white/5 border border-white/5">
                      {item.icon}
                    </div>
                    <div>
                      <span className="font-medium">{item.label}</span>
                      <span className="ml-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 opacity-60" />
                </button>
              ))
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="px-4 py-2.5 bg-[#0e0f15] border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <div className="flex items-center gap-3">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>ESC Close</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Rune OS Intelligence</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
