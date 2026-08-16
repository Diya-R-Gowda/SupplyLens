import ForecastChart from "@/components/supplier/ForecastChart"
import type { ForecastBundle } from "@/lib/types"

function ForecastPanel({
  title,
  subtitle,
  forecast,
}: {
  title: string
  subtitle?: string
  forecast: ForecastBundle | null
}) {
  if (!forecast) return null

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-medium">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <ForecastChart label="Risk" color="#b45309" forecast={forecast.risk} />
        <ForecastChart label="Health" color="#047857" forecast={forecast.health} />
      </div>
    </div>
  )
}

export default ForecastPanel
