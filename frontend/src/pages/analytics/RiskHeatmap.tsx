import { useCallback, useEffect, useState } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import ErrorState from "@/components/ErrorState"
import { getRiskHeatmap } from "@/lib/visualizations"
import { getErrorMessage } from "@/lib/errors"
import { riskTier, tierHex } from "@/lib/colors"
import type { RiskHeatmapData } from "@/lib/types"

function RiskHeatmap() {
  const [data, setData] = useState<RiskHeatmapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      setData(await getRiskHeatmap())
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load the risk heatmap"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Skeleton className="h-96 rounded-xl" />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!data) return null

  const chartData = data.countries.map((c) => ({
    label: c.countryName || c.country,
    averageRiskScore: c.averageRiskScore,
    supplierCount: c.supplierCount,
  }))

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Country-level average risk, sorted highest first. {data.countriesRepresented} countries
        represented — a bar chart, not a choropleth, since precise boundary data doesn't exist
        for this app.
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        {chartData.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No locatable suppliers yet.
          </p>
        ) : (
          <div style={{ height: Math.max(240, chartData.length * 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={110}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    boxShadow: "none",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Bar dataKey="averageRiskScore" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={800}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={tierHex[riskTier(entry.averageRiskScore)]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

export default RiskHeatmap
