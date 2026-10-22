import { useCallback } from 'react'
import { useSimStore } from '../store/simulationStore'
import { LOCALES, t, tArr } from '../utils/i18n'

export function useI18n() {
  const lang = useSimStore(s => s.language)
  const locale = LOCALES[lang]

  const tr = useCallback(
    (key: string, params?: Record<string, string | number>) => t(locale, key, params),
    [locale]
  )
  const trArr = useCallback((key: string) => tArr(locale, key), [locale])

  return { tr, trArr, lang }
}
