export const API_BASE: string =
  import.meta.env.VITE_API_BASE ?? (location.protocol.startsWith('http') ? '' : 'http://localhost:8000')

export const YANDEX_API_KEY: string = import.meta.env.VITE_YANDEX_API_KEY ?? ''

export const assetUrl = (url?: string | null, fallback = '/images/reg5.jpg'): string => {
  if (!url) return fallback
  return url.startsWith('http') ? url : `${API_BASE}${url}`
}
