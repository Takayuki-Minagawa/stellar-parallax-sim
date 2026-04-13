import { useEffect, useRef } from 'react'
import { useSimStore } from '../store/simulationStore'
import { STAR_PRESETS } from '../data/starPresets'
import { distanceToParallax } from '../utils/astronomy'
import type { Language, Theme, ViewMode, Star } from '../types'

/**
 * URLクエリパラメータとシミュレーション状態を双方向同期するフック
 *
 * セグメントフォーマット:
 *   プリセット (1件目):  presetId:distPc
 *   プリセット (2件目+): presetId~2:distPc  (tilde+連番で重複回避)
 *   カスタム星:          id:distPc:dirRad:colorHex:jaName:enName
 *                        ※ name/nameEn は encodeURIComponent でエンコード
 */

export function useUrlSync() {
  const mounted = useRef(false)

  const language = useSimStore(s => s.language)
  const theme    = useSimStore(s => s.theme)
  const viewMode = useSimStore(s => s.viewMode)
  const stars    = useSimStore(s => s.stars)

  const setLanguage = useSimStore(s => s.setLanguage)
  const setTheme    = useSimStore(s => s.setTheme)
  const setViewMode = useSimStore(s => s.setViewMode)
  const setStars    = useSimStore(s => s.setStars)

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
      // パス1: URL 内の custom-N id をすべて走査して最大値を取得。
      // duplicate preset 用の新 id はこの値より大きい番号から振り始める。
      const segments = starsParam.split(',')
      let maxCustomNum = 1000  // store の idCounter 初期値と同じ下限
      segments.forEach(seg => {
        const rawId = seg.split(':')[0]
        if (rawId.startsWith('custom-')) {
          const n = parseInt(rawId.slice('custom-'.length), 10)
          if (!isNaN(n) && n > maxCustomNum) maxCustomNum = n
        }
      })
      let urlIdCounter = maxCustomNum  // ++urlIdCounter で使用するため max の値を保持

      // パス2: 実解析
      const parsed: Star[] = segments.flatMap(seg => {
        const parts = seg.split(':')
        if (parts.length < 2) return []

        const rawId   = parts[0]
        const distStr = parts[1]
        const distancePc = parseFloat(distStr)
        if (isNaN(distancePc) || distancePc <= 0) return []

        // ~N サフィックスを除いてプリセットを探す (#9 対応)
        const basePresetId = rawId.replace(/~\d+$/, '')
        const preset = STAR_PRESETS.find(p => p.id === basePresetId)
        if (preset) {
          // 1件目はプリセット id をそのまま使用、2件目以降はユニークな custom-* id を割り当てる
          const isDuplicate = rawId !== basePresetId
          const id = isDuplicate ? `custom-${++urlIdCounter}` : basePresetId
          return [{ ...preset, id, distancePc, parallaxArcsec: distanceToParallax(distancePc) }]
        }

        // カスタム星: id:distPc:dirRad:colorHex:jaName:enName
        const dirStr    = parts[2]
        const colorHex  = parts[3]
        const jaEncoded = parts[4]
        const enEncoded = parts[5]

        const directionRad = dirStr ? parseFloat(dirStr) : 1.0
        const color = colorHex ? `#${colorHex}` : '#80ff80'

        // #10 対応: URL に名前が含まれていればそれを使う。なければフォールバック文字列
        const jaName = jaEncoded ? decodeURIComponent(jaEncoded) : 'Custom Star'
        const enName = enEncoded ? decodeURIComponent(enEncoded) : jaName

        return [{
          id: rawId,
          name: jaName,
          nameEn: enName,
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

    // #9 対応: プリセット id の出現回数を追跡し、2件目以降に ~N サフィックスを付与
    const presetCount = new Map<string, number>()

    const starsStr = stars.map(s => {
      // プリセットかどうかを判定 (id 直接一致 or name/nameEn 一致)
      const preset =
        STAR_PRESETS.find(p => p.id === s.id) ??
        STAR_PRESETS.find(p => p.name === s.name && p.nameEn === s.nameEn)

      if (preset) {
        const n = (presetCount.get(preset.id) ?? 0) + 1
        presetCount.set(preset.id, n)
        const serialId = n === 1 ? preset.id : `${preset.id}~${n}`
        return `${serialId}:${s.distancePc.toFixed(3)}`
      }

      // 真のカスタム星: id:distPc:dirRad:colorHex:jaName:enName
      const dirRad   = s.directionRad.toFixed(4)
      const colorHex = s.color.replace('#', '')
      const jaName   = encodeURIComponent(s.name)
      const enName   = encodeURIComponent(s.nameEn)
      return `${s.id}:${s.distancePc.toFixed(3)}:${dirRad}:${colorHex}:${jaName}:${enName}`
    }).join(',')
    params.set('stars', starsStr)

    const newSearch = `?${params.toString()}`
    if (window.location.search !== newSearch) {
      window.history.replaceState(null, '', newSearch)
    }
  }, [language, theme, viewMode, stars])
}
