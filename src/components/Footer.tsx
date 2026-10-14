import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n-context'

const YEAR = new Date().getFullYear()

// Put the real profile URLs here; links with an empty URL are not shown.
const SOCIAL: { icon: string; name: string; url: string }[] = [
  { icon: '📘', name: 'Facebook', url: '' },
  { icon: '📷', name: 'Instagram', url: 'https://www.instagram.com/discouzbekistan/' },
  { icon: '🐦', name: 'Twitter', url: '' },
  { icon: '📹', name: 'YouTube', url: '' },
]

export function Footer() {
  const { tr } = useI18n()
  const social = SOCIAL.filter((s) => s.url)
  return (
    <footer>
      <div className="footer-content">
        <div className="footer-section">
          <h3>{tr({ en: 'Destinations', uz: 'Manzillar', ru: 'Направления' })}</h3>
          <ul>
            <li><Link to="/cities/samarkand">{tr({ en: 'Samarkand', uz: 'Samarqand', ru: 'Самарканд' })}</Link></li>
            <li><Link to="/cities/bukhara">{tr({ en: 'Bukhara', uz: 'Buxoro', ru: 'Бухара' })}</Link></li>
            <li><Link to="/cities/khiva">{tr({ en: 'Khiva', uz: 'Xiva', ru: 'Хива' })}</Link></li>
            <li><Link to="/cities/tashkent">{tr({ en: 'Tashkent', uz: 'Toshkent', ru: 'Ташкент' })}</Link></li>
          </ul>
        </div>
        <div className="footer-section">
          <h3>{tr({ en: 'Services', uz: 'Xizmatlar', ru: 'Услуги' })}</h3>
          <ul>
            <li><Link to="/hotels">{tr({ en: 'Hotels', uz: 'Mehmonxonalar', ru: 'Отели' })}</Link></li>
            <li><Link to="/restaurants">{tr({ en: 'Restaurants', uz: 'Restoranlar', ru: 'Рестораны' })}</Link></li>
            <li><Link to="/routes">{tr({ en: 'Transportation', uz: 'Transport', ru: 'Транспорт' })}</Link></li>
            <li><Link to="/guides">{tr({ en: 'Tour Guides', uz: 'Gidlar', ru: 'Гиды' })}</Link></li>
          </ul>
        </div>
        <div className="footer-section">
          <h3>{tr({ en: 'Company', uz: 'Kompaniya', ru: 'Компания' })}</h3>
          <ul>
            <li><Link to="/about">{tr({ en: 'About Us', uz: 'Biz haqimizda', ru: 'О нас' })}</Link></li>
            <li><a href="/#contact">{tr({ en: 'Contact', uz: 'Aloqa', ru: 'Контакты' })}</a></li>
            <li><Link to="/privacy">{tr({ en: 'Privacy Policy', uz: 'Maxfiylik siyosati', ru: 'Политика конфиденциальности' })}</Link></li>
            <li><Link to="/terms">{tr({ en: 'Terms of Service', uz: 'Foydalanish shartlari', ru: 'Условия использования' })}</Link></li>
          </ul>
        </div>
        {social.length > 0 && (
          <div className="footer-section">
            <h3>{tr({ en: 'Follow Us', uz: 'Bizni kuzating', ru: 'Мы в соцсетях' })}</h3>
            <ul>
              {social.map((s) => (
                <li key={s.name}>
                  <a href={s.url} target="_blank" rel="noreferrer">{s.icon} {s.name}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="footer-bottom">
        <p>
          &copy; {YEAR} Discover Travel Uzbekistan.{' '}
          {tr({ en: 'All rights reserved.', uz: 'Barcha huquqlar himoyalangan.', ru: 'Все права защищены.' })}
        </p>
      </div>
    </footer>
  )
}
