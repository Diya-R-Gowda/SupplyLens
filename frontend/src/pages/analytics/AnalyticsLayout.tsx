import { NavLink, Outlet } from "react-router-dom"
import { cn } from "@/lib/utils"

const tabs = [
  { to: "/dashboard/analytics", label: "Concentration", end: true },
  { to: "/dashboard/analytics/map", label: "Geographic map", end: false },
  { to: "/dashboard/analytics/timeline", label: "Timeline", end: false },
  { to: "/dashboard/analytics/heatmap", label: "Risk heatmap", end: false },
]

function AnalyticsLayout() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio-wide supply chain visualizations.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                "border-b-2 px-3 py-2 text-sm transition-colors duration-200 ease-out",
                isActive
                  ? "border-primary font-medium text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  )
}

export default AnalyticsLayout
