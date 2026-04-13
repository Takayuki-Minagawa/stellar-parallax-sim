import { useEffect, useRef } from 'react'
import { useSimStore } from '../store/simulationStore'
import { STAR_PRESETS } from '../data/starPresets'
import { distanceToParallax } from '../utils/astronomy'
import type { Language, Theme, ViewMode, Star } from '../types'

/**
 * URLクエリパラメータとシミュレーション状態を双方向同期するフック
 *
 * フォーマット:
 *   ?lang=ja&theme=dark&view=overhead&stars=sirius:2.637,proxima:1.295
 *   カスタム星: custom-1000:5.0:1.571:80ff80  (id:distPc:dirRad:colorHex)
 */
export function useUrlSync() {
  const mounted = useRef(false)

  const language  = useSimStore(s => s.language)
  const theme     = useSimStore(s => s.theme)
  const viewMode  = useSimStore(s => s.viewMode)
  const stars     = useSimStore(s => s.stars)

  const setLanguage  = useSimStore(s => s.setLanguage)
  const setTheme     = useSimStore(s => s.setTheme)
  const setViewMode  = useSimStore(s => s.setViewMode)
  const setStars     = useSimStore(s => s.setStars)

  // ── マウント時にURLから復元 ────────────────────────────────────────────────
  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    const params = new URLSearchParams(window.location.search)

    const lang = params.get('lang')
    if (lang === 'ja' || lang === 'en') setLanguage(lang as Language)

    const themeParam = params.get('theme')
    if (themeParam === 'dark' || themeParam === 'light') setTheme(themeParam as Theme)

    const view = params.get('view')
    if (view === 'overhead' || view === 'observer' || view === 'stellar') setViewMode(view as ViewMode)

    const starsParam = params.get('stars')
    if (starsParam) {
      const parsed: Star[] = starsParam.split(',').flatMap(seg => {
        const parts = seg.split(':')
        if (parts.length < 2) return []
        const [id, distStr, dirStr, colorHex] = parts
        const distancePc = parseFloat(distStr)
        if (isNaN(distancePc) || distancePc <= 0) return []

        // プリセットにマッチするか確認
        const preset = STAR_PRESETS.find(p => p.id === id)
        if (preset) {
          return [{ ...preset, distancePc, parallaxArcsec: distanceToParallax(distancePc) }]
        }

        // カスタム恒星
        const directionRad = dirStr ? parseFloat(dirStr) : 1.0
        const color = colorHex ? `#${colorHex}` : '#80ff80'
        return [{
          id,
          name: 'Custom',
          nameEn: 'Custom',
          distancePc,
          parallaxArcsec: distanceToParallax(distancePc),
          directionRad: isNaN(directionRad) ? 1.0 : directionRad,
          color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#80ff80',
        }]
      })

      if (parsed.length > 0) setStars(parsed)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 状態変化時にURLを更新 (replaceState で履歴を汚さない) ─────────────────
  useEffect(() => {
    if (!mounted.current) return

    const params = new URLSearchParams()
    params.set('lang', language)
    params.set('theme', theme)
    params.set('view', viewMode)

    const starsStr = stars.map(s => {
      const preset = STAR_PRESETS.find(p => p.id === s.id)
      if (preset) return `${s.id}:${s.distancePc.toFixed(3)}`
      const dirRad = s.directionRad.toFixed(4)
      const colorHex = s.color.replace('#', '')
      return `${s.id}:${s.distancePc.toFixed(3)}:${dirRad}:${colorHex}`
    }).join(',')
    params.set('stars', starsStr)

    const newSearch = `?${params.toString()}`
    if (window.location.search !== newSearch) {
      window.history.replaceState(null, '', newSearch)
    }
  }, [language, theme, viewMode, stars])
}
