// src/hooks/useAiSummary.ts
import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";

interface UseAiSummaryOptions {
  scanId:     string;
  toolName:   string;
  scanData:   any;
  scanStatus: string;
}

export function useAiSummary({
  scanId,
  toolName,
  scanData,
  scanStatus,
}: UseAiSummaryOptions) {
  const [summary,   setSummary]   = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCached,  setIsCached]  = useState<boolean>(false);
  const [hasChecked,setHasChecked]= useState<boolean>(false);
  const generating = useRef(false);

  // ── On mount: load from DB ────────────────────────────────────
  useEffect(() => {
    if (!scanId || hasChecked) return;
    let cancelled = false;

    (async () => {
      try {
        const res  = await fetch(`/api/ai/summary?scanId=${encodeURIComponent(scanId)}`);
        const data = await res.json();
        if (!cancelled && data.success && data.summary?.content) {
          setSummary(data.summary.content);
          setIsCached(true);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setHasChecked(true);
      }
    })();

    return () => { cancelled = true; };
  }, [scanId, hasChecked]);

  // ── generate() ───────────────────────────────────────────────
  const generate = useCallback(async () => {
    if (generating.current)         return;
    if (scanStatus !== "completed") return;
    if (!scanData)                  return;
    if (summary)                    return; // already populated

    generating.current = true;
    setIsLoading(true);
    setSummary("");

    try {
      const res = await fetch("/api/ai/summarize", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolName, scanData, scanId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "AI service error" }));
        toast.error(err.message ?? "AI summary failed.");
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";

      // Cached JSON path
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data.cached && data.content) {
          setSummary(data.content);
          setIsCached(true);
        }
        return;
      }

      // Streaming path
      if (!res.body) { toast.error("No stream received."); return; }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   full    = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setSummary((prev) => prev + chunk);
      }

      // Save to DB from client — guaranteed to fire after stream ends
      if (full && scanId) {
        fetch("/api/ai/summary", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scanId, toolId: toolName, content: full }),
        }).catch((err) => console.error("[useAiSummary] save failed:", err));
      }
    } catch (err: any) {
      toast.error(err.message ?? "AI summary generation failed.");
      setSummary("");
    } finally {
      setIsLoading(false);
      generating.current = false;
    }
  }, [summary, scanStatus, scanData, scanId, toolName]);

  return { summary, isLoading, isCached, hasChecked, generate, setSummary };
}