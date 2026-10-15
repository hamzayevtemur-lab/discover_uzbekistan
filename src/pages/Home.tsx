import { Link } from 'react-router-dom'
import { UzTop } from '../components/UzTop'
import { ServicesSection } from '../components/ServicesSection'
import { Footer } from '../components/Footer'
import { NewsSection } from '../components/NewsSection'
import DestinationsBlock from '../components/DestinationsBlock'
import CategoryCarousel from '../components/CategoryCarousel'
import { useI18n } from '../lib/i18n-context'
import '../styles/home.css'

const iconProps = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const
const PhoneIcon = () => <svg {...iconProps}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>
const MailIcon = () => <svg {...iconProps}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
const PinIcon = () => <svg {...iconProps}><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>

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
        <div className="contact-cta-inner">
          <div className="contact-cta-text">
            <h2>{tr({ en: 'Planning a trip to Uzbekistan? Ask someone who lives here.', uz: "O'zbekistonga sayohat rejalashtiryapsizmi? Bu yerda yashaydiganlardan so'rang.", ru: 'Планируете поездку в Узбекистан? Спросите тех, кто здесь живёт.' })}</h2>
            <p>{tr({ en: 'Our team in Samarkand builds tour packages around your dates, pace and budget, and stays reachable while you travel.', uz: "Samarqanddagi jamoamiz sana, sur'at va byudjetingizga mos tur paketlarini tayyorlaydi va sayohat davomida aloqada bo'ladi.", ru: 'Наша команда в Самарканде составит тур под ваши даты, темп и бюджет и будет на связи в пути.' })}</p>
          </div>
          <div className="contact-card">
            <a href="tel:+998703080939" className="contact-row is-phone"><PhoneIcon />+998 70 308-09-39</a>
            <a href="mailto:info@discoveruzbekistan.uz" className="contact-row"><MailIcon />info@discoveruzbekistan.uz</a>
            <div className="contact-row is-last"><PinIcon />{tr({ en: 'Samarkand, Uzbekistan', uz: "Samarqand, O'zbekiston", ru: 'Самарканд, Узбекистан' })}</div>
            <a href="tel:+998703080939" className="contact-card-btn">
              {tr({ en: 'Contact Us Now', uz: "Hozir bog'laning", ru: 'Связаться сейчас' })}
            </a>
          </div>
        </div>
      </section>

      <section className="partner-cta-section">
        <div className="partner-cta-container">
          <h2>{tr({ en: 'Want to Grow Your Business?', uz: "Biznesingizni rivojlantirmoqchimisiz?", ru: 'Хотите развить свой бизнес?' })}</h2>
          <p>{tr({ en: 'Join hundreds of restaurants, hotels, and attractions reaching thousands of travelers across Uzbekistan', uz: "O'zbekiston bo'ylab minglab sayyohlarga yetib borayotgan yuzlab restoran, mehmonxona va diqqatga sazovor joylarga qo'shiling", ru: 'Присоединяйтесь к сотням ресторанов, отелей и достопримечательностей, которые привлекают тысячи путешественников по Узбекистану' })}</p>
          <div className="partner-cta-footer">
            <span>{tr({ en: 'Increased Visibility', uz: "Ko'proq e'tibor", ru: 'Больше видимости' })}</span>
            <span>{tr({ en: 'Real-time Analytics', uz: "Real vaqt tahlili", ru: 'Аналитика в реальном времени' })}</span>
            <span>{tr({ en: 'Easy Management', uz: "Oson boshqaruv", ru: 'Простое управление' })}</span>
            <Link to="/partner" className="partner-cta-button">{tr({ en: 'Become a Partner Today', uz: "Bugunoq hamkor bo'ling", ru: 'Станьте партнёром сегодня' })}</Link>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </>
  )
}
