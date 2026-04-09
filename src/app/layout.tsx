import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/providers/AuthProvider";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Toaster } from "react-hot-toast";

// ── Use system font stack instead of Google Fonts ─────────────────────
// Avoids network warnings in dev and eliminates external dependency.
// The app already uses Tailwind's font-sans which maps to this stack.
const fontClass = "font-sans";

export const metadata: Metadata = {
  title: "Pentellia",
  description: "Pentellia Security Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={cn(
          "min-h-screen bg-background antialiased",
          fontClass,
        )}
      >
        <AuthProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#0B0C15",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
                fontSize: "14px",
              },
              success: {
                icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
                style: {
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                },
              },
              error: {
                icon: <AlertCircle className="h-5 w-5 text-red-500" />,
                style: {
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                },
              },
            }}
          />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}