import type { MouseEvent } from 'react'

interface Props {
  placeId: string
  count: number
  liked: boolean
  onLike: (placeId: string) => void
}

export function LikeButton({ placeId, count, liked, onLike }: Props) {
  const handle = (e: MouseEvent) => {
    e.stopPropagation()
    onLike(placeId)
  }
  return (
    <button
      type="button"
      className={`like-btn${liked ? ' liked' : ''}`}
      data-place-id={placeId}
      onClick={handle}
    >
      <span className="heart-icon">{liked ? '♥' : '♡'}</span>
      <span className="like-count">{count}</span>
    </button>
  )
}
