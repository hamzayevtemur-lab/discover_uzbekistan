import { useEffect, useState } from 'react'
import type { LatLng } from '../types'

export function useUserPosition(): LatLng | null {
  const [pos, setPos] = useState<LatLng | null>(null)
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setPos(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [])
  return pos
}
