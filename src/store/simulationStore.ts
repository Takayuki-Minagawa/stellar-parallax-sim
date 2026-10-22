import { create } from 'zustand'
import type { Star, ViewMode, DistanceUnit, Theme, Language, CameraPreset, MissionId } from '../types'
import { STAR_PRESETS, DEFAULT_STAR_ID, DEFAULT_CUSTOM_STAR } from '../data/starPresets'

const PROGRESS_KEY = 'sps-progress-v1'
/** 初回ガイドを一度閉じたかどうか */
export const WELCOME_KEY = 'sps-welcome-seen'

let idCounter = 0
/** ストア内で一意な恒星 id を発行 */
export function nextStarId(): string {
  return `s${++idCounter}`
}

function loadProgress(): Partial<Record<MissionId, boolean>> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveProgress(progress: Partial<Record<MissionId, boolean>>) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    // storage unavailable (private mode etc.)
  }
}

/** プリセットから新しい恒星インスタンスを作る */
export function starFromPreset(presetId: string): Star | undefined {
  const preset = STAR_PRESETS.find(p => p.id === presetId)
  if (!preset) return undefined
  const { id, noteKey: _note, ...rest } = preset
  return { ...rest, id: nextStarId(), presetId: id }
}

interface SimState {
  // ─── アニメーション ────────────────────────────────────────────
  /** 公転角度 [deg] 0 = 1月1日頃 */
  earthAngleDeg: number
  playing: boolean
  /** 再生速度 1× = 1 年 / 60 秒 */
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
  cameraPreset: CameraPreset
  /** 同じプリセットを再選択してもカメラを戻せるようにするカウンタ */
  cameraNonce: number

  // ─── UI ────────────────────────────────────────────────────────
  theme: Theme
  language: Language
  helpOpen: boolean
  progress: Partial<Record<MissionId, boolean>>

  // ─── アクション ────────────────────────────────────────────────
  setEarthAngle: (deg: number) => void
  setPlaying: (v: boolean) => void
  setSpeed: (v: number) => void

  setStars: (stars: Star[], selectedIndex?: number) => void
  addPreset: (presetId: string) => void
  addCustomStar: () => void
  removeStar: (id: string) => void
  updateStar: (id: string, patch: Partial<Omit<Star, 'id'>>) => void
  selectStar: (id: string) => void

  setViewMode: (m: ViewMode) => void
  setDistanceUnit: (u: DistanceUnit) => void
  setShowTrail: (v: boolean) => void
  setShowParallaxLine: (v: boolean) => void
  setCompareMode: (v: boolean) => void
  setShowAberration: (v: boolean) => void
  setCameraPreset: (p: CameraPreset) => void

  setTheme: (t: Theme) => void
  setLanguage: (l: Language) => void
  setHelpOpen: (v: boolean) => void
  markMission: (id: MissionId) => void
  resetProgress: () => void
}

const defaultStar = starFromPreset(DEFAULT_STAR_ID)!

export const useSimStore = create<SimState>((set, get) => ({
  earthAngleDeg: 0,
  playing: false,
  speed: 6,

  stars: [defaultStar],
  selectedStarId: defaultStar.id,

  viewMode: 'overhead',
  distanceUnit: 'pc',
  showTrail: true,
  showParallaxLine: true,
  compareMode: false,
  showAberration: false,
  cameraPreset: 'oblique',
  cameraNonce: 0,

  theme: 'dark',
  language: 'ja',
  helpOpen: false,
  progress: loadProgress(),

  setEarthAngle: (deg) => set({ earthAngleDeg: ((deg % 360) + 360) % 360 }),
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),

  setStars: (stars, selectedIndex = 0) =>
    set({
      stars,
      selectedStarId: (stars[selectedIndex] ?? stars[0])?.id ?? '',
    }),
  addPreset: (presetId) => {
    const star = starFromPreset(presetId)
    if (!star) return
    set(s => ({ stars: [...s.stars, star], selectedStarId: star.id }))
  },
  addCustomStar: () => {
    const n = get().stars.filter(s => !s.presetId).length + 1
    const star: Star = {
      ...DEFAULT_CUSTOM_STAR,
      id: nextStarId(),
      name: `${DEFAULT_CUSTOM_STAR.name} ${n}`,
      nameEn: `${DEFAULT_CUSTOM_STAR.nameEn} ${n}`,
      eclLonDeg: Math.round(Math.random() * 360),
    }
    set(s => ({ stars: [...s.stars, star], selectedStarId: star.id }))
  },
  removeStar: (id) =>
    set(s => {
      if (s.stars.length <= 1) return s
      const filtered = s.stars.filter(st => st.id !== id)
      return {
        stars: filtered,
        selectedStarId: s.selectedStarId === id ? filtered[0].id : s.selectedStarId,
      }
    }),
  updateStar: (id, patch) =>
    set(s => ({
      stars: s.stars.map(st => (st.id === id ? { ...st, ...patch } : st)),
    })),
  selectStar: (id) => set({ selectedStarId: id }),

  setViewMode: (viewMode) => set({ viewMode }),
  setDistanceUnit: (distanceUnit) => set({ distanceUnit }),
  setShowTrail: (showTrail) => set({ showTrail }),
  setShowParallaxLine: (showParallaxLine) => set({ showParallaxLine }),
  setCompareMode: (compareMode) => set({ compareMode }),
  setShowAberration: (showAberration) => set({ showAberration }),
  setCameraPreset: (cameraPreset) => set(s => ({ cameraPreset, cameraNonce: s.cameraNonce + 1 })),

  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
  setHelpOpen: (helpOpen) => {
    // ✕ ボタン・Esc・? キーなど、どの方法で閉じても次回は自動表示しない
    if (!helpOpen) {
      try { localStorage.setItem(WELCOME_KEY, '1') } catch { /* storage unavailable */ }
    }
    set({ helpOpen })
  },
  markMission: (id) => {
    if (get().progress[id]) return
    const progress = { ...get().progress, [id]: true }
    saveProgress(progress)
    set({ progress })
  },
  resetProgress: () => {
    saveProgress({})
    set({ progress: {} })
  },
}))

/** 選択中の恒星 (見つからなければ先頭) */
export function useSelectedStar(): Star {
  return useSimStore(s => s.stars.find(st => st.id === s.selectedStarId) ?? s.stars[0])
}
