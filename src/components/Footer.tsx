import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useI18n, type Tr } from '../lib/i18n-context'

const YEAR = new Date().getFullYear()

const InstagramIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r=".6" />
  </svg>
)

// Put the real profile URLs here; links with an empty URL are not shown.
// Add an `icon` (an inline SVG) and a `handle` for each network you fill in.
const SOCIAL: { icon?: ReactNode; name: string; handle?: string; url: string }[] = [
  { name: 'Facebook', url: '' },
  { icon: <InstagramIcon />, name: 'Instagram', handle: '@discouzbekistan', url: 'https://www.instagram.com/discouzbekistan/' },
  { name: 'Twitter', url: '' },
  { name: 'YouTube', url: '' },
]

interface FooterLink { to: string; label: Tr }

// Footer columns mirror what the site offers: the same cities, categories and
// pages as the home page blocks and the main menu. Edit links here.
const COLUMNS: { title: Tr; links: FooterLink[] }[] = [
  {
    title: { en: 'Destinations', uz: 'Manzillar', ru: 'Направления' },
    links: [
      { to: '/cities/samarkand', label: { en: 'Samarkand', uz: 'Samarqand', ru: 'Самарканд' } },
      { to: '/cities/bukhara', label: { en: 'Bukhara', uz: 'Buxoro', ru: 'Бухара' } },
      { to: '/cities/khiva', label: { en: 'Khiva', uz: 'Xiva', ru: 'Хива' } },
      { to: '/cities/tashkent', label: { en: 'Tashkent', uz: 'Toshkent', ru: 'Ташкент' } },
      { to: '/cities/shahrisabz', label: { en: 'Shahrisabz', uz: 'Shahrisabz', ru: 'Шахрисабз' } },
      { to: '/cities/fergana', label: { en: 'Fergana', uz: "Farg'ona", ru: 'Фергана' } },
    ],
  },
  {
    title: { en: 'Plan your trip', uz: 'Sayohatingizni rejalashtiring', ru: 'Спланируйте поездку' },
    links: [
      { to: '/attractions', label: { en: 'Historical Sites', uz: 'Tarixiy joylar', ru: 'Исторические места' } },
      { to: '/tips', label: { en: 'Local Tips', uz: 'Mahalliy maslahatlar', ru: 'Советы местных жителей' } },
      { to: '/guides', label: { en: 'Local Guides', uz: "Mahalliy qo'llanma", ru: 'Местные гиды' } },
      { to: '/travel-agencies', label: { en: 'Travel Agencies', uz: 'Sayohat agentliklari', ru: 'Турагентства' } },
      { to: '/emergency', label: { en: 'Emergency Contacts', uz: 'Favqulodda raqamlar', ru: 'Экстренные службы' } },
    ],
  },
  {
    title: { en: 'Eat & Stay', uz: 'Ovqat va turar joy', ru: 'Еда и жильё' },
    links: [
      { to: '/hotels', label: { en: 'Hotels & Stays', uz: 'Mehmonxonalar', ru: 'Отели' } },
      { to: '/restaurants', label: { en: 'Restaurants', uz: 'Restoranlar', ru: 'Рестораны' } },
      { to: '/routes', label: { en: 'Transportation', uz: 'Transport', ru: 'Транспорт' } },
    ],
  },
  {
    title: { en: 'Company', uz: 'Kompaniya', ru: 'Компания' },
    links: [
      { to: '/about', label: { en: 'About Us', uz: 'Biz haqimizda', ru: 'О нас' } },
      { to: '/#contact', label: { en: 'Contact', uz: 'Aloqa', ru: 'Контакты' } },
      { to: '/partner', label: { en: 'Partner With Us', uz: 'Biz bilan hamkorlik qiling', ru: 'Стать партнёром' } },
    ],
  },
]

export function Footer() {
  const { tr } = useI18n()
  const social = SOCIAL.filter((s) => s.url)
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-head">
          <div>
            <div className="footer-brand">Discover Uzbekistan</div>
            <p className="footer-tag">
              {tr({
                en: "Your complete travel companion for exploring Uzbekistan's ancient cities, culture & cuisine",
                uz: 'Oʻzbekistonning qadimiy shaharlari, madaniyati va taomi bilan tanishish uchun toʻliq sayohat hamrohingiz',
                ru: 'Ваш полный путеводитель по древним городам, культуре и кухне Узбекистана',
              })}
            </p>
          </div>
          <a href="/#contact" className="footer-cta">{tr({ en: 'Contact Us Now', uz: "Hozir bog'laning", ru: 'Связаться сейчас' })}</a>
        </div>

        <div className="footer-content">
          {COLUMNS.map((col) => (
            <div className="footer-section" key={col.title.en}>
              <h3>{tr(col.title)}</h3>
              <ul>
                {col.links.map((l) => (
                  <li key={l.to}>
                    {l.to.startsWith('/#') ? <a href={l.to}>{tr(l.label)}</a> : <Link to={l.to}>{tr(l.label)}</Link>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {social.length > 0 && (
            <div className="footer-section">
              <h3>{tr({ en: 'Follow Us', uz: 'Bizni kuzating', ru: 'Мы в соцсетях' })}</h3>
              <div className="footer-socials">
                {social.map((x) => (
                  <a key={x.name} className="footer-social" href={x.url} target="_blank" rel="noreferrer">
                    {x.icon && <span className="footer-social-icon">{x.icon}</span>}
                    <span className="footer-social-text">
                      <strong>{x.name}</strong>
                      {x.handle && <small>{x.handle}</small>}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="footer-bottom">
          <p>
            &copy; {YEAR} Discover Travel Uzbekistan.{' '}
            {tr({ en: 'All rights reserved.', uz: 'Barcha huquqlar himoyalangan.', ru: 'Все права защищены.' })}
          </p>
          <div className="footer-legal">
            <Link to="/privacy">{tr({ en: 'Privacy Policy', uz: 'Maxfiylik siyosati', ru: 'Политика конфиденциальности' })}</Link>
            <Link to="/terms">{tr({ en: 'Terms of Service', uz: 'Foydalanish shartlari', ru: 'Условия использования' })}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
