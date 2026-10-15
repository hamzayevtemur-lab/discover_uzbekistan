import type { ReactElement } from 'react'
import type { Lang } from '../types'

export const FLAGS: Record<Lang, ReactElement> = {
  en: (
    <svg className="flag" viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="60" height="30" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="2"/><path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10"/><path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6"/></svg>
  ),
  uz: (
    <svg className="flag" viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="6.4" fill="#0099B5"/><rect y="6.4" width="30" height="7.2" fill="#fff"/><rect y="6.4" width="30" height="0.7" fill="#CE1126"/><rect y="12.9" width="30" height="0.7" fill="#CE1126"/><rect y="13.6" width="30" height="6.4" fill="#1EB53A"/><circle cx="5" cy="3.2" r="2.3" fill="#fff"/><circle cx="6" cy="3.2" r="2" fill="#0099B5"/><g fill="#fff"><circle cx="9" cy="1.6" r=".5"/><circle cx="11" cy="1.6" r=".5"/><circle cx="13" cy="1.6" r=".5"/><circle cx="9" cy="3.4" r=".5"/><circle cx="11" cy="3.4" r=".5"/><circle cx="13" cy="3.4" r=".5"/><circle cx="11" cy="5.1" r=".5"/><circle cx="13" cy="5.1" r=".5"/></g></svg>
  ),
  ru: (
    <svg className="flag" viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="6.67" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#0039A6"/><rect y="13.33" width="30" height="6.67" fill="#D52B1E"/></svg>
  ),
}
