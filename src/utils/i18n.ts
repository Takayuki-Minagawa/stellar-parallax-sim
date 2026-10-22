import type { Language } from '../types'
import ja from '../locales/ja.json'
import en from '../locales/en.json'

type LocaleData = Record<string, unknown>

/** ロケールはバンドルに含めて同期的に参照する (初回表示でキーが見えないように) */
export const LOCALES: Record<Language, LocaleData> = { ja, en }

function lookup(data: LocaleData, key: string): unknown {
  let cur: unknown = data
  for (const part of key.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

/** ネストされたキーを '.' 区切りで取得し {{param}} を置換 */
export function t(data: LocaleData, key: string, params?: Record<string, string | number>): string {
  const cur = lookup(data, key)
  if (typeof cur !== 'string') return key
  if (!params) return cur
  return cur.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? `{{${k}}}`))
}

/** 配列取得 */
export function tArr(data: LocaleData, key: string): string[] {
  const cur = lookup(data, key)
  return Array.isArray(cur) ? (cur as string[]) : []
}
