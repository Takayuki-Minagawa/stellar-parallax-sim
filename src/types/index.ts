// ─── 恒星データ ──────────────────────────────────────────────────────────────

export interface Star {
  id: string
  name: string
  nameEn: string
  /** 距離 [pc] */
  distancePc: number
  /** 実際の視差角 [arcsec] */
  parallaxArcsec: number
  /** 赤道座標系での方向角 [rad] — 俯瞰ビューで恒星を置く方向 */
  directionRad: number
  color: string
}

// ─── シミュレーション状態 ─────────────────────────────────────────────────────

export type ViewMode = 'overhead' | 'observer' | 'stellar'
export type DistanceUnit = 'pc' | 'ly' | 'au'
export type Theme = 'light' | 'dark'
export type Language = 'ja' | 'en'

export interface PlaybackState {
  playing: boolean
  /** 1x〜60x */
  speed: number
}

// ─── 計算結果 ────────────────────────────────────────────────────────────────

export interface EarthPosition {
  /** 公転角度 [rad]  0 = 1月1日頃 */
  angle: number
  x: number
  z: number
}

/** 地球視点での恒星の見かけ方向 (正規化済み) */
export interface ApparentDirection {
  /** 水平方向ずれ [arcsec] */
  deltaRA: number
  /** 垂直方向ずれ [arcsec] */
  deltaDec: number
}

export interface ParallaxResult {
  star: Star
  /** 現在の見かけ方向 */
  apparent: ApparentDirection
  /** 1月時点の見かけ方向 */
  apparentJan: ApparentDirection
  /** 7月時点の見かけ方向 */
  apparentJul: ApparentDirection
  /** 計算視差角 [arcsec] */
  parallaxArcsec: number
  /** 1au / d [pc] = 視差角 [arcsec] */
  parallaxAngleFromDist: number
}

// ─── クイズ ──────────────────────────────────────────────────────────────────

export type QuizType = 'dist-from-parallax' | 'which-is-closer' | 'parsec-def'

export interface QuizQuestion {
  type: QuizType
  questionKey: string
  /** ロケールキー（要 tr() 解決）または表示文字列の配列 */
  choices: string[]
  /** choices の代わりに使う trArr キー（parsec-def など配列ロケールがある場合） */
  choicesKey?: string
  correctIndex: number
  explanationKey: string
  params?: Record<string, number | string>
}
