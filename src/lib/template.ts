export function getPurpleReportHtml(data: any) {
  // Handle variations in payload nesting
  const result = data.result || data;
  const target = data.target || result.target || result.meta?.target || "Unknown Target";
  const completed_at = data.completed_at || result.completed_at || result.meta?.completed_at || new Date().toISOString();
  
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
  const PAGE_HEIGHT = 1122;
  const PAGE_PADDING = 160;
  const MAX_HEIGHT = PAGE_HEIGHT - PAGE_PADDING;

  function getColor(sev: string) {
    const s = (sev || '').toLowerCase();
    if (s === 'critical') return 'red';
    if (s === 'high') return 'orange';
    if (s === 'medium') return 'yellow';
    if (s === 'low') return 'blue';
    return 'slate';
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
  function estimateTextHeight(text = "") {
    if (!text) return 0;
    return text.length * 0.25; 
  }

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
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-purple-400 mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-6 mb-3 border-b border-purple-500/30 pb-1">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mb-4">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-purple-300">$1</strong>')
      .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-1 text-dim">• $1</li>')
      .replace(/---\n/g, '<hr class="border-white/10 my-4">')
      .replace(/`(.*?)`/g, '<code class="bg-purple-900/30 px-1 rounded font-mono text-purple-200">$1</code>');
  }

  /* ================= PRE-PROCESSING ================= */
  
  // 1. AI Summary Pagination
  const aiBlocks = ai_summary.split(/\n\n|---/).filter((b: string) => b.trim() !== "");
  const aiPages = paginate(aiBlocks, (block: string) => {
    const lines = block.split("\n").length;
    return block.length * 0.35 + lines * 25; 
  });

  // 2. Findings Pagination (Updated to account for larger NVD / Host grids)
  function estimateFindingHeight(f: any) {
    let h = 200; // Base height (title, layout, padding)
    h += estimateTextHeight(f.description || f.impact);
    h += estimateTextHeight(f.recommendation);
    if (f.owasp_category || f.sans_category) h += 45; 
    if (f.evidence?.additional?.nvd_enrichment) h += 80;
    if (f.evidence?.additional?.affected_hosts?.length > 0) h += 70;
    return h;
  }
  
  const indexedFindings = findings.map((f: any, index: number) => ({ ...f, __index: index + 1 }));
  const findingPages = paginate(indexedFindings, estimateFindingHeight);

  // 3. SANS Column Splitting (25 items split into 2 columns of 13 and 12)
  const sansEntries = Object.entries(sans.categories || {});
  const sansCol1 = sansEntries.slice(0, 13);
  const sansCol2 = sansEntries.slice(13);

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
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
:root { --bg-deep: #0a0514; --bg-card: #150e26; --accent: #9333ea; --text-main: #f3f4f6; --text-dim: #9ca3af; }
body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg-deep); color: var(--text-main); -webkit-print-color-adjust: exact; }
.pdf-page { width: 210mm; height: 297mm; padding: 60px; page-break-after: always; position: relative; overflow: hidden; }
.glass { background: var(--bg-card); border: 1px solid rgba(147,51,234,0.2); border-radius: 12px; padding: 24px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2); }
.footer { position: absolute; bottom: 30px; left: 60px; right: 60px; font-size: 10px; color: var(--text-dim); display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
.badge { font-size: 10px; padding: 4px 10px; border-radius: 6px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
canvas { max-height: 100%; max-width: 100%; }
</style>
</head>
<body>

<div class="pdf-page flex flex-col justify-between relative">
  <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none -mr-40 -mt-40"></div>
  
  <div class="relative z-10 pt-10">
    <img src="${logoUrl}" class="h-40 mb-24 opacity-90" />
    <h1 class="text-6xl font-extrabold leading-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
      ${meta.tool || "Security Audit"} Report
    </h1>
    <p class="text-lg uppercase tracking-[0.3em] text-purple-400 font-bold">Pentellia Security Suite</p>
  </div>
  
  <div class="grid grid-cols-2 gap-12 border-t border-white/10 pt-12 relative z-10">
    <div>
      <p class="text-xs text-purple-500 font-bold uppercase tracking-widest mb-2">Target Asset</p>
      <p class="text-2xl font-semibold font-mono text-slate-200">${target}</p>
    </div>
    <div>
      <p class="text-xs text-purple-500 font-bold uppercase tracking-widest mb-2">Assessed Risk Level</p>
      <p class="text-2xl font-black uppercase ${summary.risk_level === 'critical' ? 'text-red-500' : summary.risk_level === 'high' ? 'text-orange-500' : 'text-yellow-400'}">
        ${summary.risk_level}
      </p>
    </div>
  </div>
  <div class="footer"><span>Pentellia Core</span><span>Generated: ${new Date(completed_at).toLocaleString()}</span></div>
</div>

<div class="pdf-page">
  <div class="flex items-center gap-3 mb-8">
    <div class="p-2.5 bg-purple-500/20 rounded-xl border border-purple-500/30">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
    </div>
    <h2 class="text-3xl font-extrabold text-white">Executive Analytics</h2>
  </div>

  <div class="grid grid-cols-3 gap-6 mb-8">
    <div class="glass text-center relative overflow-hidden flex flex-col justify-center">
      <p class="text-[10px] uppercase text-purple-400 font-bold tracking-widest mb-3">Risk Score</p>
      <p class="text-6xl font-black text-white">${summary.risk_score}</p>
    </div>
    <div class="glass text-center relative overflow-hidden flex flex-col justify-center">
      <p class="text-[10px] uppercase text-blue-400 font-bold tracking-widest mb-3">Total Findings</p>
      <p class="text-6xl font-black text-white">${summary.total_findings}</p>
    </div>
    <div class="glass text-center relative overflow-hidden flex flex-col justify-center">
      <p class="text-[10px] uppercase text-green-400 font-bold tracking-widest mb-3">Affected Assets</p>
      <p class="text-6xl font-black text-white">${summary.affected_assets || 0}</p>
    </div>
  </div>

  ${summary.top_categories && summary.top_categories.length > 0 ? `
  <div class="mb-8 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
    <p class="text-[10px] uppercase text-dim font-bold tracking-widest mb-3">Primary Risk Domains Detected</p>
    <div class="flex gap-2 flex-wrap">
      ${summary.top_categories.map((c: string) => `<span class="px-3 py-1.5 bg-[#0B0C15] border border-white/10 rounded-md text-[10px] font-bold text-slate-300 uppercase tracking-wider">${c.replace(/_/g, ' ')}</span>`).join('')}
    </div>
  </div>
  ` : ''}

  <div class="grid grid-cols-2 gap-8 h-[340px] mb-12">
    <div class="glass flex flex-col items-center justify-between">
      <p class="font-bold w-full text-left text-lg text-white mb-2">Severity Distribution</p>
      <div class="relative w-full flex-1 flex items-center justify-center min-h-[200px]">
        <canvas id="severityChart"></canvas>
        <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
          <span class="text-4xl font-extrabold text-white">${summary.total_findings}</span>
          <span class="text-[10px] font-bold uppercase tracking-widest text-dim mt-1">Total</span>
        </div>
      </div>
      <div class="flex flex-wrap gap-4 mt-4 w-full justify-center text-xs font-semibold text-dim">
        <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>Cri <span class="text-white ml-0.5">${summary.critical || 0}</span></div>
        <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></span>Hi <span class="text-white ml-0.5">${summary.high || 0}</span></div>
        <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]"></span>Med <span class="text-white ml-0.5">${summary.medium || 0}</span></div>
        <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>Low <span class="text-white ml-0.5">${summary.low || 0}</span></div>
      </div>
    </div>
    
    <div class="glass flex flex-col items-center justify-between">
      <p class="font-bold w-full text-left text-lg text-white mb-2">Risk Comparison Benchmark</p>
      <div class="relative w-full flex-1 flex items-center justify-center min-h-[200px]">
        <canvas id="riskChart"></canvas>
      </div>
      <div class="flex gap-4 mt-4 w-full justify-center text-xs font-medium text-dim">
         <span class="italic text-dim/70">Measured against industry standards</span>
      </div>
    </div>
  </div>

  ${result.executive_summary ? `
  <div class="glass bg-gradient-to-r from-purple-900/20 to-transparent border-purple-500/20 border-l-4 border-l-purple-500">
    <div class="flex gap-4 items-start">
      <div class="mt-1 text-purple-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
      </div>
      <p class="text-sm text-slate-300 leading-relaxed font-medium">
        ${escapeHtml(result.executive_summary)}
      </p>
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <span>Pentellia</span>
    <span>Executive Analytics</span>
  </div>
</div>

<div class="pdf-page">
  <div class="flex items-center gap-3 mb-8">
    <div class="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
    </div>
    <h2 class="text-3xl font-extrabold text-white">OWASP Top 10 (2021) Matrix</h2>
  </div>

  <div class="glass mb-8 p-6 bg-gradient-to-br from-emerald-900/10 to-transparent border-emerald-500/20">
      <div class="flex items-center justify-between">
         <div class="space-y-1">
            <h3 class="text-xl font-bold text-white tracking-wide">Application Security Compliance</h3>
            <p class="text-xs text-dim">Assessment against the Open Worldwide Application Security Project standards.</p>
         </div>
         <div class="flex gap-4 text-sm font-bold uppercase tracking-widest">
            <span class="text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">Passed: ${owasp.passed}</span>
            <span class="text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">Failed: ${owasp.failed}</span>
         </div>
      </div>
  </div>

  <div class="space-y-3">
    ${Object.entries(owasp.categories).map(([catName, catData]: any) => `
      <div class="p-4 rounded-xl border ${catData.safe ? 'border-white/5 bg-white/[0.02]' : 'border-red-500/20 bg-red-500/5'} flex justify-between items-center">
         <div class="flex flex-col">
            <span class="${catData.safe ? 'text-slate-300' : 'text-red-300 font-bold'} text-sm">${escapeHtml(catName)}</span>
         </div>
         ${catData.safe
           ? `<span class="text-xs font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-1.5"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg> Pass</span>`
           : `<span class="badge bg-red-500/20 text-red-400 border border-red-500/30 whitespace-nowrap">${catData.count} Violations Found</span>`
         }
      </div>
    `).join('')}
  </div>

  <div class="footer">
    <span>Pentellia</span>
    <span>OWASP Compliance Matrix</span>
  </div>
</div>

<div class="pdf-page">
  <div class="flex items-center gap-3 mb-8">
    <div class="p-2.5 bg-blue-500/20 rounded-xl border border-blue-500/30">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    </div>
    <h2 class="text-3xl font-extrabold text-white">SANS Top 25 CWE Matrix</h2>
  </div>

  <div class="glass mb-8 p-6 bg-gradient-to-br from-blue-900/10 to-transparent border-blue-500/20">
      <div class="flex items-center justify-between">
         <div class="space-y-1">
            <h3 class="text-xl font-bold text-white tracking-wide">Common Weakness Enumeration</h3>
            <p class="text-xs text-dim">Assessment against the SANS Top 25 Most Dangerous Software Errors.</p>
         </div>
         <div class="flex gap-4 text-sm font-bold uppercase tracking-widest">
            <span class="text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">Passed: ${sans.passed}</span>
            <span class="text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">Failed: ${sans.failed}</span>
         </div>
      </div>
  </div>

  <div class="grid grid-cols-2 gap-x-6 gap-y-2">
    <div class="flex flex-col gap-2">
      ${sansCol1.map(([catName, catData]: any) => {
        const parts = catName.split(':');
        const cweId = parts[0];
        const cweDesc = parts.slice(1).join(':').trim();
        return `
        <div class="p-3 rounded-lg border ${catData.safe ? 'border-white/5 bg-white/[0.01]' : 'border-red-500/20 bg-red-500/5'} flex justify-between items-center">
           <div class="flex flex-col pr-2 overflow-hidden">
              <span class="${catData.safe ? 'text-slate-400' : 'text-red-300'} font-bold text-xs mb-0.5">${escapeHtml(cweId)}</span>
              <span class="${catData.safe ? 'text-dim' : 'text-white'} text-[10px] truncate w-[220px]">${escapeHtml(cweDesc)}</span>
           </div>
           ${catData.safe
             ? `<span class="text-[9px] font-bold uppercase tracking-widest text-emerald-500/70">Pass</span>`
             : `<span class="text-[9px] font-bold uppercase text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 whitespace-nowrap">${catData.count} Found</span>`
           }
        </div>
      `}).join('')}
    </div>
    <div class="flex flex-col gap-2">
      ${sansCol2.map(([catName, catData]: any) => {
        const parts = catName.split(':');
        const cweId = parts[0];
        const cweDesc = parts.slice(1).join(':').trim();
        return `
        <div class="p-3 rounded-lg border ${catData.safe ? 'border-white/5 bg-white/[0.01]' : 'border-red-500/20 bg-red-500/5'} flex justify-between items-center">
           <div class="flex flex-col pr-2 overflow-hidden">
              <span class="${catData.safe ? 'text-slate-400' : 'text-red-300'} font-bold text-xs mb-0.5">${escapeHtml(cweId)}</span>
              <span class="${catData.safe ? 'text-dim' : 'text-white'} text-[10px] truncate w-[220px]">${escapeHtml(cweDesc)}</span>
           </div>
           ${catData.safe
             ? `<span class="text-[9px] font-bold uppercase tracking-widest text-emerald-500/70">Pass</span>`
             : `<span class="text-[9px] font-bold uppercase text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 whitespace-nowrap">${catData.count} Found</span>`
           }
        </div>
      `}).join('')}
    </div>
  </div>

  <div class="footer">
    <span>Pentellia</span>
    <span>SANS Top 25 Compliance</span>
  </div>
</div>

${aiPages.map((blocks, idx) => `
<div class="pdf-page">
  <div class="flex items-center gap-3 mb-8">
    <div class="p-2.5 bg-fuchsia-500/20 rounded-xl border border-fuchsia-500/30">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e879f9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="m3 12 18 0"/><path d="m6 6 12 12"/><path d="m18 6-12 12"/></svg>
    </div>
    <h2 class="text-3xl font-extrabold text-white">AI Synthesis ${aiPages.length > 1 ? `<span class="text-lg font-medium text-dim ml-2">(${idx + 1}/${aiPages.length})</span>` : ""}</h2>
  </div>

  <div class="glass border-fuchsia-500/20 shadow-[0_4px_40px_rgba(232,121,249,0.05)]" style="min-height: 800px; max-height: 900px; overflow: hidden;">
    <div class="prose prose-invert max-w-none text-sm leading-relaxed">
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
  <div class="flex items-center gap-3 mb-8">
    <div class="p-2.5 bg-red-500/20 rounded-xl border border-red-500/30">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
    </div>
    <h2 class="text-3xl font-extrabold text-white">Detailed Findings <span class="text-lg font-medium text-dim ml-2">(${i + 1}/${findingPages.length})</span></h2>
  </div>

  <div class="space-y-6">
  ${page.map((f: any) => {
    const sevColor = getColor(f.severity);
    const nvd = f.evidence?.additional?.nvd_enrichment;
    const cveId = f.evidence?.additional?.cve_id;
    const hosts = f.evidence?.additional?.affected_hosts || [];
    
    return `
    <div class="glass border-white/5 bg-[#100b1a] relative overflow-hidden p-6">
      <div class="absolute top-0 left-0 w-1.5 h-full bg-${sevColor}-500"></div>
      
      <div class="flex justify-between items-start mb-3">
        <h4 class="font-bold text-lg text-white w-5/6 leading-snug">
          <span class="text-dim mr-2">${f.__index}.</span>${escapeHtml(f.title)}
        </h4>
        <span class="badge bg-${sevColor}-500/20 text-${sevColor}-400 border border-${sevColor}-500/30">${f.severity}</span>
      </div>

      ${(f.owasp_category || f.sans_category) ? `
      <div class="flex flex-wrap gap-2 mb-4">
        ${f.owasp_category ? `<span class="text-[10px] font-bold tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-1 rounded-md uppercase">${escapeHtml(f.owasp_category)}</span>` : ''}
        ${f.sans_category ? `<span class="text-[10px] font-bold tracking-wider bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20 px-2.5 py-1 rounded-md uppercase truncate max-w-[300px]">${escapeHtml(f.sans_category.split(':')[0])}</span>` : ''}
      </div>
      ` : ''}

      ${nvd ? `
      <div class="grid grid-cols-4 gap-4 mb-4 bg-black/30 border border-white/5 rounded-lg p-3">
         <div>
            <p class="text-[9px] uppercase tracking-widest text-dim mb-1">CVE ID</p>
            <p class="text-xs font-bold text-white">${escapeHtml(cveId || 'N/A')}</p>
         </div>
         <div class="col-span-2">
            <p class="text-[9px] uppercase tracking-widest text-dim mb-1">CVSS v3 Vector</p>
            <p class="text-[10px] font-mono text-blue-300 truncate">${escapeHtml(nvd.cvss_v3?.vector_string || 'N/A')}</p>
         </div>
         <div>
            <p class="text-[9px] uppercase tracking-widest text-dim mb-1">Exploitability</p>
            <p class="text-xs font-bold text-white">${nvd.exploitability_score ? `${nvd.exploitability_score}/10` : 'N/A'}</p>
         </div>
      </div>
      ` : ''}

      <div class="mb-4">
        <p class="text-[11px] font-bold uppercase tracking-widest text-dim mb-1">Description & Impact</p>
        <p class="text-sm text-slate-300 leading-relaxed font-light">${escapeHtml(f.description || f.impact)}</p>
      </div>

      <div class="grid grid-cols-2 gap-6 mb-4">
         <div class="bg-white/[0.02] border border-white/5 rounded-lg p-3 flex flex-col justify-center">
           <p class="text-[10px] uppercase tracking-widest text-dim mb-1">Primary Asset</p>
           <p class="text-sm font-mono text-blue-300 break-all">${escapeHtml(f.affected_asset)}</p>
         </div>
         <div class="bg-white/[0.02] border border-white/5 rounded-lg p-3 flex flex-col justify-center">
           <p class="text-[10px] uppercase tracking-widest text-dim mb-1">Detector Module</p>
           <p class="text-sm text-slate-300">${escapeHtml(f.source_tool || "Orchestrator")}</p>
         </div>
      </div>

      ${hosts.length > 0 ? `
      <div class="mb-4 pt-4 border-t border-white/5">
        <p class="text-[10px] uppercase tracking-widest text-dim mb-2">Affected Endpoints (${hosts.length})</p>
        <div class="flex flex-wrap gap-2">
          ${hosts.slice(0, 8).map((h: any) => `<span class="bg-[#0B0C15] border border-white/10 text-slate-400 text-[10px] px-2.5 py-1 rounded font-mono">${escapeHtml(h.ip)}:${escapeHtml(String(h.port))} ${h.service !== 'unknown' ? `<span class="text-slate-600">(${escapeHtml(h.service)})</span>` : ''}</span>`).join('')}
          ${hosts.length > 8 ? `<span class="bg-[#0B0C15] border border-white/10 text-slate-500 text-[10px] px-2.5 py-1 rounded font-mono">+${hosts.length - 8} more</span>` : ''}
        </div>
      </div>
      ` : ''}

      ${f.recommendation ? `
      <div class="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
        <p class="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1.5 flex items-center gap-2">
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg> Remediation
        </p>
        <p class="text-sm text-slate-300 leading-relaxed">${escapeHtml(f.recommendation)}</p>
      </div>
      ` : ''}
    </div>
  `}).join("")}
  </div>

  <div class="footer">
    <span>Pentellia</span>
    <span>Vulnerabilities • Page ${i + 1}</span>
  </div>
</div>
`}).join("") : `
<div class="pdf-page flex flex-col items-center justify-center text-center">
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mb-6 opacity-50"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
    <h2 class="text-2xl font-bold text-white mb-2">No Vulnerabilities Detected</h2>
    <p class="text-slate-400 max-w-md">The selected scanners did not find any issues matching the requested scope. The infrastructure appears secure against the executed profiles.</p>
</div>
`}

<script>
Chart.register(ChartDataLabels);
Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
Chart.defaults.color = '#9ca3af';

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
        backgroundColor: ['#a855f7', '#312e81', '#312e81'],
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 50
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
          offset: -30,
          font: { weight: 'bold', size: 16 },
          formatter: (value) => value
        }
      },
      scales: { 
        y: { display: false, max: 100, beginAtZero: true }, 
        x: { 
          grid: { display: false },
          border: { display: false },
          ticks: { font: { weight: '700', size: 12 }, color: '#9ca3af', padding: 10 }
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