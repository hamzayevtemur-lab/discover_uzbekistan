import { useEffect, useRef } from 'react'
import { SiteHeader, HEADER_COPY } from './SiteHeader'
import { useI18n } from '../lib/i18n-context'
import type { Lang } from '../types'
import '../styles/uz-top.css'

const VIDEO_SRC = 'https://pub-9723ea93395f4ea99c19cd388804aaaf.r2.dev/Uzbekistan.mp4'

const HERO: Record<Lang, { h1: [string, string]; p: string }> = {
  uz: { h1: ['Ipak Yoʻlining', 'Marvaridini Kashf Eting'], p: 'Oʻzbekistonning qadimiy shaharlari, madaniyati va taomi bilan tanishish uchun toʻliq sayohat hamrohingiz' },
  ru: { h1: ['Откройте Жемчужину', 'Шёлкового Пути'], p: 'Ваш полный путеводитель по древним городам, культуре и кухне Узбекистана' },
  en: { h1: ['Explore the Pearl of', 'the Silk Road'], p: "Your complete travel companion for exploring Uzbekistan's ancient cities, culture & cuisine" },
}

/** Header + hero block (replaces the original header and first section of the home page). */
export function UzTop() {
  const { lang } = useI18n()
  const hero = HERO[lang]
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    document.title = HEADER_COPY[lang].title
  }, [lang])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) videoRef.current?.pause()
  }, [])

  return (
    <div className="uz-root">
      <SiteHeader variant="overlay" />

      <main>
        <section className="hero" id="home">
          <video ref={videoRef} className="hero-video" autoPlay muted loop playsInline preload="metadata" poster="/images/uzb2.jpg" aria-hidden="true">
            <source src={VIDEO_SRC} type="video/mp4" />
          </video>
          <div className="hero-content">
            <h1>
              {hero.h1[0]}
              <br />
              {hero.h1[1]}
            </h1>
            <p>{hero.p}</p>
          </div>
        </section>
      </main>
    </div>
  )
}
