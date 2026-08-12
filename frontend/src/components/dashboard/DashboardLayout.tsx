import { Outlet } from "react-router-dom"
import Sidebar from "@/components/dashboard/Sidebar"
import Topbar from "@/components/dashboard/Topbar"

function DashboardLayout() {
  return (
    <div className="flex h-svh bg-background text-foreground">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-y-auto">
        <Topbar />

        <main className="flex-1 space-y-6 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
