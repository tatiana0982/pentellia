"use client";

import React, { useState } from "react";
import {
  LifeBuoy, Mail, MessageSquare, Send, CheckCircle2,
  AlertTriangle, ChevronDown, Loader2, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const CATEGORIES = [
  "Billing & Payments",
  "Scan Issues",
  "Domain Verification",
  "Account & Profile",
  "Report Generation",
  "AI Summary",
  "Security Concern",
  "Feature Request",
  "Other",
];

const PRIORITIES = [
  { value: "low",      label: "Low",      color: "text-blue-400   bg-blue-500/10   border-blue-500/20" },
  { value: "medium",   label: "Medium",   color: "text-amber-400  bg-amber-500/10  border-amber-500/20" },
  { value: "high",     label: "High",     color: "text-red-400    bg-red-500/10    border-red-500/20" },
  { value: "critical", label: "Critical", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
];

const FAQS = [
  {
    q: "How do I verify my domain?",
    a: "Go to Settings → Domains, add your domain, choose a verification method (DNS TXT, HTTP file, or HTML meta tag), follow the instructions, then click Verify. Once verified all scanning tools are unlocked.",
  },
  {
    q: "Why was I charged twice for a scan?",
    a: "Each unique scan (distinct tool + target combination) is charged once. If you see duplicate charges, note the scan IDs from Transaction History and contact us — we will investigate and refund any erroneous deductions.",
  },
  {
    q: "How is the AI Summary priced?",
    a: "AI summaries use token-based pricing: input tokens × ₹0.000180 + output tokens × ₹0.000250. A typical summary costs ₹0.50–₹1.50. The charge appears immediately in Transaction History with the exact token breakdown.",
  },
  {
    q: "Can I scan the same domain from two accounts?",
    a: "No. Each domain can only be verified by one account at a time. If another account has verified the domain first, you will see a conflict message when adding it. Contact support if you believe the domain was registered in error.",
  },
  {
    q: "My wallet balance did not update after a scan — what should I do?",
    a: "The wallet updates automatically after each operation. Try refreshing the page. If the balance still appears incorrect after 30 seconds, contact support with your scan ID and we will reconcile the transaction.",
  },
  {
    q: "Report generation fails — what happens to my ₹100?",
    a: "If report generation fails (Puppeteer/Chromium error), the ₹100 fee is automatically refunded and logged as a credit transaction. You will see 'Refund: report generation failed' in your Transaction History.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-lg bg-[#0B0C15] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="font-medium text-slate-200 text-sm pr-4">{q}</span>
        <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform shrink-0", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-3">
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
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required.");
      return;
    }
    if (message.trim().length < 20) {
      toast.error("Please describe your issue in at least 20 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/support/contact", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ subject, category, message, priority }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit ticket. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const priorityObj = PRIORITIES.find(p => p.value === priority)!;

  return (
    <div className="flex flex-col space-y-8 font-sans text-slate-200 overflow-y-auto pb-12 px-1">

      {/* ── Header ── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-indigo-400" />
          Support Center
        </h1>
        <p className="text-sm text-slate-400">
          Submit a support ticket or browse common questions. Tickets go directly to our team via email.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* ── Contact Form — left 3 cols ── */}
        <div className="lg:col-span-3">
          <div className="bg-[#0B0C15] border border-white/10 rounded-xl p-6">

            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Ticket Submitted</h3>
                  <p className="text-sm text-slate-400 max-w-sm">
                    Your message has been delivered to our team. We typically respond within a few hours.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="border-white/10 hover:bg-white/5 text-slate-300 mt-2"
                  onClick={() => { setSubmitted(false); setSubject(""); setMessage(""); setPriority("medium"); setCategory(CATEGORIES[0]); }}
                >
                  Submit Another Ticket
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-indigo-400" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider">New Support Ticket</h2>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Subject</label>
                  <Input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Brief summary of your issue"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500/50 h-10"
                    maxLength={120}
                  />
                </div>

                {/* Category + Priority side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Category</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full h-10 rounded-md bg-white/5 border border-white/10 text-slate-200 text-sm px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0B0C15]">{c}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Priority</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {PRIORITIES.map(p => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setPriority(p.value)}
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
                            p.color,
                            priority === p.value ? "ring-1 ring-offset-1 ring-offset-[#0B0C15] ring-current opacity-100" : "opacity-50 hover:opacity-80"
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
                  <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Message</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Describe your issue in detail. Include scan IDs, transaction IDs, error messages, or steps to reproduce."
                    rows={7}
                    className="w-full rounded-md bg-white/5 border border-white/10 text-slate-200 text-sm px-3 py-2.5 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none"
                  />
                  <p className="text-xs text-slate-600 text-right">{message.length} characters</p>
                </div>

                {/* Info strip */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/15">
                  <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Your account details (name, email, company, user ID) are automatically included. 
                    Tickets are delivered directly to our admin inbox.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !subject.trim() || !message.trim()}
                  className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {isLoading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
                    : <><Send className="mr-2 h-4 w-4" />Send Ticket</>
                  }
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* ── Right sidebar — 2 cols ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Priority guide */}
          <div className="bg-[#0B0C15] border border-white/10 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Priority Guide</h3>
            <div className="space-y-2.5 text-xs text-slate-400">
              {[
                ["Low",      "bg-blue-500",   "General questions, feature requests"],
                ["Medium",   "bg-amber-500",  "Feature not working as expected"],
                ["High",     "bg-red-500",    "Scan failure, billing discrepancy"],
                ["Critical", "bg-purple-500", "Data loss, security incident, account breach"],
              ].map(([label, dot, desc]) => (
                <div key={label} className="flex items-start gap-2">
                  <span className={`h-2 w-2 rounded-full mt-0.5 shrink-0 ${dot}`} />
                  <div><span className="text-slate-300 font-medium">{label} — </span>{desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Response time */}
          <div className="bg-[#0B0C15] border border-white/10 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Response Times</h3>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between"><span>Critical</span><span className="text-red-400 font-mono">&lt; 1 hour</span></div>
              <div className="flex justify-between"><span>High</span><span className="text-amber-400 font-mono">&lt; 4 hours</span></div>
              <div className="flex justify-between"><span>Medium</span><span className="text-slate-300 font-mono">&lt; 12 hours</span></div>
              <div className="flex justify-between"><span>Low</span><span className="text-slate-300 font-mono">&lt; 48 hours</span></div>
            </div>
          </div>

          {/* Alert box for billing */}
          <div className="flex gap-2.5 p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">
              For billing disputes, always include the <span className="text-amber-400 font-mono">Transaction ID</span> from the Transaction History tab on the Wallet page.
            </p>
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div>
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-400" />
          Frequently Asked Questions
        </h2>
        <div className="space-y-2 max-w-3xl">
          {FAQS.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
        </div>
      </div>
    </div>
  );
}