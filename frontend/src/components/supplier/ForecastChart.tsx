import { useMemo } from "react"
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import type { ForecastResult } from "@/lib/types"

const DAY_MS = 24 * 60 * 60 * 1000

const REASON_MESSAGES: Record<string, string> = {
  no_history: "No score history exists yet for this supplier.",
  too_few_points: "A handful of data points exist, but not enough to fit a trend.",
  insufficient_time_spread:
    "The data points collected so far landed too close together in time (e.g. from a single test/refresh session) to show a real trend.",
}

function formatTick(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

interface ChartPoint {
  ms: number
  score?: number
  projected?: number
  low?: number
  bandHeight?: number
}

function ForecastChart({
  label,
  color,
  forecast,
}: {
  label: string
  color: string
  forecast: ForecastResult
}) {
  const data = useMemo(() => {
    if (forecast.status !== "ok") return []

    const points = new Map<number, ChartPoint>()
    const historical = forecast.historical || []
    for (const h of historical) {
      const ms = new Date(h.timestamp).getTime()
      points.set(ms, { ...(points.get(ms) || { ms }), score: h.score })
    }

    const lastHistorical = historical[historical.length - 1]
    const anchorMs = lastHistorical ? new Date(lastHistorical.timestamp).getTime() : Date.now()
    const anchorEntry = points.get(anchorMs) || { ms: anchorMs }
    points.set(anchorMs, {
      ...anchorEntry,
      projected: lastHistorical?.score,
      low: lastHistorical?.score,
      bandHeight: 0,
    })

    const sortedProjections = [...forecast.projections].sort(
      (a, b) => a.horizonDays - b.horizonDays
    )
    for (const p of sortedProjections) {
      const ms = anchorMs + p.horizonDays * DAY_MS
      points.set(ms, {
        ms,
        projected: p.projectedScore,
        low: p.confidenceInterval.low,
        bandHeight: p.confidenceInterval.high - p.confidenceInterval.low,
      })
    }

    return [...points.values()].sort((a, b) => a.ms - b.ms)
  }, [forecast])

  if (forecast.status === "insufficient_data") {
    const reason = forecast.dataQuality.reason || "no_history"
    return (
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-3 text-sm text-muted-foreground">{REASON_MESSAGES[reason]}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {forecast.dataQuality.pointCount} collected, {forecast.dataQuality.minPointsRequired ?? 5} needed
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {forecast.trend && (
          <span className="text-xs text-muted-foreground">
            {forecast.dataQuality.pointCount} pts · {forecast.dataQuality.spanDays}d ·{" "}
            {forecast.dataQuality.confidenceLevel} confidence · {forecast.trend.direction}
          </span>
        )}
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="ms"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={formatTick}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <Tooltip
              labelFormatter={(v) => formatTick(Number(v))}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                boxShadow: "none",
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--foreground)" }}
            />
            <Area
              dataKey="low"
              stackId="band"
              stroke="none"
              fill="transparent"
              isAnimationActive={false}
            />
            <Area
              dataKey="bandHeight"
              stackId="band"
              stroke="none"
              fill={color}
              fillOpacity={0.18}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke={color}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive
              animationDuration={800}
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke={color}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls
              isAnimationActive
              animationDuration={800}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default ForecastChart
