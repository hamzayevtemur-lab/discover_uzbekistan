import { YANDEX_API_KEY } from './config'

let loader: Promise<void> | null = null

/** Loads the Yandex Maps 2.1 script once and resolves when ymaps is ready. */
export function loadYandexMaps(lang = 'en_US'): Promise<void> {
  if (loader) return loader
  loader = new Promise<void>((resolve, reject) => {
    const apikey = YANDEX_API_KEY ? `&apikey=${YANDEX_API_KEY}` : ''
    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/2.1/?lang=${lang}${apikey}`
    script.async = true
    script.onload = () => ymaps.ready(resolve)
    script.onerror = () => {
      loader = null
      reject(new Error('Failed to load Yandex Maps'))
    }
    document.head.appendChild(script)
  })
  return loader
}
