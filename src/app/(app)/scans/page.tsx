'use client';
import React, { useState } from 'react';
import { 
  Zap, 
  CheckCircle2, 
  Filter, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Play
} from 'lucide-react';

interface Scan {
  id: string;
  name: string;
  status: 'completed' | 'running' | 'failed';
  target: string;
  targetRedirect?: string;
  workspace: string;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  date: string;
  time: string;
}

export default function ScansPage() {
  const [activeTab, setActiveTab] = useState<'scans' | 'scheduled'>('scans');

  const scans: Scan[] = [
    {
      id: '1',
      name: 'Website Scanner',
      status: 'completed',
      target: 'https://www.gohighlevel.com/78486a1',
      targetRedirect: 'Target added due to a redirect from http://g...',
      workspace: 'My Workspace',
      summary: { critical: 0, high: 0, medium: 6, low: 33 },
      date: 'Oct 30, 2025',
      time: '20:20'
    }
  ];

  return (
    <div className="p-8 bg-[#0b0f1a] min-h-screen text-slate-300 font-sans">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Scans</h1>
        <p className="text-sm text-slate-400 mt-1">
          Showing all scans from the current workspace.
        </p>
      </div>

      {/* Main Action Button */}
      <div className="mb-8">
        <button className="flex items-center gap-2 bg-[#1c2636] hover:bg-[#253247] text-white px-4 py-2 rounded-md font-medium transition-all border border-[#2d3a4f]">
          <Zap size={18} className="text-blue-400 fill-blue-400/20" />
          New scan
        </button>
      </div>

      {/* Tabs & Content Container */}
      <div className="bg-[#131926] rounded-xl border border-[#1e293b] overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex justify-between items-center px-6 border-b border-[#1e293b]">
          <div className="flex gap-8">
            <button 
              onClick={() => setActiveTab('scans')}
              className={`py-4 text-sm font-medium border-b-2 transition-all ${activeTab === 'scans' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              Scans
            </button>
            <button 
              onClick={() => setActiveTab('scheduled')}
              className={`py-4 text-sm font-medium border-b-2 transition-all ${activeTab === 'scheduled' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              Scheduled
            </button>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <span>Filters off</span>
            <button className="p-1 hover:text-white transition-colors">
              <Filter size={16} />
            </button>
          </div>
        </div>

        {/* Scans Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#18202f] text-slate-400 text-xs uppercase tracking-wider">
                <th className="py-4 px-6 w-10">
                  <input type="checkbox" className="rounded border-[#2d3a4f] bg-[#0b0f1a] checked:bg-blue-600 focus:ring-0 focus:ring-offset-0" />
                </th>
                <th className="py-4 px-4 font-semibold">Scans ({scans.length})</th>
                <th className="py-4 px-4 font-semibold text-center">Status</th>
                <th className="py-4 px-4 font-semibold">Target</th>
                <th className="py-4 px-4 font-semibold">Workspace</th>
                <th className="py-4 px-4 font-semibold">Summary</th>
                <th className="py-4 px-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {scans.map((scan) => (
                <tr key={scan.id} className="hover:bg-[#1c2636]/50 transition-colors group">
                  <td className="py-5 px-6">
                    <input type="checkbox" className="rounded border-[#2d3a4f] bg-[#0b0f1a] checked:bg-blue-600 focus:ring-0 focus:ring-offset-0" />
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-3">
                      <Zap size={16} className="text-blue-400" />
                      <span className="text-blue-400 hover:text-blue-300 cursor-pointer font-medium text-sm">
                        {scan.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex justify-center">
                      {scan.status === 'completed' && (
                        <div className="relative">
                          <CheckCircle2 size={20} className="text-emerald-500" />
                          <div className="absolute inset-0 bg-emerald-500/20 blur-sm rounded-full -z-10"></div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <div className="max-w-[240px]">
                      <div className="text-slate-300 text-sm truncate">{scan.target}</div>
                      {scan.targetRedirect && (
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate italic">
                          {scan.targetRedirect}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-5 px-4 text-sm text-slate-400">
                    {scan.workspace}
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-2">
                      {/* Summary Badges matching the screenshot colors */}
                      <span className="flex items-center justify-center min-w-[32px] h-6 px-2 bg-blue-600/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/30">
                        {scan.summary.medium}
                      </span>
                      <span className="flex items-center justify-center min-w-[32px] h-6 px-2 bg-emerald-600/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30">
                        {scan.summary.low}
                      </span>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <div className="text-xs text-slate-300 font-medium">{scan.date}</div>
                    <div className="text-[10px] text-slate-500">{scan.time}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        <div className="flex justify-between items-center px-6 py-4 bg-[#18202f] text-sm text-slate-400 border-t border-[#1e293b]">
          <div className="flex items-center gap-2">
            <span>Displaying</span>
            <div className="relative inline-block">
              <select className="appearance-none bg-[#1c2636] border border-[#2d3a4f] rounded-md px-3 py-1 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500 text-white text-xs cursor-pointer">
                <option>25</option>
                <option>50</option>
                <option>100</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
            </div>
            <span>in page</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-1.5 text-slate-600 cursor-not-allowed hover:bg-[#1c2636] rounded transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button className="w-7 h-7 flex items-center justify-center bg-blue-600 text-white rounded text-xs font-bold shadow-md shadow-blue-900/40">
              1
            </button>
            <button className="p-1.5 text-slate-600 cursor-not-allowed hover:bg-[#1c2636] rounded transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

