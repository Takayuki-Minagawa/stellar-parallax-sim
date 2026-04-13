import { useRef, useEffect, useState } from 'react'
import { useSimStore } from '../../store/simulationStore'
import {
  getApparentDirection,
  getEarthPosition,
  distanceToParallax,
  formatParallax,
  formatDistance,
  getStarName,
} from '../../utils/astronomy'
import { useI18n } from '../../hooks/useI18n'

export default function GraphPanel() {
  const { tr } = useI18n()
  const [tab, setTab] = useState<'position' | 'curve'>('position')

  return (
    <div className="h-full flex flex-col bg-gray-900 dark:bg-gray-950 text-gray-100">
      {/* タブ */}
      <div className="flex border-b border-gray-700 shrink-0">
        {(['position', 'curve'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
              tab === t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'position' ? tr('graph.positionPlot') : tr('graph.parallaxCurve')}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        {tab === 'position' ? <PositionPlot /> : <ParallaxCurve />}
      </div>

      {/* 数値表示 */}
      <InfoBar />
    </div>
  )
}

// ─── 見かけ位置プロット ────────────────────────────────────────────────────────

function PositionPlot() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { tr, trArr } = useI18n()
  const earthAngleDeg = useSimStore(s => s.earthAngleDeg)
  const stars = useSimStore(s => s.stars)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    const pad = 36
    const pw = w - pad * 2
    const ph = h - pad * 2

    ctx.fillStyle = '#0a1020'
    ctx.fillRect(0, 0, w, h)

    if (stars.length === 0) { ctx.restore(); return }

    // スケール計算
    const maxShift = Math.max(...stars.map(s => 1 / s.distancePc)) * 1.3
    const scaleX = pw / 2 / maxShift
    const scaleY = ph / 2 / maxShift
    const cx = pad + pw / 2
    const cy = pad + ph / 2

    // グリッド
    ctx.strokeStyle = '#1a2a44'
    ctx.lineWidth = 0.5
    ctx.setLineDash([2, 4])
    for (let i = -3; i <= 3; i++) {
      const x = cx + i * maxShift * scaleX / 3
      const y = cy + i * maxShift * scaleY / 3
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, h - pad); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke()
    }
    ctx.setLineDash([])

    // 軸
    ctx.strokeStyle = '#334466'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(cx, pad); ctx.lineTo(cx, h - pad); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(pad, cy); ctx.lineTo(w - pad, cy); ctx.stroke()

    // 軸ラベル
    ctx.fillStyle = '#556688'
    ctx.font = '9px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(tr('graph.xAxis'), cx, h - 4)
    ctx.save()
    ctx.translate(10, cy)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(tr('graph.yAxis'), 0, 0)
    ctx.restore()

    const monthNames = trArr('months')
    const earthPos = getEarthPosition(earthAngleDeg)

    stars.forEach(star => {
      // 1年分の軌跡
      const trail = Array.from({ length: 361 }, (_, i) => {
        const pos = getEarthPosition((i / 360) * 360)
        return getApparentDirection(star, pos)
      })

      ctx.beginPath()
      trail.forEach((ap, i) => {
        const x = cx + ap.deltaRA * scaleX
        const y = cy - ap.deltaDec * scaleY
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.closePath()
      ctx.strokeStyle = hexToRgba(star.color, 0.5)
      ctx.lineWidth = 1.5
      ctx.stroke()

      // 各月のドット (12点)
      for (let m = 0; m < 12; m++) {
        const pos = getEarthPosition((m / 12) * 360)
        const ap = getApparentDirection(star, pos)
        const x = cx + ap.deltaRA * scaleX
        const y = cy - ap.deltaDec * scaleY
        ctx.beginPath()
        ctx.arc(x, y, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = hexToRgba(star.color, 0.7)
        ctx.fill()
        ctx.fillStyle = hexToRgba(star.color, 0.5)
        ctx.font = '8px sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(monthNames[m] ?? String(m + 1), x + 3, y - 2)
      }

      // 現在位置
      const curr = getApparentDirection(star, earthPos)
      const cx2 = cx + curr.deltaRA * scaleX
      const cy2 = cy - curr.deltaDec * scaleY
      ctx.beginPath()
      ctx.arc(cx2, cy2, 6, 0, Math.PI * 2)
      ctx.fillStyle = star.color
      ctx.fill()
    })

    ctx.restore()
  }, [earthAngleDeg, stars, tr, trArr, canvasSize])

  // リサイズ
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      setCanvasSize({ w: canvas.offsetWidth, h: canvas.offsetHeight })
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
}

// ─── 視差角 vs 距離カーブ ──────────────────────────────────────────────────────

function ParallaxCurve() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { tr } = useI18n()
  const stars = useSimStore(s => s.stars)
  const distanceUnit = useSimStore(s => s.distanceUnit)
  const language = useSimStore(s => s.language)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    const pad = 40
    const pw = w - pad * 2
    const ph = h - pad * 2

    ctx.fillStyle = '#0a1020'
    ctx.fillRect(0, 0, w, h)

    const maxD = 200  // pc
    const maxP = 1.2  // arcsec

    const xToCanvas = (d: number) => pad + (d / maxD) * pw
    const yToCanvas = (p: number) => pad + ph - (p / maxP) * ph

    // グリッド
    ctx.strokeStyle = '#1a2a44'
    ctx.lineWidth = 0.5
    ctx.setLineDash([2, 4])
    for (let d = 0; d <= maxD; d += 20) {
      const x = xToCanvas(d)
      ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, pad + ph); ctx.stroke()
    }
    for (let p = 0; p <= maxP; p += 0.2) {
      const y = yToCanvas(p)
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + pw, y); ctx.stroke()
    }
    ctx.setLineDash([])

    // 反比例カーブ d=1/p
    ctx.beginPath()
    let first = true
    for (let d = 0.5; d <= maxD; d += 0.5) {
      const p = 1 / d
      if (p > maxP) continue
      const x = xToCanvas(d)
      const y = yToCanvas(p)
      if (first) { ctx.moveTo(x, y); first = false }
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = '#4488cc'
    ctx.lineWidth = 2
    ctx.stroke()

    // 軸
    ctx.strokeStyle = '#334466'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, pad + ph); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(pad, pad + ph); ctx.lineTo(pad + pw, pad + ph); ctx.stroke()

    // 軸ラベル
    ctx.fillStyle = '#668899'
    ctx.font = '9px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(tr('graph.parallaxX'), pad + pw / 2, h - 4)
    ctx.save()
    ctx.translate(10, pad + ph / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(tr('graph.parallaxY'), 0, 0)
    ctx.restore()

    // 目盛り
    ctx.fillStyle = '#445566'
    ctx.font = '8px monospace'
    ctx.textAlign = 'center'
    for (let d = 0; d <= maxD; d += 40) {
      ctx.fillText(String(d), xToCanvas(d), pad + ph + 12)
    }
    ctx.textAlign = 'right'
    for (let p = 0; p <= maxP; p += 0.2) {
      ctx.fillText(p.toFixed(1), pad - 4, yToCanvas(p) + 3)
    }

    // 現在の恒星を点でマーク
    stars.forEach(star => {
      const d = star.distancePc
      const p = distanceToParallax(d)
      if (p > maxP || d > maxD) return
      const x = xToCanvas(d)
      const y = yToCanvas(p)

      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fillStyle = star.color
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.fillStyle = star.color
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(getStarName(star, language), x + 8, y - 4)
    })

    ctx.restore()
  }, [stars, distanceUnit, tr, canvasSize, language])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      setCanvasSize({ w: canvas.offsetWidth, h: canvas.offsetHeight })
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
}

// ─── 数値バー ────────────────────────────────────────────────────────────────

function InfoBar() {
  const { tr } = useI18n()
  const stars = useSimStore(s => s.stars)
  const selectedStarId = useSimStore(s => s.selectedStarId)
  const distanceUnit = useSimStore(s => s.distanceUnit)
  const earthAngleDeg = useSimStore(s => s.earthAngleDeg)

  const star = stars.find(s => s.id === selectedStarId) ?? stars[0]
  if (!star) return null

  const earthPos = getEarthPosition(earthAngleDeg)
  const ap = getApparentDirection(star, earthPos)

  return (
    <div className="shrink-0 px-3 py-2 border-t border-gray-700 bg-gray-850 text-xs">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-300">
        <span>
          <span className="text-gray-500">{tr('info.distance')}: </span>
          <span className="text-white font-mono">{formatDistance(star.distancePc, distanceUnit)}</span>
        </span>
        <span>
          <span className="text-gray-500">{tr('info.parallaxAngle')}: </span>
          <span className="text-white font-mono">{formatParallax(star.parallaxArcsec)}</span>
        </span>
        <span>
          <span className="text-gray-500">RA: </span>
          <span className="text-white font-mono">{ap.deltaRA.toFixed(4)}″</span>
        </span>
        <span>
          <span className="text-gray-500">Dec: </span>
          <span className="text-white font-mono">{ap.deltaDec.toFixed(4)}″</span>
        </span>
        <span className="text-blue-400 font-mono">{tr('view.formula')}</span>
      </div>
    </div>
  )
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
