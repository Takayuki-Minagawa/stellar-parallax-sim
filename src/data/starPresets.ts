import type { Star } from '../types'

/** 実恒星プリセット (距離・視差角は実測値) */
export const STAR_PRESETS: Star[] = [
  {
    id: 'proxima',
    name: 'プロキシマ・ケンタウリ',
    nameEn: 'Proxima Centauri',
    distancePc: 1.295,
    parallaxArcsec: 0.7689,
    directionRad: 0.8,
    color: '#ff8080',
  },
  {
    id: 'alpha-centauri',
    name: 'アルファ・ケンタウリ',
    nameEn: 'Alpha Centauri',
    distancePc: 1.34,
    parallaxArcsec: 0.7421,
    directionRad: 0.85,
    color: '#ffe080',
  },
  {
    id: 'barnard',
    name: 'バーナード星',
    nameEn: "Barnard's Star",
    distancePc: 1.834,
    parallaxArcsec: 0.5454,
    directionRad: 1.8,
    color: '#ff6060',
  },
  {
    id: 'sirius',
    name: 'シリウス',
    nameEn: 'Sirius',
    distancePc: 2.637,
    parallaxArcsec: 0.3792,
    directionRad: 2.4,
    color: '#c0e8ff',
  },
  {
    id: 'vega',
    name: 'ベガ',
    nameEn: 'Vega',
    distancePc: 7.68,
    parallaxArcsec: 0.1303,
    directionRad: 0.3,
    color: '#e8f0ff',
  },
  {
    id: 'altair',
    name: 'アルタイル',
    nameEn: 'Altair',
    distancePc: 5.13,
    parallaxArcsec: 0.195,
    directionRad: 1.2,
    color: '#fff0c0',
  },
  {
    id: 'aldebaran',
    name: 'アルデバラン',
    nameEn: 'Aldebaran',
    distancePc: 20.0,
    parallaxArcsec: 0.05,
    directionRad: 3.5,
    color: '#ff9040',
  },
]

/** デフォルトで表示する恒星 */
export const DEFAULT_STAR_ID = 'sirius'

/** カスタム恒星の初期値 */
export const DEFAULT_CUSTOM_STAR: Omit<Star, 'id'> = {
  name: 'カスタム恒星',
  nameEn: 'Custom Star',
  distancePc: 5.0,
  parallaxArcsec: 1 / 5.0,
  directionRad: 1.0,
  color: '#80ff80',
}

/** 距離 [pc] → 距離 [ly] 変換 */
export const PC_TO_LY = 3.26156

/** 距離 [pc] → 距離 [au] 変換 */
export const PC_TO_AU = 206265
