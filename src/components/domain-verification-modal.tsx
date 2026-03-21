"use client";

// src/components/domain-verification-modal.tsx
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDomainGate } from "@/context/DomainVerificationContext";
import { DomainRecord } from "@/hooks/useDomainVerification";
import toast from "react-hot-toast";
import {
  ShieldCheck,
  Globe,
  Code2,
  FileCode,
  Terminal,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  ChevronRight,
  Clock,
  Plus,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────

type VerifyMethod = "txt" | "meta" | "file";
type ModalStep = "enter-domain" | "choose-method" | "instructions";

const METHODS = [
  {
    id: "txt" as VerifyMethod,
    label: "DNS TXT Record",
    icon: Terminal,
    desc: "Add a TXT record to your DNS. Recommended — works with every registrar.",
    difficulty: "Easy",
    colorCls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    time: "2–48 hrs (DNS propagation)",
  },
  {
    id: "meta" as VerifyMethod,
    label: "HTML Meta Tag",
    icon: Code2,
    desc: "Add a <meta> tag to your homepage <head>. Good when DNS access is unavailable.",
    difficulty: "Easy",
    colorCls: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    time: "Instant after deploy",
  },
  {
    id: "file" as VerifyMethod,
    label: "HTML Verification File",
    icon: FileCode,
    desc: "Upload a plain-text file to your domain root. Ideal for static sites.",
    difficulty: "Moderate",
    colorCls: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    time: "Instant after deploy",
  },
];

// ─────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={cn(
        "p-1.5 rounded-md transition-colors shrink-0",
        copied
          ? "text-emerald-400 bg-emerald-500/10"
          : "text-slate-400 hover:text-white hover:bg-white/10",
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#080910] overflow-hidden">
      {label && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/[0.02]">
          <span className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">
            {label}
          </span>
          <CopyBtn text={code} />
        </div>
      )}
      <div className="relative group">
        {!label && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyBtn text={code} />
          </div>
        )}
        <pre className="p-4 text-sm text-violet-300 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap break-all pr-10">
          {code}
        </pre>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 mt-0.5">
        <div className="h-6 w-6 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
          <span className="text-[11px] font-bold text-violet-400">{n}</span>
        </div>
      </div>
      <div className="flex-1 space-y-2.5">
        <p className="text-sm font-semibold text-slate-200 leading-tight">{title}</p>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Modal
// ─────────────────────────────────────────────

export function DomainVerificationModal() {
  const { isModalOpen, closeModal, domains, refresh, hasVerifiedDomain } =
    useDomainGate();

  const [step, setStep] = useState<ModalStep>("enter-domain");
  const [domainInput, setDomainInput] = useState("");
  const [method, setMethod] = useState<VerifyMethod>("txt");
  const [activeDomain, setActiveDomain] = useState<DomainRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Pre-fill pending domain when modal opens
  useEffect(() => {
    if (!isModalOpen) return;
    const pending = domains.find((d) => !d.isVerified);
    if (pending) {
      setActiveDomain(pending);
      setDomainInput(pending.name);
      setStep("choose-method");
    }
  }, [isModalOpen]);

  // Reset on close
  useEffect(() => {
    if (!isModalOpen) {
      setTimeout(() => {
        setStep("enter-domain");
        setDomainInput("");
        setActiveDomain(null);
        setCooldown(0);
        setLastChecked(null);
      }, 300);
    }
  }, [isModalOpen]);

  // ── Add domain ─────────────────────────────────────────────
  const handleAddDomain = async () => {
    if (!domainInput.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: domainInput.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.data) {
        setActiveDomain(data.data);
        await refresh();
        setStep("choose-method");
      } else if (res.status === 400 && data.message?.includes("already")) {
        // Domain exists — find it
        await refresh();
        const found = domains.find((d) =>
          d.name ===
          domainInput
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, "")
            .replace(/^www\./, "")
            .replace(/\/.*$/, ""),
        );
        if (found) {
          setActiveDomain(found);
          setStep("choose-method");
        } else {
          toast.error("Domain already added. Refresh and try again.");
        }
      } else {
        toast.error(data.message || "Failed to add domain.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // ── Verify ─────────────────────────────────────────────────
  const runVerify = async (): Promise<boolean> => {
    if (!activeDomain) return false;
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/domains/${activeDomain.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      const data = await res.json();

      setLastChecked(new Date());

      if (res.ok) {
        await refresh();
        toast.success("🎉 Domain verified! All tools are now unlocked.");
        closeModal();
        return true;
      } else {
        toast.error(data.message || "Verification failed. Check your settings and try again.");
        setCooldown(15);
        return false;
      }
    } catch {
      toast.error("Verification check failed. Please try again.");
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRefresh = async () => {
    if (cooldown > 0 || isVerifying) return;
    await runVerify();
  };

  // ── Data shortcuts ─────────────────────────────────────────
  const token = activeDomain?.verificationToken ?? "";
  const domainName = activeDomain?.name ?? "";
  const vHost = activeDomain?.verificationHost ?? `_pentellia.${domainName}`;
  const metaTag = `<meta name="pentellia-site-verification" content="${token}" />`;
  const fileName = `pentellia-${token}.txt`;
  const fileContent = `pentellia-site-verification: ${token}`;
  const fileUrl = `https://${domainName}/${fileName}`;

  // ── Instructions per method ────────────────────────────────
  const renderInstructions = () => {
    if (method === "txt") {
      return (
        <div className="space-y-5">
          <Step n={1} title="Log in to your DNS provider">
            <p className="text-xs text-slate-400 leading-relaxed">
              Open your registrar or DNS host (Cloudflare, GoDaddy, Namecheap, Route 53, etc.)
              and navigate to your DNS management page.
            </p>
          </Step>

          <Step n={2} title="Create a new TXT record with these exact values">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Type</p>
                  <p className="text-sm font-mono text-white">TXT</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">TTL</p>
                  <p className="text-sm font-mono text-white">3600 (or Auto)</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Host / Name</p>
                <CodeBlock code={vHost} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Value / Content</p>
                <CodeBlock code={token} />
              </div>
            </div>
          </Step>

          <Step n={3} title="Save and wait for DNS propagation">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/80 leading-relaxed">
                DNS changes can take <strong>2–48 hours</strong> to propagate. Come back here
                once you've added the record and click "Check Verification".
              </p>
            </div>
          </Step>

          <Step n={4} title="Click 'Check Verification' below">
            <p className="text-xs text-slate-400">We'll look up the DNS record and confirm it matches.</p>
          </Step>
        </div>
      );
    }

    if (method === "meta") {
      return (
        <div className="space-y-5">
          <Step n={1} title="Copy the meta tag below">
            <CodeBlock code={metaTag} label="Meta Tag" />
          </Step>

          <Step n={2} title={`Paste it inside <head> of https://${domainName}/`}>
            <p className="text-xs text-slate-400 leading-relaxed">
              It must be on your root homepage — not a sub-page. Paste it immediately after
              your opening <code className="text-violet-400">&lt;head&gt;</code> tag.
            </p>
            <CodeBlock
              label="Example"
              code={`<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Site</title>\n    ${metaTag}\n  </head>\n  ...\n</html>`}
            />
          </Step>

          <Step n={3} title="Deploy your site">
            <p className="text-xs text-slate-400">
              Make sure the page is publicly accessible — no authentication or redirects.
            </p>
          </Step>

          <Step n={4} title="Click 'Check Verification' below">
            <p className="text-xs text-slate-400">We'll fetch your homepage and scan for the tag.</p>
          </Step>
        </div>
      );
    }

    // file
    return (
      <div className="space-y-5">
        <Step n={1} title="Create a plain-text file with this exact name and content">
          <div className="space-y-2">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Filename</p>
              <CodeBlock code={fileName} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">File Content (exact)</p>
              <CodeBlock code={fileContent} />
            </div>
          </div>
        </Step>

        <Step n={2} title="Upload to your domain root">
          <p className="text-xs text-slate-400 leading-relaxed">
            The file must be accessible at:
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 min-w-0">
              <CodeBlock code={fileUrl} />
            </div>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </Step>

        <Step n={3} title="Ensure no auth or redirect blocks the file">
          <p className="text-xs text-slate-400">
            The file must return HTTP 200 with the exact content — no HTML wrapper.
          </p>
        </Step>

        <Step n={4} title="Click 'Check Verification' below" />
      </div>
    );
  };

  // Breadcrumb steps
  const STEPS: { key: ModalStep; label: string }[] = [
    { key: "enter-domain", label: "Add Domain" },
    { key: "choose-method", label: "Choose Method" },
    { key: "instructions", label: "Instructions" },
  ];

  const stepIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent
        className="max-w-[560px] bg-[#0B0C15] border border-white/10 text-slate-200 p-0 overflow-hidden max-h-[92vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* ── Header ───────────────────────────────── */}
        <div className="bg-gradient-to-r from-violet-600/20 to-indigo-600/10 border-b border-white/10 px-6 py-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/20 border border-violet-500/30 shrink-0">
              <ShieldCheck className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <DialogTitle className="text-white text-lg font-bold leading-tight">
                Verify Your Domain
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-0.5">
                Ownership verification is required before using Pentellia tools
              </DialogDescription>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 mt-4 text-xs">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3 w-3 text-slate-600" />}
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full transition-colors",
                    step === s.key
                      ? "bg-violet-500/30 text-violet-300 font-semibold"
                      : i < stepIdx
                        ? "text-emerald-400"
                        : "text-slate-600",
                  )}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Scrollable Body ───────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ══════════════════════════════════════════
              STEP 1 — Enter Domain
          ══════════════════════════════════════════ */}
          {step === "enter-domain" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <Info className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 leading-relaxed space-y-1">
                  <p className="font-semibold text-violet-300">Why verify?</p>
                  <p>
                    Pentellia only scans domains you own. Verification prevents abuse
                    and unlocks the full security toolset for your infrastructure.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-300 uppercase tracking-wider font-semibold">
                  Your Domain
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                      placeholder="example.com"
                      className="pl-9 h-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-violet-500"
                    />
                  </div>
                  <Button
                    onClick={handleAddDomain}
                    disabled={isCreating || !domainInput.trim()}
                    className="bg-violet-600 hover:bg-violet-500 text-white h-10 px-5 shrink-0"
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Continue
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Root domain only — e.g.{" "}
                  <span className="text-slate-400">example.com</span>, not
                  www.example.com
                </p>
              </div>

              {/* Previously added domains */}
              {domains.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Your domains
                  </p>
                  {domains.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        if (!d.isVerified) {
                          setActiveDomain(d);
                          setDomainInput(d.name);
                          setStep("choose-method");
                        }
                      }}
                      disabled={d.isVerified}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                        d.isVerified
                          ? "border-emerald-500/30 bg-emerald-500/5 cursor-default"
                          : "border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Globe
                          className={cn(
                            "h-4 w-4",
                            d.isVerified ? "text-emerald-400" : "text-slate-500",
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm font-medium",
                            d.isVerified ? "text-emerald-300" : "text-slate-300",
                          )}
                        >
                          {d.name}
                        </span>
                      </div>
                      {d.isVerified ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending — click to continue
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════
              STEP 2 — Choose Method
          ══════════════════════════════════════════ */}
          {step === "choose-method" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                <Globe className="h-4 w-4 text-violet-400 shrink-0" />
                <span className="text-sm font-semibold text-white">{domainName}</span>
                <Badge className="ml-auto bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">
                  Pending verification
                </Badge>
              </div>

              <p className="text-sm text-slate-400">
                How would you like to verify ownership of{" "}
                <span className="text-white font-semibold">{domainName}</span>?
              </p>

              <div className="space-y-3">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all group",
                      method === m.id
                        ? "border-violet-500/50 bg-violet-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-lg border transition-colors",
                          method === m.id
                            ? "bg-violet-500/20 border-violet-500/40 text-violet-400"
                            : "bg-white/5 border-white/10 text-slate-500 group-hover:text-slate-300",
                        )}
                      >
                        <m.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">{m.label}</span>
                          <Badge className={cn("text-[10px] border px-1.5", m.colorCls)}>
                            {m.difficulty}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{m.desc}</p>
                        <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {m.time}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full border-2 shrink-0 mt-1 transition-all",
                          method === m.id
                            ? "border-violet-500 bg-violet-500"
                            : "border-slate-600",
                        )}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
              STEP 3 — Instructions
          ══════════════════════════════════════════ */}
          {step === "instructions" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Active method badge */}
              {(() => {
                const m = METHODS.find((x) => x.id === method)!;
                return (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10">
                    <m.icon className="h-4 w-4 text-violet-400" />
                    <span className="text-sm font-semibold text-white">{m.label}</span>
                    <Badge className={cn("ml-auto text-[10px] border px-1.5", m.colorCls)}>
                      {m.difficulty}
                    </Badge>
                  </div>
                );
              })()}

              {renderInstructions()}

              {lastChecked && (
                <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                  <RefreshCw className="h-3 w-3" />
                  Last checked: {lastChecked.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────── */}
        <div className="border-t border-white/10 px-6 py-4 flex items-center gap-3 bg-[#080910] shrink-0">
          {/* Back */}
          {step !== "enter-domain" && (
            <Button
              variant="ghost"
              onClick={() => {
                if (step === "choose-method") setStep("enter-domain");
                if (step === "instructions") setStep("choose-method");
              }}
              className="text-slate-400 hover:text-white hover:bg-white/10"
            >
              Back
            </Button>
          )}

          <div className="flex-1" />

          {step === "enter-domain" && (
            <Button
              variant="ghost"
              onClick={closeModal}
              className="text-slate-500 hover:text-slate-300 hover:bg-white/5"
            >
              Remind me later
            </Button>
          )}

          {step === "choose-method" && (
            <Button
              onClick={() => setStep("instructions")}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white"
            >
              View Instructions
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === "instructions" && (
            <div className="flex items-center gap-2">
              {/* Refresh / retry */}
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isVerifying || cooldown > 0}
                className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                {isVerifying ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {cooldown > 0
                  ? `Retry in ${cooldown}s`
                  : isVerifying
                    ? "Checking…"
                    : "Check Verification"}
              </Button>

              {/* Primary verify */}
              <Button
                onClick={runVerify}
                disabled={isVerifying}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]"
              >
                {isVerifying ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ShieldCheck className="h-4 w-4 mr-2" />
                )}
                Verify Domain
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}