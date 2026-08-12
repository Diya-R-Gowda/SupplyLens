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
  hint,
}: {
  icon: LucideIcon
  label: string
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  change?: number
  hint?: string
}) {
  const hasChange = change !== undefined
  const isPositive = (change ?? 0) >= 0

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors duration-200 ease-out hover:border-primary/40">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="size-4 text-primary" />
      </div>

      <div className="text-2xl font-semibold tracking-tight">
        <AnimatedNumber value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </div>

      {hasChange && (
        <div
          className={cn(
            "mt-2 flex items-center gap-1 text-xs font-medium",
            isPositive ? "text-emerald-700" : "text-red-700"
          )}
        >
          {isPositive ? (
            <ArrowUpRight className="size-3.5" />
          ) : (
            <ArrowDownRight className="size-3.5" />
          )}
          <span>{Math.abs(change ?? 0)}% vs last month</span>
        </div>
      )}

      {!hasChange && hint && (
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

export default MetricCard
