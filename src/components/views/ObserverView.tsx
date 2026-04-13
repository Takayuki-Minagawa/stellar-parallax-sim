import { useRef, useEffect, useMemo } from 'react'
import { useSimStore } from '../../store/simulationStore'
import {
  getApparentDirection,
  getEarthPosition,
  computeTrail,
  getStarName,
  getAberration,
  computeAberrationTrail,
} from '../../utils/astronomy'
import { useI18n } from '../../hooks/useI18n'
import type { Star } from '../../types'

// ─── 定数 ─────────────────────────────────────────────────────────────────────
/** 背景星の数 */
const BG_STAR_COUNT = 200

/** 背景星のランダムシード (固定) */
const bgStars = Array.from({ length: BG_STAR_COUNT }, (_, i) => ({
  x: Math.sin(i * 2.399) * 0.5 + 0.5,
  y: Math.cos(i * 1.618) * 0.5 + 0.5,
  size: 0.5 + ((i * 137.5) % 1.5),
  alpha: 0.3 + ((i * 0.618) % 0.7),
  jitter: ((i * 31.4) % 1) - 0.5,
}))

// ─── ヘルパー ─────────────────────────────────────────────────────────────────
function getScale(stars: Star[], w: number, h: number): number {
  const maxShift = Math.max(...stars.map(s => 1 / s.distancePc))
  const targetFraction = 0.35
  const canvasMin = Math.min(w, h) * targetFraction
  return canvasMin / Math.max(maxShift, 0.01)
}

// ─── メイン ────────────────────────────────────────────────────────────────────
export default function ObserverView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const timeRef = useRef(0)

  const { tr } = useI18n()
  const earthAngleDeg = useSimStore(s => s.earthAngleDeg)
  const stars = useSimStore(s => s.stars)
  const showTrail = useSimStore(s => s.showTrail)
  const compareMode = useSimStore(s => s.compareMode)
  const showAberration = useSimStore(s => s.showAberration)
  const theme = useSimStore(s => s.theme)
  const language = useSimStore(s => s.language)

  const janLabel = tr('view.jan')
  const julLabel = tr('view.jul')

  // 軌跡データ (恒星が変わったとき再計算)
  const trails = useMemo(
    () => stars.map(star => computeTrail(star, 180)),
    [stars]
  )

  // 年周光行差軌跡 (恒星ごと; 距離非依存だが方向に依存)
  const aberrationTrails = useMemo(
    () => stars.map(star => computeAberrationTrail(star, 180)),
    [stars]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frameId: number

    const draw = (timestamp: number) => {
      timeRef.current = timestamp

      const dpr = window.devicePixelRatio || 1
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      const cx = w / 2
      const cy = h / 2

      const isDark = theme === 'dark'
      const bgColor = isDark ? '#050a14' : '#e8f0ff'
      const gridColor = isDark ? '#1a2a44' : '#b0c4e8'

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)

      // ─── 背景 ──────────────────────────────────────────────────
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, w, h)

      // ─── グリッド ──────────────────────────────────────────────
      const scale = getScale(stars, w, h)
      const tickArcsec = bestTickInterval(1 / (stars[0]?.distancePc ?? 1))
      drawGrid(ctx, cx, cy, w, h, scale, tickArcsec, gridColor, isDark)

      // ─── 背景星 ─────────────────────────────────────────────────
      const jitterAmp = 0.3
      const jitterPhase = (timeRef.current / 3000) * Math.PI * 2
      for (const s of bgStars) {
        const jx = s.jitter * jitterAmp * Math.sin(jitterPhase + s.x * 10)
        const jy = s.jitter * jitterAmp * Math.cos(jitterPhase + s.y * 8)
        const bx = s.x * w + jx
        const by = s.y * h + jy
        ctx.beginPath()
        ctx.arc(bx, by, s.size, 0, Math.PI * 2)
        ctx.fillStyle = isDark
          ? `rgba(200,220,255,${s.alpha * 0.6})`
          : `rgba(80,100,160,${s.alpha * 0.4})`
        ctx.fill()
      }

      // ─── 各恒星の軌跡と現在位置 ────────────────────────────────
      const earthPos = getEarthPosition(earthAngleDeg)
      const earthJan = getEarthPosition(0)
      const earthJul = getEarthPosition(180)

      stars.forEach((star, idx) => {
        const trail = trails[idx]
        const curr = getApparentDirection(star, earthPos)

        // 年周光行差の軌跡 (視差スケールで表示)
        if (showAberration) {
          const aberTrail = aberrationTrails[idx]
          ctx.beginPath()
          aberTrail.forEach((ap, i) => {
            const px = cx + ap.deltaRA * scale
            const py = cy - ap.deltaDec * scale
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          })
          ctx.closePath()
          ctx.strokeStyle = hexToRgba('#ffaa44', 0.5)
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 4])
          ctx.stroke()
          ctx.setLineDash([])

          // 光行差の現在位置
          const aberCurr = getAberration(star, earthAngleDeg)
          const abx = cx + aberCurr.deltaRA * scale
          const aby = cy - aberCurr.deltaDec * scale
          ctx.beginPath()
          ctx.arc(abx, aby, 5, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,170,68,0.8)'
          ctx.fill()
        }

        // 視差軌跡
        if (showTrail && trail.length > 1) {
          ctx.beginPath()
          trail.forEach((ap, i) => {
            const px = cx + ap.deltaRA * scale
            const py = cy - ap.deltaDec * scale
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          })
          ctx.closePath()
          ctx.strokeStyle = hexToRgba(star.color, 0.35)
          ctx.lineWidth = 1.2
          ctx.stroke()
        }

        // 比較モード (1月・7月を同時表示)
        if (compareMode) {
          const apJan = getApparentDirection(star, earthJan)
          const apJul = getApparentDirection(star, earthJul)

          drawStarDot(ctx, cx + apJan.deltaRA * scale, cy - apJan.deltaDec * scale, star.color, 7, 0.8, janLabel)
          drawStarDot(ctx, cx + apJul.deltaRA * scale, cy - apJul.deltaDec * scale, star.color, 7, 0.5, julLabel)

          // 比較線
          ctx.beginPath()
          ctx.moveTo(cx + apJan.deltaRA * scale, cy - apJan.deltaDec * scale)
          ctx.lineTo(cx + apJul.deltaRA * scale, cy - apJul.deltaDec * scale)
          ctx.strokeStyle = hexToRgba(star.color, 0.5)
          ctx.lineWidth = 1
          ctx.setLineDash([3, 3])
          ctx.stroke()
          ctx.setLineDash([])
        }

        // 現在位置
        const px = cx + curr.deltaRA * scale
        const py = cy - curr.deltaDec * scale
        drawStarDot(ctx, px, py, star.color, 9, 1.0)

        // 名前ラベル
        ctx.fillStyle = star.color
        ctx.font = `11px sans-serif`
        ctx.fillText(getStarName(star, language) || tr('view.nearStar'), px + 11, py + 4)
      })

      // ─── 中心（基準方向） ──────────────────────────────────────
      ctx.beginPath()
      ctx.arc(cx, cy, 2, 0, Math.PI * 2)
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
      ctx.fill()

      ctx.restore()
      frameId = requestAnimationFrame(draw)
      animRef.current = frameId
    }

    frameId = requestAnimationFrame(draw)
    animRef.current = frameId
    return () => cancelAnimationFrame(frameId)
  }, [earthAngleDeg, stars, trails, aberrationTrails, showTrail, showAberration, compareMode, theme, janLabel, julLabel, language, tr])

  // リサイズ
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        const dpr = window.devicePixelRatio || 1
        canvas.width = width * dpr
        canvas.height = height * dpr
      }
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  )
}

// ─── 補助描画関数 ──────────────────────────────────────────────────────────────

function drawStarDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  r: number,
  alpha: number,
  label?: string
) {
  ctx.save()
  ctx.globalAlpha = alpha
  const grd = ctx.createRadialGradient(x, y, 0, x, y, r)
  grd.addColorStop(0, color)
  grd.addColorStop(1, 'transparent')
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = grd
  ctx.fill()
  if (label) {
    ctx.fillStyle = color
    ctx.font = '10px sans-serif'
    ctx.fillText(label, x + r + 3, y + 4)
  }
  ctx.restore()
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  w: number, h: number,
  scale: number,
  tickArcsec: number,
  color: string,
  isDark: boolean
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 0.5
  ctx.setLineDash([3, 6])

  // 水平・垂直線
  const maxExtent = Math.max(w, h) / 2
  const steps = Math.ceil(maxExtent / (tickArcsec * scale)) + 1
  for (let i = -steps; i <= steps; i++) {
    const px = cx + i * tickArcsec * scale
    const py = cy + i * tickArcsec * scale
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke()
  }

  ctx.setLineDash([])

  // 軸
  ctx.strokeStyle = isDark ? '#334466' : '#8898cc'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke()

  // 目盛りラベル
  ctx.fillStyle = isDark ? '#445566' : '#7788aa'
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'
  for (let i = 1; i <= steps; i++) {
    const val = (i * tickArcsec).toFixed(tickArcsec < 0.1 ? 3 : 2)
    ctx.fillText(`+${val}″`, cx + i * tickArcsec * scale, cy - 4)
    ctx.fillText(`-${val}″`, cx - i * tickArcsec * scale, cy - 4)
  }

  ctx.restore()
}

function bestTickInterval(maxArcsec: number): number {
  const candidates = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100]
  const target = maxArcsec * 0.4
  return candidates.reduce((prev, curr) =>
    Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
  )
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
