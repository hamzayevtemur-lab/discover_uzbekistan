import { useCallback, useEffect, useState } from 'react'
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

function getUserId(): string {
  let id = localStorage.getItem(USER_KEY)
  if (!id) {
    id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    localStorage.setItem(USER_KEY, id)
  }
  return id
}

export function useLikes() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [liked, setLiked] = useState<Record<string, boolean>>(readLiked)

  useEffect(() => {
    get<LikeCount[]>('/api/likes/all')
      .then((rows) => setCounts(Object.fromEntries(rows.map((r) => [r.page_id, r.like_count]))))
      .catch((e) => console.error('Error loading likes:', e))
  }, [])

  const like = useCallback(
    async (placeId: string) => {
      if (liked[placeId]) return // likes are one-way, same as the original
      const prevCount = counts[placeId] ?? 0
      const nextLiked = { ...liked, [placeId]: true }
      setLiked(nextLiked)
      setCounts((c) => ({ ...c, [placeId]: prevCount + 1 }))
      localStorage.setItem(LIKED_KEY, JSON.stringify(nextLiked))
      try {
        const data = await post<{ like_count: number }>(`/api/likes/${placeId}/add`, {
          page_id: placeId,
          user_id: getUserId(),
        })
        setCounts((c) => ({ ...c, [placeId]: data.like_count }))
      } catch {
        const reverted = { ...nextLiked }
        delete reverted[placeId]
        setLiked(reverted)
        setCounts((c) => ({ ...c, [placeId]: prevCount }))
        localStorage.setItem(LIKED_KEY, JSON.stringify(reverted))
      }
    },
    [liked, counts],
  )

  return { counts, liked, like }
}
