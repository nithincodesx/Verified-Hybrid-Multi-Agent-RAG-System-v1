import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Maximize2, Sparkles, CheckCircle2, ChevronRight } from "lucide-react";
import GlowingEffect from "./GlowingEffect";

export const PREVIOUS_CHATS_DATA = [
  {
    id: "chat-1",
    query: "Summarise liability & indemnity caps in latest customer contract...",
    snippet: "Synthesized Section 14 indemnification terms and aggregate liability ceiling from James Wick MSA.",
    agent: "Rune",
    badges: ["avatar-bubble-1", "avatar-bubble-2"],
    timestamp: "2h ago",
    score: "98% verified",
    sourceDoc: "MSA_James_Wick.pdf",
  },
  {
    id: "chat-2",
    query: "Verify SLA compliance & uptime commitments across cloud vendors...",
    snippet: "Cross-referenced 99.95% availability guarantees and credit remedy schedules against service logs.",
    agent: "Theo",
    badges: ["avatar-bubble-2", "avatar-bubble-3"],
    timestamp: "Yesterday",
    score: "100% verified",
    sourceDoc: "Vendor_SLA_Schedule.pdf",
  },
  {
    id: "chat-3",
    query: "Extract Q3 recurring revenue & net retention metrics from SEC filing...",
    snippet: "Extracted $4.2M ARR figure and 94.2% dollar-based net retention rate with verified page citations.",
    agent: "Syntax",
    badges: ["avatar-bubble-3", "avatar-bubble-4"],
    timestamp: "3d ago",
    score: "100% verified",
    sourceDoc: "Financial_Highlights_Q3.pdf",
  },
  {
    id: "chat-4",
    query: "Audit IP assignment & non-disclosure clauses in contractor agreement...",
    snippet: "Audited invention assignment covenants and confidentiality restrictions for trade secret protection.",
    agent: "Aether",
    badges: ["avatar-bubble-1", "avatar-bubble-4"],
    timestamp: "5d ago",
    score: "96% verified",
    sourceDoc: "Consulting_Agreement_v2.pdf",
  },
];

export default function PreviousChatsGrid({ onSelectChat }) {
  const [refreshing, setRefreshing] = useState(false);
  const [chats, setChats] = useState(PREVIOUS_CHATS_DATA);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setChats([...PREVIOUS_CHATS_DATA].reverse());
      setRefreshing(false);
    }, 400);
  };

  return (
    <div className="w-full space-y-3.5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-200 tracking-tight">
            Previous chats
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            ({chats.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition"
          >
            <Maximize2 className="w-3 h-3" />
            <span>{isExpanded ? "Collapse" : "Expand"}</span>
          </button>
        </div>
      </div>

      {/* Grid of Previous Chat Cards (Image 1) */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 transition-all`}>
        {chats.map((chat) => (
          <motion.div
            key={chat.id}
            whileHover={{ y: -3, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            onClick={() => onSelectChat(chat.query)}
            className="rune-card relative p-3.5 rounded-2xl cursor-pointer group flex flex-col justify-between min-h-[115px] border border-white/5 hover:border-white/15 transition-all bg-[#13141a]/90 backdrop-blur-sm"
          >
            <GlowingEffect spread={25} glow proximity={50} inactiveZone={0.01} />

            <div className="relative z-10">
              {/* Avatar Badges Row */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex -space-x-1.5 items-center">
                  {chat.badges.map((b, i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full ${b} border border-[#13141a]`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400/90 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>{chat.score}</span>
                </div>
              </div>

              {/* Title / Query Snippet */}
              <p className="text-xs font-medium text-slate-200 group-hover:text-white line-clamp-2 leading-snug">
                {chat.query}
              </p>
            </div>

            {/* Footer with Timestamp and Source */}
            <div className="relative z-10 pt-2 mt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-mono text-[10px]">{chat.timestamp}</span>
              <span className="flex items-center gap-0.5 text-slate-400 group-hover:text-indigo-400 transition text-[10px]">
                Re-run <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
