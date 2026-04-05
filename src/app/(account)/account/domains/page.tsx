"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Globe, Plus, RefreshCw, ShieldCheck, ShieldAlert, Copy,
  Trash2, ChevronDown, ChevronUp, Check, Terminal, Code2,
  FileText, Clock, Zap, Lock, AlertTriangle, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────────────
interface Domain {
  id:                string;
  name:              string;
  isVerified:        boolean;
  verificationToken: string;
  verificationHost:  string;
  createdAt:         string;
  updatedAt?:        string;
}

type Method = "txt" | "meta" | "file";

// ─── Copy button ─────────────────────────────────────────────────────
function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 text-xs font-medium transition-all"
    >
      {copied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />{label ?? "Copy"}</>}
    </button>
  );
}

// ─── Inline code block ───────────────────────────────────────────────
function CodeBlock({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{label}</p>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800/60">
        <span className={cn("text-sm text-slate-200 break-all", mono && "font-mono")}>{value}</span>
        <CopyBtn value={value} />
      </div>
    </div>
  );
}

// ─── Shimmer skeleton ────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={cn("h-20 rounded-2xl bg-slate-900/40 animate-pulse", i > 1 && "opacity-60")} />
      ))}
    </div>
  );
}

// ─── Domain card ─────────────────────────────────────────────────────
function DomainCard({
  domain,
  onDelete,
  onVerify,
  verifying,
}: {
  domain:   Domain;
  onDelete: (id: string) => void;
  onVerify: (id: string) => void;
  verifying:string | null;
}) {
  const [expanded, setExpanded] = useState(!domain.isVerified);
  const [method,   setMethod]   = useState<Method>("txt");

  const isVerifying = verifying === domain.id;

  const METHODS: { id: Method; label: string; icon: React.ElementType; desc: string }[] = [
    { id: "txt",  label: "DNS TXT",    icon: Terminal, desc: "Add a TXT record to your DNS. Works with every registrar." },
    { id: "meta", label: "HTML Meta",  icon: Code2,    desc: "Add a <meta> tag to your homepage <head>." },
    { id: "file", label: "File Upload",icon: FileText, desc: "Host a plain-text file at your domain root." },
  ];

  return (
    <div className={cn(
      "relative rounded-2xl overflow-hidden border transition-all duration-300",
      domain.isVerified
        ? "bg-gradient-to-r from-emerald-950/40 to-slate-900/40 border-emerald-500/20"
        : "bg-[#0d0e1a] border-slate-800/60 hover:border-slate-700/60",
    )}>
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.015] to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

      {/* Top accent line for verified */}
      {domain.isVerified && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      )}

      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Icon */}
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
          domain.isVerified
            ? "bg-emerald-500/10 border-emerald-500/20"
            : "bg-amber-500/8 border-amber-500/15",
        )}>
          {domain.isVerified
            ? <ShieldCheck className="h-5 w-5 text-emerald-400" />
            : <ShieldAlert  className="h-5 w-5 text-amber-400" />}
        </div>

        {/* Domain info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-base font-bold text-white truncate">{domain.name}</span>
            {domain.isVerified ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <Check className="h-2.5 w-2.5" /> Verified
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/8 border border-amber-500/15 px-2 py-0.5 rounded-full">
                <Clock className="h-2.5 w-2.5" /> Pending
              </span>
            )}
            {domain.isVerified && (
              <span className="text-[10px] font-semibold text-violet-400 bg-violet-500/8 border border-violet-500/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Zap className="h-2.5 w-2.5" /> Tools Unlocked
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Added {new Date(domain.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
            {domain.isVerified && domain.updatedAt && (
              <> · Verified {new Date(domain.updatedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!domain.isVerified && (
            <button
              onClick={() => onVerify(domain.id)}
              disabled={isVerifying}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-violet-300 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 transition-all disabled:opacity-50"
            >
              {isVerifying
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying…</>
                : <><RefreshCw className="h-3.5 w-3.5" /> Re-verify</>}
            </button>
          )}
          <button
            onClick={() => setExpanded((p) => !p)}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onDelete(domain.id)}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded panel — only for pending domains */}
      {expanded && !domain.isVerified && (
        <div className="border-t border-slate-800/50 px-5 py-5 space-y-5">

          {/* Method tabs */}
          <div className="flex gap-2">
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border",
                  method === m.id
                    ? "bg-violet-600/20 text-violet-300 border-violet-500/30"
                    : "text-slate-500 border-slate-800/50 hover:text-slate-200 hover:border-slate-700/60",
                )}
              >
                <m.icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            ))}
          </div>

          {/* DNS TXT instructions */}
          {method === "txt" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400 leading-relaxed">
                Add the following TXT record to your DNS provider (Cloudflare, GoDaddy, Namecheap, Route 53, etc.)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CodeBlock label="TYPE" value="TXT" />
                <CodeBlock label="TTL"  value="3600" />
              </div>
              <CodeBlock label="HOST / NAME"   value={domain.verificationHost} />
              <CodeBlock label="VALUE / CONTENT" value={domain.verificationToken} />
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-300/80 leading-relaxed">
                  <strong>DNS propagation</strong> can take 2–48 hours globally. After adding the record, click "Re-verify" to check.
                </p>
              </div>
            </div>
          )}

          {/* Meta tag instructions */}
          {method === "meta" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400 leading-relaxed">
                Add this meta tag inside the <code className="text-violet-300 text-xs bg-violet-500/10 px-1.5 py-0.5 rounded">&lt;head&gt;</code> of your homepage.
              </p>
              <CodeBlock
                label="HTML META TAG"
                value={`<meta name="pentellia-verification" content="${domain.verificationToken}" />`}
              />
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/15">
                <Check className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-300/80 leading-relaxed">
                  Meta verification is instant after deployment. No DNS propagation required.
                </p>
              </div>
            </div>
          )}

          {/* File upload instructions */}
          {method === "file" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400 leading-relaxed">
                Create a plain-text file and host it at the URL below.
              </p>
              <CodeBlock label="FILE URL" value={`https://${domain.name}/.well-known/pentellia-verification.txt`} />
              <CodeBlock label="FILE CONTENTS" value={domain.verificationToken} />
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/15">
                <Check className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-300/80 leading-relaxed">
                  Ideal for static sites. Verification is instant once the file is accessible.
                </p>
              </div>
            </div>
          )}

          {/* Verify button */}
          <button
            onClick={() => onVerify(domain.id)}
            disabled={isVerifying}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-[0_4px_20px_rgba(124,58,237,0.3)] transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {isVerifying
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking DNS records…</>
              : <><ShieldCheck className="h-4 w-4" /> Verify Domain Ownership</>}
          </button>
        </div>
      )}

      {/* Expanded panel — verified domain shows scan-ready info */}
      {expanded && domain.isVerified && (
        <div className="border-t border-emerald-500/10 px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>This domain is verified. All Pentellia scanning tools are unlocked for <strong>{domain.name}</strong> and its sub-assets.</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────
export default function DomainsPage() {
  const [domains,   setDomains]   = useState<Domain[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [adding,    setAdding]    = useState(false);
  const [newName,   setNewName]   = useState("");
  const [verifying, setVerifying] = useState<string | null>(null);
  const bgPollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDomains = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res  = await fetch("/api/domains");
      const data = await res.json();
      if (data.data) setDomains(data.data);
    } catch {}
    finally  { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchDomains();

    // Background auto-polling every 3 min — auto-verifies pending domains
    bgPollRef.current = setInterval(async () => {
      const res  = await fetch("/api/domains").catch(() => null);
      if (!res?.ok) return;
      const data = await res.json().catch(() => null);
      if (!data?.data) return;

      const newDomains: Domain[] = data.data;
      setDomains((prev) => {
        const justVerified = newDomains.filter(
          (nd) => nd.isVerified && prev.find((od) => od.id === nd.id && !od.isVerified),
        );
        if (justVerified.length > 0) {
          justVerified.forEach((d) => {
            toast.success(`✓ ${d.name} is now verified`, { duration: 6000 });
          });
          window.dispatchEvent(new Event("refresh-notifications"));
        }
        return newDomains;
      });
    }, 3 * 60 * 1000); // 3 minutes

    return () => { if (bgPollRef.current) clearInterval(bgPollRef.current); };
  }, [fetchDomains]);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const res  = await fetch("/api/domains", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Domain added — choose a verification method to unlock scanning.");
        setNewName("");
        await fetchDomains(true);
      } else if (res.status === 409) {
        // Domain already verified by another account
        toast.error(data.error ?? "This domain is already claimed by another account.");
      } else {
        toast.error(data.error ?? data.message ?? "Failed to add domain");
      }
    } catch { toast.error("Network error"); }
    finally  { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    setDomains((p) => p.filter((d) => d.id !== id));
    await fetch(`/api/domains/${id}`, { method: "DELETE" }).catch(() => {});
    toast.success("Domain removed");
  };

  const handleVerify = async (id: string) => {
    setVerifying(id);
    try {
      const res  = await fetch(`/api/domains/${id}/verify`, { method: "POST" });
      const data = await res.json();
      if (res.ok && (data.success || data.message?.includes("verified"))) {
        toast.success("Domain verified! All scanning tools are now unlocked.");
        window.dispatchEvent(new Event("refresh-notifications"));
        await fetchDomains(true);
      } else if (res.status === 409) {
        toast.error(data.error ?? "This domain was claimed by another account before verification completed.");
      } else {
        toast.error(data.error ?? data.message ?? "Verification failed — check your DNS / file / meta tag and try again.");
      }
    } catch { toast.error("Network error"); }
    finally  { setVerifying(null); }
  };

  const total    = domains.length;
  const verified = domains.filter((d) => d.isVerified).length;
  const pending  = total - verified;

  return (
    <div className="w-full space-y-8 pb-16 max-w-5xl xl:max-w-none">

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Globe className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Domain Verification</h1>
            <p className="text-sm text-slate-500 mt-0.5">Verify ownership to unlock security scanning tools</p>
          </div>
        </div>
        <button
          onClick={() => fetchDomains(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/50 transition-all"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* ── Stats row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Domains", value: total,    color: "text-white",        bg: "from-slate-800/60 to-slate-900/40",   border: "border-slate-700/40" },
          { label: "Verified",      value: verified, color: "text-emerald-400",  bg: "from-emerald-950/60 to-slate-900/40", border: "border-emerald-500/20" },
          { label: "Pending",       value: pending,  color: "text-amber-400",    bg: "from-amber-950/40 to-slate-900/40",   border: "border-amber-500/15" },
        ].map((s) => (
          <div key={s.label}
            className={cn("relative rounded-2xl p-5 bg-gradient-to-br border overflow-hidden", s.bg, s.border)}>
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/[0.01] to-transparent" />
            <p className="text-3xl font-black tabular-nums text-white mb-1">{s.value}</p>
            <p className={cn("text-xs font-semibold uppercase tracking-widest", s.color)}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Why it matters ───────────────────────────────────── */}
      <div className="relative rounded-2xl bg-gradient-to-r from-violet-950/60 to-indigo-950/40 border border-violet-500/15 p-5 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 blur-[80px] pointer-events-none rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="flex items-start gap-3 relative z-10">
          <Lock className="h-5 w-5 text-violet-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white mb-1">Why domain verification matters</p>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Pentellia only scans infrastructure you own. Verification prevents unauthorized scanning of third-party assets, ensures compliance, and unlocks the full toolset including vulnerability scanners, asset monitoring, and AI threat analysis.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Prevents abuse","Ensures compliance","Unlocks all tools","Required for AI reports"].map((tag) => (
                <span key={tag} className="text-[10px] font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/15 px-2.5 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add domain ───────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#0d0e1a] border border-slate-800/60 p-6 space-y-2">
        <h3 className="text-sm font-semibold text-white">Add a Domain</h3>
        <p className="text-xs text-slate-500">Enter the root domain only — e.g. <code className="text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">example.com</code></p>
        <div className="flex gap-3 mt-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="yourdomain.com"
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-900/70 border border-slate-700/60 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="flex items-center gap-2 px-5 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold shadow-[0_4px_14px_rgba(124,58,237,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Domain
          </button>
        </div>
      </div>

      {/* ── Domain list ──────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Your Domains</h3>
          {pending > 0 && (
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Auto-checking every 3 min
            </span>
          )}
        </div>

        {loading ? <Skeleton /> : domains.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/20 py-16 flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-slate-800/60 flex items-center justify-center">
              <Globe className="h-7 w-7 text-slate-600" />
            </div>
            <p className="text-slate-400 text-sm font-medium">No domains added yet</p>
            <p className="text-slate-600 text-xs">Add your first domain above to unlock scanning</p>
          </div>
        ) : (
          domains.map((d) => (
            <DomainCard key={d.id} domain={d} onDelete={handleDelete} onVerify={handleVerify} verifying={verifying} />
          ))
        )}
      </div>

      {/* ── Security notes ───────────────────────────────────── */}
      <div className="rounded-2xl bg-[#0d0e1a] border border-slate-800/60 p-5">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5" /> Security & Compliance Notes
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: Lock,    title: "One-time verification",   body: "Tokens are single-use and rotated after verification. No replay attacks possible." },
            { icon: Globe,   title: "DNS propagation",         body: "TXT records can take up to 48 hours globally. Meta and file methods are instant." },
            { icon: AlertTriangle, title: "Scope limitation",  body: "Scanning is restricted to your verified domain and its direct sub-assets only." },
            { icon: RefreshCw,    title: "Re-verification",    body: "If you rotate DNS or change hosting, re-verify to keep tool access uninterrupted." },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/40">
              <item.icon className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-300 mb-0.5">{item.title}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}