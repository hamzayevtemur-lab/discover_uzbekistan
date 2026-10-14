import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Gift01, Grid01, InfoCircle, List, Map01, NavigationPointer01, SearchLg } from '@untitledui/icons'
import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { Select } from '@/components/base/select/select'
import { SiteHeader } from '../components/SiteHeader'
import { AttractionsMap, type MapAttraction } from '../components/AttractionsMap'
import { get } from '../lib/api'
import { assetUrl } from '../lib/config'
import { useI18n, type Tr } from '../lib/i18n-context'
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

const CITIES: { value: string; label: Tr }[] = [
  { value: 'tashkent', label: { en: 'Tashkent', uz: 'Toshkent', ru: 'Ташкент' } },
  { value: 'samarkand', label: { en: 'Samarkand', uz: 'Samarqand', ru: 'Самарканд' } },
  { value: 'bukhara', label: { en: 'Bukhara', uz: 'Buxoro', ru: 'Бухара' } },
  { value: 'khiva', label: { en: 'Khiva', uz: 'Xiva', ru: 'Хива' } },
]
// `value` must match the category stored by the backend; only the label is translated
const CATEGORIES: { value: string; label: Tr }[] = [
  { value: 'Historical Site', label: { en: 'Historical Site', uz: 'Tarixiy joy', ru: 'Исторический объект' } },
  { value: 'Museum', label: { en: 'Museum', uz: 'Muzey', ru: 'Музей' } },
  { value: 'Monument', label: { en: 'Monument', uz: 'Yodgorlik', ru: 'Памятник' } },
  { value: 'Park', label: { en: 'Park', uz: 'Park', ru: 'Парк' } },
  { value: 'Religious Site', label: { en: 'Religious Site', uz: 'Diniy joy', ru: 'Религиозный объект' } },
  { value: 'Architectural Wonder', label: { en: 'Architectural Wonder', uz: "Me'moriy durdona", ru: 'Архитектурное чудо' } },
  { value: 'Cultural Center', label: { en: 'Cultural Center', uz: 'Madaniyat markazi', ru: 'Культурный центр' } },
]

/** Select items for a translated option list, with an "All ..." entry in front. */
const toItems = (all: string, options: { value: string; label: Tr }[], tr: (t: Tr) => string) => [
  { id: 'all', label: all },
  ...options.map((o) => ({ id: o.value, label: tr(o.label) })),
]

type GeoStatus = 'detecting' | 'unsupported' | 'denied' | 'ready'
type Sort = 'default' | 'distance' | 'rating' | 'name'

export default function AttractionsList() {
  const navigate = useNavigate()
  const { tr } = useI18n()
  const [all, setAll] = useState<Attraction[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [position, setPosition] = useState<LatLng | null>(null)
  const [geo, setGeo] = useState<GeoStatus>(() => (typeof navigator !== 'undefined' && navigator.geolocation ? 'detecting' : 'unsupported'))

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

    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (p) => { setPosition({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeo('ready') },
      () => setGeo('denied'),
      { enableHighAccuracy: false, timeout: 2500, maximumAge: 300000 },
    )
  }, [])

  const withDistance: MapAttraction[] = useMemo(
    () => all.map((a) => ({ ...a, _distance: position ? distanceKm(position, { lat: a.latitude, lng: a.longitude }) : undefined })),
    [all, position],
  )

  const cityItems = useMemo(() => toItems(tr({ en: 'All Cities', uz: 'Barcha shaharlar', ru: 'Все города' }), CITIES, tr), [tr])
  const categoryItems = useMemo(() => toItems(tr({ en: 'All Categories', uz: 'Barcha kategoriyalar', ru: 'Все категории' }), CATEGORIES, tr), [tr])
  const sortItems = useMemo(
    () => [
      { id: 'default', label: tr({ en: 'Default', uz: 'Odatiy', ru: 'По умолчанию' }) },
      { id: 'distance', label: tr({ en: 'Distance', uz: 'Masofa', ru: 'Расстояние' }) },
      { id: 'rating', label: tr({ en: 'Top Rated', uz: 'Eng yuqori baho', ru: 'Лучшие по рейтингу' }) },
      { id: 'name', label: tr({ en: 'Name (A–Z)', uz: 'Nomi (A–Z)', ru: 'Название (А–Я)' }) },
    ],
    [tr],
  )

  const { list, statusText } = useMemo(() => {
    let radius: number | 'all' = 'all'
    let text = tr({ en: '📍 Location disabled — showing all attractions', uz: "📍 Joylashuv o'chiq — barcha diqqatga sazovor joylar ko'rsatilmoqda", ru: '📍 Геолокация отключена — показаны все достопримечательности' })
    if (position) {
      if (withDistance.some((a) => a._distance != null && a._distance <= 10)) {
        radius = 10
        text = tr({ en: '📍 Showing attractions within 10 km of your location', uz: "📍 Joylashuvingizdan 10 km ichidagi joylar ko'rsatilmoqda", ru: '📍 Достопримечательности в радиусе 10 км от вас' })
      } else if (withDistance.some((a) => a._distance != null && a._distance <= 20)) {
        radius = 20
        text = tr({ en: '📍 No attractions within 10 km — showing attractions within 20 km', uz: "📍 10 km ichida joy yo'q — 20 km ichidagilari ko'rsatilmoqda", ru: '📍 В радиусе 10 км ничего нет — показаны объекты в радиусе 20 км' })
      } else {
        text = tr({ en: '📍 No attractions within 20 km — showing all attractions nearby', uz: "📍 20 km ichida joy yo'q — barcha joylar ko'rsatilmoqda", ru: '📍 В радиусе 20 км ничего нет — показаны все объекты' })
      }
    }

    const q = search.trim().toLowerCase()
    const out = withDistance.filter((a) => {
      if (q && !(a.name || '').toLowerCase().includes(q)) return false
      // the city is usually in the address, but fall back to the name for records with a short address
      if (city !== 'all' && !`${a.address ?? ''} ${a.name ?? ''}`.toLowerCase().includes(city)) return false
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
  }, [withDistance, position, search, city, category, sort, nearMe, freeOnly, tr])

  const open = useCallback((id: number) => navigate(`/attractions/${id}`), [navigate])

  const select = useCallback((id: number) => {
    setHighlight(id)
    document.getElementById(`acard-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const toggleNearMe = () => {
    if (!position) { showToast(tr({ en: '📍 Allow location access to use Near Me', uz: "📍 Yaqin atrofni ko'rish uchun joylashuvga ruxsat bering", ru: '📍 Разрешите доступ к геолокации для режима «Рядом»' })); return }
    if (!nearMe) setSort('distance')
    setNearMe(!nearMe)
  }

  return (
    <>
    {/* outside .pg-attractions-list so that page's old `header` styles can't leak into the shared header */}
    <SiteHeader />
    <div className="pg-attractions-list">

      <div className="hero-strip">
        <div className="hero-inner">
          <h1>🏛️ {tr({ en: 'Attractions', uz: 'Diqqatga sazovor joylar', ru: 'Достопримечательности' })} <span>{tr({ en: 'in Uzbekistan', uz: "O'zbekistonda", ru: 'Узбекистана' })}</span></h1>
          <p>{tr({ en: 'Explore historical sites, monuments and cultural landmarks along the Silk Road', uz: "Ipak yo'li bo'ylab tarixiy joylar, yodgorliklar va madaniy obidalarni kashf eting", ru: 'Откройте исторические места, памятники и культурные достопримечательности Шёлкового пути' })}</p>
        </div>
      </div>

      <div className="al-container">
        <div className="location-status">
          <div className={`loc-dot${position ? ' active' : ''}`} />
          <span>{geo === 'detecting' ? tr({ en: 'Detecting your location…', uz: 'Joylashuvingiz aniqlanmoqda…', ru: 'Определяем ваше местоположение…' }) : geo === 'unsupported' ? tr({ en: 'Location not supported', uz: "Joylashuv qo'llab-quvvatlanmaydi", ru: 'Геолокация не поддерживается' }) : statusText}</span>
        </div>

        <div className="toolbar">
          <div className="search-wrap">
            <Input
              size="md"
              icon={SearchLg}
              aria-label={tr({ en: 'Search attractions…', uz: 'Qidirish…', ru: 'Поиск…' })}
              placeholder={tr({ en: 'Search attractions…', uz: 'Qidirish…', ru: 'Поиск…' })}
              value={search}
              onChange={setSearch}
            />
          </div>
          <div className="filter-group">
            <Select
              label={tr({ en: 'City', uz: 'Shahar', ru: 'Город' })}
              size="md"
              selectedKey={city}
              onSelectionChange={(key) => key != null && setCity(String(key))}
              items={cityItems}
            >
              {(item) => <Select.Item id={item.id} label={item.label} />}
            </Select>
          </div>
          <div className="filter-group">
            <Select
              label={tr({ en: 'Category', uz: 'Kategoriya', ru: 'Категория' })}
              size="md"
              selectedKey={category}
              onSelectionChange={(key) => key != null && setCategory(String(key))}
              items={categoryItems}
            >
              {(item) => <Select.Item id={item.id} label={item.label} />}
            </Select>
          </div>
          <div className="filter-group">
            <Select
              label={tr({ en: 'Sort By', uz: 'Saralash', ru: 'Сортировка' })}
              size="md"
              selectedKey={sort}
              onSelectionChange={(key) => key != null && setSort(String(key) as Sort)}
              items={sortItems}
            >
              {(item) => <Select.Item id={item.id} label={item.label} />}
            </Select>
          </div>
          <div className="quick-btns">
            <Button
              size="md"
              color={nearMe ? 'primary' : 'secondary'}
              iconLeading={NavigationPointer01}
              onPress={toggleNearMe}
            >
              {tr({ en: 'Near Me', uz: 'Yaqin atrofda', ru: 'Рядом' })}
            </Button>
            <Button
              size="md"
              color={freeOnly ? 'primary' : 'secondary'}
              iconLeading={Gift01}
              onPress={() => setFreeOnly(!freeOnly)}
            >
              {tr({ en: 'Free Entry', uz: 'Bepul kirish', ru: 'Бесплатно' })}
            </Button>
          </div>
        </div>

        <div className="results-bar">
          <div className="results-count">
            {status === 'loading' ? tr({ en: 'Loading…', uz: 'Yuklanmoqda…', ru: 'Загрузка…' }) : status === 'ready' ? <><strong>{list.length}</strong> {tr({ en: list.length === 1 ? 'attraction found' : 'attractions found', uz: 'ta joy topildi', ru: 'найдено' })}</> : ''}
          </div>
          <div className="view-toggle">
            <Button
              size="sm"
              color={view === 'grid' ? 'primary' : 'secondary'}
              iconLeading={Grid01}
              aria-label={tr({ en: 'Grid view', uz: "To'r ko'rinishi", ru: 'Сетка' })}
              onPress={() => setView('grid')}
            />
            <Button
              size="sm"
              color={view === 'list' ? 'primary' : 'secondary'}
              iconLeading={List}
              aria-label={tr({ en: 'List view', uz: "Ro'yxat ko'rinishi", ru: 'Список' })}
              onPress={() => setView('list')}
            />
          </div>
        </div>

        <Button
          size="lg"
          color="secondary"
          className="mb-3.5 w-full justify-between"
          iconTrailing={mapOpen ? ChevronUp : ChevronDown}
          onPress={() => setMapOpen(!mapOpen)}
        >
          <span className="flex items-center gap-2">
            <Map01 aria-hidden="true" className="size-5 text-fg-quaternary" />
            {mapOpen ? tr({ en: 'Hide Map', uz: 'Xaritani yashirish', ru: 'Скрыть карту' }) : tr({ en: 'Show Attractions on Map', uz: "Xaritada ko'rsatish", ru: 'Показать на карте' })}
          </span>
        </Button>
        <div className={`map-panel${mapOpen ? '' : ' collapsed'}`}>
          {mapOpen && status === 'ready' && (
            <AttractionsMap attractions={withDistance} userPosition={position} onSelect={select} onOpen={open} />
          )}
        </div>

        <div className={`attractions-grid${view === 'list' ? ' list-view' : ''}`}>
          {status === 'loading' && (
            <div className="loading-state"><div className="spinner" /><p style={{ color: 'var(--text-dim)' }}>{tr({ en: 'Loading attractions…', uz: 'Yuklanmoqda…', ru: 'Загрузка…' })}</p></div>
          )}
          {status === 'error' && (
            <div className="empty-state"><div className="empty-icon">⚠️</div><h3>{tr({ en: 'Could not load attractions', uz: "Ma'lumotlarni yuklab bo'lmadi", ru: 'Не удалось загрузить данные' })}</h3><p>{tr({ en: 'Please check your connection or try again later.', uz: "Ulanishni tekshiring yoki keyinroq urinib ko'ring.", ru: 'Проверьте подключение или повторите попытку позже.' })}</p></div>
          )}
          {status === 'ready' && list.length === 0 && (
            <div className="empty-state"><div className="empty-icon">🏛️</div><h3>{tr({ en: 'No attractions found', uz: 'Hech narsa topilmadi', ru: 'Ничего не найдено' })}</h3><p>{tr({ en: 'Try adjusting your filters or search term.', uz: "Filtrlarni yoki qidiruvni o'zgartirib ko'ring.", ru: 'Измените фильтры или поисковый запрос.' })}</p></div>
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
                {a.price ? <div className="chip-price"><i className="fas fa-ticket-alt" /> ${String(a.price)}</div> : <div className="chip-free"><i className="fas fa-gift" /> {tr({ en: 'Free', uz: 'Bepul', ru: 'Бесплатно' })}</div>}
                {a.is_partner && <div className="chip-partner"><i className="fas fa-crown" /> {tr({ en: 'Partner', uz: 'Hamkor', ru: 'Партнёр' })}</div>}
              </div>
              <div className="attraction-info">
                <div className="attraction-name">{a.name}</div>
                {a.category && <div className="category-tag"><i className="fas fa-landmark" /> {a.category}</div>}
                <div className="attraction-meta">
                  {a.rating != null && <div className="meta-item rating"><i className="fas fa-star" /> {Number(a.rating).toFixed(1)}</div>}
                  {a._distance != null && <div className="meta-item dist"><i className="fas fa-map-marker-alt" /> {a._distance.toFixed(1)} {tr({ en: 'km away', uz: 'km uzoqlikda', ru: 'км от вас' })}</div>}
                  {a.review_count ? <div className="meta-item"><i className="fas fa-comment" /> {a.review_count} {tr({ en: 'reviews', uz: 'sharh', ru: 'отзывов' })}</div> : null}
                </div>
                {a.duration && <div className="duration-row"><i className="fas fa-clock" /> {a.duration}</div>}
                {/* the wrapper keeps the click from also triggering the card's own onClick */}
                <div onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" color="primary" className="w-full" iconLeading={InfoCircle} onPress={() => open(a.id)}>
                    {tr({ en: 'View Details', uz: 'Batafsil', ru: 'Подробнее' })}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
    </>
  )
}
