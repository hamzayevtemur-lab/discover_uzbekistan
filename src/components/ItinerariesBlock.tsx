import { Link } from 'react-router-dom'
import { ArrowRight, Calendar, Compass, Train } from '@untitledui/icons'
import { useI18n, type Tr } from '../lib/i18n-context'
import './ItinerariesBlock.css'

const SparklesIcon = () => (
  <svg className="itin-eyebrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
  </svg>
)

export interface Itinerary {
  id: string
  title: Tr
  duration: Tr
  style: Tr
  routeStops: string[]
  badge: Tr
  image: string
  highlights: Tr[]
  pace: Tr
}

const ITINERARIES: Itinerary[] = [
  {
    id: 'classic-silk-road',
    title: {
      en: 'Classic Silk Road Highlights',
      uz: 'Klassik Ipak Yoʻli Moʻjizalari',
      ru: 'Классические жемчужины Шёлкового пути',
    },
    duration: {
      en: '7 Days • 6 Nights',
      uz: '7 Kun • 6 Kecha',
      ru: '7 Дней • 6 Ночей',
    },
    style: {
      en: 'High-Speed Rail • Cultural Heritage',
      uz: 'Tezyurar Poyezd • Madaniy Meros',
      ru: 'Скоростной поезд • Культурное наследие',
    },
    routeStops: ['Tashkent', 'Samarkand', 'Bukhara'],
    badge: {
      en: 'Most Popular',
      uz: 'Eng Ommabop',
      ru: 'Самый популярный',
    },
    image: '/images/Shah-i-Zinda.jpg',
    pace: {
      en: 'Leisurely pace with 2 nights in each historic capital',
      uz: 'Har bir tarixiy shaharda 2 kechalik qulay sur’at',
      ru: 'Неспешный темп с 2 ночами в каждом городе',
    },
    highlights: [
      {
        en: 'Afrosiyob express rail journey between cities',
        uz: 'Shaharlararo Afrosiyob tezyurar poyezdi sayohati',
        ru: 'Поездки на скоростном экспрессе «Афросиёб»',
      },
      {
        en: 'Registan Square illuminated at twilight',
        uz: 'Kechki chiroqlarda porlagan Registon maydoni',
        ru: 'Площадь Регистан в вечерней иллюминации',
      },
      {
        en: 'Centuries-old domed trading bazaars in Bukhara',
        uz: 'Buxoroning qadimiy gumbazli savdo rastalari',
        ru: 'Купольные торговые ряды старой Бухары',
      },
    ],
  },
  {
    id: 'grand-oasis-journey',
    title: {
      en: 'Grand Oasis & Desert Fortresses',
      uz: 'Katta Voha va Sahro Qal’alari',
      ru: 'Великий оазис и пустынные крепости',
    },
    duration: {
      en: '10 Days • 9 Nights',
      uz: '10 Kun • 9 Kecha',
      ru: '10 Дней • 9 Ночей',
    },
    style: {
      en: 'Complete Circuit • 4 UNESCO Cities',
      uz: 'Toʻliq Yoʻnalish • 4 ta YUNESKO Shahri',
      ru: 'Полный маршрут • 4 города ЮНЕСКО',
    },
    routeStops: ['Tashkent', 'Samarkand', 'Bukhara', 'Khiva'],
    badge: {
      en: 'Signature Grand Tour',
      uz: 'Asosiy Katta Tur',
      ru: 'Фирменный гранд-тур',
    },
    image: '/images/itchanqala.jpg',
    pace: {
      en: 'Comprehensive route tracing ancient camel caravan paths',
      uz: 'Qadimiy karvon yoʻllarini qamragan toʻliq marshrut',
      ru: 'Насыщенный маршрут по древним караванным путям',
    },
    highlights: [
      {
        en: 'Full day walking inside the walled museum city of Ichan-Kala',
        uz: 'Ichan Qal’a ochiq osmon ostidagi muzey shahrida toʻliq kun',
        ru: 'Целый день в городе-крепости Ичан-Кала',
      },
      {
        en: 'Kyzylkum desert crossing along the historic Oxus river',
        uz: 'Amudaryo boʻylab Qizilqum sahrosini kesib oʻtish',
        ru: 'Переезд через пустыню Кызылкум вдоль Амударьи',
      },
      {
        en: 'Royal Ark fortress & Kalyan Mosque ensemble',
        uz: 'Buxoro Arki va Poi Kalon majmuasi',
        ru: 'Крепость Арк и ансамбль Пои-Калян',
      },
    ],
  },
  {
    id: 'fergana-craft-route',
    title: {
      en: 'Fergana Valley: Silk & Ceramics',
      uz: 'Fargʻona Vodiysi: Ipak va Kulolchilik',
      ru: 'Ферганская долина: Шёлк и керамика',
    },
    duration: {
      en: '5 Days • 4 Nights',
      uz: '5 Kun • 4 Kecha',
      ru: '5 Дней • 4 Ночей',
    },
    style: {
      en: 'Master Artisans & Mountain Passes',
      uz: 'Mohir Hunarmandlar va Togʻ Dovoni',
      ru: 'Ремесленные династии и горные перевалы',
    },
    routeStops: ['Tashkent', 'Kokand', 'Rishtan', 'Margilan'],
    badge: {
      en: 'Craft & Culture',
      uz: 'Hunarmandchilik',
      ru: 'Ремёсла и традиции',
    },
    image: '/images/RishtanCeramicsCenter.jpg',
    pace: {
      en: 'Intimate immersion into generational craft workshops',
      uz: 'Avloddan-avlodga oʻtgan ustaxonalar bilan yaqindan tanishuv',
      ru: 'Погружение в мастерские потомственных ремесленников',
    },
    highlights: [
      {
        en: 'Authentic silk spinning & ikat dyeing at Yodgorlik',
        uz: 'Yodgorlik fabrikasida ipak toʻqish va abrbandchilik',
        ru: 'Традиционное шёлкоткачество и икат на фабрике «Ёдгорлик»',
      },
      {
        en: 'Hands-on ceramics masterclass with Rishtan usto masters',
        uz: 'Rishton ustalari bilan bevosita kulolchilik master-klassi',
        ru: 'Мастер-класс у потомственных гончаров Риштана',
      },
      {
        en: 'Scenic crossing of the 2,268m Kamchik Mountain Pass',
        uz: '2,268 metr balandlikdagi Qamchiq dovonidan manzarali oʻtish',
        ru: 'Живописный перевал Камчик на высоте 2268 метров',
      },
    ],
  },
  {
    id: 'yurt-stargazing',
    title: {
      en: 'Desert Yurts & Ancient Astronomy',
      uz: 'Sahro Oʻtovlari va Qadimiy Falakiyot',
      ru: 'Ночи в юртах и древняя астрономия',
    },
    duration: {
      en: '8 Days • 7 Nights',
      uz: '8 Kun • 7 Kecha',
      ru: '8 Дней • 7 Ночей',
    },
    style: {
      en: 'Desert Safari • Lake Aydarkul',
      uz: 'Sahro Safari • Aydarkoʻl',
      ru: 'Сафари в пустыне • Озеро Айдаркуль',
    },
    routeStops: ['Samarkand', 'Nurata', 'Aydarkul', 'Bukhara'],
    badge: {
      en: 'Off The Beaten Track',
      uz: 'Noyob Marshrut',
      ru: 'Вдали от толпы',
    },
    image: '/images/bukhara.jpg',
    pace: {
      en: 'Blends monument exploration with open desert tranquility',
      uz: 'Tarixiy obidalar va sahro sokinligining mukammal uygʻunligi',
      ru: 'Сочетание монументальной архитектуры и тишины пустыни',
    },
    highlights: [
      {
        en: 'Stargazing around desert campfire with nomad songs',
        uz: 'Gulxan atrofida choʻl qoʻshiqlari va yulduzlar jilosi',
        ru: 'Ночь у костра под звёздным небом пустыни',
      },
      {
        en: 'Camel trekking and lakeside swimming at Aydarkul',
        uz: 'Aydarkoʻl sohilida tuyada sayr va choʻmilish',
        ru: 'Прогулки на верблюдах и отдых у озера Айдаркуль',
      },
      {
        en: 'Ulugh Beg astronomical observatory & Chashma holy spring',
        uz: 'Ulugʻbek rasadxonasi va muqaddas Chashma bulogʻi',
        ru: 'Обсерватория Улугбека и священный источник Чашма',
      },
    ],
  },
]

export default function ItinerariesBlock() {
  const { tr } = useI18n()

  return (
    <section id="itineraries" className="itin-section" aria-labelledby="itin-title">
      <div className="itin-container">
        <div className="itin-head">
          <p className="itin-eyebrow">
            <SparklesIcon />
            {tr({
              en: 'Curated Silk Road Journeys',
              uz: 'Tavsiya etilgan Ipak Yoʻli marshrutlari',
              ru: 'Продуманные маршруты по Шёлковому пути',
            })}
          </p>
          <h2 id="itin-title" className="itin-title">
            {tr({
              en: 'Start with an itinerary',
              uz: 'Marshrutdan boshlang',
              ru: 'Начните с готового маршрута',
            })}
          </h2>
          <p className="itin-subtitle">
            {tr({
              en: 'Multi-day journeys designed by local specialists with realistic pacing, high-speed rail connections, and authentic cultural access.',
              uz: 'Mahalliy mutaxassislar tomonidan qulay surʼat, tezyurar poyezdlar va chuqur madaniy tajriba bilan rejalashtirilgan sayohatlar.',
              ru: 'Многодневные путешествия, составленные местными экспертами с комфортным темпом, скоростными поездами и живой культурой.',
            })}
          </p>
        </div>

        <div className="itin-grid">
          {ITINERARIES.map((item) => (
            <article key={item.id} className="itin-card">
              <div className="itin-media">
                <img src={item.image} alt={tr(item.title)} className="itin-img" loading="lazy" />
                <div className="itin-media-overlay" />
                <span className="itin-badge">{tr(item.badge)}</span>
                <div className="itin-media-meta">
                  <span className="itin-chip">
                    <Calendar className="itin-chip-icon" />
                    {tr(item.duration)}
                  </span>
                  <span className="itin-chip itin-chip--subtle">
                    <Train className="itin-chip-icon" />
                    {tr(item.style)}
                  </span>
                </div>
              </div>

              <div className="itin-content">
                <div className="itin-route">
                  {item.routeStops.map((stop, idx) => (
                    <span key={stop} className="itin-stop-wrap">
                      <span className="itin-stop">{stop}</span>
                      {idx < item.routeStops.length - 1 && <span className="itin-arrow">→</span>}
                    </span>
                  ))}
                </div>

                <h3 className="itin-card-title">{tr(item.title)}</h3>
                <p className="itin-pace">{tr(item.pace)}</p>

                <ul className="itin-highlights">
                  {item.highlights.map((h, i) => (
                    <li key={i} className="itin-highlight-item">
                      <span className="itin-check">✓</span>
                      <span>{tr(h)}</span>
                    </li>
                  ))}
                </ul>

                <div className="itin-footer">
                  <Link to="/routes" className="itin-btn-primary">
                    {tr({
                      en: 'View full itinerary',
                      uz: 'Toʻliq marshrutni koʻrish',
                      ru: 'Посмотреть маршрут',
                    })}
                    <ArrowRight className="itin-btn-icon" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="itin-bottom-banner">
          <div className="itin-bottom-text">
            <h4>
              {tr({
                en: 'Looking for a tailor-made route built around your dates?',
                uz: 'Oʻz sanalaringizga moslashtirilgan maxsus marshrut istaysizmi?',
                ru: 'Хотите индивидуальный маршрут под ваши даты?',
              })}
            </h4>
            <p>
              {tr({
                en: 'Our local specialists customize pacing, private drivers, boutique hotels and train tickets for your exact group.',
                uz: 'Mahalliy mutaxassislarimiz sur’at, shaxsiy haydovchi, butik mehmonxonalar va chiptalarni sizga moslab beradi.',
                ru: 'Наши эксперты подберут темп, индивидуальный транспорт, аутентичные отели и билеты специально для вашей поездки.',
              })}
            </p>
          </div>
          <a href="#contact" className="itin-bottom-btn">
            <Compass className="itin-btn-icon" />
            {tr({
              en: 'Customize with a local specialist',
              uz: 'Mutaxassis bilan moslashtirish',
              ru: 'Собрать тур с экспертом',
            })}
          </a>
        </div>
      </div>
    </section>
  )
}
