import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import ErrorState from "@/components/ErrorState"
import { useAuth } from "@/lib/auth"
import { deleteSupplier, getSupplier } from "@/lib/suppliers"
import { getErrorMessage } from "@/lib/errors"
import { formatCategory, formatDate } from "@/lib/format"
import type { Supplier } from "@/lib/types"

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  )
}

function SupplierDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError("")
    try {
      const data = await getSupplier(id)
      setSupplier(data)
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load supplier"))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async () => {
    if (!supplier) return
    if (!window.confirm(`Delete ${supplier.name}? This can't be undone.`)) return
    setDeleting(true)
    try {
      await deleteSupplier(supplier._id)
      navigate("/dashboard/suppliers")
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't delete supplier"))
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Link
        to="/dashboard/suppliers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to suppliers
      </Link>

      {loading && <Skeleton className="h-64 rounded-xl" />}

      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && supplier && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{supplier.name}</h1>
              <p className="text-sm text-muted-foreground">
                {formatCategory(supplier.category)}
              </p>
            </div>

            {isAdmin && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/dashboard/suppliers/${supplier._id}/edit`}>
                    <Pencil className="size-4" />
                    Edit
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  <Trash2 className="size-4 text-red-700" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-3">
            <Field label="Country" value={supplier.country} />
            <Field label="Risk score" value={String(supplier.riskScore ?? "—")} />
            <Field
              label="Health score"
              value={String(supplier.healthScore ?? "—")}
            />
            <Field label="Payment terms" value={supplier.paymentTerms || "—"} />
            <Field label="Contract expiry" value={formatDate(supplier.contractExpiry)} />
            <Field label="Added" value={formatDate(supplier.createdAt)} />
          </dl>
        </div>
      )}
    </div>
  )
}

export default SupplierDetail
