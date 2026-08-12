import { useCallback, useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import ErrorState from "@/components/ErrorState"
import { useAuth } from "@/lib/auth"
import { deleteSupplier, listSuppliers } from "@/lib/suppliers"
import { getErrorMessage } from "@/lib/errors"
import { CATEGORY_OPTIONS, formatCategory, formatDate } from "@/lib/format"
import type { Pagination, Supplier } from "@/lib/types"

function SupplierList() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get("search") || ""
  const category = searchParams.get("category") || ""
  const page = Number(searchParams.get("page") || "1")

  const [searchInput, setSearchInput] = useState(search)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const result = await listSuppliers({
        search: search || undefined,
        category: category || undefined,
        page,
      })
      setSuppliers(result.suppliers)
      setPagination(result.pagination)
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load suppliers"))
    } finally {
      setLoading(false)
    }
  }, [search, category, page])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setSearchInput(search)
  }, [search])

  const updateParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    next.delete("page")
    setSearchParams(next)
  }

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    updateParams({ search: searchInput })
  }

  const handleDelete = async (supplier: Supplier) => {
    if (!window.confirm(`Delete ${supplier.name}? This can't be undone.`)) return
    setDeletingId(supplier._id)
    try {
      await deleteSupplier(supplier._id)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't delete supplier"))
    } finally {
      setDeletingId(null)
    }
  }

  const goToPage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams)
    next.set("page", String(nextPage))
    setSearchParams(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            {pagination ? `${pagination.total} total` : "…"}
          </p>
        </div>

        {isAdmin && (
          <Button asChild>
            <Link to="/dashboard/suppliers/new">
              <Plus className="size-4" />
              Add supplier
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name…"
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>

        <Select
          value={category || "all"}
          onValueChange={(value) => updateParams({ category: value === "all" ? "" : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && (
        <div className="rounded-xl border border-border bg-card">
          {suppliers.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No suppliers found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="p-4 font-medium">Name</th>
                    <th className="p-4 font-medium">Category</th>
                    <th className="p-4 font-medium">Country</th>
                    <th className="p-4 font-medium">Risk score</th>
                    <th className="p-4 font-medium">Contract expiry</th>
                    <th className="p-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr
                      key={supplier._id}
                      className="border-b border-border/60 transition-colors duration-200 ease-out last:border-0 hover:bg-muted/50"
                    >
                      <td className="p-4">
                        <Link
                          to={`/dashboard/suppliers/${supplier._id}`}
                          className="font-medium hover:text-primary"
                        >
                          {supplier.name}
                        </Link>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {formatCategory(supplier.category)}
                      </td>
                      <td className="p-4 text-muted-foreground">{supplier.country}</td>
                      <td className="p-4 text-muted-foreground">
                        {supplier.riskScore ?? "—"}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {formatDate(supplier.contractExpiry)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          {isAdmin && (
                            <>
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/dashboard/suppliers/${supplier._id}/edit`}>
                                  Edit
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={deletingId === supplier._id}
                                onClick={() => handleDelete(supplier)}
                                aria-label={`Delete ${supplier.name}`}
                              >
                                <Trash2 className="size-4 text-red-700" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => goToPage(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => goToPage(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupplierList
