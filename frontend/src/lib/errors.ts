import { AxiosError } from "axios"

interface ApiErrorBody {
  error?: {
    message?: string
    code?: string
    details?: Record<string, string>
  }
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined
    return body?.error?.message || fallback
  }
  return fallback
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined
    return body?.error?.details || {}
  }
  return {}
}
