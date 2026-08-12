import { useCallback, useEffect, useState } from "react"
import { Users, ShieldAlert, HeartPulse, UserPlus } from "lucide-react"
import MetricCard from "@/components/dashboard/MetricCard"
import GrowthChart from "@/components/dashboard/GrowthChart"
import ActivityTable from "@/components/dashboard/ActivityTable"
import ErrorState from "@/components/ErrorState"
import { Skeleton } from "@/components/ui/skeleton"
import { getDashboardStats } from "@/lib/dashboard"
import { getErrorMessage } from "@/lib/errors"
import type { DashboardStats } from "@/lib/types"

function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await getDashboardStats()
      setStats(data)
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load dashboard stats"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error} onRetry={load} />
  }

  if (!stats) return null

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Total suppliers"
          value={stats.totalSuppliers}
        />
        <MetricCard
          icon={ShieldAlert}
          label="Avg. risk score"
          value={stats.averageRiskScore}
          decimals={1}
        />
        <MetricCard
          icon={HeartPulse}
          label="Avg. health score"
          value={stats.averageHealthScore}
          decimals={1}
        />
        <MetricCard
          icon={UserPlus}
          label="New suppliers"
          value={stats.newSuppliers.last7Days}
          hint="Last 7 days"
        />
      </div>

      <GrowthChart data={stats.growthSeries} />

      <ActivityTable activity={stats.recentActivity} />
    </>
  )
}

export default DashboardOverview
