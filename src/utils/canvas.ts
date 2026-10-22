import type { Theme } from '../types'

/** Canvas 描画用のテーマ別配色 */
export interface CanvasPalette {
  bg: string
  plotBg: string
  grid: string
  axis: string
  text: string
  textMuted: string
  bgStar: string
  sun: string
  earth: string
  accent: string
  aberration: string
  compare: string
}

const DARK: CanvasPalette = {
  bg: '#050912',
  plotBg: '#080e1c',
  grid: 'rgba(120,150,210,0.14)',
  axis: 'rgba(140,170,230,0.45)',
  text: '#cbd5e1',
  textMuted: '#64748b',
  bgStar: '210,225,255',
  sun: '#ffd84d',
  earth: '#4f9bff',
  accent: '#60a5fa',
  aberration: '#fb923c',
  compare: '#f472b6',
}

const LIGHT: CanvasPalette = {
  bg: '#eef3fb',
  plotBg: '#ffffff',
  grid: 'rgba(60,80,130,0.12)',
  axis: 'rgba(60,80,130,0.45)',
  text: '#1e293b',
  textMuted: '#64748b',
  bgStar: '40,55,95',
  sun: '#e0a100',
  earth: '#2563eb',
  accent: '#2563eb',
  aberration: '#ea580c',
  compare: '#db2777',
}

export function getPalette(theme: Theme): CanvasPalette {
  return theme === 'dark' ? DARK : LIGHT
}

/** #rrggbb → rgba() */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/** ライトテーマで淡い恒星色が背景に埋もれないよう暗くする (#rrggbb を返す) */
export function readableStarColor(hex: string, theme: Theme): string {
  if (theme === 'dark') return hex
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const k = 0.6
  const h2 = (v: number) => Math.round(v * k).toString(16).padStart(2, '0')
  return `#${h2(r)}${h2(g)}${h2(b)}`
}

/** 光芒つきの星 */
export function drawGlowStar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  color: string, r: number, alpha = 1
) {
  ctx.save()
  ctx.globalAlpha = alpha
  const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4)
  grd.addColorStop(0, hexToRgba(color, 0.9))
  grd.addColorStop(0.35, hexToRgba(color, 0.35))
  grd.addColorStop(1, hexToRgba(color, 0))
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.arc(x, y, r * 2.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x, y, r * 0.45, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** 擬似乱数 (固定シード) — 背景星の配置を毎回同じにする */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** 背景の遠い恒星 (正規化座標) */
export interface BgStar { x: number; y: number; r: number; a: number; phase: number }

export function makeBackgroundStars(count: number, seed: number): BgStar[] {
  const rnd = seededRandom(seed)
  return Array.from({ length: count }, () => {
    const m = rnd()
    return {
      x: rnd(),
      y: rnd(),
      r: 0.4 + m * m * 1.6,
      a: 0.25 + rnd() * 0.65,
      phase: rnd() * Math.PI * 2,
    }
  })
}

/** 角丸の吹き出しラベル */
export function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number,
  color: string, bg: string,
  align: CanvasTextAlign = 'left'
) {
  ctx.save()
  ctx.font = '600 11px system-ui, sans-serif'
  const w = ctx.measureText(text).width + 10
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.roundRect(left, y - 9, w, 18, 4)
  ctx.fill()
  ctx.fillStyle = color
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, left + 5, y + 0.5)
  ctx.restore()
}
