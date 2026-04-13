import { useState, useEffect, useCallback } from 'react'
import { useSimStore } from '../store/simulationStore'
import { loadLocale, t, tArr } from '../utils/i18n'
import type { Language } from '../types'

type LocaleData = Record<string, unknown>

export function useI18n() {
  const lang = useSimStore(s => s.language)
  const [locale, setLocale] = useState<LocaleData>({})

  useEffect(() => {
    loadLocale(lang).then(setLocale)
  }, [lang])

  const tr = useCallback(
    (key: string, params?: Record<string, string | number>) => t(locale, key, params),
    [locale]
  )
  const trArr = useCallback(
    (key: string) => tArr(locale, key),
    [locale]
  )

  return { tr, trArr, lang, locale }
}

export type { Language }
