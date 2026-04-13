import type { Star, EarthPosition, ApparentDirection, ParallaxResult } from '../types'

/** 天文単位 [pc] */
export const AU_IN_PC = 1 / 206265

/** 公転角度から地球位置を計算 (XZ平面 = 公転面, Y = 上方向) */
export function getEarthPosition(angleDeg: number): EarthPosition {
  const angle = (angleDeg * Math.PI) / 180
  return {
    angle,
    x: Math.cos(angle),  // 1 au 単位
    z: Math.sin(angle),
  }
}

/** 月番号 (0-based, 0=1月) → 公転角度 [deg] */
export function monthToAngle(month: number): number {
  return (month / 12) * 360
}

/** 公転角度 [deg] → 月番号 (0-based) */
export function angleToMonth(angleDeg: number): number {
  return (angleDeg / 360) * 12
}

/**
 * 地球視点での恒星の見かけ方向ずれを計算
 * @param star 恒星データ
 * @param earthPos 地球位置 (1 au 単位)
 * @returns 見かけ方向ずれ [arcsec]
 *
 * 簡略モデル:
 * - 恒星は赤道面から direction 方向に distancePc [pc] の位置に固定
 * - 地球位置 (ex, 0, ez) [au] から恒星への方向ベクトルを正規化
 * - 恒星方向の基準ベクトルからのずれを arcsec に変換
 */
export function getApparentDirection(
  star: Star,
  earthPos: EarthPosition
): ApparentDirection {
  const d = star.distancePc  // [pc]
  const dAu = d * 206265     // [au]

  // 恒星位置 (au 単位)
  const sx = Math.cos(star.directionRad) * dAu
  const sz = Math.sin(star.directionRad) * dAu
  const sy = 0  // 赤道面

  // 地球から恒星への方向ベクトル
  const dx = sx - earthPos.x
  const dy = sy
  const dz = sz - earthPos.z
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz)

  // 正規化
  const nx = dx / len
  const ny = dy / len
  const nz = dz / len

  // 基準方向 (太陽から見た恒星方向)
  const refLen = Math.sqrt(sx * sx + sy * sy + sz * sz)
  const rx = sx / refLen
  const ry = sy / refLen
  const rz = sz / refLen

  // 基準方向に垂直な 2 軸 (RA 方向, Dec 方向)
  // RA軸: 恒星方向 × Y軸 の垂直方向 (XZ平面内)
  const raX = -rz
  const raZ = rx

  // Dec軸: Y方向
  const decY = 1.0

  // 差分ベクトル
  const diffX = nx - rx
  const diffY = ny - ry
  const diffZ = nz - rz

  // RA, Dec 方向への投影 [rad] → arcsec
  const deltaRA = (diffX * raX + diffZ * raZ) * (180 / Math.PI) * 3600
  const deltaDec = (diffY * decY) * (180 / Math.PI) * 3600

  return { deltaRA, deltaDec }
}

/** 視差角 [arcsec] から距離 [pc] を計算 */
export function parallaxToDistance(parallaxArcsec: number): number {
  if (parallaxArcsec <= 0) return Infinity
  return 1 / parallaxArcsec
}

/** 距離 [pc] から理論視差角 [arcsec] を計算 */
export function distanceToParallax(distancePc: number): number {
  if (distancePc <= 0) return Infinity
  return 1 / distancePc
}

/** 恒星の視差計算結果をまとめて返す */
export function computeParallax(
  star: Star,
  earthAngleDeg: number
): ParallaxResult {
  const earthPos = getEarthPosition(earthAngleDeg)
  const apparent = getApparentDirection(star, earthPos)

  const earthJan = getEarthPosition(0)
  const earthJul = getEarthPosition(180)
  const apparentJan = getApparentDirection(star, earthJan)
  const apparentJul = getApparentDirection(star, earthJul)

  const parallaxArcsec = distanceToParallax(star.distancePc)
  const parallaxAngleFromDist = parallaxArcsec

  return {
    star,
    apparent,
    apparentJan,
    apparentJul,
    parallaxArcsec,
    parallaxAngleFromDist,
  }
}

/** 軌跡計算 — 全月の見かけ方向を返す */
export function computeTrail(star: Star, steps = 360): ApparentDirection[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angleDeg = (i / steps) * 360
    const earthPos = getEarthPosition(angleDeg)
    return getApparentDirection(star, earthPos)
  })
}

/** 距離単位変換 */
export function formatDistance(
  distancePc: number,
  unit: 'pc' | 'ly' | 'au'
): string {
  if (unit === 'pc') return `${distancePc.toFixed(2)} pc`
  if (unit === 'ly') return `${(distancePc * 3.26156).toFixed(2)} ly`
  return `${(distancePc * 206265).toFixed(0)} au`
}

/** 視差角のフォーマット */
export function formatParallax(arcsec: number): string {
  if (arcsec >= 0.01) return `${arcsec.toFixed(4)}″`
  return `${(arcsec * 1000).toFixed(2)} mas`
}
