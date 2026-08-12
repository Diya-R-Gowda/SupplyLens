import api from "@/lib/api"
import type { DocumentRecord } from "@/lib/types"

export async function listDocuments(supplierId: string): Promise<DocumentRecord[]> {
  const { data } = await api.get(`/documents/${supplierId}`)
  return data.data as DocumentRecord[]
}

export interface UploadResult {
  documentId: string
  totalChunks: number
  pageCount: number
}

export async function uploadDocument(
  supplierId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const formData = new FormData()
  formData.append("file", file)

  const { data } = await api.post(`/documents/upload/${supplierId}`, formData, {
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    },
  })
  return data.data as UploadResult
}

export async function deleteDocument(supplierId: string, docId: string): Promise<void> {
  await api.delete(`/documents/${supplierId}/${docId}`)
}
