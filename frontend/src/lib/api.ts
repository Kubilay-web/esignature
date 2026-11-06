import axios, { AxiosError } from 'axios'
import { translate } from './i18n'
import { usePreferencesStore } from '@/stores/preferences'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * Axios instance for the backend:
 * - withCredentials sends the httpOnly auth cookie
 * - Accept-Language makes the backend answer error messages in the UI language
 * - every error becomes an ApiError carrying the backend's message
 */



export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api',
  withCredentials: true,
})

const lang = () => usePreferencesStore().lang

http.interceptors.request.use((config) => {
  config.headers.set('Accept-Language', lang())
  return config
})

http.interceptors.response.use(undefined, async (error: AxiosError<unknown>) => {
  if (!error.response) throw new ApiError(0, translate(lang(), 'error.network'))

  let data = error.response.data
  // Blob requests (PDF download) get their JSON error back as a Blob
  if (data instanceof Blob) data = await data.text().then((text) => JSON.parse(text)).catch(() => null)

  const message = (data as { message?: string } | null)?.message ?? translate(lang(), 'error.generic')
  throw new ApiError(error.response.status, message)
})

/** Binary download (PDF) */
export async function apiBlob(path: string): Promise<Blob> {
  const res = await http.get<Blob>(path, { responseType: 'blob' })
  return res.data
}

/** Uploads a PDF as the raw request body; the file name travels in a header. */
export async function apiUploadPdf<T>(path: string, file: File): Promise<T> {
  const res = await http.put<T>(path, file, {
    headers: { 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent(file.name) },
  })
  return res.data
}

export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : translate(lang(), 'error.generic')

/** Saves a Blob as a file through a temporary link. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
