import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Puppeteer and Chromium must stay in Node.js runtime (not bundled)
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min"],
  outputFileTracingIncludes: {
    "/api/pdf":              ["./node_modules/@sparticuz/chromium-min/**/*"],
    "/api/invoice/download": ["./node_modules/@sparticuz/chromium-min/**/*"],
  },

  typescript: { ignoreBuildErrors: true },
  eslint:     { ignoreDuringBuilds: true },

  compress: true,

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-switch",
      "@radix-ui/react-scroll-area",
    ],
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error"] }
      : false,
  },

  // ── COOP headers — fixes Razorpay popup window.closed errors ──────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy",  value: "same-origin-allow-popups" },
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
          { key: "X-Content-Type-Options",       value: "nosniff" },
          { key: "X-Frame-Options",              value: "DENY" },
          { key: "Referrer-Policy",              value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  // ── Tools proxy — server-side only, eliminates any mixed-content risk ──
  async rewrites() {
    const toolsBase = process.env.TOOLS_BASE_URL;
    if (!toolsBase) return [];
    return [
      {
        source:      "/api/tools-proxy/:path*",
        destination: `${toolsBase}/:path*`,
      },
    ];
  },

  images: {
    unoptimized: false,
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
};

export default nextConfig;