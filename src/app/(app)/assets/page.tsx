'use client';
import React, { useState } from 'react';
import { 
  Plus, 
  FileText, 
  Filter, 
  MoreVertical, 
  ExternalLink, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Globe
} from 'lucide-react';

interface Asset {
  id: string;
  target: string;
  subtext: string;
  description: string;
  type: string;
  workspace: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  scansCount: number;
}

const AssetsPage: React.FC = () => {
  const [groupByAsset, setGroupByAsset] = useState(false);

  const assets: Asset[] = [
    {
      id: '1',
      target: 'https://www.gohighlevel.com/78486a1',
      subtext: 'www.gohighlevel.com',
      description: 'Target added due to a redirect from http://gohighlevel.com',
      type: 'URL',
      workspace: 'My Workspace',
      riskLevel: 'Low',
      scansCount: 1,
    }
  ];

  return (
    <div className="p-8 bg-[#0b0f1a] min-h-screen text-slate-300 font-sans">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Assets</h1>
        <p className="text-sm text-slate-400 mt-1">
          An Asset is a hostname or an IP address of the system you want to scan.
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-[#1c2636] hover:bg-[#253247] text-white px-4 py-2 rounded-md font-medium transition-all border border-[#2d3a4f]">
            <Plus size={18} className="text-blue-400" />
            Add
          </button>
          <button className="flex items-center gap-2 text-slate-400 hover:text-white px-2 py-2 font-medium transition-colors">
            <FileText size={18} />
            Import from .txt
          </button>
        </div>
        <a href="#" className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm transition-colors">
          Get started with Assets <ExternalLink size={14} />
        </a>
      </div>

      {/* Main Content Card */}
      <div className="bg-[#131926] rounded-xl border border-[#1e293b] overflow-hidden">
        {/* Controls Bar */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#1e293b]">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400 font-medium">Group by asset</span>
            <button 
              onClick={() => setGroupByAsset(!groupByAsset)}
              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors outline-none ring-1 ring-inset ${groupByAsset ? 'bg-blue-600 ring-blue-500' : 'bg-[#1c2636] ring-[#2d3a4f]'}`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${groupByAsset ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button className="flex items-center gap-2 text-sm hover:text-white transition-colors bg-[#1c2636] px-3 py-1.5 rounded border border-[#2d3a4f]">
              Filters off <Filter size={16} />
            </button>
            <button className="hover:text-white p-1">
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        {/* Assets Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#18202f] text-slate-400 text-xs uppercase tracking-wider">
                <th className="py-4 px-6 w-10">
                  <input type="checkbox" className="rounded border-[#2d3a4f] bg-[#0b0f1a] checked:bg-blue-600 focus:ring-0 focus:ring-offset-0" />
                </th>
                <th className="py-4 px-4 font-semibold">Targets ({assets.length})</th>
                <th className="py-4 px-4 font-semibold">Description</th>
                <th className="py-4 px-4 font-semibold">Type</th>
                <th className="py-4 px-4 font-semibold">Workspace</th>
                <th className="py-4 px-4 font-semibold">Risk level</th>
                <th className="py-4 px-4 font-semibold">Scans</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-[#1c2636]/50 transition-colors group">
                  <td className="py-5 px-6">
                    <input type="checkbox" className="rounded border-[#2d3a4f] bg-[#0b0f1a] checked:bg-blue-600 focus:ring-0 focus:ring-offset-0" />
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex items-start gap-3">
                      <Globe className="text-blue-400 mt-1 shrink-0" size={16} />
                      <div>
                        <div className="text-blue-400 hover:text-blue-300 cursor-pointer font-medium break-all text-sm">
                          {asset.target}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{asset.subtext}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-4 text-sm text-slate-400 max-w-xs leading-relaxed">
                    {asset.description}
                  </td>
                  <td className="py-5 px-4">
                    <span className="bg-blue-900/30 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-800/50">
                      {asset.type}
                    </span>
                  </td>
                  <td className="py-5 px-4 text-sm text-slate-400">
                    {asset.workspace}
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold shadow-lg shadow-blue-900/20">L</span>
                      <span className="text-sm text-slate-300">{asset.riskLevel}</span>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <div className="text-sm text-slate-300 font-medium">{asset.scansCount}</div>
                    <button className="text-[11px] text-slate-500 hover:text-blue-400 transition-colors">View</button>
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

export default AssetsPage;