// components/reports/ProfessionalReport.tsx
'use client';
import React from "react";
import ReactMarkdown from "react-markdown";
import { Shield, Target, AlertTriangle, CheckCircle2, Globe, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface ReportProps {
  data: any;
  aiSummary: string;
}

const ProfessionalReport = React.forwardRef<HTMLDivElement, ReportProps>(({ data, aiSummary }, ref) => {
  const { summary, meta, findings } = data.scan.result;

  return (
    <div ref={ref} className="p-12 bg-white text-slate-900 font-sans max-w-[800px] mx-auto border shadow-sm">
      {/* BRAND HEADER */}
      <div className="flex justify-between items-start border-b-4 border-indigo-600 pb-8 mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-indigo-900">PENTELLIA</h1>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-[0.2em] mt-1">
            Advanced Cyber Intelligence Platform
          </p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-slate-700">SECURITY AUDIT REPORT</h2>
          <p className="text-sm text-slate-500 font-mono">ID: {data.scan.id.split('-')[0].toUpperCase()}</p>
          <p className="text-sm text-slate-500">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY CARDS */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-slate-50 p-4 rounded border border-slate-200">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <Target size={16} /> <span className="text-[10px] font-bold uppercase">Target Asset</span>
          </div>
          <p className="text-sm font-bold truncate">{meta.target}</p>
        </div>
        <div className="bg-slate-50 p-4 rounded border border-slate-200">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <Shield size={16} /> <span className="text-[10px] font-bold uppercase">Risk Level</span>
          </div>
          <p className={cn("text-sm font-bold uppercase", 
            summary.risk_level === 'critical' ? 'text-red-600' : 'text-orange-500'
          )}>{summary.risk_level}</p>
        </div>
        <div className="bg-slate-50 p-4 rounded border border-slate-200">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <Clock size={16} /> <span className="text-[10px] font-bold uppercase">Scan Time</span>
          </div>
          <p className="text-sm font-bold">118 Seconds</p>
        </div>
      </div>

      {/* AI INTELLIGENCE SECTION */}
      <div className="mb-10 p-6 bg-indigo-50 border-l-4 border-indigo-500 rounded-r">
        <h3 className="flex items-center gap-2 text-lg font-bold text-indigo-900 mb-4 uppercase tracking-tight">
          <Sparkles className="text-indigo-500" size={20} /> AI Security Insights
        </h3>
        <div className="prose prose-sm prose-indigo max-w-none italic text-slate-700 leading-relaxed">
          <ReactMarkdown>{aiSummary}</ReactMarkdown>
        </div>
      </div>

      {/* FINDINGS BREAKDOWN */}
      <div className="mb-10">
        <h3 className="text-lg font-bold border-b pb-2 mb-4 uppercase tracking-tight text-slate-800">Vulnerability Distribution</h3>
        <div className="flex gap-2">
          {[
            { label: 'Critical', val: summary.critical, color: 'bg-red-500' },
            { label: 'High', val: summary.high, color: 'bg-orange-500' },
            { label: 'Medium', val: summary.medium, color: 'bg-yellow-500' },
            { label: 'Low', val: summary.low, color: 'bg-green-500' },
            { label: 'Info', val: summary.info, color: 'bg-blue-500' },
          ].map((item) => (
            <div key={item.label} className="flex-1 text-center p-3 border rounded bg-slate-50">
              <p className="text-[10px] uppercase text-slate-500 mb-1">{item.label}</p>
              <p className="text-xl font-black">{item.val}</p>
              <div className={`h-1 w-full mt-2 rounded-full ${item.color}`} />
            </div>
          ))}
        </div>
      </div>

      {/* TOP FINDINGS TABLE */}
      <div className="mb-10">
        <h3 className="text-lg font-bold border-b pb-2 mb-4 uppercase tracking-tight text-slate-800">Top Technical Findings</h3>
        <div className="border rounded overflow-hidden">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="p-3 border-b">Severity</th>
                <th className="p-3 border-b">Vulnerability</th>
                <th className="p-3 border-b text-right">Asset</th>
              </tr>
            </thead>
            <tbody>
              {findings.slice(0, 8).map((finding: any, idx: number) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="p-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      finding.severity === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    )}>
                      {finding.severity}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{finding.title}</td>
                  <td className="p-3 text-right font-mono text-[10px] text-slate-500">{finding.affected_asset}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-20 pt-8 border-t border-slate-200 text-center">
        <p className="text-[10px] text-slate-400 font-mono tracking-widest">
          THIS IS AN AUTO-GENERATED DOCUMENT BY PENTELLIA AI SYSTEM. 
          CONFIDENTIAL & PROPRIETARY. © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
});

ProfessionalReport.displayName = "ProfessionalReport";
export default ProfessionalReport;
