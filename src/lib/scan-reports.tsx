import React from "react";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Terminal,
  Activity,
  Layers,
  Server,
  FileText,
  AlertOctagon,
  Lock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// --- SHARED UI HELPERS ---

function ReportCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-[#0B0C15] overflow-hidden shadow-sm",
        className
      )}
    >
      <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
        <Icon className="h-5 w-5 text-violet-400" />
        <h3 className="font-semibold text-white tracking-wide">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-slate-400 font-medium">{label}</span>
      <span className="text-sm text-slate-200 font-mono text-right">
        {value}
      </span>
    </div>
  );
}

function ExplanationBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-4 p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 flex gap-3">
      <div className="mt-0.5">
        <Activity className="h-4 w-4 text-blue-400" />
      </div>
      <div className="text-sm">
        <h4 className="font-semibold text-blue-300 mb-1">{title}</h4>
        <p className="text-slate-400 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

// ============================================================================
// 1. WAFW00F REPORT COMPONENT
// ============================================================================

export function Wafw00fReport({ data }: { data: any }) {
  // Safe Access
  const detected = data?.data?.detected ?? false;
  const firewall = data?.data?.firewall || "None";
  const manufacturer = data?.data?.manufacturer || "Unknown";

  return (
    <div className="space-y-6">
      {/* Primary Status Card */}
      <ReportCard title="WAF Detection Status" icon={Shield}>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div
            className={cn(
              "h-24 w-24 rounded-full flex items-center justify-center border-4 shadow-[0_0_30px_rgba(0,0,0,0.3)]",
              detected
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            )}
          >
            {detected ? (
              <CheckCircle2 className="h-10 w-10" />
            ) : (
              <AlertOctagon className="h-10 w-10" />
            )}
          </div>

          <div className="flex-1 text-center md:text-left space-y-2">
            <h2 className="text-2xl font-bold text-white">
              {detected
                ? "Active Protection Detected"
                : "No Web Application Firewall"}
            </h2>
            <p className="text-slate-400 max-w-xl">
              {detected
                ? `The target is currently protected by a Web Application Firewall (WAF). This security layer filters incoming traffic and blocks malicious requests.`
                : `No WAF signature was identified. The application appears to be directly exposed to the internet, making it potentially vulnerable to direct attacks like SQLi or XSS without intermediate filtering.`}
            </p>
          </div>
        </div>
      </ReportCard>

      {/* Vendor Details (Only if detected) */}
      {detected && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ReportCard title="Vendor Intelligence" icon={Layers}>
            <InfoRow label="Firewall Name" value={firewall} />
            <InfoRow label="Manufacturer" value={manufacturer} />
            <InfoRow label="Detection Confidence" value="High" />
          </ReportCard>

          <ReportCard title="Security Implications" icon={Lock}>
            <ul className="space-y-3">
              <li className="flex gap-2 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                <span>Blocks common OWASP Top 10 attacks.</span>
              </li>
              <li className="flex gap-2 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                <span>Masks origin IP address from direct scanning.</span>
              </li>
              <li className="flex gap-2 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                <span>
                  May throttle or block automated vulnerability scanners.
                </span>
              </li>
            </ul>
          </ReportCard>
        </div>
      )}

      {/* Recommendations */}
      {!detected && (
        <ExplanationBox
          title="Recommendation"
          text="Consider deploying a WAF (like Cloudflare, AWS WAF, or ModSecurity) to protect your application from common web exploits and DDoS attacks."
        />
      )}
    </div>
  );
}

// ============================================================================
// 2. NMAP REPORT COMPONENT
// ============================================================================

export function NmapReport({ data }: { data: any }) {
  // Parse raw output if it's a string, or use directly if object
  // We'll simulate parsing a structured output or handle the string gracefully.

  const rawOutput = data.result || "";
  const scanType = data.scan_type || "Standard";
  const command = data.command || "nmap";

  // Naive parser for Nmap text output to extract open ports (for demonstration)
  // Real apps usually parse XML output. This regex finds lines like "80/tcp open http"
  const portRegex = /(\d+)\/(tcp|udp)\s+open\s+([^\s]+)/g;
  const foundPorts = [];
  let match;
  while ((match = portRegex.exec(rawOutput)) !== null) {
    foundPorts.push({
      port: match[1],
      protocol: match[2],
      service: match[3],
    });
  }

  return (
    <div className="space-y-6">
      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#0B0C15] border border-white/10 flex flex-col items-center justify-center text-center">
          <Server className="h-8 w-8 text-blue-400 mb-2" />
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Scan Intensity
          </p>
          <p className="text-lg font-bold text-white capitalize">{scanType}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#0B0C15] border border-white/10 flex flex-col items-center justify-center text-center">
          <Activity className="h-8 w-8 text-violet-400 mb-2" />
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Ports Discovered
          </p>
          <p className="text-2xl font-bold text-white">
            {foundPorts.length > 0 ? foundPorts.length : "0"}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[#0B0C15] border border-white/10 flex flex-col items-center justify-center text-center">
          <Terminal className="h-8 w-8 text-emerald-400 mb-2" />
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Status
          </p>
          <p className="text-lg font-bold text-white">Host Up</p>
        </div>
      </div>

      {/* Open Ports Table */}
      <ReportCard title="Open Ports & Services" icon={Layers}>
        {foundPorts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Port</th>
                  <th className="px-4 py-3">Protocol</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3 rounded-tr-lg text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {foundPorts.map((p, i) => (
                  <tr
                    key={i}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-violet-300 font-bold">
                      {p.port}
                    </td>
                    <td className="px-4 py-3 uppercase text-slate-400">
                      {p.protocol}
                    </td>
                    <td className="px-4 py-3 text-slate-200">{p.service}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      >
                        Open
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p>
              No open ports found. The host might be down or heavily firewalled.
            </p>
          </div>
        )}
      </ReportCard>

      {/* Raw Command Used */}
      <div className="p-4 rounded-lg bg-black/40 border border-white/10 font-mono text-xs text-slate-400">
        <span className="text-violet-500 mr-2">$</span>
        {command}
      </div>

      <ExplanationBox
        title="What does this mean?"
        text="Open ports represent entry points into your server. Ensure only necessary services (like 80/443 for web) are exposed. Unnecessary ports (like 21, 22, 3306) should be restricted by firewall rules to authorized IPs only."
      />
    </div>
  );
}

// ============================================================================
// 3. NUCLEI REPORT COMPONENT
// ============================================================================

export function NucleiReport({ data }: { data: any }) {
  const findings = data.results || [];
  const summary = data.severity_summary || {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  const severityColors: any = {
    critical: "bg-red-500 text-white border-red-600",
    high: "bg-orange-500 text-white border-orange-600",
    medium: "bg-yellow-500 text-black border-yellow-600",
    low: "bg-blue-500 text-white border-blue-600",
    info: "bg-slate-500 text-white border-slate-600",
  };

  return (
    <div className="space-y-8">
      {/* Executive Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(summary).map(([key, count]) => {
          if (key === "unknown") return null;
          return (
            <div
              key={key}
              className="p-4 rounded-xl bg-[#0B0C15] border border-white/10 flex flex-col items-center"
            >
              <span className="text-2xl font-bold text-white">
                {String(count)}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">
                {key}
              </span>
            </div>
          );
        })}
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-400" /> Vulnerabilities
          Found
        </h2>

        {findings.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-xl">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white">System is Clean</h3>
            <p className="text-slate-400 mt-2">
              No vulnerabilities matched the selected templates.
            </p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-3">
            {findings.map((finding: any, index: number) => {
              const info = finding.info || {};
              const severity = (info.severity || "info").toLowerCase();

              return (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border border-white/10 bg-[#0B0C15] rounded-lg px-2 overflow-hidden"
                >
                  <AccordionTrigger className="hover:no-underline py-4 px-2">
                    <div className="flex items-center gap-4 text-left w-full">
                      <Badge
                        className={cn(
                          "uppercase w-20 justify-center",
                          severityColors[severity]
                        )}
                      >
                        {severity}
                      </Badge>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-200 text-sm md:text-base">
                          {info.name || finding["template-id"]}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">
                          {finding["template-id"]}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-6 pt-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-white/[0.03] rounded border border-white/5">
                        <span className="text-xs text-slate-500 uppercase block mb-1">
                          Matched At
                        </span>
                        <code className="text-violet-300 break-all">
                          {finding["matched-at"]}
                        </code>
                      </div>
                      <div className="p-3 bg-white/[0.03] rounded border border-white/5">
                        <span className="text-xs text-slate-500 uppercase block mb-1">
                          Vulnerability Type
                        </span>
                        <span className="text-slate-300 capitalize">
                          {finding.type}
                        </span>
                      </div>
                    </div>

                    {info.tags && (
                      <div className="flex flex-wrap gap-2">
                        {info.tags.map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs bg-white/5 border-white/10 text-slate-400"
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <a
                        href={finding["matched-at"]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        View Evidence <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 4. DIRB REPORT COMPONENT
// ============================================================================

export function DirbReport({ data }: { data: any }) {
  const foundItems = data.found_items || [];
  const totalFound = data.total_found || 0;

  return (
    <div className="space-y-6">
      <ReportCard title="Directory Enumeration Summary" icon={Globe}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-3xl font-bold text-white">{totalFound}</p>
            <p className="text-sm text-slate-400">Hidden Paths Discovered</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-violet-400" />
          </div>
        </div>

        {foundItems.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-xs uppercase text-slate-500 font-semibold mb-3">
              Detailed Findings
            </h4>
            {foundItems.map((item: string, idx: number) => {
              // Simple parser for DIRB output string like "http://site.com/admin (CODE:200|SIZE:123)"
              const urlMatch = item.match(/^(https?:\/\/[^\s]+)/);
              const metaMatch = item.match(/\((.*?)\)/);
              const url = urlMatch ? urlMatch[1] : item;
              const meta = metaMatch ? metaMatch[1] : "";

              return (
                <div
                  key={idx}
                  className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors"
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-mono text-violet-300 hover:underline truncate md:max-w-md"
                  >
                    {url}
                  </a>
                  {meta && (
                    <span className="text-xs text-slate-400 font-medium bg-black/40 px-2 py-1 rounded mt-2 md:mt-0">
                      {meta}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center text-slate-500 bg-white/[0.02] rounded-lg">
            No hidden directories found using the current wordlist.
          </div>
        )}
      </ReportCard>

      <ExplanationBox
        title="Why enumerate directories?"
        text="Discovering hidden directories (like /admin, /backup, /config) can reveal sensitive files, login portals, or configuration backups that were not meant to be public. These are prime targets for attackers."
      />
    </div>
  );
}
