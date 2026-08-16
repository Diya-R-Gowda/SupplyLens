import api from "@/lib/api"
import type { ForecastBundle } from "@/lib/types"

export async function getSupplierForecast(supplierId: string): Promise<ForecastBundle> {
  const { data } = await api.get(`/suppliers/${supplierId}/forecast`)
  return data.data as ForecastBundle
}

export async function getOrgForecast(): Promise<ForecastBundle> {
  const { data } = await api.get("/org/forecast")
  return data.data as ForecastBundle
}
