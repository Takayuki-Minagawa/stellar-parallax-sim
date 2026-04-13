import { create } from 'zustand'
import type { Star, ViewMode, DistanceUnit, Theme, Language } from '../types'
import { STAR_PRESETS, DEFAULT_STAR_ID } from '../data/starPresets'
import { distanceToParallax } from '../utils/astronomy'

let idCounter = 1000

interface SimState {
  // ─── アニメーション ────────────────────────────────────────────
  /** 公転角度 [deg] 0 = 1月 */
  earthAngleDeg: number
  playing: boolean
  /** 再生速度 1x = 1年/秒 */
  speed: number

  // ─── 恒星 ──────────────────────────────────────────────────────
  stars: Star[]
  selectedStarId: string

  // ─── 表示設定 ──────────────────────────────────────────────────
  viewMode: ViewMode
  distanceUnit: DistanceUnit
  showTrail: boolean
  showParallaxLine: boolean
  compareMode: boolean
  showAberration: boolean

  // ─── UI ────────────────────────────────────────────────────────
  theme: Theme
  language: Language

  // ─── アクション ────────────────────────────────────────────────
  setEarthAngle: (deg: number) => void
  setPlaying: (v: boolean) => void
  setSpeed: (v: number) => void

  setStars: (stars: Star[]) => void
  addStar: (star: Omit<Star, 'id'>) => void
  removeStar: (id: string) => void
  updateStar: (id: string, patch: Partial<Omit<Star, 'id'>>) => void
  selectStar: (id: string) => void

  setViewMode: (m: ViewMode) => void
  setDistanceUnit: (u: DistanceUnit) => void
  setShowTrail: (v: boolean) => void
  setShowParallaxLine: (v: boolean) => void
  setCompareMode: (v: boolean) => void
  setShowAberration: (v: boolean) => void

  setTheme: (t: Theme) => void
  setLanguage: (l: Language) => void
}

const defaultStar = STAR_PRESETS.find(s => s.id === DEFAULT_STAR_ID) ?? STAR_PRESETS[0]

export const useSimStore = create<SimState>((set) => ({
  earthAngleDeg: 0,
  playing: false,
  speed: 1,

  stars: [{ ...defaultStar }],
  selectedStarId: defaultStar.id,

  viewMode: 'overhead',
  distanceUnit: 'pc',
  showTrail: true,
  showParallaxLine: true,
  compareMode: false,
  showAberration: false,

  theme: 'dark',
  language: 'ja',

  setEarthAngle: (deg) => set({ earthAngleDeg: ((deg % 360) + 360) % 360 }),
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),

  setStars: (stars) => {
    // 復元した custom-* id が idCounter を追い越さないようにカウンターを進める
    stars.forEach(s => {
      if (s.id.startsWith('custom-')) {
        const n = parseInt(s.id.slice('custom-'.length), 10)
        if (!isNaN(n) && n >= idCounter) idCounter = n
      }
    })
    return set(s => ({
      stars,
      selectedStarId: stars.find(st => st.id === s.selectedStarId)?.id ?? stars[0]?.id ?? '',
    }))
  },
  addStar: (star) => {
    const id = `custom-${++idCounter}`
    set(s => ({ stars: [...s.stars, { ...star, id }] }))
  },
  removeStar: (id) =>
    set(s => {
      const filtered = s.stars.filter(st => st.id !== id)
      return {
        stars: filtered,
        selectedStarId: s.selectedStarId === id
          ? (filtered[0]?.id ?? '')
          : s.selectedStarId,
      }
    }),
  updateStar: (id, patch) =>
    set(s => ({
      stars: s.stars.map(st =>
        st.id === id
          ? {
              ...st,
              ...patch,
              parallaxArcsec:
                patch.distancePc != null
                  ? distanceToParallax(patch.distancePc)
                  : st.parallaxArcsec,
            }
          : st
      ),
    })),
  selectStar: (id) => set({ selectedStarId: id }),

  setViewMode: (viewMode) => set({ viewMode }),
  setDistanceUnit: (distanceUnit) => set({ distanceUnit }),
  setShowTrail: (showTrail) => set({ showTrail }),
  setShowParallaxLine: (showParallaxLine) => set({ showParallaxLine }),
  setCompareMode: (compareMode) => set({ compareMode }),
  setShowAberration: (showAberration) => set({ showAberration }),

  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
}))
