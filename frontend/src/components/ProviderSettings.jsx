import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getProviderSettings, saveProviderSettings } from "../api";
import GlowingEffect from "./GlowingEffect";

/* ── Spring presets ─────────────────────────────────────────────── */
const spring = { type: "spring", stiffness: 260, damping: 26, mass: 0.9 };
const springBouncy = { type: "spring", stiffness: 420, damping: 12, mass: 0.5 };
const springSnappy = { type: "spring", stiffness: 600, damping: 28, mass: 0.6 };

/* ── Provider metadata ──────────────────────────────────────────── */
const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    tagline: "Cloud · GPT models",
    color: "#10a37f",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3z" />
        <path d="M19 14l.9 2.3 2.1.7-2.1.7L19 20l-.9-2.3-2.1-.7 2.1-.7L19 14z" />
        <path d="M5 14l.9 2.3 2.1.7-2.1.7L5 20l-.9-2.3-2.1-.7 2.1-.7L5 14z" />
      </svg>
    ),
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    tagline: "One key · many models",
    color: "#8b5cf6",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="19" r="2.5" />
        <circle cx="18" cy="5" r="2.5" />
        <circle cx="18" cy="19" r="2.5" />
        <path d="M8.2 17.5L15.8 6.5" />
        <path d="M15.8 17.5L8.2 6.5" />
      </svg>
    ),
  },
  {
    id: "ollama",
    name: "Ollama",
    tagline: "Local · free · offline",
    color: "#34d399",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
        <line x1="9" y1="1.5" x2="9" y2="4" />
        <line x1="15" y1="1.5" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="22.5" />
        <line x1="15" y1="20" x2="15" y2="22.5" />
      </svg>
    ),
  },
];

const DEFAULT_MODELS = {
  openaiModel: "gpt-4o-mini",
  openaiBase: "https://api.openai.com/v1",
  openrouterModel: "openai/gpt-4o-mini",
  openrouterBase: "https://openrouter.ai/api/v1",
  ollamaUrl: "http://localhost:11434",
  embed: "nomic-embed-text",
  draft: "llama3.2:1b",
  verify: "llama3.2:1b",
};

/* ── Small building blocks ──────────────────────────────────────── */

function Field({ label, value, onChange, placeholder, secret, hint }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block">
      <span className="mono-metric font-semibold text-muted uppercase tracking-wider mb-1.5 block">
        {label}
      </span>
      <div className="relative">
        <input
          type={secret && !visible ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="input-glass w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono"
        />
        {secret && (
          <motion.button
            type="button"
            onClick={() => setVisible((v) => !v)}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            transition={springSnappy}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
            aria-label={visible ? "Hide key" : "Show key"}
          >
            {visible ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <line x1="12" y1="3" x2="12" y2="21" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
          </motion.button>
        )}
      </div>
      {hint && <span className="mono-metric text-dim mt-1 block text-[10px]">{hint}</span>}
    </label>
  );
}

function Note({ children }) {
  return (
    <div className="relative overflow-hidden flex items-start gap-2 rounded-xl bg-[rgba(26,226,16,0.04)] border border-[var(--border-accent)] px-3 py-2.5">
      <GlowingEffect spread={24} proximity={40} inactiveZone={0.03} borderWidth={0.75} />
      <svg className="mt-0.5 shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1AE210" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span className="mono-metric text-muted text-[11px] leading-relaxed">{children}</span>
    </div>
  );
}

function Spinner() {
  return (
    <motion.svg
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24" fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </motion.svg>
  );
}

/* ── Main component ─────────────────────────────────────────────── */

export default function ProviderSettings({ onClose, onSaved }) {
  const [provider, setProvider] = useState("ollama");
  const [models, setModels] = useState(DEFAULT_MODELS);
  const [keys, setKeys] = useState({ openai: "", openrouter: "" });
  const [keyPlaceholder, setKeyPlaceholder] = useState({ openai: "", openrouter: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  /* Load current settings from the backend on mount */
  useEffect(() => {
    let active = true;
    getProviderSettings()
      .then((s) => {
        if (!active) return;
        setProvider(s.provider || "ollama");
        setModels({
          openaiModel: s.openai_model || DEFAULT_MODELS.openaiModel,
          openaiBase: s.openai_base_url || DEFAULT_MODELS.openaiBase,
          openrouterModel: s.openrouter_model || DEFAULT_MODELS.openrouterModel,
          openrouterBase: s.openrouter_base_url || DEFAULT_MODELS.openrouterBase,
          ollamaUrl: s.ollama_base_url || DEFAULT_MODELS.ollamaUrl,
          embed: s.embedding_model || DEFAULT_MODELS.embed,
          draft: s.draft_model || DEFAULT_MODELS.draft,
          verify: s.verifier_model || DEFAULT_MODELS.verify,
        });
        setKeyPlaceholder({ openai: s.openai_api_key || "", openrouter: s.openrouter_api_key || "" });
      })
      .catch(() => {})
      .finally(() => active && setLoaded(true));
    return () => { active = false; };
  }, []);

  /* Close on Escape */
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await saveProviderSettings({
        provider,
        openai_api_key: keys.openai,
        openai_model: models.openaiModel,
        openai_base_url: models.openaiBase,
        openrouter_api_key: keys.openrouter,
        openrouter_model: models.openrouterModel,
        openrouter_base_url: models.openrouterBase,
        ollama_base_url: models.ollamaUrl,
        embedding_model: models.embed,
        draft_model: models.draft,
        verifier_model: models.verify,
      });
      setSaved(true);
      onSaved?.(res.provider);
      // Refresh the masked placeholder with the newly-saved key
      setKeyPlaceholder((prev) => ({
        openai: res.openai_api_key || prev.openai,
        openrouter: res.openrouter_api_key || prev.openrouter,
      }));
      setKeys({ openai: "", openrouter: "" });
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(err.message ?? "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }, [provider, keys, models, onSaved]);

  const active = PROVIDERS.find((p) => p.id === provider);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Model provider settings"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.95, y: 12, filter: "blur(8px)" }}
        transition={spring}
        className="relative glass-elevated rounded-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto"
      >
        <GlowingEffect spread={48} glow proximity={72} inactiveZone={0.005} borderWidth={1.25} />
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springBouncy}
              className="w-9 h-9 rounded-xl bg-[rgba(26,226,16,0.08)] flex items-center justify-center mb-2.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1AE210" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </motion.div>
            <h2 className="heading-md text-[17px]">Model provider</h2>
            <p className="mono-metric text-muted mt-0.5 text-[11px]">
              Pick where answers come from — cloud API or local Ollama
            </p>
          </div>
          <motion.button
            type="button"
            onClick={onClose}
            whileHover={{ scale: 1.15, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            transition={springSnappy}
            className="text-muted hover:text-primary p-1.5 -mr-1.5"
            aria-label="Close settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </motion.button>
        </div>

        {/* Provider cards */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {PROVIDERS.map((p) => {
            const isActive = provider === p.id;
            return (
              <motion.button
                key={p.id}
                type="button"
                onClick={() => { setProvider(p.id); setSaved(false); setError(null); }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                animate={{
                  borderColor: isActive ? "rgba(26,226,16,0.35)" : "var(--border-glass)",
                  background: isActive ? "rgba(26,226,16,0.06)" : "var(--bg-card)",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="relative overflow-hidden rounded-xl px-3 py-3.5 text-left border"
              >
                <GlowingEffect spread={26} proximity={44} inactiveZone={0.02} borderWidth={0.75} />
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${p.color}14`, color: p.color }}
                  >
                    {p.icon}
                  </span>
                  <AnimatePresence>
                    {isActive && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={springBouncy}
                        className="w-2 h-2 rounded-full"
                        style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }}
                      />
                    )}
                  </AnimatePresence>
                </div>
                <p className="text-[13px] font-semibold text-primary">{p.name}</p>
                <p className="mono-metric text-muted mt-0.5 text-[10px]">{p.tagline}</p>
              </motion.button>
            );
          })}
        </div>

        {/* Provider-specific fields */}
        <AnimatePresence mode="wait">
          <motion.div
            key={provider}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ ...spring, duration: 0.25 }}
            className="space-y-3.5"
          >
            {provider === "openai" && (
              <>
                <Field
                  label="API Key"
                  secret
                  value={keys.openai}
                  onChange={(v) => setKeys((k) => ({ ...k, openai: v }))}
                  placeholder={keyPlaceholder.openai ? `${keyPlaceholder.openai} (saved — type to replace)` : "sk-…"}
                  hint="Required. Stored in provider_settings.json on this machine only."
                />
                <Field
                  label="Model"
                  value={models.openaiModel}
                  onChange={(v) => setModels((m) => ({ ...m, openaiModel: v }))}
                  placeholder="gpt-4o-mini"
                />
                <Field
                  label="Base URL (optional)"
                  value={models.openaiBase}
                  onChange={(v) => setModels((m) => ({ ...m, openaiBase: v }))}
                  placeholder="https://api.openai.com/v1"
                />
                <Note>
                  OpenAI handles answers, verification, and embeddings. Existing
                  documents embedded with a different model should be re-uploaded.
                </Note>
              </>
            )}

            {provider === "openrouter" && (
              <>
                <Field
                  label="API Key"
                  secret
                  value={keys.openrouter}
                  onChange={(v) => setKeys((k) => ({ ...k, openrouter: v }))}
                  placeholder={keyPlaceholder.openrouter ? `${keyPlaceholder.openrouter} (saved — type to replace)` : "sk-or-…"}
                  hint="Required. Stored in provider_settings.json on this machine only."
                />
                <Field
                  label="Model"
                  value={models.openrouterModel}
                  onChange={(v) => setModels((m) => ({ ...m, openrouterModel: v }))}
                  placeholder="openai/gpt-4o-mini"
                />
                <Field
                  label="Base URL (optional)"
                  value={models.openrouterBase}
                  onChange={(v) => setModels((m) => ({ ...m, openrouterBase: v }))}
                  placeholder="https://openrouter.ai/api/v1"
                />
                <Note>
                  OpenRouter powers answers &amp; verification. Embeddings use your
                  OpenAI key if saved, else local Ollama, else a built-in offline
                  fallback — so uploads work even without either.
                </Note>
              </>
            )}

            {provider === "ollama" && (
              <>
                <Field
                  label="Ollama URL"
                  value={models.ollamaUrl}
                  onChange={(v) => setModels((m) => ({ ...m, ollamaUrl: v }))}
                  placeholder="http://localhost:11434"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="Embed model"
                    value={models.embed}
                    onChange={(v) => setModels((m) => ({ ...m, embed: v }))}
                    placeholder="nomic-embed-text"
                  />
                  <Field
                    label="Draft model"
                    value={models.draft}
                    onChange={(v) => setModels((m) => ({ ...m, draft: v }))}
                    placeholder="llama3.2:1b"
                  />
                  <Field
                    label="Verifier model"
                    value={models.verify}
                    onChange={(v) => setModels((m) => ({ ...m, verify: v }))}
                    placeholder="llama3.2:1b"
                  />
                </div>
                <Note>
                  Fully local, free, and private. Pull models first with{" "}
                  <code className="text-[#1AE210]">ollama pull llama3.2:1b</code>.
                </Note>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-separator">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="mono-metric text-dim text-[10px] max-w-[190px] leading-relaxed">
              {active?.name} selected · applies to the next pipeline run
            </p>
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {error && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="mono-metric text-[#fb7185] text-[11px] max-w-[160px] truncate"
                    title={error}
                  >
                    {error}
                  </motion.span>
                )}
              </AnimatePresence>
              <motion.button
                type="button"
                onClick={onClose}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                transition={springSnappy}
                className="glass rounded-xl px-4 py-2.5 text-[12px] mono-metric text-muted"
              >
                Close
              </motion.button>
              <motion.button
                type="button"
                onClick={handleSave}
                disabled={saving || !loaded}
                whileHover={!saving && loaded ? { scale: 1.03 } : {}}
                whileTap={!saving && loaded ? { scale: 0.95 } : {}}
                transition={springBouncy}
                className={`rounded-xl px-4 py-2.5 text-[12px] font-medium mono-metric flex items-center gap-2 border disabled:opacity-50 ${
                  saved
                    ? "badge-pass"
                    : "glass-glow text-[#1AE210] border-[rgba(26,226,16,0.12)]"
                }`}
              >
                {saving ? (
                  <>
                    <Spinner /> Saving…
                  </>
                ) : saved ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Applied
                  </>
                ) : (
                  "Save & apply"
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
