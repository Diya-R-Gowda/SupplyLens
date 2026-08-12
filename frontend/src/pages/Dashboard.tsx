import { Users, ShieldAlert, TrendingUp, FileText } from "lucide-react"
import Sidebar from "@/components/dashboard/Sidebar"
import Topbar from "@/components/dashboard/Topbar"
import MetricCard from "@/components/dashboard/MetricCard"
import TrafficChart from "@/components/dashboard/TrafficChart"
import ActivityTable from "@/components/dashboard/ActivityTable"

const metrics = [
  { icon: Users, label: "Active suppliers", value: 128, change: 4.2 },
  { icon: ShieldAlert, label: "Avg. risk score", value: 24, change: -3.1 },
  {
    icon: TrendingUp,
    label: "Portfolio health",
    value: 87,
    suffix: "%",
    change: 1.8,
  },
  { icon: FileText, label: "Documents tracked", value: 342, change: 6.5 },
]

function Dashboard() {
  return (
    <div className="flex h-svh bg-background text-foreground">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-y-auto">
        <Topbar />

        <main className="flex-1 space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <TrafficChart />

          <ActivityTable />
        </main>
      </div>
    </div>
  )
}

export default Dashboard
