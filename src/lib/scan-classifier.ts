/**
 * scan-classifier.ts
 *
 * Centralized scan classification layer for Pentellia.
 * Determines "light" vs "deep" from actual tool parameters.
 *
 * Built by reading every tool function in f.py and mapping the exact
 * params that change behavior from passive/light to active/deep.
 *
 * Rules:
 *   1. Tool-level override  (always-deep tools regardless of params)
 *   2. Explicit scope param (scan_level, depth, scope)
 *   3. Intensity params     (level, risk, threads)
 *   4. Per-signal flags     (enable_cve, aggressive, recursive, …)
 *   5. Default → "light"
 *
 * Future-proof: any new tool using standard param names classifies
 * automatically without changes here. Tool-specific edge cases are
 * handled by reading the ACTUAL default values from f.py.
 */

// ─── Section 1: Tool-level overrides ─────────────────────────────────────────
//
// These tools are ALWAYS deep regardless of parameters.
// Rationale sourced from f.py:
//
//   gvm          → OpenVAS full vulnerability assessment (3600s timeout, scans
//                  all 65535 ports, correlates CVEs, modifies remote GVM state)
//   discovery    → Interactive multi-phase asset discovery (subdomain enum,
//                  port mapping, API endpoint discovery, cloud asset enumeration)
//   authtest     → Authentication security testing (JWT analysis, session
//                  security, OAuth testing, rate-limit probing)
//   React-2-Shell → CVE-2025-55182 / CVE-2025-66478 exploit tool — executes
//                  remote commands or opens reverse shells on targets
//
const ALWAYS_DEEP: ReadonlySet<string> = new Set([
  "gvm",
  "discovery",
  "authtest",
  "react-2-shell",
  "React-2-Shell",
]);

// ─── Section 2: Optional manual overrides ────────────────────────────────────
//
// Force a specific classification for a tool slug, overriding param logic.
// Keep this minimal — prefer adding param rules above.
// Example: "enterprise-scanner": "deep"
//
const TOOL_OVERRIDES: Readonly<Record<string, "light" | "deep">> = {};

// ─── Section 3: Normalizer ────────────────────────────────────────────────────
//
// Different tools use different key names for the same concept.
// Normalizing once here keeps the classifier rule-set clean.
//
// Key mappings sourced from f.py param extraction:
//   scan_level / depth / scope     → scanLevel
//   level / intensity              → intensity    (sqlmap: 1–5)
//   risk                           → risk         (sqlmap: 1–3)
//   threads / max_threads          → threads      (httpx, sqlmap, wpscan)
//   type                           → nmapType     (nmap: '1'=lite, '2'=deep)
//   enable_cve                     → enableCve    (nmap, nuclei, webscan)
//   enable_xss                     → enableXss    (webscan)
//   enable_sqli                    → enableSqli   (webscan)
//   aggressive                     → aggressive   (drupalscanner, joomlascanner,
//                                                  sharepointscanner, wpscan)
//   recursive                      → recursive    (dirb: non-recursive default)
//   automatic_scan                 → automaticScan(nuclei: -as flag)
//   use_shodan                     → useShodan    (subdomainfinder)
//   use_nmap                       → useNmap      (cvesearch: runs nmap vuln scripts)
//   deep_domxss                    → deepDomxss   (dalfox)
//   blind_xss                      → blindXss     (xssstrike)
//   probe_paths                    → probePaths   (jsspider: probes 100+ sensitive paths)
//   include_response               → includeResponse (httpx)
//   screenshot                     → screenshot   (httpx)
//   attack_type                    → attackType   (passwordauditor: 'spray'|'dictionary')
//   detection_mode                 → detectionMode(wpscan: 'mixed'|'passive'|'aggressive')
//   scan_mode                      → scanMode     (jsspider: 'quick'|'full')
//   enumerate                      → enumerate    (wpscan: comma-sep flags)
//   severity                       → severity     (nuclei: comma-sep or array)
//   payload_level                  → payloadLevel (xssstrike: 1–3)
//   crawl_depth                    → crawlDepth   (xssstrike: default 2)
//   rate                           → rate         (masscan: default 1000)
//   ports                          → ports        (masscan/nmap: '0-65535' = full)
//   deep_scan                      → deepScan     (cmsscan)

export interface NormalizedParams {
  scanLevel:       string | undefined;
  intensity:       number | undefined;
  risk:            number | undefined;
  threads:         number | undefined;
  nmapType:        string | undefined;
  enableCve:       boolean;
  enableXss:       boolean;
  enableSqli:      boolean;
  aggressive:      boolean;
  recursive:       boolean;
  automaticScan:   boolean;
  useShodan:       boolean;
  useNmap:         boolean;
  deepDomxss:      boolean;
  blindXss:        boolean;
  probePaths:      boolean | undefined; // undefined = not supplied by user
  includeResponse: boolean;
  screenshot:      boolean;
  attackType:      string | undefined;
  detectionMode:   string | undefined;
  scanMode:        string | undefined;
  enumerate:       string | undefined;
  severity:        string[] | undefined;
  payloadLevel:    number | undefined;
  crawlDepth:      number | undefined;
  rate:            number | undefined;
  ports:           string | undefined;
  deepScan:        boolean;
}

export function normalizeParams(raw: Record<string, any>): NormalizedParams {
  const bool = (v: any): boolean =>
    v === true || v === "true" || v === 1 || v === "1";

  const maybeBool = (v: any): boolean | undefined =>
    v == null ? undefined : bool(v);

  const num = (v: any): number | undefined => {
    if (v == null) return undefined;
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return isNaN(n) ? undefined : n;
  };

  const lower = (v: any): string | undefined =>
    v != null ? String(v).trim().toLowerCase() : undefined;

  const parseSeverity = (v: any): string[] | undefined => {
    if (!v) return undefined;
    if (Array.isArray(v)) return v.map((s: any) => String(s).toLowerCase().trim());
    if (typeof v === "string") return v.split(",").map((s) => s.toLowerCase().trim());
    return undefined;
  };

  return {
    // depth / scope
    scanLevel:       lower(raw.scan_level ?? raw.depth ?? raw.scope),
    intensity:       num(raw.level ?? raw.intensity),
    risk:            num(raw.risk),
    threads:         num(raw.threads ?? raw.max_threads),

    // nmap: '1' = lite (-T4 -F -sV), '2' = deep (-A -T3 -p-)
    nmapType:        raw.type != null ? String(raw.type) : undefined,

    // CVE / vulnerability
    enableCve:       bool(raw.enable_cve),
    useNmap:         bool(raw.use_nmap),      // cvesearch: triggers nmap vuln scripts

    // attack flags
    enableXss:       bool(raw.enable_xss),
    enableSqli:      bool(raw.enable_sqli),
    aggressive:      bool(raw.aggressive),
    deepDomxss:      bool(raw.deep_domxss),
    blindXss:        bool(raw.blind_xss),

    // enumeration
    recursive:       bool(raw.recursive),
    automaticScan:   bool(raw.automatic_scan),
    useShodan:       bool(raw.use_shodan),

    // jsspider: probe_paths defaults True in f.py but we treat undefined
    // differently from explicit true — see classifier rule below
    probePaths:      maybeBool(raw.probe_paths),

    // httpx
    includeResponse: bool(raw.include_response),
    screenshot:      bool(raw.screenshot),

    // passwordauditor
    attackType:      raw.attack_type != null ? String(raw.attack_type).toLowerCase() : undefined,

    // wpscan
    detectionMode:   lower(raw.detection_mode),
    enumerate:       raw.enumerate != null ? String(raw.enumerate) : undefined,

    // jsspider
    scanMode:        lower(raw.scan_mode),

    // nuclei
    severity:        parseSeverity(raw.severity),

    // xssstrike
    payloadLevel:    num(raw.payload_level),
    crawlDepth:      num(raw.crawl_depth),

    // masscan
    rate:            num(raw.rate),
    ports:           raw.ports != null ? String(raw.ports).trim() : undefined,

    // cmsscan
    deepScan:        bool(raw.deep_scan),
  };
}

// ─── Section 4: Classifier ────────────────────────────────────────────────────

/**
 * classifyScan(toolSlug, params) → "light" | "deep"
 *
 * Pure function. No I/O, no DB, no side effects.
 * Call this BEFORE any usage increment or DB insert.
 *
 * @param toolSlug  - Tool ID as stored in DB (matches SUPPORTED_TOOLS in f.py)
 * @param params    - Raw params object from the scan request body
 */
export function classifyScan(
  toolSlug: string,
  params: Record<string, any> = {},
): "light" | "deep" {
  const slug = toolSlug.toLowerCase();

  // ── Rule 1: Tool-level hardcoded overrides ──────────────────────────
  if (ALWAYS_DEEP.has(toolSlug) || ALWAYS_DEEP.has(slug)) return "deep";

  const manual = TOOL_OVERRIDES[toolSlug] ?? TOOL_OVERRIDES[slug];
  if (manual) return manual;

  const p = normalizeParams(params);

  // ── Rule 2: Explicit scope declarations ────────────────────────────
  //   webscan / networkscan / cloudscan all read scan_level from params
  //   discovery scope='full' is handled by ALWAYS_DEEP above
  if (p.scanLevel === "deep" || p.scanLevel === "full") return "deep";
  if (
    p.scanLevel === "light" ||
    p.scanLevel === "minimal" ||
    p.scanLevel === "standard"
  ) return "light";

  // ── Rule 3: Intensity parameters ───────────────────────────────────
  //   sqlmap: level 1–5 (3+ = deep), risk 1–3 (2+ = deep)
  //   Source: f.py run_sqlmap — default level=1, risk=1 = light
  if (p.intensity != null && p.intensity >= 3) return "deep";
  if (p.risk      != null && p.risk      >= 2) return "deep";

  //   threads > 5: httpx, sqlmap, wpscan all take threads param
  //   5 workers is a reasonable light/deep boundary
  if (p.threads != null && p.threads > 5) return "deep";

  // ── Rule 4: nmap scan type ──────────────────────────────────────────
  //   type='1': -T4 -F -sV  (fast, top-100 ports, version detection) = light
  //   type='2': -A -T3 -p-  (aggressive, all 65535 ports)            = deep
  if (p.nmapType === "2") return "deep";

  // ── Rule 5: CVE / vulnerability detection ──────────────────────────
  //   enable_cve: adds --script vulners,vuln to nmap OR -tags cve to nuclei
  //   use_nmap:   cvesearch explicitly runs nmap with vuln scripts
  if (p.enableCve) return "deep";
  if (p.useNmap)   return "deep";

  // ── Rule 6: Exploit / attack flags ─────────────────────────────────
  if (p.enableXss)    return "deep";
  if (p.enableSqli)   return "deep";
  if (p.aggressive)   return "deep";   // drupalscanner, joomlascanner, sharepointscanner, wpscan
  if (p.deepDomxss)   return "deep";   // dalfox deep DOM XSS
  if (p.blindXss)     return "deep";   // xssstrike blind XSS (external callback)
  if (p.deepScan)     return "deep";   // cmsscan deep_scan flag

  // ── Rule 7: Credential attack type ─────────────────────────────────
  //   spray = credential spraying (tries same pwd across many users → lockouts)
  //   brute_force = explicit brute force
  //   Source: f.py run_passwordauditor — default is 'dictionary' = light
  if (p.attackType === "spray" || p.attackType === "brute_force") return "deep";

  // ── Rule 8: Enumeration flags ───────────────────────────────────────
  if (p.recursive)      return "deep"; // dirb: non-recursive by default in f.py
  if (p.automaticScan)  return "deep"; // nuclei -as (uses all templates)
  if (p.useShodan)      return "deep"; // subdomainfinder: queries Shodan API

  // ── Rule 9: Detection / scan mode ──────────────────────────────────
  //   wpscan detection_mode: 'passive' | 'mixed' (default) | 'aggressive'
  if (p.detectionMode === "aggressive") return "deep";

  //   jsspider scan_mode: 'quick' (default) | 'full'
  //   'full' mode crawls up to max_depth levels and probes all sensitive paths
  if (p.scanMode === "full") return "deep";

  // ── Rule 10: jsspider probe_paths ──────────────────────────────────
  //   probe_paths=true fires 100+ HTTP requests to sensitive paths
  //   (/.env, /.git/config, /backup.sql, /admin, /phpinfo.php, etc.)
  //   f.py default is True BUT frontend forms default to False.
  //   Only mark deep when EXPLICITLY set to true by the user.
  if (slug === "jsspider" && p.probePaths === true) return "deep";

  // ── Rule 11: httpx advanced collection ─────────────────────────────
  //   include_response: collects full HTTP response bodies → high bandwidth
  //   screenshot: runs headless browser to capture pages → heavy
  if (p.includeResponse) return "deep";
  if (p.screenshot)      return "deep";

  // ── Rule 12: WPScan sensitive enumeration flags ─────────────────────
  //   vp = vulnerable plugins   ← light
  //   vt = vulnerable themes    ← light
  //   tt = timely topics        ← light
  //   u  = users                ← light
  //   cb = config backups       ← DEEP (sensitive files)
  //   dbe = db exports          ← DEEP (database exports)
  //   m  = timthumbs            ← DEEP (old/vulnerable thumb script)
  //   ap = all plugins          ← DEEP (scans every plugin)
  //   at = all themes           ← DEEP (scans every theme)
  if (p.enumerate) {
    const DEEP_ENUM_FLAGS = new Set(["cb", "dbe", "m", "ap", "at"]);
    const enumList = p.enumerate.split(",").map((e: string) => e.trim().toLowerCase());
    if (enumList.some((flag: string) => DEEP_ENUM_FLAGS.has(flag))) return "deep";
  }

  // ── Rule 13: Nuclei severity scope ─────────────────────────────────
  //   critical + high only → light (targeted, fast)
  //   medium / low / info / unknown → broad template set → deep
  if (p.severity?.length) {
    const BROAD_SEVERITIES = new Set(["medium", "low", "info", "unknown"]);
    if (p.severity.some((s) => BROAD_SEVERITIES.has(s))) return "deep";
  }

  // ── Rule 14: XSSStrike intensity ────────────────────────────────────
  //   payload_level 1=basic, 2=medium (default), 3=advanced evasion
  //   crawl_depth   default 2; 3+ = aggressive recursive crawl
  if (p.payloadLevel != null && p.payloadLevel >= 3) return "deep";
  if (p.crawlDepth   != null && p.crawlDepth   >= 3) return "deep";

  // ── Rule 15: Masscan full port range or high rate ───────────────────
  //   '0-65535' / '1-65535' = full 65k port scan = deep
  //   rate > 5000 pkts/sec = aggressive (default 1000 = light)
  if (p.ports === "0-65535" || p.ports === "1-65535") return "deep";
  if (p.rate != null && p.rate > 5000) return "deep";

  // ── Rule 16: breachintel ────────────────────────────────────────────
  //   Purely passive breach database lookup — never touches target directly.
  //   Always light regardless of query type (email/domain/username/auto).
  if (slug === "breachintel") return "light";

  // ── Default ──────────────────────────────────────────────────────────
  return "light";
}