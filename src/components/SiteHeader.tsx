import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { UzLogo } from './UzLogo'
import { FLAGS } from './UzFlags'
import { useI18n } from '../lib/i18n-context'
import type { Lang } from '../types'
import '../styles/uz-top.css'

interface NavItem { to: string; internal?: boolean }
// Destinations, Itineraries, News scroll to sections on the home page; the rest open their pages.
const NAV: NavItem[] = [
  { to: '#featured' },
  { to: '/attractions', internal: true },
  { to: '/restaurants', internal: true },
  { to: '#itineraries' },
  { to: '#news' },
]

/** Texts used by the header (shared by every page). */
interface HeaderCopy {
  title: string
  nav: string[]
  langLabel: string
}

export const HEADER_COPY: Record<Lang, HeaderCopy> = {
  uz: {
    title: 'Oʻzbekistonni Kashf Eting',
    nav: ['Manzillar', 'Nima qilish mumkin', 'Ovqat va turar joy', 'Marshrutlar', 'Yangiliklar va tadbirlar'],
    langLabel: 'Til: Oʻzbek',
  },
  ru: {
    title: 'Откройте Узбекистан',
    nav: ['Направления', 'Чем заняться', 'Еда и жильё', 'Маршруты', 'Новости и события'],
    langLabel: 'Язык: Русский',
  },
  en: {
    title: 'Discover Uzbekistan',
    nav: ['Destinations', 'Things to do', 'Eat & Stay', 'Itineraries', 'News & Events'],
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

interface SiteHeaderProps {
  /** 'overlay' sits on top of the hero (home page, rendered inside `.uz-root`); 'solid' is a sticky bar for inner pages. */
  variant?: 'overlay' | 'solid'
}

/**
 * The one site-wide header: logo, main nav, flag language switcher, burger menu.
 * Follows the Discover New Zealand interaction model: transparent over the hero,
 * transitions smoothly into a sticky frosted navigation bar upon scrolling.
 */
export function SiteHeader({ variant = 'solid' }: SiteHeaderProps) {
  const { lang, setLang } = useI18n()
  const t = HEADER_COPY[lang]
  const onHome = useLocation().pathname === '/'

  const [scrolled, setScrolled] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [compact, setCompact] = useState(false)

  const headerRef = useRef<HTMLElement>(null)
  const navBoxRef = useRef<HTMLDivElement>(null)
  const langBtnRef = useRef<HTMLButtonElement>(null)

  // Track window scroll for smooth sticky transformation
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
    setNavOpen(false)
    if (to.startsWith('#')) {
      if (onHome) {
        const target = document.querySelector(to)
        if (target) {
          e.preventDefault()
          target.scrollIntoView({ behavior: 'smooth' })
          window.history.pushState(null, '', to)
        }
      }
    }
  }

  const isSolid = variant === 'solid'
  const isScrolled = scrolled || isSolid
  const headerClass = [
    'site-header',
    compact ? 'compact' : '',
    isScrolled ? 'is-scrolled' : 'is-transparent',
    isSolid ? 'is-solid' : 'is-overlay',
  ].filter(Boolean).join(' ')

  const header = (
      <header ref={headerRef} className={headerClass}>
        <div className="nav" ref={navBoxRef}>
          <Link className="brand" to="/" aria-label="Discover Uzbekistan">
            <UzLogo />
          </Link>

          <nav aria-label="Main">
            <ul id="navList" className={compact && navOpen ? 'open' : ''} onClick={(e) => e.stopPropagation()}>
              {NAV.map((item, i) => (
                <li key={item.to}>
                  {item.internal ? (
                    <Link to={item.to} onClick={() => setNavOpen(false)}>{t.nav[i]}</Link>
                  ) : (
                    <a
                      href={onHome ? item.to : `/${item.to}`}
                      onClick={(e) => handleAnchorClick(e, item.to)}
                    >
                      {t.nav[i]}
                    </a>
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
  )

  // the page-scoped stylesheet lives under `.uz-root`, so inner pages need their own wrapper
  return variant === 'solid' ? <div className="uz-root uz-root--bar">{header}</div> : header
}
