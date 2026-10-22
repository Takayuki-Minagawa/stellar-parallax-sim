import type { Star, EarthPosition, ApparentOffset, Language, Vec3, DistanceUnit } from '../types'

// ─── 定数 ─────────────────────────────────────────────────────────────────────

/** 1 pc あたりの au */
export const AU_PER_PC = 206264.806
/** 1 pc あたりの光年 */
export const LY_PER_PC = 3.26156
/** rad → arcsec */
export const RAD_TO_ARCSEC = (180 / Math.PI) * 3600
/** 光行差定数 κ [arcsec] (地球の公転速度 ÷ 光速) */
export const ABERRATION_KAPPA = 20.4955
/**
 * 1月1日頃の地球の日心黄経 [deg]
 * (この頃の太陽の地心黄経は約 280°、地球はその反対側)
 */
export const EARTH_LON_AT_JAN1_DEG = 100

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const DEG = Math.PI / 180

/** 言語に応じた恒星名を返す */
export function getStarName(star: Pick<Star, 'name' | 'nameEn'>, lang: Language): string {
  return lang === 'en' ? star.nameEn : star.name
}

// ─── ベクトル ─────────────────────────────────────────────────────────────────

const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z

/** 恒星方向の単位ベクトル (黄道座標系) */
export function starUnitVector(star: Pick<Star, 'eclLonDeg' | 'eclLatDeg'>): Vec3 {
  const l = star.eclLonDeg * DEG
  const b = star.eclLatDeg * DEG
  return { x: Math.cos(b) * Math.cos(l), y: Math.cos(b) * Math.sin(l), z: Math.sin(b) }
}

/** 恒星位置での天球面上の局所軸 (東 = 黄経増加方向, 北 = 黄緯増加方向) */
export function skyAxes(star: Pick<Star, 'eclLonDeg' | 'eclLatDeg'>): { east: Vec3; north: Vec3 } {
  const l = star.eclLonDeg * DEG
  const b = star.eclLatDeg * DEG
  return {
    east: { x: -Math.sin(l), y: Math.cos(l), z: 0 },
    north: { x: -Math.sin(b) * Math.cos(l), y: -Math.sin(b) * Math.sin(l), z: Math.cos(b) },
  }
}

// ─── 地球の公転 ───────────────────────────────────────────────────────────────

/**
 * 公転角度 [deg] (0 = 1月1日頃) から地球位置を計算
 * 黄道座標系: xy 平面 = 黄道面, z = 黄道北極方向, 単位 au
 */
export function getEarthPosition(angleDeg: number): EarthPosition {
  const lon = (angleDeg + EARTH_LON_AT_JAN1_DEG) * DEG
  return { lon, x: Math.cos(lon), y: Math.sin(lon), z: 0 }
}

/** 公転角度 [deg] → おおよその日付 (month: 0-based) */
export function angleToDate(angleDeg: number): { month: number; day: number } {
  const a = ((angleDeg % 360) + 360) % 360
  // 月初の角度 (monthToAngle) が浮動小数点誤差や URL 保存時の丸め (小数 2 桁 ≈ 0.005 日)
  // で前日にならないよう 0.01 日 (約 14 分) の余裕をもたせる
  let dayOfYear = Math.floor((a / 360) * 365 + 0.01)
  let month = 0
  while (month < 11 && dayOfYear >= DAYS_IN_MONTH[month]) {
    dayOfYear -= DAYS_IN_MONTH[month]
    month++
  }
  return { month, day: dayOfYear + 1 }
}

/** 月番号 (0-based) → 公転角度 [deg] (月初) */
export function monthToAngle(month: number): number {
  let days = 0
  for (let i = 0; i < month; i++) days += DAYS_IN_MONTH[i]
  return (days / 365) * 360
}

/**
 * 1 か月送り / 戻し (実際の月の長さに合わせて月初へ移動)
 * 戻すときは、月の途中なら今月の月初、月初ならその前の月の月初へ
 */
export function stepMonth(angleDeg: number, dir: 1 | -1): number {
  const { month, day } = angleToDate(angleDeg)
  if (dir > 0) return monthToAngle((month + 1) % 12)
  return monthToAngle(day > 1 ? month : (month + 11) % 12)
}

// ─── 視差 ─────────────────────────────────────────────────────────────────────

/** 距離 [pc] → 視差角 [arcsec] */
export function distanceToParallax(distancePc: number): number {
  if (distancePc <= 0) return Infinity
  return 1 / distancePc
}

/** 視差角 [arcsec] → 距離 [pc] */
export function parallaxToDistance(parallaxArcsec: number): number {
  if (parallaxArcsec <= 0) return Infinity
  return 1 / parallaxArcsec
}

/**
 * 地球から見た恒星の見かけ方向のずれ (太陽から見た方向が基準)
 *
 * 1. 恒星を d [au] の位置に置き、地球→恒星の単位ベクトルを求める
 * 2. 太陽→恒星の単位ベクトルとの差を、天球面の東・北軸に射影
 * 3. rad → arcsec
 *
 * 結果は p = 1/d を長半径、p |sin β| を短半径とする楕円になる
 */
export function getApparentOffset(star: Star, angleDeg: number): ApparentOffset {
  const u = starUnitVector(star)
  const { east, north } = skyAxes(star)
  const e = getEarthPosition(angleDeg)
  const dAu = star.distancePc * AU_PER_PC

  const dx = u.x * dAu - e.x
  const dy = u.y * dAu - e.y
  const dz = u.z * dAu - e.z
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
  const diff = { x: dx / len - u.x, y: dy / len - u.y, z: dz / len - u.z }

  return {
    dLon: dot(diff, east) * RAD_TO_ARCSEC,
    dLat: dot(diff, north) * RAD_TO_ARCSEC,
  }
}

/** 1 年分の見かけの軌跡 (steps + 1 点, 最初と最後は同じ位置) */
export function computeTrail(star: Star, steps = 180): ApparentOffset[] {
  return Array.from({ length: steps + 1 }, (_, i) => getApparentOffset(star, (i / steps) * 360))
}

/** 視差楕円の形: 長半径 a = p, 短半径 b = p |sin β| */
export function parallaxEllipse(star: Star): { a: number; b: number; ratio: number } {
  const p = distanceToParallax(star.distancePc)
  const ratio = Math.abs(Math.sin(star.eclLatDeg * DEG))
  return { a: p, b: p * ratio, ratio }
}

/**
 * 半年離れた 2 時点のずれが最大 (= 2p) になる公転角度 [deg] (0〜180)
 * 地球が恒星の方向と直角の位置に来るとき
 */
export function maxShiftAngleDeg(star: Star): number {
  const a = star.eclLonDeg + 90 - EARTH_LON_AT_JAN1_DEG
  return ((a % 180) + 180) % 180
}

/** 2 つの見かけ位置の角距離 [arcsec] */
export function offsetSeparation(a: ApparentOffset, b: ApparentOffset): number {
  return Math.hypot(a.dLon - b.dLon, a.dLat - b.dLat)
}

// ─── 年周光行差 ───────────────────────────────────────────────────────────────

/**
 * 年周光行差による見かけ方向のずれ [arcsec]
 * 光は地球の速度方向 v̂ に向かって κ だけ傾いて見える (距離には依存しない)
 * Δ = κ (v̂ − (v̂·u) u) を天球面の東・北軸に射影
 * → 長半径 κ・短半径 κ|sin β| の楕円。視差とは位相が 90° ずれる
 */
export function getAberration(star: Star, angleDeg: number): ApparentOffset {
  const { east, north } = skyAxes(star)
  const lon = getEarthPosition(angleDeg).lon
  const v = { x: -Math.sin(lon), y: Math.cos(lon), z: 0 }
  return {
    dLon: ABERRATION_KAPPA * dot(v, east),
    dLat: ABERRATION_KAPPA * dot(v, north),
  }
}

export function computeAberrationTrail(star: Star, steps = 180): ApparentOffset[] {
  return Array.from({ length: steps + 1 }, (_, i) => getAberration(star, (i / steps) * 360))
}

// ─── 書式 ─────────────────────────────────────────────────────────────────────

function fmtNum(v: number, sig = 3): string {
  if (!isFinite(v)) return '∞'
  if (v >= 1000) return Math.round(v).toLocaleString('en-US')
  const digits = Math.max(0, sig - 1 - Math.floor(Math.log10(Math.abs(v) || 1)))
  return v.toFixed(Math.min(digits, 4))
}

/** 距離を単位付きで表示 */
export function formatDistance(distancePc: number, unit: DistanceUnit): string {
  if (unit === 'pc') return `${fmtNum(distancePc, 4)} pc`
  if (unit === 'ly') return `${fmtNum(distancePc * LY_PER_PC, 4)} ly`
  return `${fmtNum(distancePc * AU_PER_PC, 4)} au`
}

/** 視差角を ″ / mas で表示 */
export function formatParallax(arcsec: number): string {
  if (!isFinite(arcsec)) return '∞'
  const abs = Math.abs(arcsec)
  if (abs >= 1) return `${arcsec.toFixed(3)}″`
  if (abs >= 0.01) return `${arcsec.toFixed(4)}″`
  if (abs >= 0.00001) return `${fmtNum(arcsec * 1000, 3)} mas`
  return `${fmtNum(arcsec * 1e6, 3)} µas`
}

/** 符号付きの角度 [arcsec] */
export function formatSignedArcsec(arcsec: number, digits = 3): string {
  const v = Math.abs(arcsec) < 0.5 * 10 ** -digits ? 0 : arcsec
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}″`
}

/**
 * グラフの角度目盛りの単位: 0.01″ 未満の範囲は mas (ミリ秒角) で表示して桁を減らす
 */
export function angleAxisUnit(maxArcsec: number): { factor: number; unit: '″' | 'mas' } {
  return maxArcsec < 0.01 ? { factor: 1000, unit: 'mas' } : { factor: 1, unit: '″' }
}

/** 目盛り間隔を 1-2-5 系列から選ぶ */
export function niceStep(raw: number): number {
  if (raw <= 0 || !isFinite(raw)) return 1
  const exp = Math.floor(Math.log10(raw))
  const base = raw / 10 ** exp
  const m = base < 1.5 ? 1 : base < 3.5 ? 2 : base < 7.5 ? 5 : 10
  return m * 10 ** exp
}

/** 目盛りラベル (step に応じた小数桁) */
export function formatTick(v: number, step: number): string {
  const digits = Math.max(0, -Math.floor(Math.log10(step) + 1e-9))
  return v.toFixed(digits)
}

// ─── 観測精度 ─────────────────────────────────────────────────────────────────

export interface PrecisionLevel {
  /** ロケールキーの接尾辞 (precision.<key>) */
  key: 'naked' | 'ground' | 'hipparcos' | 'gaia'
  /** 測定できる最小の視差角 (おおよそ) [arcsec] */
  limitArcsec: number
  color: string
}

export const PRECISION_LEVELS: PrecisionLevel[] = [
  { key: 'naked',     limitArcsec: 60,      color: '#f472b6' },
  { key: 'ground',    limitArcsec: 0.01,    color: '#34d399' },
  { key: 'hipparcos', limitArcsec: 0.001,   color: '#60a5fa' },
  { key: 'gaia',      limitArcsec: 0.00002, color: '#fbbf24' },
]

/** その視差角を測定できる最も身近な手段 (なければ undefined) */
export function simplestDetector(parallaxArcsec: number): PrecisionLevel | undefined {
  return PRECISION_LEVELS.find(l => parallaxArcsec >= l.limitArcsec)
}
