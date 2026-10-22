import { useEffect } from 'react'
import { useSimStore } from '../store/simulationStore'
import type { Star } from '../types'

const isPole = (s: Star) => Math.abs(s.eclLatDeg) >= 80
const isEcliptic = (s: Star) => Math.abs(s.eclLatDeg) <= 3

/**
 * 操作による状態の変化を監視して観察ミッションの達成を記録する
 *
 * 共有 URL から復元した状態で達成扱いにならないよう、ストアの「変化」だけを見る。
 * App では useUrlSync より後に呼ぶこと (復元が終わってから購読を始めるため)。
 */
export function useMissionTracker() {
  useEffect(() => useSimStore.subscribe((s, prev) => {
    const mark = s.markMission

    if (s.viewMode !== prev.viewMode) {
      if (s.viewMode === 'observer') mark('observer')
      if (s.viewMode === 'stellar') mark('stellar')
    }
    if (s.compareMode && !prev.compareMode) mark('compare')
    if (s.showAberration && !prev.showAberration) mark('aberration')

    if (s.stars !== prev.stars) {
      if (s.stars.length >= 2 && s.stars.length > prev.stars.length) mark('multi')
      // 黄緯を変えた恒星が極・黄道に来たときだけ
      for (const st of s.stars) {
        const before = prev.stars.find(p => p.id === st.id)
        if (!before || before.eclLatDeg === st.eclLatDeg) continue
        if (isPole(st) && !isPole(before)) mark('pole')
        if (isEcliptic(st) && !isEcliptic(before)) mark('ecliptic')
      }
    }
  }), [])
}
