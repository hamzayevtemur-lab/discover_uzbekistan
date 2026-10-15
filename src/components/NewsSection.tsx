import { useEffect, useState } from 'react'
import { get } from '../lib/api'
import { assetUrl } from '../lib/config'
import { useI18n, type Tr } from '../lib/i18n-context'
import type { NewsItem } from '../types'
import '../styles/news.css'

const ICON: Record<string, string> = { news: '📰', event: '🎉', holiday: '🎊', announcement: '📢' }
const LABEL: Record<string, Tr> = {
  news: { en: 'News', uz: 'Yangilik', ru: 'Новость' },
  event: { en: 'Event', uz: 'Tadbir', ru: 'Событие' },
  holiday: { en: 'Holiday', uz: 'Bayram', ru: 'Праздник' },
  announcement: { en: 'Announcement', uz: "E'lon", ru: 'Объявление' },
}
const LOCALE = { en: 'en-US', uz: 'uz-UZ', ru: 'ru-RU' } as const
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

const fmtDate = (d: string | null | undefined, locale: string) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'

// Handles come from the backend/admin, so only allow characters valid in a username
// (also accepts a pasted profile URL) before putting them into a link.
const handleOf = (raw: string) =>
  raw.trim().replace(/^https?:\/\/[^/]+\//i, '').replace(/^@/, '').split(/[/?#]/)[0].replace(/[^A-Za-z0-9._]/g, '')
const phoneHref = (raw: string) => `tel:${raw.replace(/[^\d+]/g, '')}`

function NewsCard({ item, today }: { item: NewsItem; today: string }) {
  const { lang, tr } = useI18n()
  const locale = LOCALE[lang]
  const cat = item.category && item.category in ICON ? item.category : 'news'
  const expired = !!item.end_date && item.end_date < today
  const dateStr = item.end_date ? `${fmtDate(item.start_date, locale)} — ${fmtDate(item.end_date, locale)}` : fmtDate(item.start_date, locale)
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
          {ICON[cat]} {tr(LABEL[cat])}
        </span>
        {expired && <span className="news-past">{tr({ en: 'Past', uz: 'O\'tgan', ru: 'Прошло' })}</span>}
      </div>

      <div className="news-body">
        <div className="news-date">📅 {dateStr}</div>
        <h3>{item.title}</h3>
        {item.description && <p className="news-desc">{item.description}</p>}

        {item.location_name && (
          <div className="news-loc">
            📍
            {item.location_lat != null && item.location_lng != null ? (
              <a href={`https://www.google.com/maps?q=${Number(item.location_lat)},${Number(item.location_lng)}`} target="_blank" rel="noreferrer">
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
              <a className="news-link ig" href={`https://instagram.com/${handleOf(item.instagram)}`} target="_blank" rel="noreferrer">
                📷 {item.instagram}
              </a>
            )}
            {item.telegram && (
              <a className="news-link tg" href={`https://t.me/${handleOf(item.telegram)}`} target="_blank" rel="noreferrer">
                ✈️ {item.telegram}
              </a>
            )}
            {item.phone && (
              <a className="news-link ph" href={phoneHref(item.phone)}>
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
  const [today] = useState(() => new Date().toISOString().split('T')[0])

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
          <div className="news-pill">📰 {tr({ en: 'Latest from Uzbekistan', uz: "O'zbekistondan so'nggi yangiliklar", ru: 'Свежие новости Узбекистана' })}</div>
          <h2>{tr({ en: 'News & Events', uz: 'Yangiliklar va tadbirlar', ru: 'Новости и события' })}</h2>
          <p>{tr({ en: 'Stay updated with festivals, holidays and travel announcements', uz: "Festivallar, bayramlar va sayohat e'lonlaridan xabardor bo'ling", ru: 'Следите за фестивалями, праздниками и туристическими анонсами' })}</p>
        </div>
        <div className="news-grid">
          {items.map((n) => (
            <NewsCard key={n.id} item={n} today={today} />
          ))}
        </div>
      </div>
    </section>
  )
}
