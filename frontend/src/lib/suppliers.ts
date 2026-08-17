import api from "@/lib/api"
import type { Pagination, Supplier, SupplierInput, SupplierLocationDetail } from "@/lib/types"

export interface ListSuppliersParams {
  search?: string
  category?: string
  country?: string
  page?: number
  limit?: number
}

export interface ListSuppliersResult {
  suppliers: Supplier[]
  pagination: Pagination
}

export async function listSuppliers(params: ListSuppliersParams = {}): Promise<ListSuppliersResult> {
  const { data } = await api.get("/suppliers", { params })
  return { suppliers: data.data as Supplier[], pagination: data.meta.pagination as Pagination }
}

export async function getSupplier(id: string): Promise<Supplier> {
  const { data } = await api.get(`/suppliers/${id}`)
  return data.data as Supplier
}

export async function createSupplier(input: SupplierInput): Promise<Supplier> {
  const { data } = await api.post("/suppliers", input)
  return data.data as Supplier
}

export async function updateSupplier(id: string, input: Partial<SupplierInput>): Promise<Supplier> {
  const { data } = await api.patch(`/suppliers/${id}`, input)
  return data.data as Supplier
}

export async function deleteSupplier(id: string): Promise<void> {
  await api.delete(`/suppliers/${id}`)
}

// Exactly one of (address) or (lat + lng) - never both. Geocoding an address
// happens server-side (Nominatim); manual coordinates are stored as-is.
export type UpdateSupplierLocationInput =
  | { address: string }
  | { lat: number; lng: number }

export async function updateSupplierLocation(
  id: string,
  input: UpdateSupplierLocationInput
): Promise<SupplierLocationDetail> {
  const { data } = await api.patch(`/suppliers/${id}/location`, input)
  return data.data as SupplierLocationDetail
}
