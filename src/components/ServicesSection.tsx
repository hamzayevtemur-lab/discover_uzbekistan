import { ArrowRight, BookOpen01, Lightbulb02, Map01, MarkerPin01 } from '@untitledui/icons'
import type { FC } from 'react'
import { Link } from 'react-router-dom'
import { useI18n, type Tr } from '../lib/i18n-context'

interface Service {
  to: string
  icon: FC<{ className?: string }>
  title: Tr
  desc: Tr
  cta: Tr
}

const SERVICES: Service[] = [
  {
    to: '/attractions',
    icon: MarkerPin01,
    title: { en: 'Location-Based Discovery', uz: "Joylashuv bo'yicha qidiruv", ru: 'Поиск рядом с вами' },
    desc: { en: 'Find attractions and restaurants near you instantly', uz: 'Yaqin atrofdagi joylarni bir zumda toping', ru: 'Мгновенно находите достопримечательности и рестораны рядом' },
    cta: { en: 'Search nearby', uz: 'Yaqin atrofni qidirish', ru: 'Искать рядом' },
  },
  {
    to: '/routes',
    icon: Map01,
    title: { en: 'Smart Route Planning', uz: 'Aqlli marshrutlar', ru: 'Умное планирование маршрутов' },
    desc: { en: 'Get optimized travel routes between cities', uz: "Shaharlar orasidagi eng yaxshi yo'nalishlarni oling", ru: 'Оптимальные маршруты между городами' },
    cta: { en: 'Plan a route', uz: 'Marshrut tuzish', ru: 'Составить маршрут' },
  },
  {
    to: '/attractions',
    icon: BookOpen01,
    title: { en: 'Historical Context', uz: "Tarixiy ma'lumot", ru: 'Исторический контекст' },
    desc: { en: 'Learn the story behind every monument', uz: 'Har bir yodgorlik tarixini bilib oling', ru: 'Узнайте историю каждого памятника' },
    cta: { en: 'Explore history', uz: "Tarixni o'rganish", ru: 'Узнать историю' },
  },
  {
    to: '/tips',
    icon: Lightbulb02,
    title: { en: 'Local Tips & Advice', uz: 'Mahalliy maslahatlar', ru: 'Советы местных жителей' },
    desc: { en: 'Insider knowledge tourists usually miss', uz: "Sayyohlar odatda o'tkazib yuboradigan mahalliy bilimlar", ru: 'То, что туристы обычно упускают' },
    cta: { en: 'Read the tips', uz: "Maslahatlarni o'qish", ru: 'Читать советы' },
  },
]

/**
 * "Our Services" block of the home page, built with Untitled UI (Tailwind).
 * Render it OUTSIDE the `.pg-home` wrapper: that wrapper's un-layered `* { margin:0; padding:0 }` reset
 * would otherwise cancel the Tailwind spacing utilities used here.
 */
export function ServicesSection() {
  const { tr } = useI18n()

  return (
    <section id="services" className="bg-[#F7F5EE] px-5 py-16 md:py-24">
      <div className="mx-auto max-w-[1400px]">
        <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <p className="m-0 text-sm font-semibold tracking-wider text-[#0E6B3A] uppercase">
            {tr({ en: 'How we help', uz: 'Biz sizga qanday yordam beramiz', ru: 'Чем мы помогаем' })}
          </p>
          <h2 className="m-0 mt-3 text-display-sm font-bold tracking-tight text-[#0E4D2E] md:text-display-md">
            {tr({ en: 'Our Services', uz: 'Bizning xizmatlar', ru: 'Наши услуги' })}
          </h2>
          <p className="m-0 mt-4 text-lg text-[#4A5A50]">
            {tr({
              en: 'Everything you need to plan, navigate and enjoy your trip across Uzbekistan.',
              uz: "O'zbekiston bo'ylab sayohatni rejalashtirish va zavqlanish uchun kerak bo'lgan hamma narsa.",
              ru: 'Всё, что нужно, чтобы спланировать поездку по Узбекистану и получить от неё удовольствие.',
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {SERVICES.map((s) => (
            <article
              key={s.title.en}
              className="group flex flex-col gap-5 rounded-2xl bg-white p-6 ring-1 ring-[#CFE0D3] transition duration-200 ease-out ring-inset hover:-translate-y-1 hover:ring-[#0E6B3A]"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-[#0E6B3A] text-white"><s.icon className="size-6" /></span>

              <div className="flex flex-1 flex-col gap-2">
                <h3 className="m-0 text-lg font-semibold text-[#0E4D2E]">{tr(s.title)}</h3>
                <p className="m-0 text-md text-[#4A5A50]">{tr(s.desc)}</p>
              </div>

              <Link to={s.to} className="inline-flex items-center gap-1.5 self-start text-md font-semibold text-[#0E6B3A] hover:text-[#0B4F2C]">{tr(s.cta)}<ArrowRight className="size-5" /></Link>
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row md:mt-16">
          <Link to="/attractions" className="inline-flex items-center justify-center rounded-full bg-[#0E6B3A] px-7 py-4 text-md font-semibold text-white hover:bg-[#0B4F2C]">
            {tr({ en: 'Explore attractions', uz: 'Diqqatga sazovor joylar', ru: 'Смотреть достопримечательности' })}
          </Link>
          <Link to="/routes" className="inline-flex items-center justify-center rounded-full bg-transparent px-7 py-4 text-md font-semibold text-[#0E6B3A] ring-2 ring-[#0E6B3A] ring-inset hover:bg-[#0E6B3A] hover:text-white">
            {tr({ en: 'Plan your route', uz: 'Marshrut rejalashtirish', ru: 'Спланировать маршрут' })}
          </Link>
        </div>
      </div>
    </section>
  )
}
