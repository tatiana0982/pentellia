
export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] px-8 py-6">
      {/* Top section title + tabs are in your header; this starts below "Dashboard / Overview" */}

      {/* Attack surface + Vulnerability summary */}
      <section className="grid grid-cols-1 xl:grid-cols-[2fr,3fr] gap-6 mb-8">
        {/* Attack surface summary */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Attack surface summary
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SummaryCard label="IP ADDRESS" value="1" />
            <SummaryCard label="HOSTNAME" value="1" />
            <SummaryCard label="PORT" value="1" />
            <SummaryCard label="PROTOCOL" value="1" />
            <SummaryCard label="SERVICES" value="0" />
            <SummaryCard label="TECHNOLOGIES" value="9" />
          </div>
        </div>

        {/* Vulnerability summary */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Vulnerability summary
            </h2>
            <span className="text-xs text-slate-500">
              Workspace overview – last 14 days
            </span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between h-full">
            {/* Fake chart area */}
            <div className="h-44 border-b border-dashed border-slate-200 mb-4 relative overflow-hidden">
              <div className="absolute inset-x-0 top-6 h-px bg-slate-200" />
              <div className="absolute inset-x-0 top-16 h-px bg-slate-200" />
              <div className="absolute inset-x-0 top-26 h-px bg-slate-200" />
              <div className="absolute inset-x-0 top-36 h-px bg-slate-200" />
              {/* little fake line */}
              <div className="absolute left-4 right-4 bottom-6 flex items-end gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full bg-sky-300/70"
                    style={{ height: 10 + (i % 3) * 8 }}
                  />
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-xs text-slate-600">
              <LegendDot className="bg-red-500" label="Critical" />
              <LegendDot className="bg-orange-400" label="High" />
              <LegendDot className="bg-amber-300" label="Medium" />
              <LegendDot className="bg-sky-500" label="Low" />
            </div>
          </div>
        </div>
      </section>

      {/* Scan activity */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Scan activity
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <ActivityCard
            title="Scanned assets"
            value="0"
            total="5"
          />
          <ActivityCard
            title="Running scans"
            value="0"
            total="2"
          />
          <ActivityCard
            title="Waiting scans"
            value="0"
            total="25"
          />
          <ActivityCard
            title="Added assets"
            value="1"
            total="100"
          />
        </div>
      </section>

      {/* Latest scans table */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Latest scans
          </h2>
          <button className="text-sm text-sky-600 hover:underline">
            View scans
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Tool</th>
                <th className="px-6 py-3 text-left font-medium">Target</th>
                <th className="px-6 py-3 text-left font-medium">Workspace</th>
                <th className="px-6 py-3 text-left font-medium">Start date</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-right font-medium">View</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="px-6 py-4 whitespace-nowrap text-sky-700">
                  Website Scanner
                </td>
                <td className="px-6 py-4 text-slate-700">
                  https://www.gohighlevel.com/78486a1
                </td>
                <td className="px-6 py-4 text-slate-700">
                  My Workspace
                </td>
                <td className="px-6 py-4 text-slate-700">
                  Oct 30, 2025 – 20:20
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Completed
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-sm text-sky-600 hover:underline">
                    View status
                  </button>
                </td>
              </tr>

              {/* more rows here if you want */}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

/* --- Small components to keep things clean --- */

type SummaryCardProps = {
  label: string;
  value: string;
};

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between">
      <span className="text-xs font-medium tracking-wide text-slate-500">
        {label}
      </span>
      <span className="mt-6 text-3xl font-semibold text-sky-600">{value}</span>
    </div>
  );
}

type ActivityCardProps = {
  title: string;
  value: string;
  total: string;
};

function ActivityCard({ title, value, total }: ActivityCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col">
      <span className="text-sm text-slate-500 mb-2">{title}</span>

      <div className="flex items-center justify-center flex-1">
        <div className="relative h-32 w-32 rounded-full border-[10px] border-slate-200 flex items-center justify-center">
          <span className="text-2xl font-semibold text-slate-900">
            {value}
          </span>
          <span className="absolute bottom-7 text-xs text-slate-500">
            / {total}
          </span>
        </div>
      </div>
    </div>
  );
}

type LegendDotProps = {
  className?: string;
  label: string;
};

function LegendDot({ className = "", label }: LegendDotProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${className}`} />
      <span>{label}</span>
    </div>
  );
}
