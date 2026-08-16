import api from "@/lib/api"
import type { NewsArticle } from "@/lib/types"

export async function listNews(supplierId: string): Promise<NewsArticle[]> {
  const { data } = await api.get(`/news/${supplierId}`)
  return data.data as NewsArticle[]
}

export async function refreshNews(
  supplierId: string
): Promise<{ fetched: number; stored: number }> {
  const { data } = await api.post(`/news/${supplierId}/refresh`)
  return data.data
}
