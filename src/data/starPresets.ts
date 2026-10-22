import type { Star, StarPreset } from '../types'

/**
 * 実恒星プリセット
 * - 距離: 視差の実測値 (Gaia DR3 / Hipparcos 等) から d = 1/p で算出
 * - 黄経・黄緯: J2000 赤道座標から換算したおおよその値
 */
export const STAR_PRESETS: StarPreset[] = [
  { id: 'proxima',        name: 'プロキシマ・ケンタウリ', nameEn: 'Proxima Centauri', distancePc: 1.302,  eclLonDeg: 239.1, eclLatDeg: -44.8, color: '#ff7b7b', noteKey: 'presetNote.proxima' },
  { id: 'alpha-centauri', name: 'アルファ・ケンタウリ',   nameEn: 'Alpha Centauri',   distancePc: 1.339,  eclLonDeg: 239.5, eclLatDeg: -42.6, color: '#ffe17a', noteKey: 'presetNote.alphaCen' },
  { id: 'barnard',        name: 'バーナード星',           nameEn: "Barnard's Star",   distancePc: 1.828,  eclLonDeg: 269.4, eclLatDeg: 28.1,  color: '#ff5c5c', noteKey: 'presetNote.barnard' },
  { id: 'sirius',         name: 'シリウス',               nameEn: 'Sirius',           distancePc: 2.637,  eclLonDeg: 104.1, eclLatDeg: -39.6, color: '#9fdcff', noteKey: 'presetNote.sirius' },
  { id: '61-cygni',       name: 'はくちょう座61番星',     nameEn: '61 Cygni',         distancePc: 3.497,  eclLonDeg: 337.0, eclLatDeg: 51.9,  color: '#ffb36b', noteKey: 'presetNote.cyg61' },
  { id: 'altair',         name: 'アルタイル',             nameEn: 'Altair',           distancePc: 5.13,   eclLonDeg: 301.8, eclLatDeg: 29.3,  color: '#fff0c0', noteKey: 'presetNote.altair' },
  { id: 'vega',           name: 'ベガ',                   nameEn: 'Vega',             distancePc: 7.68,   eclLonDeg: 285.3, eclLatDeg: 61.7,  color: '#cfe0ff', noteKey: 'presetNote.vega' },
  { id: 'aldebaran',      name: 'アルデバラン',           nameEn: 'Aldebaran',        distancePc: 20.43,  eclLonDeg: 69.8,  eclLatDeg: -5.5,  color: '#ff9447', noteKey: 'presetNote.aldebaran' },
  { id: 'polaris',        name: 'ポラリス（北極星）',     nameEn: 'Polaris',          distancePc: 132.6,  eclLonDeg: 88.6,  eclLatDeg: 66.1,  color: '#fff6d8', noteKey: 'presetNote.polaris' },
  { id: 'betelgeuse',     name: 'ベテルギウス',           nameEn: 'Betelgeuse',       distancePc: 168,    eclLonDeg: 88.8,  eclLatDeg: -16.0, color: '#ff6a3d', noteKey: 'presetNote.betelgeuse' },
  { id: 'deneb',          name: 'デネブ',                 nameEn: 'Deneb',            distancePc: 800,    eclLonDeg: 335.3, eclLatDeg: 59.9,  color: '#e6efff', noteKey: 'presetNote.deneb' },
]

/** デフォルトで表示する恒星 */
export const DEFAULT_STAR_ID = 'sirius'

/** カスタム恒星の初期値 */
export const DEFAULT_CUSTOM_STAR: Omit<Star, 'id'> = {
  name: 'カスタム恒星',
  nameEn: 'Custom Star',
  distancePc: 4,
  eclLonDeg: 0,
  eclLatDeg: 30,
  color: '#7dffa0',
}

/** 距離スライダーの範囲 [pc] */
export const DIST_MIN_PC = 1
export const DIST_MAX_PC = 1000

export function findPreset(id: string | undefined): StarPreset | undefined {
  return id ? STAR_PRESETS.find(p => p.id === id) : undefined
}
