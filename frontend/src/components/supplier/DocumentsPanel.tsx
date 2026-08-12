import { useRef, useState, type DragEvent } from "react"
import { FileText, Trash2, UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import ErrorState from "@/components/ErrorState"
import { deleteDocument, uploadDocument } from "@/lib/documents"
import { getErrorMessage } from "@/lib/errors"
import { formatDate } from "@/lib/format"
import type { DocumentRecord } from "@/lib/types"

const MAX_SIZE_BYTES = 10 * 1024 * 1024

function validateFile(file: File): string | null {
  if (file.type !== "application/pdf") return "Only PDF files are supported."
  if (file.size > MAX_SIZE_BYTES) return "File is larger than the 10MB limit."
  return null
}

function DocumentsPanel({
  supplierId,
  documents,
  loading,
  error,
  onReload,
  isAdmin,
}: {
  supplierId: string
  documents: DocumentRecord[]
  loading: boolean
  error: string
  onReload: () => void
  isAdmin: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadError, setUploadError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setUploadError(validationError)
      return
    }

    setUploading(true)
    setUploadError("")
    setProgress(0)
    try {
      // The response only arrives once parse -> chunk -> embed has fully
      // finished server-side (POST /documents/upload/:id is synchronous) -
      // there's no separate "processing" status to poll after this resolves.
      await uploadDocument(supplierId, file, setProgress)
      onReload()
    } catch (err) {
      setUploadError(getErrorMessage(err, "Failed to process document"))
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleDelete = async (doc: DocumentRecord) => {
    if (!window.confirm(`Delete ${doc.fileName}? This can't be undone.`)) return
    setDeletingId(doc._id)
    try {
      await deleteDocument(supplierId, doc._id)
      onReload()
    } catch (err) {
      setUploadError(getErrorMessage(err, "Couldn't delete document"))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium">Documents</h2>

      {isAdmin && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-3 flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors duration-200 ease-out ${
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
          }`}
        >
          <UploadCloud className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag a PDF here, or <span className="text-primary">browse</span>
          </p>
          <p className="text-xs text-muted-foreground">PDF only, up to 10MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ""
            }}
          />
        </div>
      )}

      {uploading && (
        <div className="mt-3 space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Uploading and indexing… {progress}%
          </p>
        </div>
      )}

      {uploadError && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {uploadError}
        </p>
      )}

      <div className="mt-4">
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        )}

        {!loading && error && <ErrorState message={error} onRetry={onReload} />}

        {!loading && !error && documents.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No documents uploaded yet.
          </p>
        )}

        {!loading && !error && documents.length > 0 && (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc._id}
                id={`document-${doc._id}`}
                className="flex scroll-mt-20 items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm transition-colors duration-200 ease-out hover:bg-muted/50 target:border-primary"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {formatDate(doc.uploadedAt)}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={deletingId === doc._id}
                    onClick={() => handleDelete(doc)}
                    aria-label={`Delete ${doc.fileName}`}
                  >
                    <Trash2 className="size-4 text-red-700" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default DocumentsPanel
