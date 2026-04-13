"use client";

import React, { useState } from "react";
import {
  Mail, Send, CheckCircle2, ChevronDown,
  Loader2, Info, MessageSquare, Code2,
  Zap, LifeBuoy,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn }   from "@/lib/utils";
import toast     from "react-hot-toast";

const CATEGORIES = [
  "Billing & Payments", "Scan Issues", "Account & Profile",
  "Report Generation", "AI Summary", "API Integration",
  "Feature Request", "Security Concern", "Other",
];

const PRIORITIES = [
  { value: "low",      label: "Low"      },
  { value: "medium",   label: "Medium"   },
  { value: "high",     label: "High"     },
  { value: "critical", label: "Critical" },
];

const FAQS = [
  {
    q: "How do I start a security scan?",
    a: "Go to Dashboard → New Scan, select a tool, enter your target (URL, IP, or hostname), configure parameters, and click Launch. You will receive a notification when the scan completes.",
  },
  {
    q: "What is the difference between deep and light scans?",
    a: "Deep scans run intensive tests — vulnerability detection, exploit probing, cloud misconfiguration analysis. Light scans are faster and passive — network enumeration, DNS reconnaissance, technology fingerprinting. Your plan includes a monthly quota for each type with a daily cap.",
  },
  {
    q: "How does subscription billing work?",
    a: "You purchase a 30-day plan. Plans do not auto-renew. Each plan provides a monthly quota of deep scans, light scans, and reports. Daily limits prevent burst abuse and reset at midnight UTC.",
  },
  {
    q: "What happens when I hit my daily scan limit?",
    a: "Daily limits reset at midnight UTC. Monthly limits do not reset mid-cycle. If you need higher throughput, consider upgrading your plan from the Subscription page.",
  },
  {
    q: "How is the AI Summary generated?",
    a: "After a scan completes, click AI Summary to stream an analysis. It produces an executive summary, risk assessment, and prioritised remediation steps. Included with all active plans at no extra charge.",
  },
  {
    q: "My scan is stuck in queued status. What should I do?",
    a: "Scans typically start within 60 seconds. If stuck beyond 5 minutes the scan engine may be under load — refresh the page. If the issue persists beyond 10 minutes, raise a support ticket and include the scan ID.",
  },
  {
    q: "Is my scan data private?",
    a: "Yes. Scan results are stored securely and are only accessible to your account. Pentellia does not share or analyse individual scan data.",
  },
  {
    q: "How do I request a new tool or integration?",
    a: "Use the contact form on this page, select Feature Request as the category, and describe the tool or integration. Requests are reviewed and prioritised quarterly.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/[0.07] rounded-lg overflow-hidden hover:border-white/[0.11] transition-colors">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm text-slate-200 font-medium pr-6 leading-snug">{q}</span>
        <ChevronDown className={cn(
          "h-4 w-4 text-slate-500 shrink-0 transition-transform duration-200",
          open && "rotate-180"
        )} />
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-white/[0.05]">
          <p className="pt-3 text-sm text-slate-400 leading-relaxed">{a}</p>
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
    if (message.trim().length < 20)          { toast.error("Please provide at least 20 characters"); return; }
    setIsLoading(true);
    try {
      const res  = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const selectCls = "w-full h-9 px-3 rounded-md bg-black/30 border border-white/[0.08] text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 transition-colors";

  return (
    <div className="px-6 pt-6 pb-10 space-y-8 text-slate-200">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-white tracking-tight">Support</h1>
        <p className="text-sm text-slate-500 mt-0.5">Submit a ticket or browse common questions.</p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

        {/* LEFT — contact form */}
        <div className="rounded-lg border border-white/[0.07] bg-[#0d0e1a] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06]">
            <div className="h-6 w-6 rounded-md bg-violet-500/10 border border-violet-500/15 flex items-center justify-center shrink-0">
              <Mail className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100">Contact Support</h3>
          </div>

          <div className="p-6">
            {submitted ? (
              <div className="flex flex-col items-center py-12 text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-violet-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-white">Ticket Submitted</p>
                  <p className="text-sm text-slate-500">We typically respond within a few hours.</p>
                </div>
                <button
                  onClick={() => { setSubmitted(false); setSubject(""); setMessage(""); setPriority("medium"); }}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Submit another ticket
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Subject</label>
                  <Input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Brief description of your issue"
                    maxLength={120}
                    className="h-9 bg-black/30 border-white/[0.08] text-slate-200 placeholder:text-slate-600 focus-visible:ring-0 focus-visible:border-violet-500/50 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)} className={selectCls}>
                      {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0d0e1a]">{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Priority</label>
                    <select value={priority} onChange={e => setPriority(e.target.value)} className={selectCls}>
                      {PRIORITIES.map(p => <option key={p.value} value={p.value} className="bg-[#0d0e1a]">{p.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-400">Message</label>
                    <span className="text-[11px] text-slate-600">{message.length} chars</span>
                  </div>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={6}
                    placeholder="Describe your issue in detail. Include scan IDs, error messages, or steps to reproduce."
                    className="w-full rounded-md bg-black/30 border border-white/[0.08] text-sm text-slate-200 placeholder:text-slate-600 px-3 py-2.5 focus:outline-none focus:border-violet-500/50 resize-none transition-colors"
                  />
                </div>

                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <Info className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Your account details are attached automatically. Tickets go directly to our engineering team.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !subject.trim() || !message.trim()}
                  className="w-full h-9 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  {isLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</>
                    : <><Send className="h-4 w-4" />Send Ticket</>
                  }
                </button>
              </form>
            )}
          </div>
        </div>

        {/* RIGHT — sidebar */}
        <div className="space-y-4">

          <div className="rounded-lg border border-white/[0.07] bg-[#0d0e1a] overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06]">
              <LifeBuoy className="h-3.5 w-3.5 text-slate-500" />
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quick Links</p>
            </div>
            <div className="p-2">
              {[
                { label: "New Scan",     href: "/dashboard/new-scan", icon: Zap           },
                { label: "My Reports",   href: "/dashboard/reports",  icon: MessageSquare  },
                { label: "Subscription", href: "/subscription",       icon: Mail           },
                { label: "API Access",   href: "/account/api",        icon: Code2          },
              ].map(l => (
                <a key={l.href} href={l.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-white/[0.04] transition-colors group"
                >
                  <l.icon className="h-3.5 w-3.5 text-slate-600 group-hover:text-violet-400 transition-colors shrink-0" />
                  <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">{l.label}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.07] bg-[#0d0e1a] p-4 space-y-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Before You Submit</p>
            <ul className="space-y-2.5">
              {[
                "Include the scan ID for scan-related issues",
                "Include the Payment ID for billing issues",
                "Describe steps to reproduce if possible",
              ].map(t => (
                <li key={t} className="flex items-start gap-2.5 text-xs text-slate-500 leading-relaxed">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-600 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {FAQS.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
        </div>
      </div>

    </div>
  );
}