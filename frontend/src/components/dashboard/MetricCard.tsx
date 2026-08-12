import type { LucideIcon } from "lucide-react"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import AnimatedNumber from "@/components/dashboard/AnimatedNumber"
import { cn } from "@/lib/utils"

function MetricCard({
  icon: Icon,
  label,
  value,
  decimals,
  prefix,
  suffix,
  change,
}: {
  icon: LucideIcon
  label: string
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  change: number
}) {
  const isPositive = change >= 0

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="size-4 text-primary" />
      </div>

      <div className="text-2xl font-semibold tracking-tight">
        <AnimatedNumber value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </div>

      <div
        className={cn(
          "mt-2 flex items-center gap-1 text-xs font-medium",
          isPositive ? "text-emerald-600" : "text-red-600"
        )}
      >
        {isPositive ? (
          <ArrowUpRight className="size-3.5" />
        ) : (
          <ArrowDownRight className="size-3.5" />
        )}
        <span>{Math.abs(change)}% vs last month</span>
      </div>
    </div>
  )
}

export default MetricCard
