import { useEffect, useState } from 'react'
import { get } from '../lib/api'
import { assetUrl } from '../lib/config'
import { useI18n } from '../lib/i18n'
import type { NewsItem } from '../types'
import '../styles/news.css'

const ICON: Record<string, string> = { news: '📰', event: '🎉', holiday: '🎊', announcement: '📢' }
const LABEL: Record<string, string> = { news: 'News', event: 'Event', holiday: 'Holiday', announcement: 'Announcement' }
const GRADIENT: Record<string, string> = {
  news: 'linear-gradient(135deg,#1e3a5f,#2d5986)',
  event: 'linear-gradient(135deg,#1a3d2b,#2d6b47)',
  holiday: 'linear-gradient(135deg,#4a1942,#7b2d7b)',
  announcement: 'linear-gradient(135deg,#3d2a00,#7a5500)',
}
const BADGE: Record<string, string> = {
  news: '#1d4ed8',
  event: '#059669',
  holiday: '#9d174d',
  announcement: '#b45309',
}

const fmtDate = (d?: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'

const strip = (handle: string) => handle.replace('@', '')

function NewsCard({ item }: { item: NewsItem }) {
  const cat = item.category && item.category in ICON ? item.category : 'news'
  const today = new Date().toISOString().split('T')[0]
  const expired = !!item.end_date && item.end_date < today
  const dateStr = item.end_date ? `${fmtDate(item.start_date)} — ${fmtDate(item.end_date)}` : fmtDate(item.start_date)
  const img = item.image_url ? assetUrl(item.image_url) : null
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <div className="news-card">
      {img && !imgFailed ? (
        <img className="news-bg" src={img} alt={item.title} onError={() => setImgFailed(true)} />
      ) : (
        <div className="news-bg" style={{ background: GRADIENT[cat] }} />
      )}
      <div className="news-shade" />

      <div className="news-top">
        <span className="news-badge" style={{ background: BADGE[cat] }}>
          {ICON[cat]} {LABEL[cat]}
        </span>
        {expired && <span className="news-past">Past</span>}
      </div>

      <div className="news-body">
        <div className="news-date">📅 {dateStr}</div>
        <h3>{item.title}</h3>
        {item.description && <p className="news-desc">{item.description}</p>}

        {item.location_name && (
          <div className="news-loc">
            📍
            {item.location_lat && item.location_lng ? (
              <a href={`https://www.google.com/maps?q=${item.location_lat},${item.location_lng}`} target="_blank" rel="noreferrer">
                {item.location_name}
              </a>
            ) : (
              <span>{item.location_name}</span>
            )}
          </div>
        )}

        {(item.instagram || item.telegram || item.phone) && (
          <div className="news-links">
            {item.instagram && (
              <a className="news-link ig" href={`https://instagram.com/${strip(item.instagram)}`} target="_blank" rel="noreferrer">
                📷 {item.instagram}
              </a>
            )}
            {item.telegram && (
              <a className="news-link tg" href={`https://t.me/${strip(item.telegram)}`} target="_blank" rel="noreferrer">
                ✈️ {item.telegram}
              </a>
            )}
            {item.phone && (
              <a className="news-link ph" href={`tel:${item.phone}`}>
                📞 {item.phone}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function NewsSection() {
  const { tr } = useI18n()
  const [items, setItems] = useState<NewsItem[]>([])

  useEffect(() => {
    get<NewsItem[]>('/api/news/active')
      .then(setItems)
      .catch((e) => console.error('News load error:', e))
  }, [])

  if (!items.length) return null

  return (
    <section className="news-section" id="news">
      <div className="news-inner">
        <div className="news-head">
          <div className="news-pill">📰 {tr({ en: 'Latest from Uzbekistan', uz: "O'zbekistondan so'nggi yangiliklar" })}</div>
          <h2>{tr({ en: 'News & Events', uz: 'Yangiliklar va tadbirlar' })}</h2>
          <p>{tr({ en: 'Stay updated with festivals, holidays and travel announcements', uz: "Festivallar, bayramlar va sayohat e'lonlaridan xabardor bo'ling" })}</p>
        </div>
        <div className="news-grid">
          {items.map((n) => (
            <NewsCard key={n.id} item={n} />
          ))}
        </div>
      </div>
    </section>
  )
}
