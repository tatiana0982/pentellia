"use client";

import React, { useState } from "react";
import {
  LifeBuoy, Mail, Send, CheckCircle2, AlertTriangle,
  ChevronDown, Loader2, Info, MessageSquare, Code2,
  Zap, ExternalLink,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { cn }       from "@/lib/utils";
import toast from "react-hot-toast";

const CATEGORIES = [
  "Billing & Payments", "Scan Issues", "Account & Profile",
  "Report Generation", "AI Summary", "API Integration",
  "Feature Request", "Security Concern", "Other",
];

const PRIORITIES = [
  { value: "low",      label: "Low",      color: "text-blue-400 bg-blue-500/10 border-blue-500/20"     },
  { value: "medium",   label: "Medium",   color: "text-amber-400 bg-amber-500/10 border-amber-500/20"  },
  { value: "high",     label: "High",     color: "text-red-400 bg-red-500/10 border-red-500/20"        },
  { value: "critical", label: "Critical", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
];

const FAQS = [
  {
    q: "How do I start a security scan?",
    a: "Go to Dashboard → New Scan, select a tool, enter your target (URL, IP, or hostname), configure the parameters, and click Launch. You'll receive a notification when the scan completes.",
  },
  {
    q: "What is the difference between deep and light scans?",
    a: "Deep scans run intensive tests — web vulnerability, exploit detection, cloud misconfigurations. Light scans are faster reconnaissance — network enumeration, DNS, auth probing. Your plan includes a monthly quota for each.",
  },
  {
    q: "How does the subscription billing work?",
    a: "You purchase a 30-day plan (Recon, Hunter, Elite, or Elite Max). Plans do not auto-renew. You receive a monthly quota of deep scans, light scans, and reports, each with a daily cap to prevent abuse.",
  },
  {
    q: "What happens when I hit my daily scan limit?",
    a: "Daily limits reset at midnight UTC. Monthly limits do not reset mid-cycle. If you need higher throughput, consider upgrading your plan.",
  },
  {
    q: "How is the AI Summary generated?",
    a: "After a scan completes, click 'AI Summary' to stream an analysis via DeepSeek. It produces an executive summary, risk assessment, and prioritised remediation steps. Included with all plans, no extra charge.",
  },
  {
    q: "My scan is stuck in queued status — what should I do?",
    a: "Scans usually start within 60 seconds. If stuck beyond 5 minutes, the scan engine may be under load. Refresh the page. If the issue persists after 10 minutes, raise a support ticket with the scan ID.",
  },
  {
    q: "Is my scan data private?",
    a: "Yes. Scan results are stored encrypted and are only accessible to your account. Pentellia does not share or analyse individual scan data.",
  },
  {
    q: "How do I request a new scanning tool or integration?",
    a: "Use the contact form on this page, select 'Feature Request' as the category, and describe the tool or integration. Our team evaluates requests quarterly.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/[0.08] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-sm text-slate-200 font-medium pr-4">{q}</span>
        <ChevronDown className={cn("h-4 w-4 text-slate-500 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 text-sm text-slate-400 leading-relaxed border-t border-white/[0.05]">
          {a}
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  const [subject,   setSubject]   = useState("");
  const [category,  setCategory]  = useState(CATEGORIES[0]);
  const [priority,  setPriority]  = useState("medium");
  const [message,   setMessage]   = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) { toast.error("Subject and message are required"); return; }
    if (message.trim().length < 20) { toast.error("Please provide at least 20 characters"); return; }
    setIsLoading(true);
    try {
      const res  = await fetch("/api/support/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, category, message, priority }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const inp = "bg-black/30 border-white/10 text-slate-200 placeholder:text-slate-600 focus:border-violet-500/60 focus:ring-0 text-sm h-9";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white tracking-tight">Support</h1>
        <p className="text-sm text-slate-500 mt-0.5">Submit a ticket or browse common questions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

        {/* ── LEFT: Contact form ── */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0B0C15]/60 backdrop-blur-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-slate-500" />
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contact Support</p>
          </div>

          <div className="p-5">
            {submitted ? (
              <div className="flex flex-col items-center py-10 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white">Ticket Submitted</p>
                  <p className="text-sm text-slate-400 mt-1">We typically respond within a few hours.</p>
                </div>
                <button
                  onClick={() => { setSubmitted(false); setSubject(""); setMessage(""); setPriority("medium"); }}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Submit another ticket
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Subject</label>
                  <Input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Brief description of your issue"
                    className={inp}
                    maxLength={120}
                  />
                </div>

                {/* Category + Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">Category</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full h-9 px-3 rounded-md bg-black/30 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-violet-500/60"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0B0C15]">{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">Priority</label>
                    <div className="flex gap-1.5 flex-wrap pt-1">
                      {PRIORITIES.map(p => (
                        <button
                          key={p.value} type="button"
                          onClick={() => setPriority(p.value)}
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all",
                            p.color,
                            priority === p.value ? "opacity-100 ring-1 ring-offset-1 ring-offset-[#0B0C15] ring-current" : "opacity-40 hover:opacity-70",
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">Message</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={6}
                    placeholder="Describe your issue in detail. Include scan IDs, error messages, or steps to reproduce."
                    className="w-full rounded-md bg-black/30 border border-white/10 text-sm text-slate-200 placeholder:text-slate-600 px-3 py-2.5 focus:outline-none focus:border-violet-500/60 resize-none"
                  />
                  <p className="text-[11px] text-slate-600 text-right">{message.length} chars</p>
                </div>

                {/* Info */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-violet-500/[0.05] border border-violet-500/15">
                  <Info className="h-3.5 w-3.5 text-violet-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Your account details are included automatically. Tickets go directly to our team.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !subject.trim() || !message.trim()}
                  className="w-full h-9 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  {isLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                    : <><Send className="h-4 w-4" /> Send Ticket</>
                  }
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── RIGHT: Info panels ── */}
        <div className="space-y-4">

          {/* Response times */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0B0C15]/60 p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Response Times</p>
            <div className="space-y-2">
              {[
                { label: "Critical", time: "< 1 hour",   color: "text-purple-400" },
                { label: "High",     time: "< 4 hours",  color: "text-red-400"    },
                { label: "Medium",   time: "< 12 hours", color: "text-amber-400"  },
                { label: "Low",      time: "< 48 hours", color: "text-blue-400"   },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-xs">
                  <span className="text-slate-400">{r.label}</span>
                  <span className={cn("font-mono font-medium", r.color)}>{r.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0B0C15]/60 p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Links</p>
            <div className="space-y-1.5">
              {[
                { label: "New Scan",       href: "/dashboard/new-scan",    icon: Zap         },
                { label: "My Reports",     href: "/dashboard/reports",     icon: MessageSquare },
                { label: "Subscription",   href: "/subscription",          icon: Mail        },
                { label: "API Keys",       href: "/account/api",           icon: Code2       },
              ].map(l => (
                <a key={l.href} href={l.href}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer"
                >
                  <l.icon className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{l.label}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Billing note */}
          <div className="flex gap-2.5 p-3.5 rounded-lg bg-amber-500/[0.05] border border-amber-500/15">
            <AlertTriangle className="h-4 w-4 text-amber-400/70 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              For payment issues, include the{" "}
              <span className="text-amber-400/80 font-mono text-[11px]">Payment ID</span>{" "}
              from your subscription page.
            </p>
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-2 max-w-3xl">
          {FAQS.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
        </div>
      </div>
    </div>
  );
}