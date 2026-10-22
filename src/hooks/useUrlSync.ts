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
  const playing = useSimStore(s => s.playing)
  // 再生中は URL を書き換えず、停止したときの位置を反映する
  const angle = useSimStore(s => (s.playing ? -1 : Math.round(s.earthAngleDeg)))

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
    if (!mounted.current || playing) return

    const params = new URLSearchParams()
    params.set('v', '2')
    params.set('lang', language)
    params.set('theme', theme)
    params.set('view', viewMode)
    if (distanceUnit !== 'pc') params.set('unit', distanceUnit)
    if (angle >= 0) params.set('a', String(angle))
    if (compareMode) params.set('cmp', '1')
    if (showAberration) params.set('ab', '1')
    params.set('stars', stars.map(serialize).join(','))
    const sel = stars.findIndex(s => s.id === selectedStarId)
    if (sel > 0) params.set('sel', String(sel))

    const newSearch = `?${params.toString()}`
    if (window.location.search !== newSearch) {
      window.history.replaceState(null, '', newSearch)
    }
  }, [language, theme, viewMode, stars, selectedStarId, compareMode, showAberration, distanceUnit, angle, playing])
}
