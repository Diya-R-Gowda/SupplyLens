import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"

const data = [
  { date: "Jan", visitors: 2100 },
  { date: "Feb", visitors: 2450 },
  { date: "Mar", visitors: 2300 },
  { date: "Apr", visitors: 2800 },
  { date: "May", visitors: 3050 },
  { date: "Jun", visitors: 2900 },
  { date: "Jul", visitors: 3400 },
  { date: "Aug", visitors: 3650 },
  { date: "Sep", visitors: 3500 },
  { date: "Oct", visitors: 3900 },
  { date: "Nov", visitors: 4150 },
  { date: "Dec", visitors: 4400 },
]

function TrafficChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-medium">Traffic over time</h3>
        <p className="text-xs text-muted-foreground">
          Unique visitors, last 12 months
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <YAxis
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
            <Line
              type="monotone"
              dataKey="visitors"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default TrafficChart
