import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Lang } from '../types'
import { DICTIONARY } from './dictionary'

export const LANGUAGES: { code: Lang; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'uz', name: "O'zbekcha", flag: '🇺🇿' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
]

/** Inline translations, the React equivalent of data-en / data-uz / data-ru attributes */
export type Tr = Partial<Record<Lang, string>> & { en: string }

interface I18nValue {
  lang: Lang
  setLang: (l: Lang) => void
  /** look up a key in the shared dictionary */
  t: (key: string) => string
  /** pick from inline translations, falling back to English */
  tr: (text: Tr) => string
}

const I18nContext = createContext<I18nValue | null>(null)
const STORAGE_KEY = 'preferred_lang'

function initialLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'en' || saved === 'uz' || saved === 'ru' ? saved : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l)
    setLangState(l)
  }, [])

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (key) => DICTIONARY[lang]?.[key] ?? DICTIONARY.en[key] ?? key,
      tr: (text) => text[lang] ?? text.en,
    }),
    [lang, setLang],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
