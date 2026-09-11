import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Search,
  Copy,
  Check,
  Globe,
  AtSign,
  Smartphone,
  Scale,
  Sparkles,
  Clock,
  ArrowRight,
  X,
} from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORY_META = {
  domains: { title: "DOMAINS", icon: Globe, testid: "category-card-domains" },
  social: { title: "SOCIAL", icon: AtSign, testid: "category-card-social" },
  appstore: { title: "APP STORE", icon: Smartphone, testid: "category-card-app-store" },
  trademark: { title: "TRADEMARK", icon: Scale, testid: "category-card-trademark" },
};

const RECENT_KEY = "nn.recent.v1";

function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(list) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
}

function StatusPill({ status, testid }) {
  const styles =
    status === "available"
      ? "bg-[#00E676] text-[#050505]"
      : status === "taken"
      ? "bg-[#FF3333] text-[#FAFAFA]"
      : "bg-[#050505] text-[#FAFAFA]";
  const label =
    status === "available" ? "AVAILABLE" : status === "taken" ? "TAKEN" : "UNKNOWN";
  return (
    <span
      data-testid={testid}
      className={`${styles} border-2 border-[#050505] font-bold font-mono uppercase px-2 py-[2px] text-[10px] tracking-widest whitespace-nowrap`}
    >
      {label}
    </span>
  );
}

function CopyButton({ text, testid }) {
  const [copied, setCopied] = useState(false);
  const btnRef = useRef(null);
  const onCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    btnRef.current?.classList.add("nn-flash");
    setTimeout(() => {
      setCopied(false);
      btnRef.current?.classList.remove("nn-flash");
    }, 500);
    toast.success(`Copied: ${text}`);
  };
  return (
    <button
      ref={btnRef}
      data-testid={testid}
      onClick={onCopy}
      className="p-1 border-2 border-[#050505] hover:bg-[#00E676] transition-colors"
      aria-label="copy"
    >
      {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} strokeWidth={3} />}
    </button>
  );
}

function ResultRow({ item, index, category }) {
  const clickable = !!item.url;
  return (
    <div
      className="nn-reveal flex justify-between items-center gap-3 py-3 border-b-2 border-[#050505]/20 last:border-0 group"
      style={{ animationDelay: `${index * 40}ms` }}
      data-testid={`result-row-${category}-${index}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="font-mono text-sm font-bold truncate">
          {item.label}
        </span>
        {item.note && (
          <span
            className="hidden md:inline text-[10px] font-mono uppercase tracking-widest text-[#050505]/50 truncate"
            title={item.note}
          >
            [{item.note}]
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusPill status={item.status} testid={`status-${category}-${index}`} />
        <CopyButton text={item.label} testid={`copy-${category}-${index}`} />
        {clickable && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            data-testid={`open-${category}-${index}`}
            className="p-1 border-2 border-[#050505] hover:bg-[#00E676] transition-colors"
            aria-label="open"
          >
            <ArrowRight size={12} strokeWidth={3} />
          </a>
        )}
      </div>
    </div>
  );
}

function CategoryCard({ categoryKey, items }) {
  const meta = CATEGORY_META[categoryKey];
  const Icon = meta.icon;
  const availableCount = items.filter((i) => i.status === "available").length;
  return (
    <section
      data-testid={meta.testid}
      className="border-4 border-[#050505] bg-white p-5 md:p-6 nn-shadow-8 flex flex-col gap-3 nn-reveal"
    >
      <header className="flex items-center justify-between border-b-2 border-[#050505] pb-3">
        <div className="flex items-center gap-3">
          <Icon size={22} strokeWidth={3} />
          <h2 className="font-display text-2xl md:text-3xl">{meta.title}</h2>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest bg-[#050505] text-[#FAFAFA] px-2 py-1">
          {availableCount}/{items.length} open
        </span>
      </header>
      <div className="flex flex-col">
        {items.map((it, i) => (
          <ResultRow key={`${categoryKey}-${i}`} item={it} index={i} category={categoryKey} />
        ))}
      </div>
    </section>
  );
}

function SuggestionCard({ suggestions, onPick }) {
  if (!suggestions?.length) return null;
  return (
    <section
      data-testid="smart-suggestions-card"
      className="border-4 border-[#050505] bg-[#050505] text-[#FAFAFA] p-5 md:p-6 nn-shadow-green flex flex-col gap-4 nn-reveal"
    >
      <header className="flex items-center gap-3 border-b-2 border-[#FAFAFA]/40 pb-3">
        <Sparkles size={22} strokeWidth={3} className="text-[#00E676]" />
        <h2 className="font-display text-2xl md:text-3xl">SMART ALTERNATIVES</h2>
      </header>
      <p className="font-mono text-xs uppercase tracking-widest text-[#FAFAFA]/60">
        Auto-generated variants where at least .com is open. Click to re-scan.
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {suggestions.map((s, i) => (
          <li key={s.name}>
            <button
              data-testid={`suggestion-${i}`}
              onClick={() => onPick(s.name)}
              className="w-full text-left border-2 border-[#FAFAFA]/40 hover:border-[#00E676] hover:bg-[#00E676]/10 px-3 py-2 flex items-center justify-between gap-3 transition-colors group"
            >
              <span className="font-mono font-bold truncate">{s.name}</span>
              <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest">
                <span
                  className={
                    s.dot_com_status === "available"
                      ? "text-[#00E676]"
                      : s.dot_com_status === "taken"
                      ? "text-[#FF3333]"
                      : "text-[#FAFAFA]/40"
                  }
                >
                  .com
                </span>
                <span className="text-[#FAFAFA]/30">/</span>
                <span
                  className={
                    s.github_status === "available"
                      ? "text-[#00E676]"
                      : s.github_status === "taken"
                      ? "text-[#FF3333]"
                      : "text-[#FAFAFA]/40"
                  }
                >
                  gh
                </span>
                <ArrowRight
                  size={12}
                  strokeWidth={3}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LoadingState({ query }) {
  return (
    <div
      data-testid="loading-state"
      className="border-4 border-[#050505] bg-white p-8 nn-shadow-8 nn-scan"
    >
      <div className="font-mono text-sm uppercase tracking-widest text-[#050505]/60">
        SCANNING NETWORK //
      </div>
      <div className="font-display text-3xl md:text-5xl mt-2 nn-cursor">
        {query.toUpperCase() || "..."}
      </div>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs uppercase tracking-widest">
        {["domains", "social", "app store", "trademark"].map((c) => (
          <div key={c} className="border-2 border-[#050505] px-3 py-2">
            {c} ...
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NameNest() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [recent, setRecent] = useState(loadRecent());
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const runCheck = useCallback(async (name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await axios.post(`${API}/check-name`, { name: trimmed }, { timeout: 120000 });
      setData(res.data);
      const next = [
        { name: res.data.slug, checked_at: res.data.checked_at, summary: res.data.summary },
        ...recent.filter((r) => r.name !== res.data.slug),
      ].slice(0, 8);
      setRecent(next);
      saveRecent(next);
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Something broke";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [recent]);

  const onSubmit = (e) => {
    e.preventDefault();
    runCheck(query);
  };

  const pickRecent = (name) => {
    setQuery(name);
    runCheck(name);
  };

  const summary = data?.summary;

  const overall = useMemo(() => {
    if (!summary) return null;
    if (summary.available === 0) return "ALL TAKEN";
    if (summary.taken === 0) return "ALL CLEAR";
    return `${summary.available} OPEN / ${summary.taken} TAKEN`;
  }, [summary]);

  return (
    <div
      data-testid="app-shell"
      className="min-h-screen bg-[#FAFAFA] text-[#050505] font-mono border-[10px] md:border-[18px] border-[#050505]"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b-4 border-[#050505] pb-4 mb-8">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl md:text-4xl">NAMENEST</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#050505]/60">
              v0.1 // brand availability scanner
            </span>
          </div>
          <span className="hidden md:inline font-mono text-[10px] uppercase tracking-widest">
            domains · handles · apps · marks
          </span>
        </header>

        {/* Hero + form */}
        <section className="mb-10">
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl leading-[0.9] mb-6">
            IS YOUR NAME
            <br />
            <span className="bg-[#00E676] px-2">STILL FREE?</span>
          </h1>
          <p className="font-mono text-sm md:text-base max-w-2xl mb-6 text-[#050505]/70">
            Type a brand name. We scan 8 TLDs, GitHub, Instagram, X, TikTok, YouTube,
            Google Play, and USPTO. In one shot.
          </p>

          <form
            onSubmit={onSubmit}
            data-testid="hero-search-form"
            className="flex flex-col md:flex-row gap-4 items-stretch"
          >
            <div className="relative flex-1 border-4 border-[#050505] bg-white nn-shadow-4">
              <Search
                size={20}
                strokeWidth={3}
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                ref={inputRef}
                data-testid="hero-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. acmerocket"
                maxLength={40}
                className="w-full bg-transparent pl-12 pr-12 py-4 md:py-5 font-display text-2xl md:text-4xl uppercase placeholder-[#050505]/25 focus:outline-none focus:bg-[#00E676]/15 transition-colors"
              />
              {query && (
                <button
                  type="button"
                  data-testid="clear-input"
                  onClick={() => {
                    setQuery("");
                    setData(null);
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 border-2 border-[#050505] hover:bg-[#FF3333] hover:text-white transition-colors"
                  aria-label="clear"
                >
                  <X size={14} strokeWidth={3} />
                </button>
              )}
            </div>
            <button
              type="submit"
              data-testid="hero-search-button"
              disabled={loading || !query.trim()}
              className="nn-btn px-8 md:px-12 py-4 md:py-5 bg-[#050505] text-[#FAFAFA] font-mono text-lg md:text-xl uppercase font-bold border-4 border-[#050505] nn-shadow-4 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "SCANNING…" : "CHECK"}
            </button>
          </form>

          {recent.length > 0 && (
            <div
              data-testid="recent-searches"
              className="mt-6 flex flex-wrap items-center gap-2"
            >
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#050505]/60 flex items-center gap-1">
                <Clock size={12} strokeWidth={3} /> RECENT
              </span>
              {recent.map((r, i) => (
                <button
                  key={r.name}
                  data-testid={`recent-item-${i}`}
                  onClick={() => pickRecent(r.name)}
                  className="border-2 border-[#050505] px-2 py-1 font-mono text-xs uppercase hover:bg-[#00E676] transition-colors"
                >
                  {r.name}
                </button>
              ))}
              <button
                data-testid="clear-recent"
                onClick={() => {
                  setRecent([]);
                  saveRecent([]);
                }}
                className="ml-2 font-mono text-[10px] uppercase tracking-widest text-[#050505]/50 hover:text-[#FF3333]"
              >
                clear
              </button>
            </div>
          )}
        </section>

        {/* Results */}
        {error && (
          <div
            data-testid="error-banner"
            className="border-4 border-[#FF3333] bg-[#FF3333]/10 p-4 mb-8 font-mono text-sm"
          >
            <strong>ERROR:</strong> {error}
          </div>
        )}

        {loading && <LoadingState query={query} />}

        {!loading && data && (
          <div data-testid="results-grid" className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b-4 border-[#050505] pb-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#050505]/60">
                  RESULTS FOR
                </div>
                <div className="font-display text-3xl md:text-5xl">
                  {data.slug.toUpperCase()}
                </div>
              </div>
              <div
                data-testid="overall-summary"
                className={`font-display text-lg md:text-2xl px-3 py-2 border-4 border-[#050505] ${
                  summary?.available === 0
                    ? "bg-[#FF3333] text-white"
                    : summary?.taken === 0
                    ? "bg-[#00E676]"
                    : "bg-white"
                }`}
              >
                {overall}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CategoryCard categoryKey="domains" items={data.domains} />
              <CategoryCard categoryKey="social" items={data.social} />
              <CategoryCard categoryKey="appstore" items={data.appstore} />
              <CategoryCard categoryKey="trademark" items={data.trademark} />
            </div>

            <SuggestionCard suggestions={data.suggestions} onPick={pickRecent} />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t-2 border-[#050505]/30 font-mono text-[10px] uppercase tracking-widest text-[#050505]/50 flex flex-wrap justify-between gap-2">
          <span>NAMENEST // built for indie hackers</span>
          <span>rdap · public web · uspto</span>
        </footer>
      </div>
    </div>
  );
}
