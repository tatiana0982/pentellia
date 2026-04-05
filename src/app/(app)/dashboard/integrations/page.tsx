"use client";

import React, { useState } from "react";
import {
  Search,
  CheckCircle2,
  ExternalLink,
  Plus,
  LayoutGrid,
  Construction,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";

// --- Integration Data ---
type Category =
  | "All"
  | "Ticketing"
  | "Messaging"
  | "CI/CD"
  | "SIEM"
  | "Cloud"
  | "Identity"
  | "Security";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: Category;
  status: "connected" | "disconnected" | "premium";
  logoUrl: string; // URL for the real logo
  popular?: boolean;
}

const integrations: Integration[] = [
  {
    id: "jira",
    name: "Jira Software",
    description:
      "Automatically create tickets for critical vulnerabilities found during scans.",
    category: "Ticketing",
    status: "connected",
    logoUrl:
      "https://www.vectorlogo.zone/logos/atlassian_jira/atlassian_jira-icon.svg",
    popular: true,
  },
  {
    id: "slack",
    name: "Slack",
    description:
      "Receive real-time alerts and scan summaries in your security channels.",
    category: "Messaging",
    status: "connected",
    logoUrl: "https://www.vectorlogo.zone/logos/slack/slack-icon.svg",
    popular: true,
  },
  {
    id: "github",
    name: "GitHub Actions",
    description: "Trigger scans on pull requests and block insecure merges.",
    category: "CI/CD",
    status: "disconnected",
    logoUrl: "https://www.vectorlogo.zone/logos/github/github-icon.svg",
    popular: true,
  },
  {
    id: "msteams",
    name: "Microsoft Teams",
    description:
      "Send notifications and reports directly to your Teams workspace.",
    category: "Messaging",
    status: "disconnected",
    logoUrl:
      "https://www.vectorlogo.zone/logos/microsoft_teams/microsoft_teams-icon.svg",
  },
  {
    id: "servicenow",
    name: "ServiceNow",
    description:
      "Enterprise IT workflow integration for vulnerability response.",
    category: "Ticketing",
    status: "premium",
    logoUrl: "https://www.vectorlogo.zone/logos/servicenow/servicenow-icon.svg",
  },
  {
    id: "splunk",
    name: "Splunk",
    description:
      "Forward logs and finding events to Splunk SIEM for correlation.",
    category: "SIEM",
    status: "premium",
    logoUrl: "https://www.vectorlogo.zone/logos/splunk/splunk-icon.svg",
  },
  {
    id: "gitlab",
    name: "GitLab CI",
    description:
      "Integrate security testing directly into your GitLab pipelines.",
    category: "CI/CD",
    status: "disconnected",
    logoUrl: "https://www.vectorlogo.zone/logos/gitlab/gitlab-icon.svg",
  },
  {
    id: "aws",
    name: "AWS Security Hub",
    description: "Sync findings with AWS Security Hub for centralized viewing.",
    category: "Cloud",
    status: "premium",
    logoUrl: "https://www.vectorlogo.zone/logos/amazon_aws/amazon_aws-icon.svg",
  },
  {
    id: "pagerduty",
    name: "PagerDuty",
    description:
      "Trigger incidents for critical severity findings immediately.",
    category: "Messaging",
    status: "disconnected",
    logoUrl: "https://www.vectorlogo.zone/logos/pagerduty/pagerduty-icon.svg",
  },
  {
    id: "okta",
    name: "Okta",
    description:
      "Enforce security policies based on user identity and access contexts.",
    category: "Identity",
    status: "disconnected",
    logoUrl: "https://www.vectorlogo.zone/logos/okta/okta-icon.svg",
  },
  {
    id: "crowdstrike",
    name: "CrowdStrike",
    description: "Correlate endpoint data with network vulnerability findings.",
    category: "Security",
    status: "premium",
    logoUrl:
      "https://www.vectorlogo.zone/logos/crowdstrike/crowdstrike-icon.svg",
  },
  {
    id: "snyk",
    name: "Snyk",
    description:
      "Import dependency vulnerabilities into your unified dashboard.",
    category: "Security",
    status: "connected",
    logoUrl: "https://www.vectorlogo.zone/logos/snyk/snyk-icon.svg",
    popular: true,
  },
  {
    id: "linear",
    name: "Linear",
    description: "Streamline issue tracking for modern software teams.",
    category: "Ticketing",
    status: "disconnected",
    // Linear logo fallback as vectorlogo.zone might not have it
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/97/Linear_logo.svg",
  },
  {
    id: "datadog",
    name: "Datadog",
    description:
      "Visualize security metrics and logs within Datadog dashboards.",
    category: "SIEM",
    status: "premium",
    logoUrl: "https://www.vectorlogo.zone/logos/datadoghq/datadoghq-icon.svg",
  },
  {
    id: "azure-sentinel",
    name: "Microsoft Sentinel",
    description: "Cloud-native SIEM and SOAR solution for security analytics.",
    category: "Cloud",
    status: "premium",
    logoUrl:
      "https://www.vectorlogo.zone/logos/microsoft_azure/microsoft_azure-icon.svg",
  },
];

export default function IntegrationsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const router = useRouter();

  // Filter Logic
  const filteredIntegrations = integrations.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === "All" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] space-y-6 font-sans text-slate-200 overflow-y-auto custom-scrollbar">
      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Integrations
          </h1>
          <p className="text-sm text-slate-400">
            Supercharge your workflow by connecting your favorite tools.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-white/10 bg-white/5 text-slate-300 hover:text-white"
            onClick={() => router.push("/dashboard/support")}
          >
            <ExternalLink className="mr-2 h-4 w-4" /> Documentation
          </Button>
          <Button
            className="bg-violet-600 hover:bg-violet-500 text-white"
            onClick={() => router.push("/dashboard/support")}
          >
            <Plus className="mr-2 h-4 w-4" /> Request Integration
          </Button>
        </div>
      </div>

      {/* ── Coming Soon Banner ── */}
      <div className="flex items-start gap-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.06]">
        <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
          <Construction className="h-5 w-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-300 mb-0.5">Integrations are under active development</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            These integrations are not yet live. Browse available connections below and contact support to request priority access to a specific integration.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-amber-500/30 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
          onClick={() => router.push("/dashboard/support")}
        >
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
          Contact Support
        </Button>
      </div>

      {/* --- Controls Toolbar --- */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-[#0B0C15] border border-white/10 p-4 rounded-xl shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search tools (e.g. Jira, Slack)..."
            className="pl-9 bg-white/5 border-white/10 text-slate-200 focus:ring-violet-500 placeholder:text-slate-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category Filter (Desktop) */}
        <div className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            "All",
            "Ticketing",
            "Messaging",
            "CI/CD",
            "SIEM",
            "Cloud",
            "Identity",
            "Security",
          ].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as Category)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap border",
                activeCategory === cat
                  ? "bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-900/20"
                  : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white hover:border-white/10"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Category Filter (Mobile) */}
        <div className="md:hidden w-full">
          <Select
            value={activeCategory}
            onValueChange={(val) => setActiveCategory(val as Category)}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-slate-200">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-[#0B0C15] border-white/10 text-white">
              {[
                "All",
                "Ticketing",
                "Messaging",
                "CI/CD",
                "SIEM",
                "Cloud",
                "Identity",
                "Security",
              ].map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* --- Grid Layout --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
        {filteredIntegrations.map((item) => (
          <IntegrationCard key={item.id} item={item} />
        ))}

        {filteredIntegrations.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-500">
            <div className="mx-auto w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-lg font-medium text-white">
              No integrations found
            </p>
            <p className="text-sm text-slate-500">
              Try adjusting your search or filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Card Component ---

function IntegrationCard({ item }: { item: Integration }) {
  const isConnected = item.status === "connected";
  const isPremium = item.status === "premium";
  const router = useRouter();

  return (
    <div className="group relative flex flex-col justify-between p-6 rounded-2xl border border-white/10 bg-[#0B0C15] hover:border-violet-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-900/10 overflow-hidden">
      {/* POPULAR BADGE - Fixed Positioning & Style */}
      {item.popular && (
        <div className="absolute top-0 right-0">
          <div className="bg-gradient-to-bl from-violet-600 to-indigo-600 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl shadow-lg z-10 uppercase tracking-wider">
            Popular
          </div>
        </div>
      )}

      <div>
        {/* Header with Logo */}
        <div className="flex items-start justify-between mb-5">
          <div className="h-14 w-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform p-2.5">
            {/* Using Real Images */}
            <img
              src={item.logoUrl}
              alt={`${item.name} logo`}
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback if image fails
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.innerHTML =
                  '<svg class="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>';
              }}
            />
          </div>
          {isConnected && (
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] mr-2 mt-2" />
          )}
        </div>

        <div>
          <h3 className="font-semibold text-white text-lg leading-tight mb-1">
            {item.name}
          </h3>
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
            {item.category}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-400 leading-relaxed mt-3 mb-6 min-h-[60px] line-clamp-3">
          {item.description}
        </p>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
        {isConnected ? (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 pl-1 pr-2 py-0.5 text-xs font-normal"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" /> Active
          </Badge>
        ) : isPremium ? (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-300 border-amber-500/20 px-2 py-0.5 text-xs font-normal"
          >
            Enterprise
          </Badge>
        ) : (
          <span className="text-xs text-slate-500 font-medium">Coming Soon</span>
        )}

        <Button
          variant="secondary"
          size="sm"
          className="h-8 text-xs font-medium transition-all min-w-[80px] bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10"
          onClick={() => router.push("/dashboard/support")}
          title="Contact support to request this integration"
        >
          Request
        </Button>
      </div>
    </div>
  );
}