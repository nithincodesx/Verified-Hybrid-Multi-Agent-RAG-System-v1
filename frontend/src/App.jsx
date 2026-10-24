import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Home,
  Inbox,
  MessageSquare,
  FileText,
  Layers,
  Database,
  Cpu,
  Settings,
  Sparkles,
  Compass,
  Code2,
  ShieldCheck,
  Share2,
  RotateCcw,
  Plus,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  HelpCircle,
  Brain,
  AppWindow,
  Sliders,
  MoreVertical,
  Activity,
  Menu,
  X,
  CreditCard,
  Users,
  Repeat,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Wand2,
  Play,
  Pause,
  Palette,
  Eye,
  Zap,
} from "lucide-react";

import QueryInput from "./components/QueryInput";
import PipelineView from "./components/PipelineView";
import DocumentDashboard from "./components/DocumentDashboard";
import ThemeToggle from "./components/ThemeToggle";
import ProviderSettings from "./components/ProviderSettings";
import HowItWorks from "./components/HowItWorks";
import CompareView from "./components/CompareView";
import PreviousChatsGrid from "./components/PreviousChatsGrid";
import SuggestedAppsGrid from "./components/SuggestedAppsGrid";
import CommandPalette from "./components/CommandPalette";

// SmoothUI Components with Apple Ecosystem Styling
import PixelFlowField from "./components/smoothui/pixel-flow-field";
import AIOrbFace, { EXPRESSIONS } from "./components/smoothui/ai-orb-face";
import AILoader from "./components/smoothui/ai-loader";
import AIReasoning from "./components/smoothui/ai-reasoning";
import AIContextMeter from "./components/smoothui/ai-context-meter";
import AIToolCall from "./components/smoothui/ai-tool-call";
import AISources from "./components/smoothui/ai-sources";
import AITaskList from "./components/smoothui/ai-task-list";
import AIApproval from "./components/smoothui/ai-approval";
import AIDiff from "./components/smoothui/ai-diff";
import AIArtifact from "./components/smoothui/ai-artifact";

import { runPipeline, getProviderSettings, streamPipeline, listDocuments } from "./api";

const spring = { type: "spring", stiffness: 240, damping: 24, mass: 0.85 };

/* ── Agents Ensemble (Image 1 Header) ───────────────────────────── */
const AGENTS = [
  {
    id: "rune",
    name: "Rune",
    role: "Lead Orchestrator",
    tagline: "I'm Rune, where should we start today?",
    placeholder: "Example: Summarise my latest customer contract with James Wick...",
    dotColor: "bg-pink-500",
  },
  {
    id: "aether",
    name: "Aether",
    role: "Deep Research",
    tagline: "I'm Aether, ready for multi-hop semantic research.",
    placeholder: "Ask complex multi-step questions across your documents...",
    dotColor: "bg-blue-400",
  },
  {
    id: "syntax",
    name: "Syntax",
    role: "Logic & Code",
    tagline: "I'm Syntax, auditing technical schemas & quantitative data.",
    placeholder: "Verify code accuracy, numeric data, or technical architecture...",
    dotColor: "bg-amber-400",
  },
  {
    id: "theo",
    name: "Theo",
    role: "Fact Verifier",
    tagline: "I'm Theo, validating claims and filtering hallucinations.",
    placeholder: "Extract and cross-verify factual statements against source citations...",
    dotColor: "bg-emerald-400",
  },
  {
    id: "clara",
    name: "Clara",
    role: "Editorial Polish",
    tagline: "I'm Clara, drafting transparent briefings with clean citations.",
    placeholder: "Generate an executive summary with verified footnotes...",
    dotColor: "bg-purple-400",
  },
];

export default function App() {
  const [activeSection, setActiveSection] = useState("pipeline");
  const [activeAgentId, setActiveAgentId] = useState("rune");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [memoryActive, setMemoryActive] = useState(true);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [dashRefresh, setDashRefresh] = useState(0);
  const [filterSource, setFilterSource] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [providerSettings, setProviderSettings] = useState(null);
  const [availableSources, setAvailableSources] = useState([]);
  const [enableQueryExpansion, setEnableQueryExpansion] = useState(false);
  const [queryExpansionStrategy, setQueryExpansionStrategy] = useState("llm");
  const [enableReranking, setEnableReranking] = useState(false);
  const [currentQueryInput, setCurrentQueryInput] = useState("");

  // SmoothUI & Apple Theme State
  const [flowShape, setFlowShape] = useState("circle");
  const [flowText, setFlowText] = useState("");
  const [flowScatter, setFlowScatter] = useState(0);
  const [flowPaused, setFlowPaused] = useState(false);
  const [orbManualExpression, setOrbManualExpression] = useState(null);
  const [tokenUsed, setTokenUsed] = useState(6420);
  const [sessionHistory, setSessionHistory] = useState([
    {
      id: "hist-1",
      query: "Generate a quarterly sales report for Acme Corp...",
      agent: "Rune",
      time: "10:42 AM",
      passRate: "100%",
      verdicts: [
        { claim: "Acme Corp reported $4.2M Q3 recurring revenue.", supported: true, explanation: "Confirmed in Financial Highlights p.3" },
        { claim: "Annual retention stood at 94.2%.", supported: true, explanation: "Confirmed in Customer Retention p.7" },
      ],
      answer: "Acme Corp delivered $4.2M in recurring revenue for Q3, demonstrating a 94.2% net retention rate across enterprise contracts.",
    },
    {
      id: "hist-2",
      query: "Analyze customer feedback trends for Q2",
      agent: "Aether",
      time: "Yesterday",
      passRate: "100%",
      verdicts: [
        { claim: "Onboarding friction accounts for 42% of support tickets.", supported: true, explanation: "Cross-referenced with survey response cluster B." },
      ],
      answer: "Analysis shows onboarding friction remains the leading churn indicator, cited across 42% of customer support tickets.",
    },
    {
      id: "hist-3",
      query: "Create follow-up reminders for overdue invoices...",
      agent: "Syntax",
      time: "2 days ago",
      passRate: "100%",
      verdicts: [
        { claim: "12 invoices currently exceed 30 days net terms.", supported: true, explanation: "Matched against accounts receivable ledger." },
      ],
      answer: "12 client accounts currently exceed the 30-day net payment threshold, totaling $48,250 in outstanding receivables.",
    },
  ]);
  const [auditFilter, setAuditFilter] = useState("all");

  const [theme, setTheme] = useState(() => {
    return typeof window !== "undefined"
      ? localStorage.getItem("rag-theme") || "dark"
      : "dark";
  });

  const abortRef = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("rag-theme", theme);
  }, [theme]);

  // Global Command+K Keyboard Listener
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load provider settings from backend
  const refreshSettings = () => {
    getProviderSettings()
      .then((s) => {
        if (s) {
          setProviderSettings(s);
          if (s.enable_query_expansion != null) setEnableQueryExpansion(s.enable_query_expansion);
          if (s.enable_reranking != null) setEnableReranking(s.enable_reranking);
          if (s.query_expansion_strategy) setQueryExpansionStrategy(s.query_expansion_strategy);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  // Load documents for source dropdown
  useEffect(() => {
    listDocuments()
      .then((res) => {
        if (res?.documents) {
          setAvailableSources(res.documents.map((d) => d.filename));
        }
      })
      .catch(() => {});
  }, [dashRefresh]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const handleCancel = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
    setProgress(null);
  };

  const handleStartFromScratch = () => {
    handleCancel();
    setResult(null);
    setError(null);
    setProgress(null);
    setCurrentQueryInput("");
  };

  const handleShare = () => {
    const reportText = result?.draft?.answer || "Verified Multi-Agent RAG System Session";
    navigator.clipboard.writeText(
      `# Rune OS Report\nQuery: ${currentQueryInput || "RAG Session"}\n\n${reportText}`
    );
    setShareToast(true);
    setTimeout(() => setShareToast(false), 3000);
  };

  const handleQuery = async (queryText, opts = {}) => {
    if (!queryText || !queryText.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentQueryInput(queryText);
    setProgress({
      retrieval: { stage: "retrieval", status: "started", message: "Searching documents…" },
    });

    try {
      const data = await streamPipeline(queryText.trim(), {
        filterSource: opts.filterSource || filterSource || undefined,
        enableQueryExpansion: opts.enableQueryExpansion ?? enableQueryExpansion,
        queryExpansionStrategy: opts.queryExpansionStrategy ?? queryExpansionStrategy,
        enableReranking: opts.enableReranking ?? enableReranking,
        signal: controller.signal,
        onStage: (evt) => {
          setProgress((prev) => ({ ...(prev ?? {}), [evt.stage]: evt }));
        },
      });
      setResult(data);
      if (data.error) setError(data.error);
      else {
        setSessionHistory((prev) => [
          {
            id: `hist-${Date.now()}`,
            query: queryText.trim(),
            agent: activeAgent.name,
            time: "Just now",
            passRate: data.verification?.passed
              ? "100%"
              : `${Math.round(
                  ((data.verification?.verdicts?.filter((v) => v.supported)?.length || 0) /
                    Math.max(1, data.verification?.verdicts?.length || 1)) *
                    100
                )}%`,
            verdicts: data.verification?.verdicts || [],
            answer: data.verification?.verified_answer || data.draft?.answer || "",
          },
          ...prev,
        ]);
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      if (String(err?.message ?? "").includes("Pipeline stream")) {
        try {
          const data = await runPipeline(queryText.trim(), {
            filterSource: opts.filterSource || filterSource || undefined,
            enableQueryExpansion: opts.enableQueryExpansion ?? enableQueryExpansion,
            queryExpansionStrategy: opts.queryExpansionStrategy ?? queryExpansionStrategy,
            enableReranking: opts.enableReranking ?? enableReranking,
          });
          setResult(data);
          if (data.error) setError(data.error);
          else {
            setSessionHistory((prev) => [
              {
                id: `hist-${Date.now()}`,
                query: queryText.trim(),
                agent: activeAgent.name,
                time: "Just now",
                passRate: data.verification?.passed
                  ? "100%"
                  : `${Math.round(
                      ((data.verification?.verdicts?.filter((v) => v.supported)?.length || 0) /
                        Math.max(1, data.verification?.verdicts?.length || 1)) *
                        100
                    )}%`,
                verdicts: data.verification?.verdicts || [],
                answer: data.verification?.verified_answer || data.draft?.answer || "",
              },
              ...prev,
            ]);
          }
          return;
        } catch (fallbackErr) {
          setError(fallbackErr.message ?? "An unexpected error occurred.");
          return;
        }
      }
      setError(err.message ?? "An unexpected error occurred.");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const handleSelectQueryFromExample = (text) => {
    setCurrentQueryInput(text);
    setActiveSection("pipeline");
    handleQuery(text);
  };

  const activeAgent = AGENTS.find((a) => a.id === activeAgentId) || AGENTS[0];
  const activeProviderName = providerSettings?.provider || "ollama";

  // Dynamic Time Greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good morning, Jane"
      : hour < 18
      ? "Good afternoon, Jane"
      : "Good evening, Jane";

  return (
    <div className="min-h-screen bg-[#0c0d12] text-slate-100 flex flex-col lg:flex-row font-sans antialiased overflow-x-hidden selection:bg-indigo-500/30 selection:text-white relative">
      {/* ── Background PixelFlowField with Interactive Apple Particle Physics ── */}
      <PixelFlowField
        text={flowText}
        shape={flowShape}
        scatter={flowScatter}
        paused={flowPaused}
        className="fixed inset-0 pointer-events-auto opacity-30 z-0"
      />
      {/* ══════════════════════════════════════════════════════════
         COMMAND PALETTE (⌘ K)
         ══════════════════════════════════════════════════════════ */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        sources={availableSources}
        onSelectAction={(action, val) => {
          if (action === "filter-source") {
            setFilterSource(val);
            setActiveSection("pipeline");
          } else if (action === "settings") {
            setShowSettings(true);
          } else {
            setActiveSection(action);
          }
        }}
        onSelectQuery={(text) => handleSelectQueryFromExample(text)}
      />

      {/* Share Toast */}
      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-medium shadow-2xl flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Markdown report copied to clipboard</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════
         LEFT SIDEBAR (Matching Image 1: Locally inc. / Rune OS)
         ══════════════════════════════════════════════════════════ */}
      <aside
        className={`hidden lg:flex ${
          sidebarCollapsed ? "w-20" : "w-64"
        } h-screen sticky top-0 bg-[#090a0e] border-r border-white/5 flex-col justify-between p-4 z-40 select-none transition-all duration-300`}
      >
        <div className="space-y-4">
          {/* Workspace Pill & Toggle (Image 1) */}
          <div className="flex items-center justify-between gap-2 px-1">
            {!sidebarCollapsed ? (
              <button
                type="button"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 transition border border-white/5"
              >
                <div className="w-3.5 h-3.5 rounded bg-gradient-to-tr from-rose-500 to-amber-400 shrink-0" />
                <span className="tracking-tight">Locally inc.</span>
                <ChevronDown className="w-3 h-3 text-slate-400 ml-1" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-400 mx-auto" />
            )}

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Search Bar with ⌘ K Shortcut (Image 1) */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className={`w-full flex items-center ${
              sidebarCollapsed ? "justify-center px-2" : "justify-between px-3"
            } py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-slate-200 text-xs transition group`}
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-3.5 h-3.5 group-hover:text-indigo-400 transition" />
              {!sidebarCollapsed && <span>Search</span>}
            </div>
            {!sidebarCollapsed && (
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-slate-500">
                ⌘ K
              </kbd>
            )}
          </button>

          {/* ── Main Workspace Navigation ── */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveSection("pipeline")}
              title="Home · Pipeline Studio"
              className={`w-full flex items-center ${
                sidebarCollapsed ? "justify-center" : "gap-3 px-3"
              } py-2 rounded-xl text-xs font-medium transition ${
                activeSection === "pipeline"
                  ? "bg-white/10 text-white font-semibold shadow-inner border border-white/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <Home className={`w-4 h-4 ${activeSection === "pipeline" ? "text-pink-400" : ""}`} />
              {!sidebarCollapsed && <span>Home (Pipeline)</span>}
            </button>

            <button
              onClick={() => setActiveSection("inbox")}
              title="Audit & Claims Verification Ledger"
              className={`w-full flex items-center ${
                sidebarCollapsed ? "justify-center" : "gap-3 px-3"
              } py-2 rounded-xl text-xs font-medium transition ${
                activeSection === "inbox"
                  ? "bg-white/10 text-white font-semibold shadow-inner border border-white/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <Inbox className={`w-4 h-4 ${activeSection === "inbox" ? "text-emerald-400" : ""}`} />
              {!sidebarCollapsed && <span>Audit & Claims</span>}
            </button>

            <button
              onClick={() => setActiveSection("messages")}
              title="Conversations & History"
              className={`w-full flex items-center ${
                sidebarCollapsed ? "justify-center" : "gap-3 px-3"
              } py-2 rounded-xl text-xs font-medium transition ${
                activeSection === "messages"
                  ? "bg-white/10 text-white font-semibold shadow-inner border border-white/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <MessageSquare className={`w-4 h-4 ${activeSection === "messages" ? "text-cyan-400" : ""}`} />
              {!sidebarCollapsed && <span>Conversations</span>}
            </button>

            <button
              onClick={() => setActiveSection("documents")}
              title="Contracts & Document Corpus"
              className={`w-full flex items-center ${
                sidebarCollapsed ? "justify-center" : "gap-3 px-3"
              } py-2 rounded-xl text-xs font-medium transition ${
                activeSection === "documents"
                  ? "bg-white/10 text-white font-semibold shadow-inner border border-white/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <FileText className={`w-4 h-4 ${activeSection === "documents" ? "text-blue-400" : ""}`} />
              {!sidebarCollapsed && <span>Contracts & Docs</span>}
            </button>

            <button
              onClick={() => setActiveSection("compare")}
              title="Model Arena · Draft vs Verified"
              className={`w-full flex items-center ${
                sidebarCollapsed ? "justify-center" : "gap-3 px-3"
              } py-2 rounded-xl text-xs font-medium transition ${
                activeSection === "compare"
                  ? "bg-white/10 text-white font-semibold shadow-inner border border-white/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <Repeat className={`w-4 h-4 ${activeSection === "compare" ? "text-violet-400" : ""}`} />
              {!sidebarCollapsed && <span>Model Arena</span>}
            </button>

            <button
              onClick={() => setActiveSection("how-it-works")}
              title="How Verification Works"
              className={`w-full flex items-center ${
                sidebarCollapsed ? "justify-center" : "gap-3 px-3"
              } py-2 rounded-xl text-xs font-medium transition ${
                activeSection === "how-it-works"
                  ? "bg-white/10 text-white font-semibold shadow-inner border border-white/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <FileCheck2 className={`w-4 h-4 ${activeSection === "how-it-works" ? "text-amber-400" : ""}`} />
              {!sidebarCollapsed && <span>How It Works</span>}
            </button>

            <button
              onClick={() => setActiveSection("apps")}
              title="Apps & Integrations"
              className={`w-full flex items-center ${
                sidebarCollapsed ? "justify-center" : "gap-3 px-3"
              } py-2 rounded-xl text-xs font-medium transition ${
                activeSection === "apps"
                  ? "bg-white/10 text-white font-semibold shadow-inner border border-white/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <AppWindow className={`w-4 h-4 ${activeSection === "apps" ? "text-indigo-400" : ""}`} />
              {!sidebarCollapsed && <span>Apps & MCP</span>}
            </button>

            <button
              onClick={() => setShowSettings(true)}
              title="Settings & Provider Configuration"
              className={`w-full flex items-center ${
                sidebarCollapsed ? "justify-center" : "gap-3 px-3"
              } py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition`}
            >
              <Settings className="w-4 h-4 text-slate-400" />
              {!sidebarCollapsed && <span>Settings</span>}
            </button>
          </nav>
        </div>

        {/* ══════════════════════════════════════════════════════════
           BOTTOM PROFILE USER BAR (Image 1: Jane Moore)
           ══════════════════════════════════════════════════════════ */}
        <div className="pt-3 border-t border-white/5">
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-white/5 transition cursor-pointer">
            <div className="flex items-center gap-2.5">
              {/* Colorful Sunset Avatar (Image 1) */}
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 to-indigo-500 flex items-center justify-center font-bold text-[10px] text-white shadow-md">
                JM
              </div>
              {!sidebarCollapsed && (
                <div className="text-left overflow-hidden">
                  <span className="text-xs font-medium text-slate-200 block truncate">
                    Jane Moore
                  </span>
                  <span className="text-[10px] text-emerald-400/90 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {activeProviderName}
                  </span>
                </div>
              )}
            </div>

            {!sidebarCollapsed && (
              <MoreVertical className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
            )}
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Header ────────────────────────────────────── */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-[#090a0e] border-b border-white/10 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded bg-gradient-to-tr from-rose-500 to-amber-400" />
          <span className="text-sm font-bold text-white tracking-tight">Locally inc.</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="p-2 rounded-lg bg-white/5 text-slate-400"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-white/5 text-slate-300"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden p-4 bg-[#090a0e] border-b border-white/10 space-y-2">
          {[
            { id: "pipeline", label: "Home (Pipeline)", icon: <Home className="w-4 h-4" /> },
            { id: "inbox", label: "Audit & Claims Inbox", icon: <Inbox className="w-4 h-4" /> },
            { id: "messages", label: "Conversations & History", icon: <MessageSquare className="w-4 h-4" /> },
            { id: "documents", label: "Documents Corpus", icon: <FileText className="w-4 h-4" /> },
            { id: "how-it-works", label: "How It Works", icon: <FileCheck2 className="w-4 h-4" /> },
            { id: "compare", label: "Model Arena", icon: <Repeat className="w-4 h-4" /> },
            { id: "apps", label: "Suggested Apps", icon: <AppWindow className="w-4 h-4" /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs ${
                activeSection === item.id ? "bg-white/10 text-white font-semibold" : "text-slate-400"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         MAIN WORKSPACE CANVAS
         ══════════════════════════════════════════════════════════ */}
      <main className="flex-1 min-h-screen flex flex-col p-4 md:p-8 max-w-6xl mx-auto w-full relative z-10">
        {/* ── macOS Sequoia / visionOS Title Bar ── */}
        <div className="apple-glass px-4 py-2.5 rounded-2xl mb-6 flex flex-wrap items-center justify-between gap-3 border border-white/10 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            {/* macOS Traffic Lights */}
            <div className="flex items-center gap-1.5">
              <span
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title="Collapse / Expand Sidebar"
                className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/60 shadow-sm inline-block cursor-pointer hover:opacity-80 transition"
              />
              <span
                onClick={() => handleStartFromScratch()}
                title="Reset View"
                className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/60 shadow-sm inline-block cursor-pointer hover:opacity-80 transition"
              />
              <span
                onClick={() => {
                  if (document.fullscreenElement) {
                    document.exitFullscreen?.();
                  } else {
                    document.documentElement.requestFullscreen?.();
                  }
                }}
                title="Toggle Fullscreen"
                className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/60 shadow-sm inline-block cursor-pointer hover:opacity-80 transition"
              />
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold tracking-tight text-white flex items-center gap-1.5 font-sans">
                <span className="text-base text-white/90"></span>
                <span className="bg-gradient-to-r from-indigo-300 via-pink-300 to-amber-200 bg-clip-text text-transparent font-medium">Apple Intelligence</span>
                <span className="text-slate-500 font-normal">·</span>
                <span className="text-slate-300 font-normal text-xs">Verified RAG Studio</span>
              </span>
            </div>
          </div>

          {/* Right: Context Token Meter & Flow Field Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Flow Field Quick Controls Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 font-mono">
              <span className="text-slate-500 text-[10px]">FLOW:</span>
              <button
                type="button"
                onClick={() => setFlowShape(flowShape === "circle" ? "square" : flowShape === "square" ? "cross" : "circle")}
                className="hover:text-white transition uppercase text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/5"
                title="Toggle particle shape"
              >
                {flowShape}
              </button>
              <button
                type="button"
                onClick={() => setFlowScatter((s) => s + 1)}
                className="hover:text-white transition text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/5"
                title="Trigger scatter wave"
              >
                Scatter
              </button>
              <button
                type="button"
                onClick={() => setFlowPaused(!flowPaused)}
                className="hover:text-white transition text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/5"
                title={flowPaused ? "Resume particles" : "Pause particles"}
              >
                {flowPaused ? "Resume" : "Pause"}
              </button>
            </div>

            {/* Circular Context Window Meter */}
            <div
              onClick={() => setActiveSection("context-showcase")}
              className="cursor-pointer hover:opacity-90 transition flex items-center gap-2"
              title="Click to view full AI Context Window breakdown"
            >
              <AIContextMeter limit={16384} used={tokenUsed} size={28} />
              <span className="hidden sm:inline text-[11px] font-mono text-slate-400">
                {Math.round((tokenUsed / 16384) * 100)}% Context
              </span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
           TOP HEADER BAR (Image 1: Agent Tabs & Right Controls)
           ══════════════════════════════════════════════════════════ */}
        <header className="flex flex-wrap items-center justify-between gap-4 mb-10 pb-4 border-b border-white/5">
          {/* Left: Agent Tabs (Rune, Aether, Syntax, Theo, Clara, + Add Agent) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {AGENTS.map((agent) => {
              const isActive = activeAgentId === agent.id;
              return (
                <button
                  key={agent.id}
                  onClick={() => {
                    setActiveAgentId(agent.id);
                    setActiveSection("pipeline");
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? "bg-white/10 text-white border border-white/15 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? `${agent.dotColor} shadow-[0_0_8px_rgba(236,72,153,0.8)]` : "bg-slate-600"
                    }`}
                  />
                  <span>{agent.name}</span>
                </button>
              );
            })}

            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 transition border border-transparent"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Agent</span>
            </button>
          </div>

          {/* Right Header Controls (Image 1) */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Quick Chat Pill */}
            <button
              type="button"
              onClick={() => setActiveSection("pipeline")}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Quick Chat</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Memory Pill */}
            <button
              type="button"
              onClick={() => setMemoryActive(!memoryActive)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition border ${
                memoryActive
                  ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                  : "bg-white/5 text-slate-400 border-white/5"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Memory</span>
            </button>

            {/* Share Pill */}
            <button
              type="button"
              onClick={handleShare}
              title="Copy session report markdown"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {/* Multi-Model Avatar Bubble Stack (Image 1) */}
            <div
              onClick={() => setShowSettings(true)}
              title="Active Multi-Agent Model Ensemble"
              className="flex -space-x-1.5 items-center cursor-pointer hover:opacity-85 transition"
            >
              <div className="w-4 h-4 rounded-full avatar-bubble-1 border border-[#0c0d12]" />
              <div className="w-4 h-4 rounded-full avatar-bubble-2 border border-[#0c0d12]" />
              <div className="w-4 h-4 rounded-full avatar-bubble-3 border border-[#0c0d12]" />
              <div className="w-4 h-4 rounded-full avatar-bubble-4 border border-[#0c0d12]" />
            </div>

            {/* Start from Scratch (Reset) */}
            <button
              type="button"
              onClick={handleStartFromScratch}
              title="Start from scratch (Clear state)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Start from scratch</span>
            </button>

            {/* Settings */}
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              title="Provider & Model Settings"
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════
           MAIN CONTENT ROUTING
           ══════════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {/* TAB 1: Flagship Home / Pipeline Studio */}
          {activeSection === "pipeline" && (
            <motion.div
              key="pipeline"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={spring}
              className="w-full space-y-8"
            >
              {/* ── Central Hero Area (Apple Intelligence Siri Aura & AIOrbFace Hero) ── */}
              <div className="flex flex-col items-center justify-center pt-2 pb-6 space-y-4">
                {/* Hero Mascot: AIOrbFace with Apple Siri Rainbow Glow */}
                <div
                  className="relative group cursor-pointer"
                  onClick={() => {
                    const exprs = ["idle", "happy", "winking", "surprised", "listening", "thinking"];
                    const next = exprs[(exprs.indexOf(orbManualExpression || "idle") + 1) % exprs.length];
                    setOrbManualExpression(next);
                  }}
                  title="Click to interact with AI Orb Face"
                >
                  <div className="apple-siri-glow p-3 rounded-full transition-all duration-300 group-hover:scale-105">
                    <AIOrbFace
                      expression={
                        orbManualExpression ||
                        (loading ? "thinking" : error ? "error" : result ? "done" : "idle")
                      }
                      size={96}
                      showGaze={true}
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/80 border border-white/20 text-slate-300 shadow">
                    {orbManualExpression || (loading ? "thinking" : error ? "error" : result ? "done" : "idle")}
                  </div>
                </div>

                {/* Hero Headings */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    <span className="font-medium text-white">{activeAgent.name}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400">{activeAgent.role}</span>
                  </div>
                  <h1 className="font-editorial text-[38px] md:text-[48px] font-normal tracking-tight text-white leading-tight">
                    {greeting}
                  </h1>
                  <p className="text-sm md:text-base text-slate-400 font-sans max-w-lg mx-auto">
                    {activeAgent.tagline}
                  </p>
                </div>

                {/* Live Loader Pill when processing */}
                {loading && (
                  <div className="apple-glass px-4 py-2 rounded-2xl flex items-center gap-3 border border-white/10 shadow-lg">
                    <AILoader variant="dots" size="md" showText={false} />
                    <span className="text-xs text-slate-300 font-medium">Synthesizing verified response...</span>
                    <AILoader variant="elapsed" />
                  </div>
                )}
              </div>

              {/* ── Center Prompt Card (Image 1 & Image 3) ──────────── */}
              <QueryInput
                onSubmit={handleQuery}
                loading={loading}
                filterSource={filterSource}
                onFilterSourceChange={setFilterSource}
                enableQueryExpansion={enableQueryExpansion}
                setEnableQueryExpansion={setEnableQueryExpansion}
                queryExpansionStrategy={queryExpansionStrategy}
                setQueryExpansionStrategy={setQueryExpansionStrategy}
                enableReranking={enableReranking}
                setEnableReranking={setEnableReranking}
                sources={availableSources}
                initialQuery={currentQueryInput}
                activeAgent={activeAgent.name}
                placeholder={activeAgent.placeholder}
                onUploadSuccess={() => setDashRefresh((k) => k + 1)}
              />

              {/* ── Results View or Idle Dashboard Grid ─────────────── */}
              <div ref={resultRef} className="pt-2">
                {result || loading || error ? (
                  <PipelineView
                    result={result}
                    loading={loading}
                    progress={progress}
                    error={error}
                    onCancel={handleCancel}
                    onOpenSettings={() => setShowSettings(true)}
                    onSelectSuggestedQuery={handleQuery}
                    activeProvider={activeProviderName}
                    activeModel={
                      activeProviderName === "openai"
                        ? providerSettings?.openai_model || "gpt-4o"
                        : activeProviderName === "ollama"
                        ? providerSettings?.draft_model || "llama3.2"
                        : providerSettings?.openrouter_model || "openrouter"
                    }
                  />
                ) : (
                  <div className="space-y-8 pt-4">
                    {/* Previous Chats Section (Image 1) */}
                    <PreviousChatsGrid
                      onSelectChat={(q) => handleSelectQueryFromExample(q)}
                    />

                    {/* Suggested Applications Section (Image 1) */}
                    <SuggestedAppsGrid />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 2: Document Corpus Dashboard */}
          {activeSection === "documents" && (
            <motion.div
              key="documents"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={spring}
              className="w-full"
            >
              <DocumentDashboard
                refreshKey={dashRefresh}
                onUploadSuccess={() => setDashRefresh((k) => k + 1)}
              />
            </motion.div>
          )}

          {/* TAB 3: How Verification Works */}
          {activeSection === "how-it-works" && (
            <motion.div
              key="how-it-works"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={spring}
              className="w-full"
            >
              <HowItWorks onSelectQuery={handleSelectQueryFromExample} />
            </motion.div>
          )}

          {/* TAB 4: Model Arena / Compare View */}
          {activeSection === "compare" && (
            <motion.div
              key="compare"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={spring}
              className="w-full space-y-6"
            >
              <div className="max-w-xl">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest font-mono">
                  MODEL ARENA
                </span>
                <h2 className="font-editorial text-[36px] font-normal text-white mt-1 mb-2">
                  Compare Draft vs Verified LLMs
                </h2>
                <p className="text-xs text-slate-400">
                  Analyze claim consistency, hallucination suppression, and side-by-side performance.
                </p>
              </div>

              {result?.draft?.answer ? (
                <CompareView
                  draftAnswer={result.draft.answer}
                  verifiedAnswer={result.verification?.verified_answer || result.draft.answer}
                  verdicts={result.verification?.verdicts || []}
                />
              ) : (
                <div className="rune-card p-10 text-center space-y-3">
                  <Repeat className="w-8 h-8 text-indigo-400 mx-auto opacity-75" />
                  <p className="text-sm font-medium text-slate-300">
                    No active pipeline result to compare yet.
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Execute a query from the Home Studio to see side-by-side differences between the raw draft and verified answer.
                  </p>
                  <button
                    onClick={() => setActiveSection("pipeline")}
                    className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-slate-200 transition"
                  >
                    Go to Home Studio
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 5: Apps & Integrations */}
          {activeSection === "apps" && (
            <motion.div
              key="apps"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={spring}
              className="w-full space-y-6"
            >
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest font-mono">
                  ECOSYSTEM & MCP
                </span>
                <h2 className="font-editorial text-[36px] font-normal text-white mt-1 mb-2">
                  Connected Applications
                </h2>
                <p className="text-xs text-slate-400">
                  Tool-augmented agent runtime connected via Model Context Protocol (MCP) and ChromaDB.
                </p>
              </div>

              <SuggestedAppsGrid />
            </motion.div>
          )}

          {/* TAB 6: Audit & Claims Inbox */}
          {activeSection === "inbox" && (
            <motion.div
              key="inbox"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={spring}
              className="w-full space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest font-mono">
                    AUDIT & COMPLIANCE LEDGER
                  </span>
                  <h2 className="font-editorial text-[36px] font-normal text-white mt-1 mb-2">
                    Claims Verification Inbox
                  </h2>
                  <p className="text-xs text-slate-400">
                    Real-time verification audit trail, hallucination suppression logs, and ground-truth evidence snippets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection("pipeline")}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 border border-white/5 transition flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Open Pipeline Studio</span>
                </button>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rune-card p-4">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Total Claims Audited</span>
                  <div className="text-2xl font-bold text-white mt-1 font-mono">
                    {sessionHistory.reduce((acc, item) => acc + (item.verdicts?.length || 0), 0) +
                      (result?.verification?.verdicts?.length || 0)}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Across active sessions</span>
                </div>
                <div className="rune-card p-4">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Verification Pass Rate</span>
                  <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">98.5%</div>
                  <span className="text-[10px] text-emerald-400/80 mt-1 block">Ground-truth verified</span>
                </div>
                <div className="rune-card p-4">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Hallucinations Filtered</span>
                  <div className="text-2xl font-bold text-rose-400 mt-1 font-mono">
                    {result?.verification?.verdicts?.filter((v) => !v.supported)?.length || 0}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Claims suppressed</span>
                </div>
                <div className="rune-card p-4">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Verifier Agent</span>
                  <div className="text-sm font-bold text-white mt-2 font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Theo NLI Verifier
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Cross-Encoder active</span>
                </div>
              </div>

              {/* Claims Table / Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-xs font-semibold text-slate-300 font-mono tracking-wide uppercase">
                    Audited Claim Statements & Verdicts
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setAuditFilter("all")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                        auditFilter === "all" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuditFilter("supported")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                        auditFilter === "supported" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Supported
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuditFilter("unsupported")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                        auditFilter === "unsupported" ? "bg-rose-500/20 text-rose-300" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Flagged
                    </button>
                  </div>
                </div>

                {/* Live or Session Claims */}
                {(() => {
                  const currentVerdicts = result?.verification?.verdicts || [];
                  const sessionVerdicts = sessionHistory.flatMap((h) =>
                    (h.verdicts || []).map((v) => ({ ...v, query: h.query, agent: h.agent, time: h.time }))
                  );
                  const allVerdicts = currentVerdicts.length > 0
                    ? currentVerdicts.map((v) => ({ ...v, query: currentQueryInput || "Active Query", agent: "Theo", time: "Just now" }))
                    : sessionVerdicts;

                  const filtered = allVerdicts.filter((v) => {
                    if (auditFilter === "supported") return v.supported;
                    if (auditFilter === "unsupported") return !v.supported;
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="rune-card p-8 text-center space-y-2">
                        <ShieldCheck className="w-8 h-8 text-slate-500 mx-auto" />
                        <p className="text-sm font-medium text-slate-300">No claim verdicts match filter</p>
                        <p className="text-xs text-slate-500">Run a verification query in the Home studio to generate live verdicts.</p>
                      </div>
                    );
                  }

                  return filtered.map((v, i) => (
                    <div
                      key={`verdict-${i}`}
                      className="rune-card p-4 transition-all hover:border-white/15 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider ${
                              v.supported
                                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                            }`}
                          >
                            {v.supported ? "VERIFIED SUPPORTED" : "UNSUPPORTED / FLAGGED"}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            via {v.agent || "Theo"} • {v.time || "Recent"}
                          </span>
                        </div>
                        {v.source_chunk && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(v.source_chunk);
                              setShareToast(true);
                              setTimeout(() => setShareToast(false), 2000);
                            }}
                            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-mono transition"
                          >
                            <Copy className="w-3 h-3" />
                            Copy Evidence
                          </button>
                        )}
                      </div>

                      <p className="text-sm text-slate-100 font-medium leading-relaxed">
                        "{v.claim}"
                      </p>

                      {v.explanation && (
                        <p className="text-xs text-slate-400 bg-white/5 p-2 rounded-lg border border-white/5">
                          <span className="text-slate-300 font-semibold">Verifier rationale:</span> {v.explanation}
                        </p>
                      )}

                      {v.source_chunk && (
                        <div className="text-[11px] font-mono text-emerald-400/90 bg-emerald-950/20 border border-emerald-500/15 p-2 rounded-lg">
                          <span className="text-emerald-300 font-semibold block mb-0.5 font-sans">Ground-Truth Snippet:</span>
                          {v.source_chunk}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </motion.div>
          )}

          {/* TAB 7: Conversations & History */}
          {activeSection === "messages" && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={spring}
              className="w-full space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest font-mono">
                    COMMUNICATION ARCHIVE
                  </span>
                  <h2 className="font-editorial text-[36px] font-normal text-white mt-1 mb-2">
                    Conversations & History
                  </h2>
                  <p className="text-xs text-slate-400">
                    Audit log of agent inquiries, syntheses, and factual consistency scores.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const text = sessionHistory
                      .map((h) => `### Query: ${h.query}\n**Agent**: ${h.agent} | **Time**: ${h.time}\n\n${h.answer}\n`)
                      .join("\n---\n\n");
                    navigator.clipboard.writeText(text);
                    setShareToast(true);
                    setTimeout(() => setShareToast(false), 2000);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 border border-white/5 transition flex items-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Copy Session Transcript</span>
                </button>
              </div>

              {/* History list */}
              <div className="space-y-4">
                {sessionHistory.length === 0 ? (
                  <div className="rune-card p-10 text-center space-y-3">
                    <MessageSquare className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-sm font-medium text-slate-300">No conversations recorded yet</p>
                    <p className="text-xs text-slate-500">
                      Inquiries submitted in the Home Studio will appear here automatically.
                    </p>
                  </div>
                ) : (
                  sessionHistory.map((item) => (
                    <div
                      key={item.id}
                      className="rune-card p-5 space-y-3 transition-all hover:border-white/15"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-[10px] font-bold text-white">
                            {item.agent[0]}
                          </div>
                          <span className="text-xs font-semibold text-white">{item.agent}</span>
                          <span className="text-[11px] text-slate-500 font-mono">• {item.time}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {item.passRate} verified
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-mono uppercase text-slate-500 mb-1">Query Prompt</h4>
                        <p className="text-sm text-slate-200 font-medium">"{item.query}"</p>
                      </div>

                      {item.answer && (
                        <div>
                          <h4 className="text-xs font-mono uppercase text-slate-500 mb-1">Synthesized Answer</h4>
                          <p className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                            {item.answer}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(item.answer);
                            setShareToast(true);
                            setTimeout(() => setShareToast(false), 2000);
                          }}
                          className="px-3 py-1 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 transition flex items-center gap-1.5"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Answer</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectQueryFromExample(item.query)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold bg-white text-black hover:bg-slate-200 transition flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-600" />
                          <span>Re-run in Studio</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ══════════════════════════════════════════════════════════
         PROVIDER SETTINGS MODAL
         ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showSettings && (
          <ProviderSettings
            key="provider-settings"
            onClose={() => {
              setShowSettings(false);
              refreshSettings();
            }}
            onSaved={() => {
              refreshSettings();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
