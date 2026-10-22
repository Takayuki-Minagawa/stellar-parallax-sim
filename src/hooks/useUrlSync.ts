import { useEffect, useRef } from 'react'
import { useSimStore, nextStarId, starFromPreset } from '../store/simulationStore'
import { findPreset } from '../data/starPresets'
import type { Star } from '../types'

/**
 * URL クエリパラメータとシミュレーション状態を双方向同期するフック
 *
 * v=2 の stars セグメント (カンマ区切り):
 *   プリセット: p.<presetId>:<distPc>[:<latDeg>:<lonDeg>]   (位置を変えた場合のみ角度を付与)
 *   カスタム:   c:<distPc>:<latDeg>:<lonDeg>:<colorHex>:<jaName>:<enName>
 * 旧形式 (v なし) の presetId:distPc / custom-N:distPc:dirRad:color:ja:en も読み込める
 */

const num = (s: string | undefined, fallback: number) => {
  const v = s === undefined || s === '' ? NaN : parseFloat(s)
  return isFinite(v) ? v : fallback
}
const clampLat = (v: number) => Math.max(-90, Math.min(90, v))
const normLon = (v: number) => ((v % 360) + 360) % 360
const safeDecode = (s: string | undefined) => {
  if (!s) return ''
  try { return decodeURIComponent(s) } catch { return s }
}
const safeColor = (hex: string | undefined) =>
  hex && /^[0-9a-fA-F]{6}$/.test(hex) ? `#${hex}` : '#7dffa0'

function parseV2(seg: string): Star | null {
  const parts = seg.split(':')
  const distancePc = num(parts[1], NaN)
  if (!(distancePc > 0)) return null

  if (parts[0].startsWith('p.')) {
    const star = starFromPreset(parts[0].slice(2))
    if (!star) return null
    return {
      ...star,
      distancePc,
      eclLatDeg: clampLat(num(parts[2], star.eclLatDeg)),
      eclLonDeg: normLon(num(parts[3], star.eclLonDeg)),
    }
  }
  if (parts[0] === 'c') {
    const name = safeDecode(parts[5]) || 'Custom Star'
    return {
      id: nextStarId(),
      name,
      nameEn: safeDecode(parts[6]) || name,
      distancePc,
      eclLatDeg: clampLat(num(parts[2], 0)),
      eclLonDeg: normLon(num(parts[3], 0)),
      color: safeColor(parts[4]),
    }
  }
  return null
}

function parseLegacy(seg: string): Star | null {
  const parts = seg.split(':')
  const distancePc = num(parts[1], NaN)
  if (!(distancePc > 0)) return null
  const preset = findPreset(parts[0].replace(/~\d+$/, ''))
  if (preset) {
    const star = starFromPreset(preset.id)!
    return { ...star, distancePc }
  }
  const name = safeDecode(parts[4]) || 'Custom Star'
  return {
    id: nextStarId(),
    name,
    nameEn: safeDecode(parts[5]) || name,
    distancePc,
    eclLatDeg: 0,
    eclLonDeg: normLon((num(parts[2], 1) * 180) / Math.PI),
    color: safeColor(parts[3]),
  }
}

function serialize(s: Star): string {
  const d = +s.distancePc.toFixed(3)
  const preset = findPreset(s.presetId)
  if (preset) {
    const moved =
      Math.abs(preset.eclLatDeg - s.eclLatDeg) > 0.05 ||
      Math.abs(preset.eclLonDeg - s.eclLonDeg) > 0.05
    return moved
      ? `p.${preset.id}:${d}:${+s.eclLatDeg.toFixed(1)}:${+s.eclLonDeg.toFixed(1)}`
      : `p.${preset.id}:${d}`
  }
  return [
    'c', d, +s.eclLatDeg.toFixed(1), +s.eclLonDeg.toFixed(1),
    s.color.replace('#', ''), encodeURIComponent(s.name), encodeURIComponent(s.nameEn),
  ].join(':')
}

type SimSnapshot = ReturnType<typeof useSimStore.getState>

/**
 * 現在の状態を URL クエリ文字列にする
 * @param withAngle 日付 (公転角度) を含めるか
 */
export function buildSearch(s: SimSnapshot, withAngle: boolean): string {
  const params = new URLSearchParams()
  params.set('v', '2')
  params.set('lang', s.language)
  params.set('theme', s.theme)
  params.set('view', s.viewMode)
  if (s.distanceUnit !== 'pc') params.set('unit', s.distanceUnit)
  // 月初 (stepMonth の結果) が丸めで前日にならないよう小数 2 桁で保存
  if (withAngle) params.set('a', String(+s.earthAngleDeg.toFixed(2)))
  if (s.compareMode) params.set('cmp', '1')
  if (s.showAberration) params.set('ab', '1')
  params.set('stars', s.stars.map(serialize).join(','))
  const sel = s.stars.findIndex(st => st.id === s.selectedStarId)
  if (sel > 0) params.set('sel', String(sel))
  return `?${params.toString()}`
}

/** 共有用: 現在の状態 (再生中でも最新) を表す URL */
export function currentShareUrl(): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}${buildSearch(useSimStore.getState(), true)}`
}

export function useUrlSync() {
  const mounted = useRef(false)

  const language = useSimStore(s => s.language)
  const theme    = useSimStore(s => s.theme)
  const viewMode = useSimStore(s => s.viewMode)
  const stars    = useSimStore(s => s.stars)
  const selectedStarId = useSimStore(s => s.selectedStarId)
  const compareMode = useSimStore(s => s.compareMode)
  const showAberration = useSimStore(s => s.showAberration)
  const distanceUnit = useSimStore(s => s.distanceUnit)
  // 再生中は毎フレーム URL を書き換えないよう、停止中の位置だけを反映する
  const angle = useSimStore(s => (s.playing ? -1 : +s.earthAngleDeg.toFixed(2)))

  // ── マウント時にURLから復元 ────────────────────────────────────────────────
  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    const params = new URLSearchParams(window.location.search)
    const st = useSimStore.getState()

    const lang = params.get('lang')
    if (lang === 'ja' || lang === 'en') st.setLanguage(lang)

    const themeParam = params.get('theme')
    if (themeParam === 'dark' || themeParam === 'light') st.setTheme(themeParam)

    const view = params.get('view')
    if (view === 'overhead' || view === 'observer' || view === 'stellar') st.setViewMode(view)

    const unit = params.get('unit')
    if (unit === 'pc' || unit === 'ly' || unit === 'au') st.setDistanceUnit(unit)

    const a = params.get('a')
    if (a !== null && isFinite(parseFloat(a))) st.setEarthAngle(parseFloat(a))

    if (params.get('cmp') === '1') st.setCompareMode(true)
    if (params.get('ab') === '1') st.setShowAberration(true)

    const starsParam = params.get('stars')
    if (starsParam) {
      const parser = params.get('v') === '2' ? parseV2 : parseLegacy
      const parsed = starsParam.split(',').map(parser).filter((s): s is Star => s !== null)
      if (parsed.length > 0) {
        const sel = Math.max(0, Math.min(parsed.length - 1, Math.round(num(params.get('sel') ?? undefined, 0))))
        st.setStars(parsed, sel)
      }
    }
  }, [])

  // ── 状態変化時にURLを更新 (replaceState で履歴を汚さない) ─────────────────
  useEffect(() => {
    if (!mounted.current) return
    const newSearch = buildSearch(useSimStore.getState(), angle >= 0)
    if (window.location.search !== newSearch) {
      window.history.replaceState(null, '', newSearch)
    }
  }, [language, theme, viewMode, stars, selectedStarId, compareMode, showAberration, distanceUnit, angle])
}
