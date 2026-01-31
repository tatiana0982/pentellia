export function getPurpleReportHtml(data: any) {
  const { result, target, completed_at } = data;
  // Handle ai_summary being inside result or data
  const ai_summary = data.ai_summary || result.ai_summary;
  const { meta, summary, findings, tool_coverage } = result;

  /* ================= CONFIG ================= */
  const logoUrl = "https://pentellia.vercel.app/logo.png";
  const PAGE_HEIGHT = 1122;
  const PAGE_PADDING = 160;
  const MAX_HEIGHT = PAGE_HEIGHT - PAGE_PADDING;

  /* ================= PAGINATION ENGINE ================= */
  function estimateTextHeight(text = "") {
    return text.length * 0.28;
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
      .replace(
        /^### (.*$)/gim,
        '<h3 class="text-lg font-bold text-purple-400 mt-4 mb-2">$1</h3>',
      )
      .replace(
        /^## (.*$)/gim,
        '<h2 class="text-xl font-bold text-white mt-6 mb-3 border-b border-purple-500/30 pb-1">$1</h2>',
      )
      .replace(
        /^# (.*$)/gim,
        '<h1 class="text-2xl font-bold text-white mb-4">$1</h1>',
      )
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-purple-300">$1</strong>') // Bold
      .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-1 text-dim">• $1</li>') // List items
      .replace(/---\n/g, '<hr class="border-white/10 my-4">') // Horizontal rule
      .replace(
        /`(.*?)`/g,
        '<code class="bg-purple-900/30 px-1 rounded text-purple-200">$1</code>',
      ); // Inline code
  }

  /* ================= UPDATED PAGINATION ENGINE ================= */
  // Inside your getPurpleReportHtml function:

  const aiRaw = ai_summary || result.ai_summary || "";
  // Split by double newlines or table separators to avoid breaking blocks mid-page
  const aiBlocks = aiRaw
    .split(/\n\n|---/)
    .filter((b: string) => b.trim() !== "");

  // Increase estimate to account for larger headers and list padding
  const aiPages = paginate(aiBlocks, (block: any) => {
    const lines = block.split("\n").length;
    return block.length * 0.35 + lines * 25; // Add height for line breaks and headers
  });
  /* ================= FINDINGS PAGINATION ================= */
  function estimateFindingHeight(f: any) {
    let h = 150;
    h += estimateTextHeight(f.impact);
    h += estimateTextHeight(f.recommendation);
    return h;
  }
  const indexedFindings = findings.map((f: any, index: number) => ({
    ...f,
    __index: index + 1,
  }));
  const findingPages = paginate(indexedFindings, estimateFindingHeight);

  const reconFindings = findings.filter(
    (f: any) =>
      f.category === "reconnaissance" || f.tags?.includes("intelligence"),
  );
  const headerFindings = findings.filter(
    (f: any) => f.category === "security_headers",
  );

  const headerPages = paginate(headerFindings, estimateFindingHeight);
  const reconPages = paginate(reconFindings, estimateFindingHeight);

  /* ================= HTML ================= */
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
/* ... (Keep your existing styles) ... */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
:root { --bg-deep: #0a0514; --bg-card: #150e26; --accent: #9333ea; --text-main: #f3f4f6; --text-dim: #9ca3af; }
body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg-deep); color: var(--text-main); -webkit-print-color-adjust: exact; }
.pdf-page { width: 210mm; height: 297mm; padding: 60px; page-break-after: always; position: relative; overflow: hidden; }
.glass { background: var(--bg-card); border: 1px solid rgba(147,51,234,0.2); border-radius: 12px; padding: 20px; }
.footer { position: absolute; bottom: 30px; left: 60px; right: 60px; font-size: 9px; color: var(--text-dim); display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; }
.badge { font-size: 10px; padding: 3px 8px; border-radius: 999px; font-weight: 700; text-transform: uppercase; }
</style>
</head>
<body>

<div class="pdf-page flex flex-col justify-between">
  <div>
    <img src="${logoUrl}" class="h-52 mb-20 mr-16" />
    <h1 class="text-6xl font-bold leading-tight mb-4">${meta.tool}</h1>
    <p class="uppercase tracking-widest text-purple-400">Pentellia Security Suite</p>
  </div>
  <div class="grid grid-cols-2 gap-10 border-t border-white/10 pt-10">
    <div><p class="text-xs text-purple-500 font-bold uppercase">Target</p><p class="text-xl font-semibold">${target}</p></div>
    <div><p class="text-xs text-purple-500 font-bold uppercase">Risk Level</p><p class="text-xl font-bold text-yellow-400">${summary.risk_level.toUpperCase()}</p></div>
  </div>
  <div class="footer"><span>Pentellia</span><span>${completed_at}</span></div>
</div>
${aiPages
  .map(
    (blocks, idx) => `
<div class="pdf-page">
  <div class="flex items-center gap-3 mb-6">
    <div class="p-2 bg-purple-500/20 rounded-lg">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
    </div>
    <h2 class="text-3xl font-bold">AI Intelligence Summary ${aiPages.length > 1 ? `<span class="text-sm text-dim">(${idx + 1}/${aiPages.length})</span>` : ""}</h2>
  </div>

  <div class="glass border-purple-500/30 mb-20" style="min-height: 750px; max-height: 850px; overflow: hidden;">
    <div class="prose prose-invert max-w-none">
      ${blocks
        .map(
          (block) => `
        <div class="mb-4">
          ${formatAiMarkdown(block)}
        </div>
      `,
        )
        .join("")}
    </div>
  </div>

  <div class="footer">
    <span>Pentellia AI Engine</span>
    <span>AI Analysis • Page ${idx + 1}</span>
  </div>
</div>
`,
  )
  .join("")}

<!-- ================= PAGE 2: EXECUTIVE ANALYTICS ================= -->
<div class="pdf-page">
  <h2 class="text-3xl font-bold mb-10">Executive Analytics</h2>

  <div class="grid grid-cols-3 gap-6 mb-10">
    <div class="glass text-center">
      <p class="text-xs uppercase text-dim">Risk Score</p>
      <p class="text-4xl font-bold">${summary.risk_score}</p>
    </div>
    <div class="glass text-center">
      <p class="text-xs uppercase text-dim">Findings</p>
      <p class="text-4xl font-bold">${summary.total_findings}</p>
    </div>
    <div class="glass text-center">
      <p class="text-xs uppercase text-dim">Assets</p>
      <p class="text-4xl font-bold">${summary.affected_assets}</p>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-8 h-[300px] mb-12">
    <div class="glass">
      <p class="font-bold mb-4">Severity Distribution</p>
      <canvas id="severityChart"></canvas>
    </div>
    <div class="glass">
      <p class="font-bold mb-4">Risk Comparison</p>
      <canvas id="riskChart"></canvas>
    </div>
  </div>

  <div class="glass">
    <p class="italic text-sm text-dim">
      "${result.executive_summary}"
    </p>
  </div>

  <div class="footer">
    <span>Pentellia</span>
    <span>Page 2</span>
  </div>
</div>

<!-- ================= PAGE 3: TOOLS & COVERAGE ================= -->
<div class="pdf-page">
  <h2 class="text-3xl font-bold mb-8">Tools & Scan Coverage</h2>

  <div class="glass mb-8">
    <div class="grid grid-cols-2 gap-4">
      ${tool_coverage.tools_executed
        .map(
          (t: string) => `
        <div class="flex items-center gap-2 text-sm">
          <span class="w-2 h-2 rounded-full bg-green-500"></span>
          ${t}
        </div>
      `,
        )
        .join("")}
    </div>
  </div>

  <div class="glass">
    <p class="text-xs uppercase text-purple-400 font-bold mb-2">
      Scan Timeline
    </p>
    <p class="text-sm text-dim">Started: ${meta.started_at}</p>
    <p class="text-sm text-dim">Completed: ${meta.completed_at}</p>
  </div>

  <div class="footer">
    <span>Pentellia</span>
    <span>Page 3</span>
  </div>
</div>

<!-- ================= AUTO-PAGINATED RECON ================= -->
${reconPages
  .map(
    (page, i) => `
<div class="pdf-page">
  <h2 class="text-3xl font-bold mb-8">Attack Surface & Reconnaissance</h2>

  ${page
    .map(
      (f: any) => `
    <div class="glass mb-6">
      <div class="flex justify-between mb-2">
        <h4 class="font-semibold">${f.title}</h4>
        <span class="badge bg-blue-500/20 text-blue-400">${f.severity}</span>
      </div>
      <p class="text-sm text-dim mb-2">${f.description}</p>
      <p class="text-xs text-purple-400">${f.recommendation}</p>
    </div>
  `,
    )
    .join("")}

  <div class="footer">
    <span>Pentellia</span>
    <span>Recon ${i + 1}/${reconPages.length}</span>
  </div>
</div>
`,
  )
  .join("")}

<!-- ================= AUTO-PAGINATED HEADERS ================= -->
${headerPages
  .map(
    (page, i) => `
<div class="pdf-page">
  <h2 class="text-3xl font-bold mb-8">Security Headers Assessment</h2>

  ${page
    .map(
      (f: any) => `
    <div class="glass mb-4">
      <div class="flex justify-between mb-2">
        <h4 class="font-semibold">${f.title}</h4>
        <span class="badge bg-red-500/20 text-red-400">${f.severity}</span>
      </div>
      <p class="text-sm text-dim mb-2">${f.impact}</p>
      <p class="text-xs text-purple-400">${f.recommendation}</p>
    </div>
  `,
    )
    .join("")}

  <div class="footer">
    <span>Pentellia</span>
    <span>Headers ${i + 1}/${headerPages.length}</span>
  </div>
</div>
`,
  )
  .join("")}

<!-- ================= AUTO-PAGINATED FINDINGS ================= -->
${findingPages
  .map(
    (page, i) => `
<div class="pdf-page">
  <h2 class="text-3xl font-bold mb-8">Detailed Findings</h2>

  ${page
    .map(
      (f: any, idx: number) => `
    <div class="glass mb-6">
      <div class="flex justify-between mb-2">
        <h4 class="font-semibold text-sm">
          ${i * 10 + idx + 1}. ${f.title}
        </h4>
        <span class="badge bg-purple-500/20 text-purple-400">${f.severity}</span>
      </div>
      <p class="text-xs text-dim mb-1"><strong>Impact:</strong> ${f.impact}</p>
      <p class="text-xs text-dim mb-1"><strong>Confidence:</strong> ${(f.confidence * 100).toFixed(0)}%</p>
      <p class="text-xs text-purple-400"><strong>Recommendation:</strong> ${f.recommendation}</p>
    </div>
  `,
    )
    .join("")}

  <div class="footer">
    <span>Pentellia</span>
    <span>Findings ${i + 1}/${findingPages.length}</span>
  </div>
</div>
`,
  )
  .join("")}


  <!-- ================= PAGE: COMPLIANCE MAPPING ================= -->
<div class="pdf-page">
  <h2 class="text-3xl font-bold mb-8">Compliance & Risk Mapping</h2>

  <div class="glass mb-6">
    <h3 class="text-sm font-bold text-purple-400 uppercase mb-4">
      OWASP Top 10 Coverage
    </h3>

    <div class="space-y-3 text-sm text-dim">
      <div class="flex justify-between">
        <span>A05: Security Misconfiguration</span>
        <span class="text-yellow-400 font-bold">Detected</span>
      </div>
      <div class="flex justify-between">
        <span>A03: Injection</span>
        <span class="text-green-400 font-bold">Not Detected</span>
      </div>
      <div class="flex justify-between">
        <span>A01: Broken Access Control</span>
        <span class="text-blue-400 font-bold">Informational</span>
      </div>
    </div>
  </div>

  <div class="glass">
    <h3 class="text-sm font-bold text-purple-400 uppercase mb-4">
      Compliance Readiness
    </h3>

    <div class="grid grid-cols-3 gap-4 text-center">
      <div>
        <p class="text-xs text-dim uppercase">ISO 27001</p>
        <p class="text-lg font-bold text-yellow-400">Partial</p>
      </div>
      <div>
        <p class="text-xs text-dim uppercase">SOC 2</p>
        <p class="text-lg font-bold text-yellow-400">Partial</p>
      </div>
      <div>
        <p class="text-xs text-dim uppercase">PCI DSS</p>
        <p class="text-lg font-bold text-green-400">Low Scope</p>
      </div>
    </div>
  </div>

  <div class="footer">
    <span>Pentellia</span>
    <span>Compliance Overview</span>
  </div>
</div>
<!-- ================= PAGE: ATTACK SCENARIOS ================= -->
<div class="pdf-page">
  <h2 class="text-3xl font-bold mb-8">Potential Attack Scenarios</h2>

  <div class="glass mb-6">
    <h3 class="text-sm font-bold text-red-400 uppercase mb-2">
      Scenario 1: XSS via Missing CSP
    </h3>
    <p class="text-sm text-dim mb-2">
      An attacker could inject malicious JavaScript through third-party
      resources due to the absence of a Content-Security-Policy header.
    </p>
    <p class="text-xs text-purple-400">
      Impact: Session hijacking, credential theft, client-side malware.
    </p>
  </div>

  <div class="glass mb-6">
    <h3 class="text-sm font-bold text-yellow-400 uppercase mb-2">
      Scenario 2: Clickjacking
    </h3>
    <p class="text-sm text-dim mb-2">
      Without X-Frame-Options, attackers may embed the site inside
      malicious iframes to trick users into unintended actions.
    </p>
    <p class="text-xs text-purple-400">
      Impact: Unauthorized actions, user manipulation.
    </p>
  </div>

  <div class="glass">
    <h3 class="text-sm font-bold text-blue-400 uppercase mb-2">
      Scenario 3: Infrastructure Fingerprinting
    </h3>
    <p class="text-sm text-dim mb-2">
      Disclosure of server technology allows attackers to tailor exploits
      based on known platform weaknesses.
    </p>
  </div>

  <div class="footer">
    <span>Pentellia</span>
    <span>Attack Simulation</span>
  </div>
</div>

<!-- ================= PAGE: SECURITY MATURITY ================= -->
<div class="pdf-page">
  <h2 class="text-3xl font-bold mb-8">Security Maturity Scorecard</h2>

  <div class="glass mb-8">
    <div class="grid grid-cols-2 gap-6 text-sm">
      <div class="flex justify-between">
        <span>Perimeter Protection</span>
        <span class="text-yellow-400 font-bold">Basic</span>
      </div>
      <div class="flex justify-between">
        <span>Application Hardening</span>
        <span class="text-red-400 font-bold">Weak</span>
      </div>
      <div class="flex justify-between">
        <span>Security Headers</span>
        <span class="text-red-400 font-bold">Poor</span>
      </div>
      <div class="flex justify-between">
        <span>Threat Visibility</span>
        <span class="text-green-400 font-bold">Good</span>
      </div>
      <div class="flex justify-between">
        <span>Exposure Management</span>
        <span class="text-yellow-400 font-bold">Moderate</span>
      </div>
    </div>
  </div>

  <div class="glass">
    <p class="text-sm text-dim italic">
      Overall maturity indicates early-stage security posture with
      significant improvement potential through configuration hardening
      and proactive controls.
    </p>
  </div>

  <div class="footer">
    <span>Pentellia</span>
    <span>Security Maturity</span>
  </div>
</div>

<script>
new Chart(document.getElementById('severityChart'), {
  type: 'doughnut',
  data: {
    labels: ['High','Medium','Low','Info'],
    datasets: [{
      data: [${summary.high},${summary.medium},${summary.low},${summary.info}],
      backgroundColor: ['#ef4444','#f97316','#eab308','#3b82f6']
    }]
  },
  options: { plugins: { legend: { display: false } }, cutout: '70%' }
});

new Chart(document.getElementById('riskChart'), {
  type: 'bar',
  data: {
    labels: ['Score','Baseline','Threshold'],
    datasets: [{
      data: [${summary.risk_score},50,80],
      backgroundColor: ['#9333ea','#1e1b4b','#1e1b4b']
    }]
  },
  options: {
    plugins: { legend: { display: false } },
    scales: { y: { display: false }, x: { grid: { display: false } } }
  }
});
</script>

</body>
</html>
`;
}
