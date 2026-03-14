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

  /* ================= CALCULATE RADAR CHART SCORES ================= */
  const appSecScore = owasp.total_categories ? Math.round((owasp.passed / owasp.total_categories) * 100) : 100;
  const netSecScore = sans.total_categories ? Math.round((sans.passed / sans.total_categories) * 100) : 100;
  const densityScore = Math.max(0, 100 - (summary.total_findings * 2));
  const defenseScore = summary.critical > 0 ? 15 : (summary.high > 0 ? 45 : (summary.medium > 0 ? 75 : 100));
  const exposureScore = Math.max(0, 100 - ((summary.affected_assets || 0) * 4));

  /* ================= CONFIG & HELPERS ================= */
  const logoUrl = "https://pentellia.vercel.app/logo.png";
  
  // Strict Pagination Bounds
  const PAGE_HEIGHT = 1122; // A4 at 96 DPI
  const PAGE_PADDING = 260; // Huge safety buffer to prevent footer overlap
  const MAX_HEIGHT = PAGE_HEIGHT - PAGE_PADDING;

  function getSeverityColor(sev: string) {
    const s = (sev || '').toLowerCase();
    if (s === 'critical') return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' };
    if (s === 'high') return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' };
    if (s === 'medium') return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' };
    if (s === 'low') return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' };
    return { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-300' }; 
  }

  function escapeHtml(unsafe: string) {
    if (!unsafe) return "";
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  function truncateText(text: string, maxLength: number = 800) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "... [Truncated for report brevity]";
  }

  /* ================= PAGINATION ENGINE ================= */
  function paginate<T>(items: T[], estimator: (item: T) => number): T[][] {
    const pages: T[][] = [];
    let page: T[] = [];
    let height = 0;
    for (const item of items) {
      const h = estimator(item);
      if (height + h > MAX_HEIGHT && page.length > 0) {
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
      .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold text-purple-300 mt-6 mb-2 uppercase tracking-wide">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-white mt-8 mb-4 pb-2 border-b border-purple-500/20">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-extrabold text-white mb-6">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
      .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-2 text-slate-300 flex items-start text-sm"><span class="mr-2 text-fuchsia-500 mt-0.5">•</span> <span>$1</span></li>')
      .replace(/---\n/g, '<hr class="border-purple-500/20 my-6">')
      .replace(/`(.*?)`/g, '<code class="bg-purple-900/40 px-1.5 py-0.5 rounded font-mono text-xs text-purple-200 border border-purple-500/30">$1</code>');
  }

  /* ================= PRE-PROCESSING ================= */
  
  // 1. AI Summary Pagination
  const aiBlocks = ai_summary.split(/\n\n|---/).filter((b: string) => b.trim() !== "");
  const aiPages = paginate(aiBlocks, (block: string) => {
    const lines = block.split("\n").length;
    return (block.length * 0.35) + (lines * 24) + 40; 
  });

  // 2. Findings Pagination (Highly accurate estimation)
  function estimateFindingHeight(f: any) {
    let h = 260; // Base height for title, tags, padding, borders
    
    // Clamp text to prevent massive overflows
    f.description = truncateText(f.description, 800);
    f.impact = truncateText(f.impact, 400);
    f.recommendation = truncateText(f.recommendation, 400);

    const textLength = (f.description?.length || 0) + (f.impact?.length || 0) + (f.recommendation?.length || 0);
    h += Math.ceil(textLength / 80) * 20; 
    
    if (f.evidence?.additional?.nvd_enrichment) h += 90; 
    
    const hosts = f.evidence?.additional?.affected_hosts || [];
    if (hosts.length > 0) {
      h += 60 + (Math.ceil(Math.min(hosts.length, 8) / 2) * 36); 
    }
    
    return h + 40; 
  }
  
  // Sort findings by severity
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
:root { 
  --bg-deep: #05030A; 
  --bg-card: #0A0713; 
  --border-color: rgba(139, 92, 246, 0.15); 
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
  box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5);
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
  border-top: 1px solid rgba(139, 92, 246, 0.2); 
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
  background-image: linear-gradient(to right, rgba(139, 92, 246, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(139, 92, 246, 0.04) 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: 1;
  z-index: 0;
}
.toc-link {
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px dashed rgba(139, 92, 246, 0.2);
}
</style>
</head>
<body>

<div class="pdf-page flex flex-col justify-between relative bg-gradient-to-br from-[#05030A] via-[#100725] to-[#05030A]">
  <div class="grid-bg"></div>
  <div class="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-[0_0_20px_rgba(139,92,246,0.5)]"></div>
  <div class="absolute top-0 right-0 w-[600px] h-[600px] bg-fuchsia-600/10 blur-[150px] rounded-full pointer-events-none -mr-40 -mt-40"></div>
  
  <div class="relative z-10 pt-16">
    <div class="flex justify-between items-start mb-24">
      <img src="${logoUrl}" class="h-24 object-contain drop-shadow-2xl" />
      <div class="text-right">
        <p class="text-[10px] text-purple-400 font-mono uppercase tracking-widest mb-1 font-bold">Report Reference</p>
        <p class="text-sm text-slate-300 font-mono bg-purple-900/20 px-3 py-1 rounded border border-purple-500/30">${reportId}</p>
      </div>
    </div>
    
    <div class="space-y-6">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 text-[10px] font-bold uppercase tracking-widest">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Confidential Audit
      </div>
      <h1 class="text-6xl font-extrabold leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-purple-200 tracking-tight max-w-2xl">
        ${meta.tool || "Comprehensive Vulnerability Assessment"}
      </h1>
      <p class="text-lg text-purple-200/60 max-w-xl mt-6 leading-relaxed font-light">
        A deep-dive security analysis detailing discovered assets, critical vulnerabilities, and strategic remediation steps.
      </p>
    </div>
  </div>
  
  <div class="relative z-10 border-t border-purple-500/20 bg-purple-900/10 p-8 rounded-xl backdrop-blur-sm grid grid-cols-2 gap-x-12 gap-y-8 mb-10 shadow-2xl">
    <div>
      <p class="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-2">Target Asset / Scope</p>
      <p class="text-lg font-bold font-mono text-white break-all">${target}</p>
    </div>
    <div>
      <p class="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-2">Overall Risk Posture</p>
      <div class="flex items-center gap-3">
        <div class="h-3 w-3 rounded-full shadow-[0_0_15px_currentColor] ${summary.risk_level === 'critical' ? 'bg-red-500 text-red-500' : summary.risk_level === 'high' ? 'bg-orange-500 text-orange-500' : summary.risk_level === 'medium' ? 'bg-yellow-500 text-yellow-500' : 'bg-blue-500 text-blue-500'}"></div>
        <p class="text-xl font-black uppercase text-white">${summary.risk_level}</p>
      </div>
    </div>
    <div>
      <p class="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-2">Audit Initiated</p>
      <p class="text-xs font-medium text-slate-300 font-mono">${new Date(started_at).toLocaleString()}</p>
    </div>
    <div>
      <p class="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-2">Audit Concluded</p>
      <p class="text-xs font-medium text-slate-300 font-mono">${new Date(completed_at).toLocaleString()}</p>
    </div>
  </div>
</div>

<div class="pdf-page">
  <div class="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/5 blur-[100px] rounded-full pointer-events-none"></div>
  
  <div class="pt-10 mb-12">
    <h2 class="text-3xl font-extrabold text-white tracking-tight mb-2">Table of Contents</h2>
    <p class="text-slate-400 text-sm">Document Structure & Navigation</p>
  </div>

  <div class="report-card bg-[#0b0714]/80 p-8">
    <div class="flex flex-col text-base font-medium text-slate-200">
      <a href="#executive-analytics" class="toc-link">
        <span class="flex items-center gap-4"><span class="text-purple-500 font-bold font-mono text-sm w-6">01</span> Executive Analytics</span>
      </a>
      <a href="#owasp-matrix" class="toc-link">
        <span class="flex items-center gap-4"><span class="text-purple-500 font-bold font-mono text-sm w-6">02</span> OWASP Top 10 Compliance</span>
      </a>
      <a href="#sans-matrix" class="toc-link">
        <span class="flex items-center gap-4"><span class="text-purple-500 font-bold font-mono text-sm w-6">03</span> SANS Top 25 CWE Matrix</span>
      </a>
      ${ai_summary ? `
      <a href="#ai-synthesis" class="toc-link">
        <span class="flex items-center gap-4"><span class="text-purple-500 font-bold font-mono text-sm w-6">04</span> AI Security Synthesis</span>
      </a>
      <a href="#detailed-findings" class="toc-link">
        <span class="flex items-center gap-4"><span class="text-purple-500 font-bold font-mono text-sm w-6">05</span> Detailed Findings Log</span>
      </a>
      <a href="#annexure" class="toc-link border-0">
        <span class="flex items-center gap-4"><span class="text-purple-500 font-bold font-mono text-sm w-6">06</span> Annexure & Methodology</span>
      </a>
      ` : `
      <a href="#detailed-findings" class="toc-link">
        <span class="flex items-center gap-4"><span class="text-purple-500 font-bold font-mono text-sm w-6">04</span> Detailed Findings Log</span>
      </a>
      <a href="#annexure" class="toc-link border-0">
        <span class="flex items-center gap-4"><span class="text-purple-500 font-bold font-mono text-sm w-6">05</span> Annexure & Methodology</span>
      </a>
      `}
    </div>
  </div>

  <div class="footer">
    <span>Pentellia Analytics</span>
    <span>Table of Contents</span>
  </div>
</div>

<div class="pdf-page" id="executive-analytics">
  <div class="flex items-center gap-3 mb-8 pb-4 border-b border-purple-500/20">
    <div class="p-2 bg-purple-500/10 rounded border border-purple-500/30">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
    </div>
    <h2 class="text-2xl font-bold text-white tracking-tight">Executive Analytics</h2>
  </div>

  <div class="grid grid-cols-3 gap-6 mb-6">
    <div class="report-card text-center flex flex-col justify-center py-6">
      <p class="text-[10px] uppercase text-purple-400 font-bold tracking-widest mb-2">Calculated Risk Score</p>
      <p class="text-5xl font-black text-white">${summary.risk_score}<span class="text-lg text-slate-600 font-medium">/100</span></p>
    </div>
    <div class="report-card text-center flex flex-col justify-center py-6 border-t-4 border-t-purple-500">
      <p class="text-[10px] uppercase text-purple-400 font-bold tracking-widest mb-2">Total Findings</p>
      <p class="text-5xl font-black text-white">${summary.total_findings}</p>
    </div>
    <div class="report-card text-center flex flex-col justify-center py-6">
      <p class="text-[10px] uppercase text-purple-400 font-bold tracking-widest mb-2">Affected Assets</p>
      <p class="text-5xl font-black text-white">${summary.affected_assets || 0}</p>
    </div>
  </div>

<div class="grid grid-cols-3 gap-6 mb-8 h-[340px]">
    <div class="report-card flex flex-col items-center justify-between p-6">
      <p class="font-bold w-full text-center text-sm text-slate-300 mb-4 uppercase tracking-wider">Severity Breakdown</p>
      <div class="relative w-full flex-1 flex items-center justify-center min-h-[180px]">
        <canvas id="severityChart"></canvas>
        <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
          <span class="text-5xl font-extrabold text-white">${summary.total_findings}</span>
        </div>
      </div>
      <div class="flex flex-wrap gap-3 mt-6 w-full justify-center text-[11px] font-bold uppercase tracking-wider text-slate-300">
        <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>CRI <span class="text-white ml-0.5">${summary.critical || 0}</span></div>
        <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></span>HI <span class="text-white ml-0.5">${summary.high || 0}</span></div>
        <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></span>MED <span class="text-white ml-0.5">${summary.medium || 0}</span></div>
        <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>LOW <span class="text-white ml-0.5">${summary.low || 0}</span></div>
      </div>
    </div>
    
    <div class="report-card flex flex-col items-center justify-between p-6">
      <p class="font-bold w-full text-center text-sm text-slate-300 mb-4 uppercase tracking-wider">Security Posture Area</p>
      <div class="relative w-full flex-1 flex items-center justify-center min-h-[180px]">
        <canvas id="postureChart"></canvas>
      </div>
    </div>

    <div class="report-card flex flex-col items-center justify-between p-6">
      <p class="font-bold w-full text-center text-sm text-slate-300 mb-4 uppercase tracking-wider">Risk Benchmark</p>
      <div class="relative w-full flex-1 flex items-center justify-center min-h-[180px]">
        <canvas id="riskChart"></canvas>
      </div>
    </div>
  </div>

  <div class="report-card flex flex-col p-6">
    <p class="font-bold w-full text-left text-sm text-white mb-4 uppercase tracking-wider">Assessment Parameters</p>
    <div class="space-y-3 w-full">
       <div class="flex justify-between items-center py-2 border-b border-purple-500/10">
          <span class="text-xs text-slate-400">Scan Engine</span>
          <span class="text-xs font-semibold text-white">${meta.tool || 'N/A'}</span>
       </div>
       <div class="flex justify-between items-center py-2 border-b border-purple-500/10">
          <span class="text-xs text-slate-400">Scan Profile</span>
          <span class="text-xs font-semibold text-white uppercase">${meta.parameters?.scan_level || 'Standard'}</span>
       </div>
       <div class="flex justify-between items-center py-2 border-b border-purple-500/10">
          <span class="text-xs text-slate-400">Modules Executed</span>
          <span class="text-xs font-semibold text-white">${tool_coverage.tools_executed?.length || 0}</span>
       </div>
       <div class="flex justify-between items-center py-2">
          <span class="text-xs text-slate-400">CVE Validation</span>
          <span class="text-[10px] font-bold uppercase ${meta.parameters?.enable_cve ? 'text-emerald-400' : 'text-slate-500'}">${meta.parameters?.enable_cve ? 'Enabled' : 'Disabled'}</span>
       </div>
    </div>
  </div>

  <div class="footer">
    <span>Pentellia Analytics</span>
    <span>Executive Summary</span>
  </div>
</div>

<div class="pdf-page" id="owasp-matrix">
  <div class="flex items-center gap-3 mb-8 pb-4 border-b border-purple-500/20">
    <div class="p-2 bg-emerald-500/10 rounded border border-emerald-500/20">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
    </div>
    <h2 class="text-2xl font-bold text-white tracking-tight">OWASP Top 10 (2021) Matrix</h2>
  </div>

  <div class="flex items-center justify-between mb-8">
      <p class="text-sm text-slate-400">Assessment against the Open Worldwide Application Security Project standard.</p>
      <div class="flex gap-4 text-xs font-bold uppercase tracking-widest bg-purple-900/20 px-4 py-2.5 rounded-lg border border-purple-500/30">
        <span class="text-emerald-400">Passed: ${owasp.passed}</span>
        <span class="text-slate-600">|</span>
        <span class="text-red-400">Failed: ${owasp.failed}</span>
      </div>
  </div>

  <div class="report-card p-0 overflow-hidden">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="bg-purple-900/20 border-b border-purple-500/20 text-[10px] uppercase tracking-widest text-purple-300">
          <th class="py-4 px-6 font-bold w-3/4">Security Control / Category</th>
          <th class="py-4 px-6 font-bold text-right">Status</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-purple-500/10 text-sm">
        ${Object.entries(owasp.categories).map(([catName, catData]: any) => `
          <tr class="${catData.safe ? 'bg-transparent' : 'bg-red-950/20'}">
             <td class="py-4 px-6 font-medium ${catData.safe ? 'text-slate-200' : 'text-red-300'}">
                ${escapeHtml(catName)}
             </td>
             <td class="py-4 px-6 text-right">
                ${catData.safe
                  ? `<span class="text-xs font-bold uppercase tracking-widest text-emerald-500 flex items-center justify-end gap-1.5"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg> Pass</span>`
                  : `<span class="badge bg-red-500/10 text-red-400 border border-red-500/30 whitespace-nowrap">${catData.count} Violations</span>`
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

<div class="pdf-page" id="sans-matrix">
  <div class="flex items-center gap-3 mb-8 pb-4 border-b border-purple-500/20">
    <div class="p-2 bg-blue-500/10 rounded border border-blue-500/20">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    </div>
    <h2 class="text-2xl font-bold text-white tracking-tight">SANS Top 25 CWE Matrix</h2>
  </div>

  <div class="flex items-center justify-between mb-8">
      <p class="text-sm text-slate-400">Assessment against the Most Dangerous Software Errors.</p>
      <div class="flex gap-4 text-xs font-bold uppercase tracking-widest bg-purple-900/20 px-4 py-2.5 rounded-lg border border-purple-500/30">
        <span class="text-emerald-400">Passed: ${sans.passed}</span>
        <span class="text-slate-600">|</span>
        <span class="text-red-400">Failed: ${sans.failed}</span>
      </div>
  </div>

  <div class="grid grid-cols-2 gap-6">
    <div class="report-card p-0 overflow-hidden h-fit">
      <table class="w-full text-left border-collapse">
        <tbody class="divide-y divide-purple-500/10 text-[11px]">
          ${sansCol1.map(([catName, catData]: any) => {
            const parts = catName.split(':');
            const cweId = parts[0];
            const cweDesc = parts.slice(1).join(':').trim();
            return `
            <tr class="${catData.safe ? 'bg-transparent' : 'bg-red-950/20'}">
               <td class="py-3 px-4">
                  <div class="font-bold font-mono ${catData.safe ? 'text-purple-400' : 'text-red-400'} mb-1">${escapeHtml(cweId)}</div>
                  <div class="${catData.safe ? 'text-slate-300' : 'text-red-200'} truncate max-w-[200px]">${escapeHtml(cweDesc)}</div>
               </td>
               <td class="py-3 px-4 text-right align-middle">
                  ${catData.safe
                    ? `<span class="text-[9px] font-bold uppercase tracking-widest text-emerald-500/50">Pass</span>`
                    : `<span class="text-[9px] font-bold uppercase text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30 whitespace-nowrap">${catData.count} Found</span>`
                  }
               </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    </div>

    <div class="report-card p-0 overflow-hidden h-fit">
      <table class="w-full text-left border-collapse">
        <tbody class="divide-y divide-purple-500/10 text-[11px]">
          ${sansCol2.map(([catName, catData]: any) => {
            const parts = catName.split(':');
            const cweId = parts[0];
            const cweDesc = parts.slice(1).join(':').trim();
            return `
            <tr class="${catData.safe ? 'bg-transparent' : 'bg-red-950/20'}">
               <td class="py-3 px-4">
                  <div class="font-bold font-mono ${catData.safe ? 'text-purple-400' : 'text-red-400'} mb-1">${escapeHtml(cweId)}</div>
                  <div class="${catData.safe ? 'text-slate-300' : 'text-red-200'} truncate max-w-[200px]">${escapeHtml(cweDesc)}</div>
               </td>
               <td class="py-3 px-4 text-right align-middle">
                  ${catData.safe
                    ? `<span class="text-[9px] font-bold uppercase tracking-widest text-emerald-500/50">Pass</span>`
                    : `<span class="text-[9px] font-bold uppercase text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30 whitespace-nowrap">${catData.count} Found</span>`
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
<div class="pdf-page" ${idx === 0 ? 'id="ai-synthesis"' : ''}>
  <div class="flex items-center gap-3 mb-8 pb-4 border-b border-purple-500/20">
    <div class="p-2 bg-fuchsia-500/10 rounded border border-fuchsia-500/20">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e879f9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="m3 12 18 0"/><path d="m6 6 12 12"/><path d="m18 6-12 12"/></svg>
    </div>
    <h2 class="text-2xl font-bold text-white tracking-tight">AI Security Synthesis ${aiPages.length > 1 ? `<span class="text-sm font-medium text-slate-500 ml-2">(${idx + 1}/${aiPages.length})</span>` : ""}</h2>
  </div>

  <div class="report-card bg-purple-900/10 border-fuchsia-500/20 shadow-[0_4px_40px_rgba(232,121,249,0.05)]" style="min-height: 800px; max-height: 880px; overflow: hidden;">
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
<div class="pdf-page" ${i === 0 ? 'id="detailed-findings"' : ''}>
  <div class="flex items-center gap-3 mb-8 pb-4 border-b border-purple-500/20">
    <div class="p-2 bg-red-500/10 rounded border border-red-500/20">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
    </div>
    <h2 class="text-2xl font-bold text-white tracking-tight">Detailed Findings Log <span class="text-sm font-medium text-slate-500 ml-2">(${i + 1}/${findingPages.length})</span></h2>
  </div>

  <div class="space-y-6">
  ${page.map((f: any) => {
    const sev = getSeverityColor(f.severity);
    const nvd = f.evidence?.additional?.nvd_enrichment;
    const cveId = f.evidence?.additional?.cve_id;
    const hosts = f.evidence?.additional?.affected_hosts || [];
    
    return `
    <div class="report-card p-0 overflow-hidden flex flex-col border border-purple-500/20">
      <div class="bg-purple-900/20 border-b border-purple-500/20 px-6 py-4 flex justify-between items-start">
        <h4 class="font-bold text-base text-white w-5/6 leading-snug">
          <span class="text-purple-500 mr-2 font-mono">${f.__index}.</span>${escapeHtml(f.title)}
        </h4>
        <span class="badge ${sev.bg} ${sev.text} border ${sev.border}">${f.severity}</span>
      </div>

      <div class="p-5 flex-1 bg-[#0b0714]">
        ${(f.owasp_category || f.sans_category) ? `
        <div class="flex flex-wrap gap-2 mb-4">
          ${f.owasp_category ? `<span class="text-[9px] font-bold tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2 py-1 rounded-md uppercase">${escapeHtml(f.owasp_category)}</span>` : ''}
          ${f.sans_category ? `<span class="text-[9px] font-bold tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2 py-1 rounded-md uppercase truncate max-w-[350px]">${escapeHtml(f.sans_category.split(':')[0])}</span>` : ''}
        </div>
        ` : ''}

        ${nvd ? `
        <div class="grid grid-cols-4 gap-4 mb-4 bg-[#07040f] border border-purple-500/20 rounded-lg p-3 shadow-inner">
           <div>
              <p class="text-[9px] uppercase tracking-widest text-slate-500 mb-1 font-bold">CVE ID</p>
              <p class="text-xs font-bold text-red-400 font-mono">${escapeHtml(cveId || 'N/A')}</p>
           </div>
           <div class="col-span-2">
              <p class="text-[9px] uppercase tracking-widest text-slate-500 mb-1 font-bold">CVSS v3 Vector</p>
              <p class="text-[10px] font-mono text-purple-300 truncate">${escapeHtml(nvd.cvss_v3?.vector_string || 'N/A')}</p>
           </div>
           <div>
              <p class="text-[9px] uppercase tracking-widest text-slate-500 mb-1 font-bold">Exploitability</p>
              <p class="text-xs font-bold text-white font-mono">${nvd.exploitability_score ? `${nvd.exploitability_score}/10` : 'N/A'}</p>
           </div>
        </div>
        ` : ''}

        <div class="mb-4">
          <p class="text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-1">Description & Impact</p>
          <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(f.description || f.impact)}</p>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
           <div>
             <p class="text-[10px] uppercase tracking-widest text-purple-400 font-bold mb-1">Primary Asset</p>
             <p class="text-[11px] font-mono text-slate-200 bg-purple-900/20 px-2.5 py-1.5 rounded border border-purple-500/20 break-all w-fit shadow-sm">${escapeHtml(f.affected_asset)}</p>
           </div>
           <div>
             <p class="text-[10px] uppercase tracking-widest text-purple-400 font-bold mb-1">Detector Module</p>
             <p class="text-[11px] text-slate-200 bg-purple-900/20 px-2.5 py-1.5 rounded border border-purple-500/20 w-fit shadow-sm">${escapeHtml(f.source_tool || "Orchestrator")}</p>
           </div>
        </div>

        ${hosts.length > 0 ? `
        <div class="mb-4 pt-4 border-t border-purple-500/20">
          <p class="text-[10px] uppercase tracking-widest text-purple-400 font-bold mb-2">Affected Endpoints (${hosts.length})</p>
          <div class="grid grid-cols-2 gap-2">
            ${hosts.slice(0, 12).map((h: any) => `
              <div class="bg-[#07040f] border border-purple-500/20 rounded px-2.5 py-1.5 flex items-center justify-between shadow-sm">
                <span class="text-[10px] font-mono text-slate-200">${escapeHtml(h.ip)}<span class="text-purple-500 font-bold">:${escapeHtml(String(h.port))}</span></span>
                ${h.service !== 'unknown' ? `<span class="text-[9px] text-slate-400 uppercase tracking-wider truncate ml-2 max-w-[80px]">${escapeHtml(h.service)}</span>` : ''}
              </div>
            `).join('')}
          </div>
          ${hosts.length > 12 ? `<p class="text-[10px] text-slate-500 mt-2 italic">+ ${hosts.length - 12} additional endpoints omitted for brevity.</p>` : ''}
        </div>
        ` : ''}

        ${f.recommendation ? `
        <div class="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p class="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1 flex items-center gap-1.5">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg> Recommended Action
          </p>
          <p class="text-xs text-slate-200 leading-relaxed">${escapeHtml(f.recommendation)}</p>
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
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mb-6 opacity-50"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
    <h2 class="text-2xl font-bold text-white mb-2">No Vulnerabilities Detected</h2>
    <p class="text-slate-400 max-w-md">The selected scanners did not find any issues matching the requested scope. The infrastructure appears secure against the executed profiles.</p>
</div>
`}

<div class="pdf-page" id="annexure">
  <div class="absolute top-0 left-0 w-full h-2 bg-slate-800"></div>
  <div class="flex items-center gap-3 mb-10 pb-4 border-b border-slate-800 pt-10">
    <div class="p-2 bg-slate-800 rounded border border-slate-700">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    </div>
    <h2 class="text-2xl font-bold text-white tracking-tight">Annexure & Methodology</h2>
  </div>

  <div class="space-y-8">
    <div class="report-card">
      <h3 class="text-lg font-bold text-white mb-3">Scope & Execution</h3>
      <p class="text-sm text-slate-400 leading-relaxed mb-4">
        This automated security assessment was conducted against <strong>${target}</strong> using the Pentellia Engine. 
        The objective of this scan is to identify, classify, and report security misconfigurations, known vulnerabilities (CVEs), 
        and infrastructure exposures based on current threat intelligence.
      </p>
      <div class="grid grid-cols-2 gap-4 mt-4">
        <div class="p-4 bg-[#07040f] rounded-lg border border-slate-800">
          <p class="text-[10px] font-bold uppercase text-slate-500 mb-1">Target Constraint</p>
          <p class="text-sm text-white font-mono">${target}</p>
        </div>
        <div class="p-4 bg-[#07040f] rounded-lg border border-slate-800">
          <p class="text-[10px] font-bold uppercase text-slate-500 mb-1">Modules Invoked</p>
          <p class="text-sm text-white">${tool_coverage.tools_executed?.length || 0} Modules</p>
        </div>
      </div>
    </div>

    <div class="report-card">
      <h3 class="text-lg font-bold text-white mb-3">Risk Calculation Algorithm</h3>
      <p class="text-sm text-slate-400 leading-relaxed mb-4">
        The Pentellia Risk Score (0-100) is deterministically calculated using a weighted algorithm based on the Common Vulnerability Scoring System (CVSS v3.1). 
        Critical and High severity findings exponentially impact the score, while Low and Informational findings apply linear penalties. 
      </p>
      <ul class="text-sm text-slate-400 space-y-2 list-disc list-inside ml-2">
        <li><strong class="text-red-400">Critical (9.0 - 10.0):</strong> Immediate exploitation possible. High likelihood of total system compromise.</li>
        <li><strong class="text-orange-400">High (7.0 - 8.9):</strong> Difficult to exploit but leads to significant data loss or escalation.</li>
        <li><strong class="text-yellow-400">Medium (4.0 - 6.9):</strong> Flaws that require specific pre-conditions or user interaction to exploit.</li>
        <li><strong class="text-blue-400">Low (0.1 - 3.9):</strong> Minor exposures that assist in reconnaissance or fingerprinting.</li>
      </ul>
    </div>

    <div class="report-card">
      <h3 class="text-lg font-bold text-white mb-3">Disclaimer & Limitations</h3>
      <p class="text-sm text-slate-400 leading-relaxed">
        This report is generated through automated analysis tools and AI synthesis. While extensive, automated tools cannot identify logical flaws, business logic abuse, or zero-day vulnerabilities. 
        This document should be treated as a point-in-time snapshot of the external attack surface and used to guide manual penetration testing and patch management cycles.
      </p>
    </div>
  </div>

  <div class="footer">
    <span>Pentellia Security</span>
    <span>Methodology</span>
  </div>
</div>

<script>
Chart.register(ChartDataLabels);
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#94A3B8';

// CRITICAL FIX: Forces high resolution and stops animations for PDF printing
const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false, // Prevents PDF capturing mid-animation
  devicePixelRatio: 3, // Renders at 3x resolution to fix blurriness
};

// 1. Severity Doughnut Chart
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
      ...commonOptions,
      cutout: '75%',
      plugins: { 
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: {
          color: '#ffffff',
          font: { weight: 'bold', size: 16 },
          formatter: (value) => value > 0 ? value : ''
        }
      }
    }
  });
}

// 2. Risk Benchmark Bar Chart
const riskCtx = document.getElementById('riskChart');
if(riskCtx) {
  new Chart(riskCtx, {
    type: 'bar',
    data: {
      labels: ['Score', 'Baseline', 'Threshold'],
      datasets: [{
        data: [${summary.risk_score || 0}, 50, 80],
        backgroundColor: ['#8b5cf6', '#1e293b', '#1e293b'],
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 45
      }]
    },
    options: {
      ...commonOptions,
      plugins: { 
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: {
          color: '#ffffff',
          anchor: 'end',
          align: 'bottom',
          offset: -26,
          font: { weight: 'bold', size: 18 },
          formatter: (value) => value
        }
      },
      scales: { 
        y: { display: false, max: 100, beginAtZero: true }, 
        x: { 
          grid: { display: false },
          border: { display: false },
          ticks: { font: { weight: '700', size: 12, family: "'Inter', sans-serif" }, color: '#94A3B8', padding: 12 }
        } 
      }
    }
  });
}

// 3. Security Posture Radar Chart
const postureCtx = document.getElementById('postureChart');
if(postureCtx) {
  new Chart(postureCtx, {
    type: 'radar',
    data: {
      labels: ['AppSec', 'NetSec', 'Density', 'Defense', 'Exposure'],
      datasets: [{
        label: 'Posture',
        data: [${appSecScore}, ${netSecScore}, ${densityScore}, ${defenseScore}, ${exposureScore}],
        backgroundColor: 'rgba(139, 92, 246, 0.25)',
        borderColor: 'rgba(139, 92, 246, 1)',
        pointBackgroundColor: 'rgba(217, 70, 239, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(217, 70, 239, 1)',
        borderWidth: 2.5,
      }]
    },
    options: {
      ...commonOptions,
      scales: {
        r: {
          angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          pointLabels: { color: '#F8FAFC', font: { size: 11, family: "'Inter', sans-serif", weight: 'bold' } },
          ticks: { display: false, min: 0, max: 100 }
        }
      },
      plugins: { 
        legend: { display: false }, 
        datalabels: { display: false },
        tooltip: { enabled: false }
      }
    }
  });
}
</script>

</body>
</html>
`;
}