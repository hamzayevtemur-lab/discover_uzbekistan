import { useCallback, useEffect, useRef, useState } from 'react'
import { get, post } from '../lib/api'
import type { LikeCount } from '../types'

const LIKED_KEY = 'liked_places'
const USER_KEY = 'uzbekistan_user_id'

function readLiked(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(LIKED_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function writeLiked(liked: Record<string, boolean>) {
  try {
    localStorage.setItem(LIKED_KEY, JSON.stringify(liked))
  } catch {
    /* ignore blocked storage */
  }
}

function getUserId(): string {
  try {
    let id = localStorage.getItem(USER_KEY)
    if (!id) {
      id = `user_${crypto.randomUUID()}`
      localStorage.setItem(USER_KEY, id)
    }
    return id
  } catch {
    return `user_${crypto.randomUUID()}`
  }
}

export function useLikes() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [liked, setLiked] = useState<Record<string, boolean>>(readLiked)
  // always-current copy so rapid clicks on different places never see stale state
  const likedRef = useRef(liked)
  useEffect(() => {
    likedRef.current = liked
    writeLiked(liked)
  }, [liked])

  useEffect(() => {
    get<LikeCount[]>('/api/likes/all')
      .then((rows) => setCounts(Object.fromEntries(rows.map((r) => [r.page_id, r.like_count]))))
      .catch((e) => console.error('Error loading likes:', e))
  }, [])

  const like = useCallback(async (placeId: string) => {
    if (likedRef.current[placeId]) return // likes are one-way, same as the original
    likedRef.current = { ...likedRef.current, [placeId]: true }
    setLiked((l) => ({ ...l, [placeId]: true }))
    setCounts((c) => ({ ...c, [placeId]: (c[placeId] ?? 0) + 1 }))
    try {
      const data = await post<{ like_count: number }>(`/api/likes/${encodeURIComponent(placeId)}/add`, {
        page_id: placeId,
        user_id: getUserId(),
      })
      setCounts((c) => ({ ...c, [placeId]: data.like_count }))
    } catch {
      // roll back only this place
      const { [placeId]: _removed, ...rest } = likedRef.current
      void _removed
      likedRef.current = rest
      setLiked((l) => {
        const { [placeId]: _r, ...others } = l
        void _r
        return others
      })
      setCounts((c) => ({ ...c, [placeId]: Math.max(0, (c[placeId] ?? 1) - 1) }))
    }
  }, [])

  return { counts, liked, like }
}
