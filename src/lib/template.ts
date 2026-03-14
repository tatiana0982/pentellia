export function getPurpleReportHtml(data: any) {
  // Handle variations in payload nesting
  const result = data.result || data;
  const target = data.target || result.target || result.meta?.target || "Unknown Target";
  const started_at = result.meta?.started_at || new Date().toISOString();
  const completed_at = data.completed_at || result.completed_at || result.meta?.completed_at || new Date().toISOString();
  const scanId = String(data.id || data.scan_id || result.id || result.scan_id || "");
  
  // Extract core modules with safe fallbacks
  const ai_summary = data.ai_summary || result.ai_summary || "";
  const meta = result.meta || {};
  const summary = result.summary || { risk_score: 0, total_findings: 0, affected_assets: 0, risk_level: "Unknown", top_categories: [] };
  const findings = result.findings || [];
  const tool_coverage = result.tool_coverage || { tools_executed: [] };

  // Compliance Objects
  const owasp = result.owasp_compliance || { categories: {}, passed: 0, failed: 0, total_categories: 0 };
  const sans = result.sans_compliance || { categories: {}, passed: 0, failed: 0, total_categories: 0 };

  /* ================= CONFIG & HELPERS ================= */
  const logoUrl = "https://pentellia.vercel.app/logo.png";
  
  // Strict Pagination Bounds
  const PAGE_HEIGHT = 1122; // A4 at 96 DPI
  const PAGE_PADDING = 180; // Top + Bottom padding allowance
  const MAX_HEIGHT = PAGE_HEIGHT - PAGE_PADDING;

  function getSeverityColor(sev: string) {
    const s = (sev || '').toLowerCase();
    if (s === 'critical') return { bg: 'bg-red-950/40', border: 'border-red-900', text: 'text-red-400' };
    if (s === 'high') return { bg: 'bg-orange-950/40', border: 'border-orange-900', text: 'text-orange-400' };
    if (s === 'medium') return { bg: 'bg-yellow-950/40', border: 'border-yellow-900', text: 'text-yellow-400' };
    if (s === 'low') return { bg: 'bg-blue-950/40', border: 'border-blue-900', text: 'text-blue-400' };
    return { bg: 'bg-slate-800/40', border: 'border-slate-700', text: 'text-slate-400' };
  }

  function escapeHtml(unsafe: string) {
    if (!unsafe) return "";
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  /* ================= PAGINATION ENGINE ================= */
  function paginate<T>(items: T[], estimator: (item: T) => number): T[][] {
    const pages: T[][] = [];
    let page: T[] = [];
    let height = 0;
    for (const item of items) {
      const h = estimator(item);
      if (height + h > MAX_HEIGHT) {
        pages.push(page);
        page = [];
        height = 0;
      }
      page.push(item);
      height += h;
    }
    if (page.length) pages.push(page);
    return pages;
  }

  function formatAiMarkdown(text: string) {
    return text
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-slate-200 mt-6 mb-2 uppercase tracking-wide">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-8 mb-4 pb-2 border-b border-slate-800">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-extrabold text-white mb-6">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
      .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-2 text-slate-300 flex items-start"><span class="mr-2 text-indigo-500 mt-0.5">•</span> <span>$1</span></li>')
      .replace(/---\n/g, '<hr class="border-slate-800 my-6">')
      .replace(/`(.*?)`/g, '<code class="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-xs text-slate-200 border border-slate-700">$1</code>');
  }

  /* ================= PRE-PROCESSING ================= */
  
  // 1. AI Summary Pagination
  const aiBlocks = ai_summary.split(/\n\n|---/).filter((b: string) => b.trim() !== "");
  const aiPages = paginate(aiBlocks, (block: string) => {
    const lines = block.split("\n").length;
    return (block.length * 0.3) + (lines * 20) + 40; // More accurate text wrapping estimate
  });

  // 2. Findings Pagination (Highly accurate estimation)
  function estimateFindingHeight(f: any) {
    let h = 220; // Base height for title, tags, padding, borders
    
    const textLength = (f.description?.length || 0) + (f.impact?.length || 0) + (f.recommendation?.length || 0);
    h += Math.ceil(textLength / 90) * 22; // Assume ~90 chars per line, 22px per line
    
    if (f.evidence?.additional?.nvd_enrichment) h += 90; // NVD Grid
    
    const hosts = f.evidence?.additional?.affected_hosts || [];
    if (hosts.length > 0) {
      h += 50 + (Math.ceil(Math.min(hosts.length, 12) / 2) * 32); // Host grid (max 12 shown, 2 columns, 32px per row)
    }
    
    return h + 40; // Margin bottom
  }
  
  // Sort findings by severity (Critical -> High -> Medium -> Low -> Info)
  const severityRank: any = { critical: 5, high: 4, medium: 3, low: 2, info: 1, unknown: 0 };
  const sortedFindings = [...findings].sort((a, b) => 
    (severityRank[(b.severity || 'info').toLowerCase()] || 0) - (severityRank[(a.severity || 'info').toLowerCase()] || 0)
  );

  const indexedFindings = sortedFindings.map((f: any, index: number) => ({ ...f, __index: index + 1 }));
  const findingPages = paginate(indexedFindings, estimateFindingHeight);

  // 3. SANS Column Splitting
  const sansEntries = Object.entries(sans.categories || {});
  const sansCol1 = sansEntries.slice(0, Math.ceil(sansEntries.length / 2));
  const sansCol2 = sansEntries.slice(Math.ceil(sansEntries.length / 2));

  // Generate Unique Report ID
  const reportId = `REP-${Date.now().toString(36).toUpperCase()}-${scanId ? scanId.slice(0, 6).toUpperCase() : 'SYS'}`;

  /* ================= HTML TEMPLATE GENERATION ================= */
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0"></script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
:root { 
  --bg-deep: #05050A; 
  --bg-card: #0B0E14; 
  --border-color: #1E293B; 
  --text-main: #F8FAFC; 
  --text-dim: #94A3B8; 
}
body { 
  font-family: 'Inter', sans-serif; 
  background: var(--bg-deep); 
  color: var(--text-main); 
  -webkit-print-color-adjust: exact; 
  margin: 0;
  padding: 0;
}
.font-mono { font-family: 'JetBrains Mono', monospace; }
.pdf-page { 
  width: 210mm; 
  height: 297mm; 
  padding: 50px 60px; 
  page-break-after: always; 
  position: relative; 
  overflow: hidden; 
  box-sizing: border-box;
}
.report-card { 
  background: var(--bg-card); 
  border: 1px solid var(--border-color); 
  border-radius: 8px; 
  padding: 24px; 
}
.footer { 
  position: absolute; 
  bottom: 30px; 
  left: 60px; 
  right: 60px; 
  font-size: 9px; 
  color: #64748B; 
  display: flex; 
  justify-content: space-between; 
  border-top: 1px solid #1E293B; 
  padding-top: 16px; 
  font-weight: 600; 
  text-transform: uppercase; 
  letter-spacing: 0.05em; 
}
.badge { 
  font-size: 10px; 
  padding: 4px 10px; 
  border-radius: 4px; 
  font-weight: 700; 
  text-transform: uppercase; 
  letter-spacing: 0.05em; 
}
canvas { max-height: 100%; max-width: 100%; }
.grid-bg {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: 0.2;
  z-index: 0;
}
</style>
</head>
<body>

<div class="pdf-page flex flex-col justify-between relative bg-[#020205]">
  <div class="grid-bg"></div>
  <div class="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
  
  <div class="relative z-10 pt-12">
    <div class="flex justify-between items-start mb-24">
      <img src="${logoUrl}" class="h-12 object-contain" />
      <div class="text-right">
        <p class="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Report Reference</p>
        <p class="text-sm text-slate-300 font-mono">${reportId}</p>
      </div>
    </div>
    
    <div class="space-y-4">
      <p class="text-sm uppercase tracking-[0.3em] text-indigo-500 font-bold">Automated Security Audit</p>
      <h1 class="text-5xl font-extrabold leading-tight text-white tracking-tight max-w-2xl">
        ${meta.tool || "Comprehensive Vulnerability Assessment"}
      </h1>
      <p class="text-lg text-slate-400 max-w-xl mt-4 leading-relaxed">
        Confidential security analysis detailing discovered assets, vulnerabilities, and recommended remediation strategies.
      </p>
    </div>
  </div>
  
  <div class="relative z-10 border-t border-slate-800 pt-10 grid grid-cols-2 gap-x-12 gap-y-8">
    <div>
      <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Target Asset / Scope</p>
      <p class="text-lg font-semibold font-mono text-slate-200">${target}</p>
    </div>
    <div>
      <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Overall Risk Posture</p>
      <div class="flex items-center gap-3">
        <div class="h-3 w-3 rounded-full ${summary.risk_level === 'critical' ? 'bg-red-500' : summary.risk_level === 'high' ? 'bg-orange-500' : summary.risk_level === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}"></div>
        <p class="text-xl font-bold uppercase text-white">${summary.risk_level}</p>
      </div>
    </div>
    <div>
      <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Audit Initiated</p>
      <p class="text-sm font-medium text-slate-300">${new Date(started_at).toLocaleString()}</p>
    </div>
    <div>
      <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Audit Concluded</p>
      <p class="text-sm font-medium text-slate-300">${new Date(completed_at).toLocaleString()}</p>
    </div>
  </div>
  
  <div class="absolute bottom-10 left-16 right-16 flex justify-between items-center text-[9px] text-slate-600 uppercase tracking-widest font-semibold border-t border-slate-800 pt-6">
    <span>Strictly Confidential</span>
    <span>Pentellia Engine v4.2</span>
  </div>
</div>

<div class="pdf-page">
  <div class="flex items-center gap-3 mb-10 pb-4 border-b border-slate-800">
    <div class="p-2 bg-indigo-500/10 rounded border border-indigo-500/20">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
    </div>
    <h2 class="text-2xl font-bold text-white tracking-tight">Executive Analytics</h2>
  </div>

  <div class="grid grid-cols-3 gap-6 mb-10">
    <div class="report-card text-center flex flex-col justify-center">
      <p class="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-3">Calculated Risk Score</p>
      <p class="text-5xl font-black text-white">${summary.risk_score}<span class="text-xl text-slate-600 font-medium">/100</span></p>
    </div>
    <div class="report-card text-center flex flex-col justify-center border-t-4 border-t-indigo-500">
      <p class="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-3">Total Findings</p>
      <p class="text-5xl font-black text-white">${summary.total_findings}</p>
    </div>
    <div class="report-card text-center flex flex-col justify-center">
      <p class="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-3">Affected Assets</p>
      <p class="text-5xl font-black text-white">${summary.affected_assets || 0}</p>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-8 h-[300px] mb-12">
    <div class="report-card flex flex-col items-center justify-between">
      <p class="font-semibold w-full text-left text-sm text-slate-300 mb-4 uppercase tracking-wider">Severity Distribution</p>
      <div class="relative w-full flex-1 flex items-center justify-center min-h-[180px]">
        <canvas id="severityChart"></canvas>
        <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
          <span class="text-3xl font-bold text-white">${summary.total_findings}</span>
        </div>
      </div>
      <div class="flex flex-wrap gap-4 mt-6 w-full justify-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>CRI <span class="text-white ml-0.5">${summary.critical || 0}</span></div>
        <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-orange-500"></span>HI <span class="text-white ml-0.5">${summary.high || 0}</span></div>
        <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>MED <span class="text-white ml-0.5">${summary.medium || 0}</span></div>
        <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>LOW <span class="text-white ml-0.5">${summary.low || 0}</span></div>
      </div>
    </div>
    
    <div class="report-card flex flex-col">
      <p class="font-semibold w-full text-left text-sm text-slate-300 mb-4 uppercase tracking-wider">Assessment Parameters</p>
      <div class="space-y-4 w-full">
         <div class="flex justify-between items-center py-3 border-b border-slate-800">
            <span class="text-xs text-slate-400">Scan Engine</span>
            <span class="text-xs font-medium text-white">${meta.tool || 'N/A'}</span>
         </div>
         <div class="flex justify-between items-center py-3 border-b border-slate-800">
            <span class="text-xs text-slate-400">Scan Profile</span>
            <span class="text-xs font-medium text-white uppercase">${meta.parameters?.scan_level || 'Standard'}</span>
         </div>
         <div class="flex justify-between items-center py-3 border-b border-slate-800">
            <span class="text-xs text-slate-400">Modules Executed</span>
            <span class="text-xs font-medium text-white">${tool_coverage.tools_executed?.length || 0}</span>
         </div>
         <div class="flex justify-between items-center py-3">
            <span class="text-xs text-slate-400">CVE Validation</span>
            <span class="text-[10px] font-bold uppercase ${meta.parameters?.enable_cve ? 'text-emerald-400' : 'text-slate-500'}">${meta.parameters?.enable_cve ? 'Enabled' : 'Disabled'}</span>
         </div>
      </div>
    </div>
  </div>

  ${result.executive_summary ? `
  <div class="report-card bg-slate-900/50 border-slate-800 border-l-4 border-l-indigo-500">
    <div class="flex gap-4 items-start">
      <div class="mt-0.5 text-indigo-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
      </div>
      <div class="space-y-1">
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Platform Conclusion</h4>
        <p class="text-sm text-slate-400 leading-relaxed">
          ${escapeHtml(result.executive_summary)}
        </p>
      </div>
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <span>Pentellia Analytics</span>
    <span>Page 2</span>
  </div>
</div>

<div class="pdf-page">
  <div class="flex items-center gap-3 mb-8 pb-4 border-b border-slate-800">
    <div class="p-2 bg-slate-800 rounded border border-slate-700">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
    </div>
    <h2 class="text-2xl font-bold text-white tracking-tight">OWASP Top 10 (2021) Matrix</h2>
  </div>

  <div class="flex items-center justify-between mb-6">
      <p class="text-sm text-slate-400">Assessment against the Open Worldwide Application Security Project standard.</p>
      <div class="flex gap-4 text-xs font-bold uppercase tracking-widest bg-slate-900 px-4 py-2 rounded border border-slate-800">
        <span class="text-emerald-500">Passed: ${owasp.passed}</span>
        <span class="text-slate-600">|</span>
        <span class="text-red-400">Failed: ${owasp.failed}</span>
      </div>
  </div>

  <div class="report-card p-0 overflow-hidden">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="bg-slate-900 border-b border-slate-800 text-[10px] uppercase tracking-widest text-slate-500">
          <th class="py-4 px-6 font-semibold w-2/3">Security Control / Category</th>
          <th class="py-4 px-6 font-semibold text-right">Status</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-800 text-sm">
        ${Object.entries(owasp.categories).map(([catName, catData]: any) => `
          <tr class="${catData.safe ? 'bg-[#0B0E14]' : 'bg-red-950/10'}">
             <td class="py-4 px-6 font-medium ${catData.safe ? 'text-slate-300' : 'text-red-300'}">
                ${escapeHtml(catName)}
             </td>
             <td class="py-4 px-6 text-right">
                ${catData.safe
                  ? `<span class="text-xs font-bold uppercase tracking-widest text-emerald-500/80">Pass</span>`
                  : `<span class="text-[10px] font-bold uppercase tracking-wider bg-red-900/30 text-red-400 px-2 py-1 rounded border border-red-900/50">${catData.count} Violations</span>`
                }
             </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <span>Pentellia Governance</span>
    <span>OWASP Matrix</span>
  </div>
</div>

<div class="pdf-page">
  <div class="flex items-center gap-3 mb-8 pb-4 border-b border-slate-800">
    <div class="p-2 bg-slate-800 rounded border border-slate-700">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    </div>
    <h2 class="text-2xl font-bold text-white tracking-tight">SANS Top 25 CWE Matrix</h2>
  </div>

  <div class="flex items-center justify-between mb-6">
      <p class="text-sm text-slate-400">Assessment against the Most Dangerous Software Errors.</p>
      <div class="flex gap-4 text-xs font-bold uppercase tracking-widest bg-slate-900 px-4 py-2 rounded border border-slate-800">
        <span class="text-emerald-500">Passed: ${sans.passed}</span>
        <span class="text-slate-600">|</span>
        <span class="text-red-400">Failed: ${sans.failed}</span>
      </div>
  </div>

  <div class="grid grid-cols-2 gap-6">
    <div class="report-card p-0 overflow-hidden h-fit">
      <table class="w-full text-left border-collapse">
        <tbody class="divide-y divide-slate-800 text-[11px]">
          ${sansCol1.map(([catName, catData]: any) => {
            const parts = catName.split(':');
            const cweId = parts[0];
            const cweDesc = parts.slice(1).join(':').trim();
            return `
            <tr class="${catData.safe ? 'bg-[#0B0E14]' : 'bg-red-950/10'}">
               <td class="py-3 px-4">
                  <div class="font-bold font-mono ${catData.safe ? 'text-slate-500' : 'text-red-400'} mb-0.5">${escapeHtml(cweId)}</div>
                  <div class="${catData.safe ? 'text-slate-300' : 'text-red-200'} truncate max-w-[200px]">${escapeHtml(cweDesc)}</div>
               </td>
               <td class="py-3 px-4 text-right align-middle">
                  ${catData.safe
                    ? `<span class="text-[9px] font-bold uppercase tracking-widest text-emerald-500/50">Pass</span>`
                    : `<span class="text-[9px] font-bold uppercase text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded border border-red-900/50 whitespace-nowrap">${catData.count} Found</span>`
                  }
               </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    </div>

    <div class="report-card p-0 overflow-hidden h-fit">
      <table class="w-full text-left border-collapse">
        <tbody class="divide-y divide-slate-800 text-[11px]">
          ${sansCol2.map(([catName, catData]: any) => {
            const parts = catName.split(':');
            const cweId = parts[0];
            const cweDesc = parts.slice(1).join(':').trim();
            return `
            <tr class="${catData.safe ? 'bg-[#0B0E14]' : 'bg-red-950/10'}">
               <td class="py-3 px-4">
                  <div class="font-bold font-mono ${catData.safe ? 'text-slate-500' : 'text-red-400'} mb-0.5">${escapeHtml(cweId)}</div>
                  <div class="${catData.safe ? 'text-slate-300' : 'text-red-200'} truncate max-w-[200px]">${escapeHtml(cweDesc)}</div>
               </td>
               <td class="py-3 px-4 text-right align-middle">
                  ${catData.safe
                    ? `<span class="text-[9px] font-bold uppercase tracking-widest text-emerald-500/50">Pass</span>`
                    : `<span class="text-[9px] font-bold uppercase text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded border border-red-900/50 whitespace-nowrap">${catData.count} Found</span>`
                  }
               </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="footer">
    <span>Pentellia Governance</span>
    <span>SANS Matrix</span>
  </div>
</div>

${aiPages.map((blocks, idx) => `
<div class="pdf-page">
  <div class="flex items-center gap-3 mb-8 pb-4 border-b border-slate-800">
    <div class="p-2 bg-slate-800 rounded border border-slate-700">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="m3 12 18 0"/><path d="m6 6 12 12"/><path d="m18 6-12 12"/></svg>
    </div>
    <h2 class="text-2xl font-bold text-white tracking-tight">AI Security Synthesis ${aiPages.length > 1 ? `<span class="text-lg font-medium text-slate-500 ml-2">(${idx + 1}/${aiPages.length})</span>` : ""}</h2>
  </div>

  <div class="report-card bg-slate-900/20" style="min-height: 800px; max-height: 880px; overflow: hidden;">
    <div class="prose prose-invert max-w-none text-sm leading-[1.8] text-slate-300">
      ${blocks.map((block) => `<div class="mb-4">${formatAiMarkdown(block)}</div>`).join("")}
    </div>
  </div>

  <div class="footer">
    <span>Pentellia LLM Engine</span>
    <span>AI Analysis • Page ${idx + 1}</span>
  </div>
</div>
`).join("")}

${findingPages.length > 0 ? findingPages.map((page, i) => `
<div class="pdf-page">
  <div class="flex items-center gap-3 mb-8 pb-4 border-b border-slate-800">
    <div class="p-2 bg-slate-800 rounded border border-slate-700">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
    </div>
    <h2 class="text-2xl font-bold text-white tracking-tight">Detailed Findings Log <span class="text-lg font-medium text-slate-500 ml-2">(${i + 1}/${findingPages.length})</span></h2>
  </div>

  <div class="space-y-6">
  ${page.map((f: any) => {
    const sev = getSeverityColor(f.severity);
    const nvd = f.evidence?.additional?.nvd_enrichment;
    const cveId = f.evidence?.additional?.cve_id;
    const hosts = f.evidence?.additional?.affected_hosts || [];
    
    return `
    <div class="report-card p-0 overflow-hidden flex flex-col">
      <div class="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-start">
        <h4 class="font-bold text-base text-white w-5/6 leading-snug">
          <span class="text-slate-500 mr-2 font-mono">${f.__index}.</span>${escapeHtml(f.title)}
        </h4>
        <span class="badge ${sev.bg} ${sev.text} border ${sev.border}">${f.severity}</span>
      </div>

      <div class="p-6 flex-1">
        ${(f.owasp_category || f.sans_category) ? `
        <div class="flex flex-wrap gap-2 mb-5">
          ${f.owasp_category ? `<span class="text-[9px] font-bold tracking-wider bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700 uppercase">${escapeHtml(f.owasp_category)}</span>` : ''}
          ${f.sans_category ? `<span class="text-[9px] font-bold tracking-wider bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700 uppercase truncate max-w-[350px]">${escapeHtml(f.sans_category.split(':')[0])}</span>` : ''}
        </div>
        ` : ''}

        ${nvd ? `
        <div class="grid grid-cols-4 gap-4 mb-5 bg-[#080B11] border border-slate-800 rounded-lg p-4">
           <div>
              <p class="text-[9px] uppercase tracking-widest text-slate-500 mb-1 font-bold">CVE ID</p>
              <p class="text-xs font-bold text-white font-mono">${escapeHtml(cveId || 'N/A')}</p>
           </div>
           <div class="col-span-2">
              <p class="text-[9px] uppercase tracking-widest text-slate-500 mb-1 font-bold">CVSS v3 Vector</p>
              <p class="text-[10px] font-mono text-slate-300 truncate">${escapeHtml(nvd.cvss_v3?.vector_string || 'N/A')}</p>
           </div>
           <div>
              <p class="text-[9px] uppercase tracking-widest text-slate-500 mb-1 font-bold">Exploitability</p>
              <p class="text-xs font-bold text-white font-mono">${nvd.exploitability_score ? `${nvd.exploitability_score}/10` : 'N/A'}</p>
           </div>
        </div>
        ` : ''}

        <div class="mb-5">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Description & Impact</p>
          <p class="text-sm text-slate-300 leading-relaxed">${escapeHtml(f.description || f.impact)}</p>
        </div>

        <div class="grid grid-cols-2 gap-6 mb-5">
           <div>
             <p class="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">Primary Asset</p>
             <p class="text-xs font-mono text-slate-300 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 break-all w-fit">${escapeHtml(f.affected_asset)}</p>
           </div>
           <div>
             <p class="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">Detector Module</p>
             <p class="text-xs text-slate-300 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 w-fit">${escapeHtml(f.source_tool || "Orchestrator")}</p>
           </div>
        </div>

        ${hosts.length > 0 ? `
        <div class="mb-5">
          <p class="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Affected Endpoints (${hosts.length})</p>
          <div class="grid grid-cols-2 gap-2">
            ${hosts.slice(0, 12).map((h: any) => `
              <div class="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 flex items-center justify-between">
                <span class="text-[10px] font-mono text-slate-300">${escapeHtml(h.ip)}<span class="text-slate-500">:${escapeHtml(String(h.port))}</span></span>
                ${h.service !== 'unknown' ? `<span class="text-[9px] text-slate-500 uppercase tracking-wider truncate ml-2 max-w-[80px]">${escapeHtml(h.service)}</span>` : ''}
              </div>
            `).join('')}
          </div>
          ${hosts.length > 12 ? `<p class="text-[10px] text-slate-500 mt-2 italic">+ ${hosts.length - 12} additional endpoints omitted for brevity.</p>` : ''}
        </div>
        ` : ''}

        ${f.recommendation ? `
        <div class="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg> Recommended Action
          </p>
          <p class="text-sm text-slate-300 leading-relaxed">${escapeHtml(f.recommendation)}</p>
        </div>
        ` : ''}
      </div>
    </div>
  `}).join("")}
  </div>

  <div class="footer">
    <span>Pentellia Technical Log</span>
    <span>Findings Log • Page ${i + 1}</span>
  </div>
</div>
`).join("") : `
<div class="pdf-page flex flex-col items-center justify-center text-center">
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mb-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
    <h2 class="text-2xl font-bold text-white mb-2">No Vulnerabilities Detected</h2>
    <p class="text-slate-400 max-w-md">The selected scanners did not find any issues matching the requested scope. The infrastructure appears secure against the executed profiles.</p>
</div>
`}

<script>
Chart.register(ChartDataLabels);
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#94A3B8';

const sevCtx = document.getElementById('severityChart');
if(sevCtx) {
  new Chart(sevCtx, {
    type: 'doughnut',
    data: {
      labels: ['Critical', 'High', 'Medium', 'Low'],
      datasets: [{
        data: [${summary.critical || 0}, ${summary.high || 0}, ${summary.medium || 0}, ${summary.low || 0}],
        backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: { 
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: {
          color: '#ffffff',
          font: { weight: 'bold', size: 14 },
          formatter: (value) => value > 0 ? value : ''
        }
      }
    }
  });
}

const riskCtx = document.getElementById('riskChart');
if(riskCtx) {
  new Chart(riskCtx, {
    type: 'bar',
    data: {
      labels: ['Score', 'Baseline', 'Threshold'],
      datasets: [{
        data: [${summary.risk_score || 0}, 50, 80],
        backgroundColor: ['#6366f1', '#1e293b', '#1e293b'],
        borderRadius: 4,
        borderSkipped: false,
        barThickness: 40
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: {
          color: '#ffffff',
          anchor: 'end',
          align: 'bottom',
          offset: -28,
          font: { weight: 'bold', size: 14 },
          formatter: (value) => value
        }
      },
      scales: { 
        y: { display: false, max: 100, beginAtZero: true }, 
        x: { 
          grid: { display: false },
          border: { display: false },
          ticks: { font: { weight: '600', size: 10, family: "'Inter', sans-serif" }, color: '#94A3B8', padding: 10 }
        } 
      }
    }
  });
}
</script>

</body>
</html>
`;
}
