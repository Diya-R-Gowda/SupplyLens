import { useMemo } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"
import type { HealthHistoryItem, RiskHistoryItem } from "@/lib/types"

interface Point {
  timestamp: number
  risk?: number
  health?: number
}

function formatTick(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function RiskHealthTrendChart({
  riskItems,
  healthItems,
}: {
  riskItems: RiskHistoryItem[]
  healthItems: HealthHistoryItem[]
}) {
  const data = useMemo(() => {
    const merged = new Map<number, Point>()
    for (const item of riskItems) {
      const t = new Date(item.timestamp).getTime()
      merged.set(t, { ...(merged.get(t) || { timestamp: t }), risk: item.newScore })
    }
    for (const item of healthItems) {
      const t = new Date(item.timestamp).getTime()
      merged.set(t, { ...(merged.get(t) || { timestamp: t }), health: item.newScore })
    }
    return [...merged.values()].sort((a, b) => a.timestamp - b.timestamp)
  }, [riskItems, healthItems])

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-medium">Risk &amp; health trend</h3>
        <p className="mt-4 py-6 text-center text-sm text-muted-foreground">
          No score history yet.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-medium">Risk &amp; health trend</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={formatTick}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip
              labelFormatter={(label) => formatTick(Number(label))}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                boxShadow: "none",
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--foreground)" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="risk"
              name="Risk"
              stroke="#b45309"
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive
              animationDuration={800}
            />
            <Line
              type="monotone"
              dataKey="health"
              name="Health"
              stroke="#047857"
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default RiskHealthTrendChart
