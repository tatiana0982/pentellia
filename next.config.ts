import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Puppeteer and Chromium must stay in Node.js runtime (not bundled)
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min"],
  outputFileTracingIncludes: {
    "/api/pdf": ["./node_modules/@sparticuz/chromium-min/**/*"],
    "/api/invoice/download": ["./node_modules/@sparticuz/chromium-min/**/*"],
  },

  typescript: { ignoreBuildErrors: true },
  eslint:     { ignoreDuringBuilds: true },

  // Compress responses
  compress: true,

  // Faster builds + smaller bundles
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

  // Remove debug logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error"] }   // keep console.error only
      : false,
  },

  images: {
    unoptimized: false,
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
};

export default nextConfig;