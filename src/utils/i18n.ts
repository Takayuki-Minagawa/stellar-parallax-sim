import type { Language } from '../types'

type LocaleData = Record<string, unknown>

const cache: Partial<Record<Language, LocaleData>> = {}

export async function loadLocale(lang: Language): Promise<LocaleData> {
  if (cache[lang]) return cache[lang]!
  const base = import.meta.env.BASE_URL
  const res = await fetch(`${base}locales/${lang}.json`)
  const data = (await res.json()) as LocaleData
  cache[lang] = data
  return data
}

/** ネストされたキーを '.' 区切りで取得 */
export function t(data: LocaleData, key: string, params?: Record<string, string | number>): string {
  const parts = key.split('.')
  let cur: unknown = data
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return key
    cur = (cur as Record<string, unknown>)[part]
  }
  if (typeof cur !== 'string') return key
  if (!params) return cur
  return cur.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? `{{${k}}}`))
}

/** 配列取得 */
export function tArr(data: LocaleData, key: string): string[] {
  const parts = key.split('.')
  let cur: unknown = data
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return []
    cur = (cur as Record<string, unknown>)[part]
  }
  if (!Array.isArray(cur)) return []
  return cur as string[]
}
