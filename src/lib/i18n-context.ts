import { createContext, useContext } from 'react'
import type { Lang } from '../types'

export const LANGUAGES: { code: Lang; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'uz', name: "O'zbekcha", flag: '🇺🇿' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
]

/** Inline translations, the React equivalent of data-en / data-uz / data-ru attributes */
export type Tr = Partial<Record<Lang, string>> & { en: string }

export interface I18nValue {
  lang: Lang
  setLang: (l: Lang) => void
  /** look up a key in the shared dictionary */
  t: (key: string) => string
  /** pick from inline translations, falling back to English */
  tr: (text: Tr) => string
}

export const I18nContext = createContext<I18nValue | null>(null)

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
