export type Role = "admin" | "viewer"

export interface User {
  email: string
  role: Role
  orgId: string
}

export interface AuthPayload {
  accessToken: string
  refreshToken: string
  user: User
}

export type SupplierCategory = "raw_material" | "logistics" | "saas" | "other"

export interface Supplier {
  _id: string
  name: string
  category?: SupplierCategory
  country: string
  riskScore?: number
  healthScore?: number
  contractExpiry?: string | null
  paymentTerms?: string
  orgId: string
  createdAt: string
  updatedAt: string
}

export interface SupplierInput {
  name: string
  country: string
  category?: SupplierCategory
  riskScore?: number
  paymentTerms?: string
  contractExpiry?: string | null
}

export interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface RecentActivityEntry {
  _id: string
  name: string
  category?: SupplierCategory
  riskScore?: number
  updatedAt: string
}

export interface GrowthPoint {
  date: string
  count: number
}

export interface DashboardStats {
  totalSuppliers: number
  averageRiskScore: number
  averageHealthScore: number
  byCategory: { category: string; count: number }[]
  newSuppliers: { last7Days: number; last30Days: number }
  growthSeries: GrowthPoint[]
  recentActivity: RecentActivityEntry[]
}
