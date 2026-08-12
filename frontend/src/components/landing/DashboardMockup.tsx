const stats = [
  { label: "Suppliers", value: "128" },
  { label: "Avg. risk", value: "24" },
  { label: "Alerts", value: "3" },
]

const bars = [40, 65, 50, 80, 60, 90, 70]

const rows = [
  { name: "Acme Components", risk: "Low" },
  { name: "Nordic Freight", risk: "Medium" },
  { name: "Delta Materials", risk: "Low" },
]

function DashboardMockup() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-5 flex items-center justify-between">
        <span className="text-sm font-medium">Portfolio overview</span>
        <span className="text-xs text-muted-foreground">Last 7 days</span>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border p-3">
            <div className="text-lg font-semibold">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 flex h-28 items-end gap-2 rounded-lg border border-border p-3">
        {bars.map((height, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-primary/70"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.name}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
          >
            <span>{row.name}</span>
            <span className="text-xs text-muted-foreground">{row.risk}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DashboardMockup
