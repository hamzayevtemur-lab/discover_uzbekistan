import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { UzLogo } from './UzLogo'
import { FLAGS } from './UzFlags'
import { useI18n } from '../lib/i18n-context'
import type { Lang } from '../types'
import '../styles/uz-top.css'

const VIDEO_SRC = 'https://pub-9723ea93395f4ea99c19cd388804aaaf.r2.dev/Uzbekistan.mp4'

interface NavItem { to: string; internal?: boolean }
// Destinations / News scroll to sections on this page; the rest open their pages.
const NAV: NavItem[] = [
  { to: '#featured' },
  { to: '/attractions', internal: true },
  { to: '/restaurants', internal: true },
  { to: '/routes', internal: true },
  { to: '#news' },
]

interface Copy {
  title: string
  nav: string[]
  h1: [string, string]
  p: string
  langLabel: string
}

const COPY: Record<Lang, Copy> = {
  uz: {
    title: 'Oʻzbekistonni Kashf Eting',
    nav: ['Manzillar', 'Nima qilish mumkin', 'Ovqat va turar joy', 'Sayohatingizni rejalashtiring', 'Yangiliklar va tadbirlar'],
    h1: ['Ipak Yoʻlining', 'Marvaridini Kashf Eting'],
    p: 'Oʻzbekistonning qadimiy shaharlari, madaniyati va taomi bilan tanishish uchun toʻliq sayohat hamrohingiz',
    langLabel: 'Til: Oʻzbek',
  },
  ru: {
    title: 'Откройте Узбекистан',
    nav: ['Направления', 'Чем заняться', 'Еда и жильё', 'Спланируйте поездку', 'Новости и события'],
    h1: ['Откройте Жемчужину', 'Шёлкового Пути'],
    p: 'Ваш полный путеводитель по древним городам, культуре и кухне Узбекистана',
    langLabel: 'Язык: Русский',
  },
  en: {
    title: 'Discover Uzbekistan',
    nav: ['Destinations', 'Things to do', 'Eat & Stay', 'Plan your trip', 'News & Events'],
    h1: ['Explore the Pearl of', 'the Silk Road'],
    p: "Your complete travel companion for exploring Uzbekistan's ancient cities, culture & cuisine",
    langLabel: 'Language: English',
  },
}

const LANG_MENU: { code: Lang; name: string }[] = [
  { code: 'uz', name: 'Uzbek' },
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
]

function CheckIcon() {
  return (
    <svg className="check" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 7.5l3 3 6-6.5" />
    </svg>
  )
}

/** Header + hero block (replaces the original header and first section of the home page). */
export function UzTop() {
  const { lang, setLang } = useI18n()
  const t = COPY[lang]

  const [langOpen, setLangOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [compact, setCompact] = useState(false)

  const headerRef = useRef<HTMLElement>(null)
  const navBoxRef = useRef<HTMLDivElement>(null)
  const langBtnRef = useRef<HTMLButtonElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    document.title = t.title
  }, [t.title])

  // Switch to the burger menu when the links no longer fit on one line
  const checkFit = useCallback(() => {
    const header = headerRef.current
    const box = navBoxRef.current
    if (!header || !box) return
    header.classList.remove('compact') // measure in the expanded layout
    setNavOpen(false)
    const overflows = box.scrollWidth > box.clientWidth + 1
    header.classList.toggle('compact', overflows)
    setCompact(overflows)
  }, [])

  useLayoutEffect(() => {
    checkFit()
  }, [checkFit, lang]) // labels change width with the language

  useEffect(() => {
    window.addEventListener('resize', checkFit)
    window.addEventListener('load', checkFit)
    document.fonts?.ready.then(checkFit)
    return () => {
      window.removeEventListener('resize', checkFit)
      window.removeEventListener('load', checkFit)
    }
  }, [checkFit])

  // close menus on outside click / Escape
  useEffect(() => {
    const onDoc = () => { setLangOpen(false); setNavOpen(false) }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLangOpen(false)
        setNavOpen(false)
        langBtnRef.current?.focus()
      }
    }
    document.addEventListener('click', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) videoRef.current?.pause()
  }, [])

  return (
    <div className="uz-root">
      <header ref={headerRef}>
        <div className="nav" ref={navBoxRef}>
          <a className="brand" href="#home" aria-label="Discover Uzbekistan">
            <UzLogo />
          </a>

          <nav aria-label="Main">
            <ul id="navList" className={compact && navOpen ? 'open' : ''} onClick={(e) => e.stopPropagation()}>
              {NAV.map((item, i) => (
                <li key={item.to}>
                  {item.internal ? (
                    <Link to={item.to}>{t.nav[i]}</Link>
                  ) : (
                    <a href={item.to} onClick={() => setNavOpen(false)}>{t.nav[i]}</a>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="right">
            <div className="lang-wrap">
              <button
                ref={langBtnRef}
                className="lang"
                type="button"
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                aria-controls="langMenu"
                aria-label={t.langLabel}
                onClick={(e) => { e.stopPropagation(); setNavOpen(false); setLangOpen((o) => !o) }}
              >
                <span>{FLAGS[lang]}</span>
              </button>
              <ul className={`lang-menu${langOpen ? ' open' : ''}`} id="langMenu" role="listbox" aria-label="Language" onClick={(e) => e.stopPropagation()}>
                {LANG_MENU.map((l) => (
                  <li key={l.code} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={lang === l.code}
                      onClick={() => { setLang(l.code); setLangOpen(false) }}
                    >
                      {FLAGS[l.code]}
                      <span className="name">{l.name}</span>
                      <CheckIcon />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <button
              className="burger"
              id="burger"
              type="button"
              aria-label="Menu"
              aria-expanded={navOpen}
              aria-controls="navList"
              onClick={(e) => { e.stopPropagation(); setNavOpen((o) => !o); setLangOpen(false) }}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M1 12C1 11.4477 1.44772 11 2 11H22C22.5523 11 23 11.4477 23 12C23 12.5523 22.5523 13 22 13H2C1.44772 13 1 12.5523 1 12Z" fill="currentColor" />
                <path d="M1 4C1 3.44772 1.44772 3 2 3H22C22.5523 3 23 3.44772 23 4C23 4.55228 22.5523 5 22 5H2C1.44772 5 1 4.55228 1 4Z" fill="currentColor" />
                <path d="M1 20C1 19.4477 1.44772 19 2 19H22C22.5523 19 23 19.4477 23 20C23 20.5523 22.5523 21 22 21H2C1.44772 21 1 20.5523 1 20Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <video ref={videoRef} className="hero-video" autoPlay muted loop playsInline preload="metadata" poster="/images/uzb2.jpg" aria-hidden="true">
            <source src={VIDEO_SRC} type="video/mp4" />
          </video>
          <div className="hero-content">
            <h1>
              {t.h1[0]}
              <br />
              {t.h1[1]}
            </h1>
            <p>{t.p}</p>
          </div>
        </section>
      </main>
    </div>
  )
}
