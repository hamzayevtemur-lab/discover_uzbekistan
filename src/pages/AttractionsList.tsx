import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { AttractionsMap, type MapAttraction } from '../components/AttractionsMap'
import { get } from '../lib/api'
import { assetUrl } from '../lib/config'
import { distanceKm } from '../lib/geo'
import type { Attraction, LatLng } from '../types'
import '../styles/attractions-list.css'

const CAT_EMOJI: Record<string, string> = {
  historical: '🏛️', museum: '🖼️', monument: '🗿', park: '🌳', religious: '🕌', mosque: '🕌',
  architectural: '🏰', cultural: '🎭', bazaar: '🏪', mausoleum: '⛩️',
}
const catEmoji = (cat?: string | null) => {
  if (!cat) return '📍'
  const lower = cat.toLowerCase()
  return Object.entries(CAT_EMOJI).find(([k]) => lower.includes(k))?.[1] ?? '📍'
}

const CITIES = ['tashkent', 'samarkand', 'bukhara', 'khiva']
const CATEGORIES = ['Historical Site', 'Museum', 'Monument', 'Park', 'Religious Site', 'Architectural Wonder', 'Cultural Center']
type Sort = 'default' | 'distance' | 'rating' | 'name'

export default function AttractionsList() {
  const navigate = useNavigate()
  const [all, setAll] = useState<Attraction[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [position, setPosition] = useState<LatLng | null>(null)
  const [locText, setLocText] = useState('Detecting your location…')

  const [search, setSearch] = useState('')
  const [city, setCity] = useState('all')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<Sort>('default')
  const [nearMe, setNearMe] = useState(false)
  const [freeOnly, setFreeOnly] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [mapOpen, setMapOpen] = useState(false)
  const [highlight, setHighlight] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number>(undefined)

  const showToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 3200)
  }

  useEffect(() => {
    get<Attraction[]>('/attractions')
      .then((d) => { setAll(d); setStatus('ready') })
      .catch((e) => { console.error('Failed to load attractions:', e); setStatus('error') })

    if (!navigator.geolocation) { setLocText('Location not supported'); return }
    navigator.geolocation.getCurrentPosition(
      (p) => setPosition({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setLocText('Location access denied — showing all attractions'),
      { enableHighAccuracy: false, timeout: 2500, maximumAge: 300000 },
    )
  }, [])

  const withDistance: MapAttraction[] = useMemo(
    () => all.map((a) => ({ ...a, _distance: position ? distanceKm(position, { lat: a.latitude, lng: a.longitude }) : undefined })),
    [all, position],
  )

  const { list, statusText } = useMemo(() => {
    let radius: number | 'all' = 'all'
    let text = '📍 Location disabled — showing all attractions'
    if (position) {
      if (withDistance.some((a) => a._distance != null && a._distance <= 10)) {
        radius = 10
        text = '📍 Showing attractions within 10 km of your location'
      } else if (withDistance.some((a) => a._distance != null && a._distance <= 20)) {
        radius = 20
        text = '📍 No attractions within 10 km — showing attractions within 20 km'
      } else {
        text = '📍 No attractions within 20 km — showing all attractions nearby'
      }
    }

    const q = search.trim().toLowerCase()
    const out = withDistance.filter((a) => {
      if (q && !(a.name || '').toLowerCase().includes(q)) return false
      if (city !== 'all' && !(a.address || '').toLowerCase().includes(city)) return false
      if (category !== 'all' && (a.category || '') !== category) return false
      if (nearMe && (a._distance == null || a._distance > 50)) return false
      if (freeOnly && a.price) return false
      if (radius !== 'all' && (a._distance == null || a._distance > radius)) return false
      return true
    })

    if (sort === 'distance' || (position && sort === 'default')) out.sort((a, b) => (a._distance ?? 9999) - (b._distance ?? 9999))
    else if (sort === 'rating') out.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    else if (sort === 'name') out.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    return { list: out, statusText: text }
  }, [withDistance, position, search, city, category, sort, nearMe, freeOnly])

  const open = useCallback((id: number) => navigate(`/attractions/${id}`), [navigate])

  const select = useCallback((id: number) => {
    setHighlight(id)
    document.getElementById(`acard-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const toggleNearMe = () => {
    if (!position) { showToast('📍 Allow location access to use Near Me'); return }
    if (!nearMe) setSort('distance')
    setNearMe(!nearMe)
  }

  return (
    <div className="pg-attractions-list">
      <PageHeader />

      <div className="hero-strip">
        <div className="hero-inner">
          <h1>🏛️ Attractions <span>in Uzbekistan</span></h1>
          <p>Explore historical sites, monuments and cultural landmarks along the Silk Road</p>
        </div>
      </div>

      <div className="container">
        <div className="location-status">
          <div className={`loc-dot${position ? ' active' : ''}`} />
          <span>{position ? statusText : locText.startsWith('Detecting') ? locText : statusText}</span>
        </div>

        <div className="toolbar">
          <div className="search-wrap">
            <i className="fas fa-search" />
            <input type="text" className="search-input" placeholder="Search attractions…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="filter-group">
            <label className="filter-label">City</label>
            <select className="filter-select" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="all">All Cities</option>
              {CITIES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Category</label>
            <select className="filter-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Sort By</label>
            <select className="filter-select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="default">Default</option>
              <option value="distance">Distance</option>
              <option value="rating">Top Rated</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </div>
          <div className="quick-btns">
            <button className={`quick-btn${nearMe ? ' active' : ''}`} onClick={toggleNearMe} title="Show only attractions within 50 km">
              <i className="fas fa-location-arrow" /> Near Me
            </button>
            <button className={`quick-btn${freeOnly ? ' active' : ''}`} onClick={() => setFreeOnly(!freeOnly)} title="Show free entry attractions">
              <i className="fas fa-gift" /> Free Entry
            </button>
          </div>
        </div>

        <div className="results-bar">
          <div className="results-count">
            {status === 'loading' ? 'Loading…' : status === 'ready' ? <><strong>{list.length}</strong> attraction{list.length !== 1 ? 's' : ''} found</> : ''}
          </div>
          <div className="view-toggle">
            <button className={`view-btn-toggle${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')} title="Grid view"><i className="fas fa-th" /></button>
            <button className={`view-btn-toggle${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')} title="List view"><i className="fas fa-list" /></button>
          </div>
        </div>

        <div className={`map-toggle-bar${mapOpen ? ' open' : ''}`} onClick={() => setMapOpen(!mapOpen)}>
          <span className="bar-label">
            <i className="fas fa-map-marked-alt" style={{ color: 'var(--teal)' }} /> {mapOpen ? 'Hide Map' : 'Show Attractions on Map'}
          </span>
          <i className="fas fa-chevron-down chevron" />
        </div>
        <div className={`map-panel${mapOpen ? '' : ' collapsed'}`}>
          {mapOpen && status === 'ready' && (
            <AttractionsMap attractions={withDistance} userPosition={position} onSelect={select} onOpen={open} />
          )}
        </div>

        <div className={`attractions-grid${view === 'list' ? ' list-view' : ''}`}>
          {status === 'loading' && (
            <div className="loading-state"><div className="spinner" /><p style={{ color: 'var(--text-dim)' }}>Loading attractions…</p></div>
          )}
          {status === 'error' && (
            <div className="empty-state"><div className="empty-icon">⚠️</div><h3>Could not load attractions</h3><p>Please check your connection or try again later.</p></div>
          )}
          {status === 'ready' && list.length === 0 && (
            <div className="empty-state"><div className="empty-icon">🏛️</div><h3>No attractions found</h3><p>Try adjusting your filters or search term.</p></div>
          )}
          {status === 'ready' && list.map((a, i) => (
            <div
              key={a.id}
              id={`acard-${a.id}`}
              className={`attraction-card${highlight === a.id ? ' highlighted' : ''}`}
              style={{ animationDelay: `${Math.min(i * 45, 500)}ms` }}
              onClick={() => open(a.id)}
            >
              <div
                className="attraction-image"
                style={a.image_url ? { background: `url('${assetUrl(a.image_url)}') center/cover no-repeat`, } : undefined}
              >
                {!a.image_url && <span>{catEmoji(a.category)}</span>}
                {a._distance != null && <div className="chip-distance"><i className="fas fa-location-arrow" /> {a._distance.toFixed(1)} km</div>}
                {a.price ? <div className="chip-price"><i className="fas fa-ticket-alt" /> ${String(a.price)}</div> : <div className="chip-free"><i className="fas fa-gift" /> Free</div>}
                {a.is_partner && <div className="chip-partner"><i className="fas fa-crown" /> Partner</div>}
              </div>
              <div className="attraction-info">
                <div className="attraction-name">{a.name}</div>
                {a.category && <div className="category-tag"><i className="fas fa-landmark" /> {a.category}</div>}
                <div className="attraction-meta">
                  {a.rating != null && <div className="meta-item rating"><i className="fas fa-star" /> {Number(a.rating).toFixed(1)}</div>}
                  {a._distance != null && <div className="meta-item dist"><i className="fas fa-map-marker-alt" /> {a._distance.toFixed(1)} km away</div>}
                  {a.review_count ? <div className="meta-item"><i className="fas fa-comment" /> {a.review_count} reviews</div> : null}
                </div>
                {a.duration && <div className="duration-row"><i className="fas fa-clock" /> {a.duration}</div>}
                <button className="view-btn" onClick={(e) => { e.stopPropagation(); open(a.id) }}>
                  <i className="fas fa-info-circle" /> View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  )
}
