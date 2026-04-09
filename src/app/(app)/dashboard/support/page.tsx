"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Mail, MessageSquare, FileText, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const FAQ = [
  {
    q: "How do I start a security scan?",
    a: "Go to Dashboard → New Scan, select a tool, enter your target (URL, IP, or domain), configure the parameters, and click Launch. Scans run in the background — you'll get a notification when complete.",
  },
  {
    q: "What scan types are available?",
    a: "Pentellia offers Web Security Suite, Network Scanner, Cloud Security Scanner, Asset Discovery, and more. Each tool is categorized as Deep (intensive, uses your deep scan quota) or Light (quick reconnaissance, uses your light scan quota).",
  },
  {
    q: "How does the subscription work?",
    a: "You purchase a monthly plan (Recon, Hunter, Elite, or Elite Max). Each plan includes a fixed number of deep scans, light scans, and reports per month, with daily rate limits. Your usage resets when you renew.",
  },
  {
    q: "What happens when I hit my daily limit?",
    a: "Daily limits reset at midnight UTC. If you need more capacity, consider upgrading your plan. Monthly limits do not reset mid-cycle.",
  },
  {
    q: "How do I generate a PDF report?",
    a: "Open any completed scan, scroll to the bottom, and click 'Download PDF Report'. PDF generation is included with all subscription plans.",
  },
  {
    q: "How do I use the AI Summary feature?",
    a: "On any completed scan report page, click 'AI Summary'. The AI will analyze findings and provide an executive summary, risk assessment, and prioritized remediation steps. Included with all plans.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Your subscription is valid for 30 days from the payment date. It does not auto-renew — you must manually subscribe again when it expires. Contact support if you need assistance.",
  },
  {
    q: "My scan is stuck in 'queued' — what should I do?",
    a: "Scans typically start within 60 seconds. If a scan stays queued for more than 5 minutes, the scan engine may be under load. Try refreshing the page. If still stuck, contact support with the scan ID.",
  },
  {
    q: "Is my scan data private?",
    a: "Yes. All scan results are stored encrypted and are only accessible to your account. Pentellia never shares individual scan data with third parties.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-sm font-medium text-slate-200">{q}</span>
        {open
          ? <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" />
          : <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
        }
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed border-t border-white/5">
          {a}
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Support</h1>
        <p className="text-sm text-slate-400 mt-1">Answers to common questions and ways to get help.</p>
      </div>

      {/* Contact cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Mail,          title: "Email Support",   desc: "Response within 24h",        href: "mailto:support@pentellia.io",                    cta: "Send Email"    },
          { icon: MessageSquare, title: "Live Chat",       desc: "Available 9AM–6PM IST",      href: "#",                                               cta: "Start Chat"    },
          { icon: FileText,      title: "Documentation",  desc: "Guides and API reference",   href: "https://docs.pentellia.io",                       cta: "View Docs"     },
        ].map(card => (
          <a
            key={card.title}
            href={card.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-white/10 bg-[#0B0C15]/50 p-5 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group"
          >
            <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center mb-3 group-hover:bg-violet-500/20 transition-colors">
              <card.icon className="h-4 w-4 text-violet-400" />
            </div>
            <p className="text-sm font-semibold text-slate-200">{card.title}</p>
            <p className="text-xs text-slate-500 mt-0.5 mb-3">{card.desc}</p>
            <span className="text-xs text-violet-400 font-medium">{card.cta} →</span>
          </a>
        ))}
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => <FaqItem key={i} {...item} />)}
        </div>
      </div>

      {/* Quick links */}
      <div className="rounded-xl border border-white/10 bg-[#0B0C15]/40 p-5">
        <p className="text-sm font-semibold text-slate-200 mb-3">Quick Links</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "New Scan",     href: "/dashboard/new-scan"       },
            { label: "My Scans",     href: "/dashboard/scans"          },
            { label: "Reports",      href: "/dashboard/reports"        },
            { label: "Subscription", href: "/subscription"             },
            { label: "Profile",      href: "/account/user-settings"    },
            { label: "Security",     href: "/account/security"         },
          ].map(l => (
            <Link key={l.label} href={l.href}>
              <span className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer">
                {l.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}