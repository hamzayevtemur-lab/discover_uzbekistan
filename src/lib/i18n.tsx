import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Lang } from '../types'
import { DICTIONARY } from './dictionary'
import { I18nContext, type I18nValue } from './i18n-context'

const STORAGE_KEY = 'preferred_lang'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'en' || saved === 'uz' || saved === 'ru' ? saved : 'en'
  } catch {
    return 'en'
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* storage can be blocked (private mode); the choice still applies for this session */
    }
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
