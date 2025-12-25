
export default function DashboardPage() {
  return (
    <main className="min-h-full bg-background px-4 sm:px-6 lg:px-8 py-6">
      {/* Top section title */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your security posture.</p>
      </div>


      {/* Attack surface + Vulnerability summary */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Attack surface summary */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Attack Surface Summary
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
            <h2 className="text-lg font-semibold text-foreground">
              Vulnerability Summary
            </h2>
            <span className="text-xs text-muted-foreground">
              Workspace overview – last 14 days
            </span>
          </div>

          <div className="bg-card rounded-lg shadow-soft border border-border p-4 flex flex-col justify-between h-full min-h-[220px]">
            {/* Fake chart area */}
            <div className="h-44 border-b border-dashed border-border mb-4 relative overflow-hidden">
                {/* Background grid lines */}
                <div className="absolute inset-x-0 top-0 h-px bg-border/50" />
                <div className="absolute inset-x-0 top-1/4 h-px bg-border/50" />
                <div className="absolute inset-x-0 top-2/4 h-px bg-border/50" />
                <div className="absolute inset-x-0 top-3/4 h-px bg-border/50" />
                <div className="absolute inset-x-0 top-full h-px bg-border/50" />

              {/* little fake line */}
              <div className="absolute left-4 right-4 bottom-0 flex items-end gap-2 h-full">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-primary/40 hover:bg-primary/80 transition-colors"
                    style={{ height: `${15 + Math.sin(i / 2) * 50 + 20}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <LegendDot color="hsl(var(--destructive))" label="Critical" />
              <LegendDot color="hsl(var(--warning))" label="High" />
              <LegendDot color="hsl(var(--secondary))" label="Medium" />
              <LegendDot color="hsl(var(--primary))" label="Low" />
            </div>
          </div>
        </div>
      </section>

      {/* Scan activity */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Scan Activity
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <h2 className="text-lg font-semibold text-foreground">
            Latest Scans
          </h2>
          <button className="text-sm text-primary hover:underline">
            View scans
          </button>
        </div>

        <div className="bg-card rounded-lg shadow-soft border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-muted-foreground">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Tool</th>
                <th className="px-6 py-3 text-left font-medium">Target</th>
                <th className="px-6 py-3 text-left font-medium">Workspace</th>
                <th className="px-6 py-3 text-left font-medium">Start date</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-right font-medium">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-secondary">
                  Website Scanner
                </td>
                <td className="px-6 py-4 text-foreground/80">
                  https://www.gohighlevel.com/78486a1
                </td>
                <td className="px-6 py-4 text-foreground/80">
                  My Workspace
                </td>
                <td className="px-6 py-4 text-foreground/80">
                  Oct 30, 2025 – 20:20
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success border border-success/20">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    Completed
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-sm text-primary hover:underline">
                    View status
                  </button>
                </td>
              </tr>
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
    <div className="bg-card rounded-lg shadow-soft border border-border p-4 flex flex-col justify-between">
      <span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
        {label}
      </span>
      <span className="mt-6 text-3xl font-medium text-primary">{value}</span>
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
    <div className="bg-card rounded-lg shadow-soft border border-border p-4 flex flex-col">
      <span className="text-sm text-muted-foreground mb-2">{title}</span>

      <div className="flex items-center justify-center flex-1 my-4">
        <div className="relative h-32 w-32">
          <svg className="h-full w-full" viewBox="0 0 100 100">
             <circle
              className="text-border"
              strokeWidth="10"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="50"
              cy="50"
            />
            <circle
              className="text-primary"
              strokeWidth="10"
              strokeDasharray="251.2"
              strokeDashoffset={`calc(251.2 - (251.2 * ${value}) / ${total})`}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r="40"
              cx="50"
              cy="50"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-medium text-foreground">
              {value}
            </span>
             <span className="text-xs text-muted-foreground">/ {total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

type LegendDotProps = {
  color: string;
  label: string;
};

function LegendDot({ color, label }: LegendDotProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}
