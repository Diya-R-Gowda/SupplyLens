import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard", exact: true },
  { label: "Suppliers", icon: Building2, to: "/dashboard/suppliers", exact: false },
  { label: "Analytics", icon: BarChart3, to: "/dashboard/analytics", exact: false },
  { label: "Settings", icon: Settings, to: "/dashboard/settings", exact: false },
]

function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate("/")
  }

  return (
    <aside className="hidden h-svh w-56 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link to="/dashboard" className="text-base font-semibold tracking-tight">
          SupplyLens
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to)
          return (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ease-out",
                isActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 ease-out hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4 shrink-0" />
          Log out
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
