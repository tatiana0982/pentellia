"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Shield, ArrowLeft, Terminal } from "lucide-react";

export default function NotFound() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const pathname   = usePathname();          // ← no SSR mismatch

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const cols  = Math.floor(canvas.width / 20);
    const chars = "01アイウエオカキクケコ</>{}[]█▓▒░";
    const drops: number[] = Array(cols).fill(1);
    let raf: number;

    const draw = () => {
      ctx.fillStyle = "rgba(8,8,15,0.07)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "12px monospace";
      for (let i = 0; i < drops.length; i++) {
        const char  = chars[Math.floor(Math.random() * chars.length)];
        const alpha = Math.random() > 0.97 ? 0.7 : 0.1;
        ctx.fillStyle = `rgba(124,58,237,${alpha})`;
        ctx.fillText(char, i * 20, drops[i] * 20);
        if (drops[i] * 20 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#08080f] flex items-center justify-center overflow-hidden font-sans">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-50" />

      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet-600/8 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md">
        {/* Glitch 404 */}
        <div className="relative mb-8 select-none">
          <span
            className="text-[130px] md:text-[160px] font-black leading-none tracking-tighter text-transparent"
            style={{ WebkitTextStroke: "1px rgba(124,58,237,0.35)", textShadow: "0 0 80px rgba(124,58,237,0.15)" }}
          >
            404
          </span>
          <span
            aria-hidden
            className="absolute inset-0 text-[130px] md:text-[160px] font-black leading-none tracking-tighter text-violet-500/15"
            style={{ clipPath: "polygon(0 28%,100% 28%,100% 52%,0 52%)", transform: "translate(-4px,0)" }}
          >
            404
          </span>
          <span
            aria-hidden
            className="absolute inset-0 text-[130px] md:text-[160px] font-black leading-none tracking-tighter text-fuchsia-500/10"
            style={{ clipPath: "polygon(0 62%,100% 62%,100% 80%,0 80%)", transform: "translate(4px,0)" }}
          >
            404
          </span>
        </div>

        {/* Icon */}
        <div className="relative mb-5">
          <div className="absolute inset-0 bg-violet-500/15 blur-[25px] rounded-full" />
          <div className="relative h-14 w-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Shield className="h-7 w-7 text-violet-400" />
          </div>
        </div>

        <div className="mb-1.5 flex items-center gap-2 text-[10px] font-mono text-violet-500/80 uppercase tracking-widest">
          <Terminal className="h-3 w-3" />
          <span>Error 0x404 — Route Not Found</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Uncharted Territory</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-xs">
          The route you requested does not exist within the Pentellia perimeter.
        </p>

        {/* Terminal block */}
        <div className="w-full mb-8 p-4 rounded-xl bg-slate-950/80 border border-slate-800/60 font-mono text-xs text-left">
          <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-slate-800/50">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/50" />
            <span className="ml-2 text-slate-600 text-[10px]">pentellia ~ error_log</span>
          </div>
          <div className="space-y-1.5">
            <div>
              <span className="text-violet-500">$</span>{" "}
              <span className="text-slate-400">resolve_route</span>{" "}
              <span className="text-emerald-400">--path</span>{" "}
              <span className="text-amber-400">"{pathname}"</span>
            </div>
            <div className="text-red-400">✗ RouteResolutionError: Path not registered</div>
            <div className="text-slate-600 mt-2">Suggestion: navigate to <span className="text-violet-400">/dashboard</span></div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 h-10 rounded-xl border border-slate-700/60 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800/60 text-sm font-medium transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Go back
          </button>
          <Link href="/dashboard">
            <button className="flex items-center gap-2 px-5 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all">
              Dashboard
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
