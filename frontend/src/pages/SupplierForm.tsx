import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
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
import { CATEGORY_OPTIONS } from "@/lib/format"
import { getErrorMessage, getFieldErrors } from "@/lib/errors"
import { createSupplier, getSupplier, updateSupplier } from "@/lib/suppliers"
import type { SupplierCategory } from "@/lib/types"

function toDateInputValue(iso?: string | null) {
  if (!iso) return ""
  return iso.slice(0, 10)
}

interface FormState {
  name: string
  country: string
  category: SupplierCategory | ""
  riskScore: string
  paymentTerms: string
  contractExpiry: string
}

const emptyForm: FormState = {
  name: "",
  country: "",
  category: "",
  riskScore: "",
  paymentTerms: "",
  contractExpiry: "",
}

function SupplierForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getSupplier(id)
      .then((supplier) => {
        setForm({
          name: supplier.name,
          country: supplier.country,
          category: supplier.category || "",
          riskScore: supplier.riskScore != null ? String(supplier.riskScore) : "",
          paymentTerms: supplier.paymentTerms || "",
          contractExpiry: toDateInputValue(supplier.contractExpiry),
        })
      })
      .catch((err) => setLoadError(getErrorMessage(err, "Couldn't load supplier")))
      .finally(() => setLoading(false))
  }, [id])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setFormError("")
    setFieldErrors({})

    const payload = {
      name: form.name.trim(),
      country: form.country.trim().toUpperCase(),
      category: form.category || undefined,
      riskScore: form.riskScore ? Number(form.riskScore) : undefined,
      paymentTerms: form.paymentTerms.trim() || undefined,
      contractExpiry: form.contractExpiry || undefined,
    }

    try {
      if (isEdit && id) {
        await updateSupplier(id, payload)
        navigate(`/dashboard/suppliers/${id}`)
      } else {
        const created = await createSupplier(payload)
        navigate(`/dashboard/suppliers/${created._id}`)
      }
    } catch (err) {
      setFormError(getErrorMessage(err, "Couldn't save supplier"))
      setFieldErrors(getFieldErrors(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Skeleton className="h-96 rounded-xl" />
  }

  if (loadError) {
    return <ErrorState message={loadError} />
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold tracking-tight">
        {isEdit ? "Edit supplier" : "Add supplier"}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <Input
            id="name"
            required
            maxLength={200}
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
          />
          {fieldErrors.name && (
            <p className="text-xs text-red-700">{fieldErrors.name}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="country" className="text-sm font-medium">
            Country (2-letter code)
          </label>
          <Input
            id="country"
            required
            maxLength={2}
            placeholder="US"
            className="uppercase"
            value={form.country}
            onChange={(e) => setField("country", e.target.value)}
          />
          {fieldErrors.country && (
            <p className="text-xs text-red-700">{fieldErrors.country}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Category</label>
          <Select
            value={form.category || undefined}
            onValueChange={(value) => setField("category", value as SupplierCategory)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.category && (
            <p className="text-xs text-red-700">{fieldErrors.category}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="riskScore" className="text-sm font-medium">
            Risk score (0-100)
          </label>
          <Input
            id="riskScore"
            type="number"
            min={0}
            max={100}
            value={form.riskScore}
            onChange={(e) => setField("riskScore", e.target.value)}
          />
          {fieldErrors.riskScore && (
            <p className="text-xs text-red-700">{fieldErrors.riskScore}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="paymentTerms" className="text-sm font-medium">
            Payment terms
          </label>
          <Input
            id="paymentTerms"
            maxLength={100}
            placeholder="Net 30"
            value={form.paymentTerms}
            onChange={(e) => setField("paymentTerms", e.target.value)}
          />
          {fieldErrors.paymentTerms && (
            <p className="text-xs text-red-700">{fieldErrors.paymentTerms}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="contractExpiry" className="text-sm font-medium">
            Contract expiry
          </label>
          <Input
            id="contractExpiry"
            type="date"
            value={form.contractExpiry}
            onChange={(e) => setField("contractExpiry", e.target.value)}
          />
          {fieldErrors.contractExpiry && (
            <p className="text-xs text-red-700">{fieldErrors.contractExpiry}</p>
          )}
        </div>

        {formError && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create supplier"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

export default SupplierForm
