import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n, type Tr } from '../lib/i18n-context'
import type { Lang } from '../types'

const NAV: { href: string; label: Tr }[] = [
  { href: '#home', label: { en: 'Home', uz: 'Bosh sahifa', ru: 'Главная' } },
  { href: '#about', label: { en: 'About Us', uz: 'Biz haqimizda', ru: 'О нас' } },
  { href: '#categories', label: { en: 'Historical Information', uz: "Tarixiy ma'lumotlar", ru: 'Историческая информация' } },
  { href: '#featured', label: { en: 'Destinations', uz: 'Manzillar', ru: 'Направления' } },
  { href: '#services', label: { en: 'Services', uz: 'Xizmatlar', ru: 'Услуги' } },
  { href: '#contact', label: { en: 'Contact', uz: 'Aloqa', ru: 'Контакты' } },
]

// the original toggles en <-> uz; ru is available through the dictionary as well
const NEXT_LANG: Record<Lang, Lang> = { en: 'uz', uz: 'ru', ru: 'en' }
const LANG_LABEL: Record<Lang, string> = { en: 'English', uz: "O'zbekcha", ru: 'Русский' }

export function Header() {
  const { lang, setLang, tr } = useI18n()
  const [open, setOpen] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [open])

  return (
    <header>
      <div className="header-content" ref={headerRef}>
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
          <img
            src="/images/logo.png"
            alt="Discover Travel Uzbekistan"
            style={{ height: 40, width: 40, objectFit: 'cover', borderRadius: '50%', flexShrink: 0 }}
          />
          <span style={{ fontSize: '0.9rem' }}>
            {tr({ en: 'DISCOVER TRAVEL UZBEKISTAN', uz: "O'ZBEKISTONNI KASHF ETING", ru: 'ОТКРОЙТЕ УЗБЕКИСТАН' })}
          </span>
        </Link>

        <button className="hamburger" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
          {open ? '✕' : '☰'}
        </button>

        <ul id="mainNav" className={open ? 'active' : ''}>
          {NAV.map((n) => (
            <li key={n.href}>
              <a href={n.href} onClick={() => setOpen(false)}>
                {tr(n.label)}
              </a>
            </li>
          ))}
        </ul>

        <div className="header-right">
          <button className="lang-toggle" onClick={() => setLang(NEXT_LANG[lang as Lang] ?? 'en')}>
            <span>{LANG_LABEL[NEXT_LANG[lang as Lang] ?? 'en']}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
