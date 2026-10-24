import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Maximize2,
  CreditCard,
  MessageCircle,
  Calendar,
  FileSpreadsheet,
  Database,
  ArrowUpRight,
  ShieldCheck,
  Layers,
  Cpu,
  FileText,
} from "lucide-react";
import GlowingEffect from "./GlowingEffect";

export const SUGGESTED_APPS_DATA = [
  {
    id: "chroma",
    name: "ChromaDB Vector Store",
    tag: "Active",
    desc: "Dense semantic vector index for lightning-fast nearest-neighbor chunk retrieval and cosine similarity search.",
    color: "from-cyan-500 to-indigo-600",
    icon: <Database className="w-4 h-4 text-white" />,
    installed: true,
  },
  {
    id: "reranker",
    name: "Cross-Encoder Reranker",
    tag: "Active",
    desc: "bge-reranker-large deep neural model scoring candidate passages for maximal contextual accuracy.",
    color: "from-pink-500 to-rose-600",
    icon: <Layers className="w-4 h-4 text-white" />,
    installed: true,
  },
  {
    id: "theo",
    name: "Theo NLI Hallucination Verifier",
    tag: "Essential",
    desc: "Natural Language Inference engine cross-verifying each synthesized claim against retrieved ground-truth evidence.",
    color: "from-emerald-500 to-teal-600",
    icon: <ShieldCheck className="w-4 h-4 text-white" />,
    installed: true,
  },
  {
    id: "parser",
    name: "Document Parser & Chunker",
    tag: "Essential",
    desc: "High-fidelity PDF, DOCX, and CSV parser with sliding-window chunking and metadata preservation.",
    color: "from-amber-500 to-orange-600",
    icon: <FileText className="w-4 h-4 text-white" />,
    installed: true,
  },
  {
    id: "mcp",
    name: "Model Context Protocol (MCP)",
    tag: "Active",
    desc: "Standardized open protocol connecting the multi-agent ensemble with external tools and databases.",
    color: "from-violet-600 to-purple-700",
    icon: <Cpu className="w-4 h-4 text-white" />,
    installed: true,
  },
];

export default function SuggestedAppsGrid() {
  const [search, setSearch] = useState("");
  const [filterEssential, setFilterEssential] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredApps = SUGGESTED_APPS_DATA.filter((app) => {
    const matchesSearch = app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.desc.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = !filterEssential || app.tag === "Essential";
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="w-full space-y-3.5 pt-2">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-200 tracking-tight">
          Suggested applications
        </h2>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search apps..."
              className="pl-8 pr-2.5 py-1 rounded-lg text-xs bg-white/5 border border-white/5 focus:border-white/15 outline-none text-slate-200 placeholder:text-slate-500 w-32 focus:w-44 transition-all"
            />
          </div>

          {/* Filter */}
          <button
            onClick={() => setFilterEssential(!filterEssential)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              filterEssential
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent"
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>Filter</span>
          </button>

          {/* Expand */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition"
          >
            <Maximize2 className="w-3 h-3" />
            <span>{isExpanded ? "Collapse" : "Expand"}</span>
          </button>
        </div>
      </div>

      {/* Grid of Apps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {filteredApps.slice(0, isExpanded ? undefined : 4).map((app) => (
          <motion.div
            key={app.id}
            whileHover={{ y: -3, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="rune-card relative p-3.5 rounded-2xl group flex flex-col justify-between border border-white/5 hover:border-white/15 transition-all bg-[#13141a]/90 backdrop-blur-sm"
          >
            <GlowingEffect spread={25} glow proximity={50} inactiveZone={0.01} />

            <div className="relative z-10">
              {/* Header: Icon + Name + Tag */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center shadow-md`}
                  >
                    {app.icon}
                  </div>
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                    {app.name}
                  </span>
                </div>

                {app.tag && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 border border-white/10 text-slate-400 font-mono">
                    {app.tag}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed mt-1">
                {app.desc}
              </p>
            </div>

            {/* Footer with Connected Status */}
            <div className="relative z-10 pt-2.5 mt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Integration
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
