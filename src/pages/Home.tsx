import { Link } from 'react-router-dom'
import { UzTop } from '../components/UzTop'
import { ServicesSection } from '../components/ServicesSection'
import { Footer } from '../components/Footer'
import { NewsSection } from '../components/NewsSection'
import DestinationsBlock from '../components/DestinationsBlock'
import CategoryCarousel from '../components/CategoryCarousel'
import { useI18n } from '../lib/i18n-context'
import '../styles/home.css'

export default function Home() {
  const { tr } = useI18n()
  return (
    <>
      <UzTop />
      <div id="categories" style={{ background: '#050505' }}>
        <CategoryCarousel />
      </div>

      <div className="pg-home">
        <NewsSection />
      </div>

      <div id="featured" style={{ background: '#050505' }}>
        <DestinationsBlock />
      </div>

      <ServicesSection />

      <div className="pg-home">

      <section className="contact-cta" id="contact">
        <img src="/images/assistant.jpg" alt="" />
        <h2>{tr({ en: 'Need Travel Assistance?', uz: 'Sayohat yordami kerakmi?', ru: 'Нужна помощь с поездкой?' })}</h2>
        <p>{tr({ en: 'Contact our travel agency for personalized tour packages and support', uz: "Shaxsiy tur paketlari va yordam uchun agentligimiz bilan bog'laning", ru: 'Свяжитесь с нашим агентством для индивидуальных туров и поддержки' })}</p>
        <div className="contact-info">
          <div className="contact-item"><span>📞</span><div>+998 70 308-09-39</div></div>
          <div className="contact-item"><span>✉️</span><div>info@discoveruzbekistan.uz</div></div>
          <div className="contact-item"><span>📍</span><div>{tr({ en: 'Samarkand, Uzbekistan', uz: "Samarqand, O'zbekiston", ru: 'Самарканд, Узбекистан' })}</div></div>
        </div>
        <a href="tel:+998703080939" className="cta-btn cta-secondary" style={{ background: 'white', color: '#667eea' }}>
          {tr({ en: 'Contact Us Now', uz: "Hozir bog'laning", ru: 'Связаться сейчас' })}
        </a>
      </section>

      <section className="partner-cta-section">
        <div className="partner-cta-container">
          <div className="partner-cta-content">
            <h2>{tr({ en: 'Want to Grow Your Business?', uz: "Biznesingizni rivojlantirmoqchimisiz?", ru: 'Хотите развить свой бизнес?' })}</h2>
            <p>{tr({ en: 'Join hundreds of restaurants, hotels, and attractions reaching thousands of travelers across Uzbekistan', uz: "O'zbekiston bo'ylab minglab sayyohlarga yetib borayotgan yuzlab restoran, mehmonxona va diqqatga sazovor joylarga qo'shiling", ru: 'Присоединяйтесь к сотням ресторанов, отелей и достопримечательностей, которые привлекают тысячи путешественников по Узбекистану' })}</p>
            <div className="partner-benefits">
              <div className="benefit-item"><span className="benefit-icon">🌟</span><span>{tr({ en: 'Increased Visibility', uz: "Ko'proq e'tibor", ru: 'Больше видимости' })}</span></div>
              <div className="benefit-item"><span className="benefit-icon">📊</span><span>{tr({ en: 'Real-time Analytics', uz: "Real vaqt tahlili", ru: 'Аналитика в реальном времени' })}</span></div>
              <div className="benefit-item"><span className="benefit-icon">💼</span><span>{tr({ en: 'Easy Management', uz: "Oson boshqaruv", ru: 'Простое управление' })}</span></div>
            </div>
            <Link to="/partner" className="partner-cta-button">🚀 {tr({ en: 'Become a Partner Today', uz: "Bugunoq hamkor bo'ling", ru: 'Станьте партнёром сегодня' })}</Link>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </>
  )
}
