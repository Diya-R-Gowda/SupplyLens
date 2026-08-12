import api from "@/lib/api"
import type { DashboardStats } from "@/lib/types"

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get("/dashboard/stats")
  return data.data as DashboardStats
}
