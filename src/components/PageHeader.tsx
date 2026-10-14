import { Link } from 'react-router-dom'

/** Compact header used on inner pages (logo only, like the original list pages). */
export function PageHeader() {
  return (
    <header>
      <div className="header-content">
        <Link
          to="/"
          className="nav-logo"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#fff', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.04em' }}
        >
          <img
            src="/images/logo.png"
            alt="Discover Travel Uzbekistan"
            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', flexShrink: 0 }}
          />
          <span>DISCOVER TRAVEL UZBEKISTAN</span>
        </Link>
        <div className="header-right" />
      </div>
    </header>
  )
}
