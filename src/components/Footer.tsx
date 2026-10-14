import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'

export function Footer() {
  const { tr } = useI18n()
  return (
    <footer>
      <div className="footer-content">
        <div className="footer-section">
          <h3>{tr({ en: 'Destinations', uz: 'Manzillar', ru: 'Направления' })}</h3>
          <ul>
            <li><a href="#">{tr({ en: 'Samarkand', uz: 'Samarqand' })}</a></li>
            <li><a href="#">{tr({ en: 'Bukhara', uz: 'Buxoro' })}</a></li>
            <li><a href="#">{tr({ en: 'Khiva', uz: 'Xiva' })}</a></li>
            <li><a href="#">{tr({ en: 'Tashkent', uz: 'Toshkent' })}</a></li>
          </ul>
        </div>
        <div className="footer-section">
          <h3>{tr({ en: 'Services', uz: 'Xizmatlar', ru: 'Услуги' })}</h3>
          <ul>
            <li><Link to="/hotels">{tr({ en: 'Hotels', uz: 'Mehmonxonalar' })}</Link></li>
            <li><Link to="/restaurants">{tr({ en: 'Restaurants', uz: 'Restoranlar' })}</Link></li>
            <li><Link to="/routes">{tr({ en: 'Transportation', uz: 'Transport' })}</Link></li>
            <li><Link to="/guides">{tr({ en: 'Tour Guides', uz: 'Gidlar' })}</Link></li>
          </ul>
        </div>
        <div className="footer-section">
          <h3>{tr({ en: 'Company', uz: 'Kompaniya' })}</h3>
          <ul>
            <li><a href="#">{tr({ en: 'About Us', uz: 'Biz haqimizda', ru: 'О нас' })}</a></li>
            <li><a href="#contact">{tr({ en: 'Contact', uz: 'Aloqa', ru: 'Контакты' })}</a></li>
            <li><a href="#">{tr({ en: 'Privacy Policy', uz: 'Maxfiylik siyosati' })}</a></li>
            <li><a href="#">{tr({ en: 'Terms of Service', uz: 'Foydalanish shartlari' })}</a></li>
          </ul>
        </div>
        <div className="footer-section">
          <h3>{tr({ en: 'Follow Us', uz: 'Bizni kuzating' })}</h3>
          <ul>
            <li><a href="#">📘 Facebook</a></li>
            <li><a href="https://www.instagram.com/discouzbekistan/" target="_blank" rel="noreferrer">📷 Instagram</a></li>
            <li><a href="#">🐦 Twitter</a></li>
            <li><a href="#">📹 YouTube</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>
          &copy; {new Date().getFullYear()} Discover Travel Uzbekistan.{' '}
          {tr({ en: 'All rights reserved.', uz: 'Barcha huquqlar himoyalangan.' })}
        </p>
      </div>
    </footer>
  )
}
