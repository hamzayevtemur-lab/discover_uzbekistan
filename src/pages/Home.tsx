import { Link, useNavigate } from 'react-router-dom'
import { UzTop } from '../components/UzTop'
import { Footer } from '../components/Footer'
import { NewsSection } from '../components/NewsSection'
import DestinationsBlock from '../components/DestinationsBlock'
import { useI18n, type Tr } from '../lib/i18n'
import '../styles/home.css'

interface Category {
  to: string
  img: string
  alt: string
  title: Tr
  desc: Tr
  btn: Tr
}

const CATEGORIES: Category[] = [
  { to: '/attractions', img: 'historylogo.png', alt: 'history', title: { en: 'Historical Sites', uz: 'Tarixiy joylar' }, desc: { en: 'Explore 2,500+ years of history', uz: "2,500+ yillik tarixni kashf eting" }, btn: { en: 'Explore', uz: "Ko'rish" } },
  { to: '/restaurants', img: 'restaurantlogo.jpg', alt: 'restaurants', title: { en: 'Restaurants', uz: 'Restoranlar' }, desc: { en: 'Taste authentic Uzbek cuisine', uz: "Haqiqiy o'zbek taomlarini tatib ko'ring" }, btn: { en: 'Find Food', uz: 'Ovqat topish' } },
  { to: '/hotels', img: 'hotels.jpg', alt: 'hotels', title: { en: 'Hotels & Stays', uz: 'Mehmonxonalar' }, desc: { en: 'Book your perfect accommodation', uz: "O'zingizga mos joyni toping" }, btn: { en: 'Book Now', uz: 'Bron qilish' } },
  { to: '/travel-agencies', img: 'travel_agency.jpg', alt: 'travel agencies', title: { en: 'Travel Agencies', uz: 'Sayohat agentliklari' }, desc: { en: 'Guided tours & travel packages', uz: "Yo'lboshchi bilan sayohatlar" }, btn: { en: 'View Agencies', uz: 'Agentliklar' } },
  { to: '/routes', img: 'transportation.webp', alt: 'transportation', title: { en: 'Transportation', uz: 'Transport' }, desc: { en: 'Travel between cities easily', uz: 'Shaharlar orasida sayohat qiling' }, btn: { en: 'View Routes', uz: "Yo'nalishlar" } },
  { to: '/guides', img: 'guide.webp', alt: 'guides', title: { en: 'Local Guide', uz: "Mahalliy qo'llanma" }, desc: { en: 'Tips, customs & local advice', uz: "Maslahatlar va ma'lumotlar" }, btn: { en: 'Learn More', uz: "Ko'proq" } },
  { to: '/emergency', img: 'emergency.webp', alt: 'emergency', title: { en: 'Emergency Contacts', uz: 'Favqulodda raqamlar' }, desc: { en: 'Important numbers & support', uz: 'Muhim raqamlar va yordam' }, btn: { en: 'View All', uz: "Ko'rish" } },
]

const SERVICES: { to: string; icon: string; title: Tr; desc: Tr }[] = [
  { to: '/routes', icon: '📍', title: { en: 'Location-Based Discovery', uz: "Joylashuv bo'yicha qidiruv" }, desc: { en: 'Find attractions, restaurants near you instantly', uz: 'Yaqin atrofdagi joylarni toping' } },
  { to: '/routes', icon: '🗺️', title: { en: 'Smart Route Planning', uz: 'Aqlli marshrutlar' }, desc: { en: 'Get optimized travel routes between cities', uz: "Eng yaxshi yo'nalishlarni oling" } },
  { to: '/attractions', icon: '📚', title: { en: 'Historical Context', uz: "Tarixiy ma'lumot" }, desc: { en: 'Learn the story behind every monument', uz: 'Har bir yodgorlik tarixini bilib oling' } },
  { to: '/tips', icon: '💡', title: { en: 'Local Tips & Advice', uz: 'Mahalliy maslahatlar' }, desc: { en: 'Insider knowledge tourists usually miss', uz: 'Mahalliy bilimlar va maslahatlar' } },
]

export default function Home() {
  const { tr } = useI18n()
  const navigate = useNavigate()
  return (
    <>
      <UzTop />
      <div className="pg-home">


      <section className="quick-access" id="categories">
        <div className="section-header">
          <p className="section-subtitle">{tr({ en: 'Everything you need', uz: "Sizga kerak bo'lgan hamma narsa" })}</p>
          <h2 className="section-title">{tr({ en: 'What are you looking for?', uz: 'Nimani qidiryapsiz?' })}</h2>
        </div>
        <div className="categories-grid">
          {CATEGORIES.map((c) => (
            <div key={c.to} className="category-card" onClick={() => navigate(c.to)}>
              <img src={`/images/${c.img}`} alt={c.alt} />
              <div className="category-overlay">
                <div className="category-title">{tr(c.title)}</div>
                <div className="category-desc">{tr(c.desc)}</div>
                <button className="category-btn">{tr(c.btn)}</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <NewsSection />

      </div>

      <div id="featured" style={{ background: '#050505' }}>
        <DestinationsBlock />
      </div>

      <div className="pg-home">

      <section className="services" id="services">
        <div className="section-header">
          <p className="section-subtitle">{tr({ en: 'How we help', uz: 'Biz sizga qanday yordam beramiz' })}</p>
          <h2 className="section-title">{tr({ en: 'Our Services', uz: 'Bizning xizmatlar' })}</h2>
        </div>
        <div className="services-grid">
          {SERVICES.map((s) => (
            <div key={s.title.en} className="service-item" onClick={() => navigate(s.to)}>
              <div className="service-icon">{s.icon}</div>
              <div className="service-title">{tr(s.title)}</div>
              <div className="service-desc">{tr(s.desc)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="contact-cta" id="contact">
        <img src="/images/assistant.jpg" alt="" />
        <h2>{tr({ en: 'Need Travel Assistance?', uz: 'Sayohat yordami kerakmi?' })}</h2>
        <p>{tr({ en: 'Contact our travel agency for personalized tour packages and support', uz: "Shaxsiy tur paketlari va yordam uchun agentligimiz bilan bog'laning" })}</p>
        <div className="contact-info">
          <div className="contact-item"><span>📞</span><div>+998 70 308-09-39</div></div>
          <div className="contact-item"><span>✉️</span><div>info@discoveruzbekistan.uz</div></div>
          <div className="contact-item"><span>📍</span><div>Samarkand, Uzbekistan</div></div>
        </div>
        <a href="tel:+998703080939" className="cta-btn cta-secondary" style={{ background: 'white', color: '#667eea' }}>
          {tr({ en: 'Contact Us Now', uz: "Hozir bog'laning" })}
        </a>
      </section>

      <section className="partner-cta-section">
        <div className="partner-cta-container">
          <div className="partner-cta-content">
            <h2>Want to Grow Your Business?</h2>
            <p>Join hundreds of restaurants, hotels, and attractions reaching thousands of travelers across Uzbekistan</p>
            <div className="partner-benefits">
              <div className="benefit-item"><span className="benefit-icon">🌟</span><span>Increased Visibility</span></div>
              <div className="benefit-item"><span className="benefit-icon">📊</span><span>Real-time Analytics</span></div>
              <div className="benefit-item"><span className="benefit-icon">💼</span><span>Easy Management</span></div>
            </div>
            <Link to="/partner" className="partner-cta-button">🚀 Become a Partner Today</Link>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </>
  )
}
