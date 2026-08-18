import axios, { type AxiosError } from "axios"

interface ApiErrorBody {
  error?: {
    message?: string
    code?: string
    details?: Record<string, string>
  }
}

// axios.isAxiosError() (a plain `error.isAxiosError === true` check) rather
// than `instanceof AxiosError` - the latter is fragile whenever the axios
// module gets loaded more than once (e.g. a mocking layer with its own
// require of "axios"), since two separate module instances produce two
// distinct AxiosError classes that fail instanceof against each other even
// for a functionally identical error object.
export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const body = (error as AxiosError).response?.data as ApiErrorBody | undefined
    return body?.error?.message || fallback
  }
  return fallback
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (axios.isAxiosError(error)) {
    const body = (error as AxiosError).response?.data as ApiErrorBody | undefined
    return body?.error?.details || {}
  }
  return {}
}
