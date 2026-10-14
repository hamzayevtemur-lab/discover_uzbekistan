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

function balloonHtml(a: MapAttraction): string {
  const dist = a._distance != null ? `<span style="color:#00e676;font-size:12px">📍 ${a._distance.toFixed(1)} km away</span><br>` : ''
  const rating = a.rating != null ? `<span style="color:#ffd740;font-size:12px">⭐ ${Number(a.rating).toFixed(1)}/5.0</span><br>` : ''
  const price = a.price
    ? `<span style="font-size:11px;color:#ff6b35">🎫 $${esc(a.price)}</span><br>`
    : '<span style="font-size:11px;color:#10b981">🎁 Free Entry</span><br>'
  return `<div style="padding:4px;min-width:190px">
    <b style="font-size:14px;display:block;margin-bottom:4px">${esc(a.name)}</b>
    ${a.category ? `<span style="font-size:11px;color:#aaa">${esc(a.category)}</span><br>` : ''}
    ${rating}${dist}${price}
    <button type="button" data-open-attraction="${Number(a.id)}" style="margin-top:10px;width:100%;background:#00bcd4;color:white;border:none;padding:8px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">View Details</button>
  </div>`
}

export function AttractionsMap({ attractions, userPosition, onSelect, onOpen }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<ymaps.Map | null>(null)
  const markersRef = useRef<ymaps.GeoObjectCollection | null>(null)
  const fittedRef = useRef(false)
  const syncRef = useRef<() => void>(() => {})

  // keep the latest callbacks without re-creating the map when the parent re-renders
  const onSelectRef = useRef(onSelect)
  const onOpenRef = useRef(onOpen)
  useEffect(() => {
    onSelectRef.current = onSelect
    onOpenRef.current = onOpen
  })

  // the balloon HTML is rendered by Yandex inside the map container, so one delegated listener
  // on the container replaces the old global `window.openAttraction`
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-open-attraction]')
      if (btn) onOpenRef.current(Number(btn.dataset.openAttraction))
    }
    el.addEventListener('click', onClick)
    return () => el.removeEventListener('click', onClick)
  }, [])

  // create the map once
  useEffect(() => {
    let cancelled = false
    loadYandexMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return
        const map = new ymaps.Map(containerRef.current, { center: [41.3, 64.6], zoom: 6, controls: ['zoomControl', 'fullscreenControl'] })
        const markers = new ymaps.GeoObjectCollection()
        map.geoObjects.add(markers)
        mapRef.current = map
        markersRef.current = markers
        syncRef.current()
      })
      .catch((e) => console.error(e))

    return () => {
      cancelled = true
      mapRef.current?.destroy()
      mapRef.current = null
      markersRef.current = null
      fittedRef.current = false
    }
  }, [])

  // update markers in place when the data or the user position changes (keeps zoom/pan)
  useEffect(() => {
    const sync = () => {
      const map = mapRef.current
      const markers = markersRef.current
      if (!map || !markers) return
      markers.removeAll()

      if (userPosition) {
        markers.add(
          new ymaps.Placemark([userPosition.lat, userPosition.lng],
            { balloonContent: '<b style="font-size:13px">📍 You are here</b>', hintContent: 'You are here' },
            { preset: 'islands#greenCircleDotIcon' }),
        )
      }
      for (const a of attractions) {
        if (!a.latitude || !a.longitude) continue
        const marker = new ymaps.Placemark(
          [a.latitude, a.longitude],
          { hintContent: a.name, balloonContent: balloonHtml(a) },
          { preset: 'islands#cyanSightIcon' },
        )
        marker.events.add('click', () => onSelectRef.current(a.id))
        markers.add(marker)
      }

      // fit the view only the first time markers appear, so later updates don't reset the user's zoom/pan
      if (!fittedRef.current) {
        const bounds = markers.getBounds()
        if (bounds) {
          map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 })
          fittedRef.current = true
        }
        map.container.fitToViewport()
      }
    }
    syncRef.current = sync
    sync()
  }, [attractions, userPosition])

  return <div id="attractionMap" ref={containerRef} />
}
