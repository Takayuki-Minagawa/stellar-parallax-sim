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

  // ─── UI ────────────────────────────────────────────────────────
  theme: Theme
  language: Language

  // ─── アクション ────────────────────────────────────────────────
  setEarthAngle: (deg: number) => void
  setPlaying: (v: boolean) => void
  setSpeed: (v: number) => void

  addStar: (star: Omit<Star, 'id'>) => void
  removeStar: (id: string) => void
  updateStar: (id: string, patch: Partial<Omit<Star, 'id'>>) => void
  selectStar: (id: string) => void

  setViewMode: (m: ViewMode) => void
  setDistanceUnit: (u: DistanceUnit) => void
  setShowTrail: (v: boolean) => void
  setShowParallaxLine: (v: boolean) => void
  setCompareMode: (v: boolean) => void

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

  theme: 'dark',
  language: 'ja',

  setEarthAngle: (deg) => set({ earthAngleDeg: ((deg % 360) + 360) % 360 }),
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),

  addStar: (star) => {
    const id = `custom-${++idCounter}`
    set(s => ({ stars: [...s.stars, { ...star, id }] }))
  },
  removeStar: (id) =>
    set(s => ({
      stars: s.stars.filter(st => st.id !== id),
      selectedStarId: s.selectedStarId === id
        ? (s.stars[0]?.id ?? '')
        : s.selectedStarId,
    })),
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

  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
}))
