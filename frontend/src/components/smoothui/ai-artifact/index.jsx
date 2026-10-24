import { cn } from "@/lib/utils";
import { Copy, Check, Terminal, ExternalLink } from "lucide-react";
import { useState } from "react";

export default function AIArtifact({
  title = "verification_contract_analysis.json",
  language = "json",
  content = `{\n  "status": "VERIFIED_SUPPORTED",\n  "audit_version": "2.4.1",\n  "claims_evaluated": 2,\n  "hallucination_index": 0.00,\n  "evidence_provenance": "ChromaDB::Contract_2025.pdf"\n}`,
  className,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("w-full rounded-2xl overflow-hidden border border-white/10 bg-[#0c0d14]/90 backdrop-blur-2xl shadow-xl", className)}>
      {/* Apple macOS style Window Titlebar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10 select-none">
        <div className="flex items-center gap-2">
          {/* macOS traffic light window dots */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/10 inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/10 inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/10 inline-block" />
          </div>
          <span className="ml-2 font-mono text-xs text-slate-300 font-medium flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-pink-400" />
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase text-slate-400 px-2 py-0.5 rounded-md bg-white/5 border border-white/5">
            {language}
          </span>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px]"
            title="Copy artifact"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-mono">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="font-mono">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed bg-black/40">
        <code>{content}</code>
      </pre>
    </div>
  );
}
