// ─── 恒星データ ──────────────────────────────────────────────────────────────

export interface Star {
  id: string
  /** プリセット由来の場合の元 id (URL 共有・説明文の表示に使用) */
  presetId?: string
  name: string
  nameEn: string
  /** 距離 [pc] — 視差角は常に p = 1/d で導出する */
  distancePc: number
  /** 黄経 λ [deg] — 黄道面内の方向 */
  eclLonDeg: number
  /** 黄緯 β [deg] — 黄道面からの傾き (±90° = 黄道の極) */
  eclLatDeg: number
  color: string
}

/** プリセット恒星 (実測値ベース) */
export interface StarPreset extends Omit<Star, 'id' | 'presetId'> {
  id: string
  /** 一言メモ (ロケールキー) */
  noteKey?: string
}

// ─── シミュレーション状態 ─────────────────────────────────────────────────────

export type ViewMode = 'overhead' | 'observer' | 'stellar'
export type DistanceUnit = 'pc' | 'ly' | 'au'
export type Theme = 'light' | 'dark'
export type Language = 'ja' | 'en'
export type CameraPreset = 'oblique' | 'top' | 'edge'

export type MissionId =
  | 'playYear'
  | 'observer'
  | 'compare'
  | 'distance'
  | 'multi'
  | 'pole'
  | 'ecliptic'
  | 'stellar'
  | 'aberration'
  | 'graphClick'
  | 'challenge'
  | 'quiz'

// ─── 計算結果 ────────────────────────────────────────────────────────────────

export interface Vec3 {
  x: number
  y: number
  z: number
}

/** 地球位置 (黄道座標系, 1 au 単位, z = 黄道北極方向) */
export interface EarthPosition extends Vec3 {
  /** 日心黄経 [rad] */
  lon: number
}

/** 見かけ方向のずれ [arcsec] (恒星方向に垂直な天球面上の 2 成分) */
export interface ApparentOffset {
  /** 黄経方向 (Δλ cos β) [arcsec] */
  dLon: number
  /** 黄緯方向 (Δβ) [arcsec] */
  dLat: number
}

// ─── クイズ ──────────────────────────────────────────────────────────────────

export interface QuizQuestion {
  id: string
  question: string
  choices: string[]
  correctIndex: number
  explanation: string
}
