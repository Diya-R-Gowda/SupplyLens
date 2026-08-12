const activity = [
  {
    event: "Contract uploaded",
    supplier: "Acme Components",
    user: "D. Gowda",
    time: "2 min ago",
  },
  {
    event: "Risk score updated",
    supplier: "Nordic Freight",
    user: "System",
    time: "18 min ago",
  },
  {
    event: "New supplier added",
    supplier: "Delta Materials",
    user: "D. Gowda",
    time: "1 hour ago",
  },
  {
    event: "Alert threshold breached",
    supplier: "Vertex Logistics",
    user: "System",
    time: "3 hours ago",
  },
  {
    event: "Enrichment refreshed",
    supplier: "Orion Textiles",
    user: "System",
    time: "5 hours ago",
  },
]

function ActivityTable() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-medium">Recent activity</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="pb-2 font-medium">Event</th>
              <th className="pb-2 font-medium">Supplier</th>
              <th className="pb-2 font-medium">By</th>
              <th className="pb-2 text-right font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {activity.map((row, i) => (
              <tr
                key={i}
                className="border-b border-border/60 transition-colors duration-200 ease-out last:border-0 hover:bg-muted/50"
              >
                <td className="py-3 pr-4">{row.event}</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {row.supplier}
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {row.user}
                </td>
                <td className="py-3 text-right text-muted-foreground">
                  {row.time}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ActivityTable
