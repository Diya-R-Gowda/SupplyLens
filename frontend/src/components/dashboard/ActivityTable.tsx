import { Link } from "react-router-dom"
import type { RecentActivityEntry } from "@/lib/types"
import { formatCategory, formatRelativeTime } from "@/lib/format"

function ActivityTable({ activity }: { activity: RecentActivityEntry[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-medium">Recent activity</h3>

      {activity.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No supplier activity yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Supplier</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Risk score</th>
                <th className="pb-2 text-right font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((row) => (
                <tr
                  key={row._id}
                  className="border-b border-border/60 transition-colors duration-200 ease-out last:border-0 hover:bg-muted/50"
                >
                  <td className="py-3 pr-4">
                    <Link
                      to={`/dashboard/suppliers/${row._id}`}
                      className="hover:text-primary"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {formatCategory(row.category)}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {row.riskScore ?? "—"}
                  </td>
                  <td className="py-3 text-right text-muted-foreground">
                    {formatRelativeTime(row.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ActivityTable
