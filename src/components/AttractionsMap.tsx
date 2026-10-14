import { useEffect, useRef } from 'react'
import { loadYandexMaps } from '../lib/yandex'
import type { Attraction, LatLng } from '../types'

export type MapAttraction = Attraction & { _distance?: number }

interface Props {
  attractions: MapAttraction[]
  userPosition: LatLng | null
  onSelect: (id: number) => void
  onOpen: (id: number) => void
}

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')

export function AttractionsMap({ attractions, userPosition, onSelect, onOpen }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<ymaps.Map | null>(null)
  // balloon buttons live in Yandex-rendered HTML, so expose the opener globally while mounted
  const openRef = useRef(onOpen)
  openRef.current = onOpen

  useEffect(() => {
    ;(window as unknown as { openAttraction?: (id: number) => void }).openAttraction = (id) => openRef.current(id)
    return () => {
      delete (window as unknown as { openAttraction?: unknown }).openAttraction
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    loadYandexMaps()
      .then(() => {
        if (cancelled || !ref.current) return
        mapRef.current?.destroy()
        const map = new ymaps.Map(ref.current, { center: [41.3, 64.6], zoom: 6, controls: ['zoomControl', 'fullscreenControl'] })
        mapRef.current = map

        if (userPosition) {
          map.geoObjects.add(
            new ymaps.Placemark([userPosition.lat, userPosition.lng],
              { balloonContent: '<b style="font-size:13px">📍 You are here</b>', hintContent: 'You are here' },
              { preset: 'islands#greenCircleDotIcon' }),
          )
        }

        for (const a of attractions) {
          if (!a.latitude || !a.longitude) continue
          const dist = a._distance != null ? `<span style="color:#00e676;font-size:12px">📍 ${a._distance.toFixed(1)} km away</span><br>` : ''
          const rating = a.rating != null ? `<span style="color:#ffd740;font-size:12px">⭐ ${Number(a.rating).toFixed(1)}/5.0</span><br>` : ''
          const price = a.price
            ? `<span style="font-size:11px;color:#ff6b35">🎫 $${esc(a.price)}</span><br>`
            : '<span style="font-size:11px;color:#10b981">🎁 Free Entry</span><br>'
          const marker = new ymaps.Placemark(
            [a.latitude, a.longitude],
            {
              hintContent: a.name,
              balloonContent: `<div style="padding:4px;min-width:190px">
                <b style="font-size:14px;display:block;margin-bottom:4px">${esc(a.name)}</b>
                ${a.category ? `<span style="font-size:11px;color:#aaa">${esc(a.category)}</span><br>` : ''}
                ${rating}${dist}${price}
                <button onclick="window.openAttraction(${Number(a.id)})" style="margin-top:10px;width:100%;background:#00bcd4;color:white;border:none;padding:8px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">View Details</button>
              </div>`,
            },
            { preset: 'islands#cyanSightIcon' },
          )
          marker.events.add('click', () => onSelect(a.id))
          map.geoObjects.add(marker)
        }

        const bounds = map.geoObjects.getBounds()
        if (bounds) map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 })
        map.container.fitToViewport()
      })
      .catch((e) => console.error(e))

    return () => {
      cancelled = true
      mapRef.current?.destroy()
      mapRef.current = null
    }
    // rebuild when the data set or user position changes
  }, [attractions, userPosition, onSelect])

  return <div id="attractionMap" ref={ref} />
}
