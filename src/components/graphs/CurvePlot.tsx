import { useState, type PointerEvent } from 'react'
import { useSimStore, useSelectedStar } from '../../store/simulationStore'
import {
  distanceToParallax, formatParallax, getStarName, PRECISION_LEVELS, niceStep, formatTick,
} from '../../utils/astronomy'
import { getPalette, readableStarColor } from '../../utils/canvas'
import { useCanvas } from '../../hooks/useCanvas'
import { useI18n } from '../../hooks/useI18n'
import { drawFrame, plotArea, type PlotArea } from './plotUtils'

const PAD = { l: 50, r: 14, t: 12, b: 30 }

interface Axes {
  xOf: (d: number) => number
  yOf: (p: number) => number
  dAt: (x: number) => number
  dMin: number
  dMax: number
}

function makeAxes(area: PlotArea, log: boolean, maxStarD: number): Axes {
  if (log) {
    const lx0 = 0, lx1 = 5     // 1 pc 〜 100,000 pc
    const ly0 = -5, ly1 = 0.3  // 0.00001″ 〜 2″
    return {
      xOf: d => area.left + ((Math.log10(d) - lx0) / (lx1 - lx0)) * area.width,
      yOf: p => area.top + area.height - ((Math.log10(p) - ly0) / (ly1 - ly0)) * area.height,
      dAt: x => 10 ** (lx0 + ((x - area.left) / area.width) * (lx1 - lx0)),
      dMin: 1, dMax: 1e5,
    }
  }
  // 線形表示では 200 pc より遠い星は範囲外 (対数表示で確認する)
  const target = Math.min(200, maxStarD) * 1.3
  const dMax = Math.min(250, Math.max(20, niceStep(target) * Math.ceil(target / niceStep(target))))
  const pMax = 1.1
  return {
    xOf: d => area.left + (d / dMax) * area.width,
    yOf: p => area.top + area.height - (Math.min(p, pMax) / pMax) * area.height,
    dAt: x => ((x - area.left) / area.width) * dMax,
    dMin: 0.5, dMax,
  }
}

/** 視差角 vs 距離 (反比例カーブ / 両対数) — クリックで選択中の恒星の距離を設定 */
export default function CurvePlot() {
  const { tr } = useI18n()
  const stars = useSimStore(s => s.stars)
  const theme = useSimStore(s => s.theme)
  const language = useSimStore(s => s.language)
  const updateStar = useSimStore(s => s.updateStar)
  const markMission = useSimStore(s => s.markMission)
  const selected = useSelectedStar()
  const [log, setLog] = useState(false)
  const [hoverX, setHoverX] = useState<number | null>(null)

  const maxStarD = Math.max(...stars.map(s => s.distancePc))
  const hiddenFar = !log && stars.some(s => s.distancePc > 250)

  const ref = useCanvas((ctx, w, h) => {
    const pal = getPalette(theme)
    const area = plotArea(w, h, PAD)
    const ax = makeAxes(area, log, maxStarD)

    let xTicks: { pos: number; label: string }[]
    let yTicks: { pos: number; label: string }[]
    if (log) {
      xTicks = ['1', '10', '100', '1k', '10k', '100k'].map((label, e) => ({ pos: ax.xOf(10 ** e), label }))
      yTicks = [-5, -4, -3, -2, -1, 0].map(e => ({ pos: ax.yOf(10 ** e), label: e >= -2 ? String(10 ** e) : `1e${e}` }))
    } else {
      const xs = niceStep(ax.dMax / 5)
      xTicks = Array.from({ length: Math.floor(ax.dMax / xs) + 1 }, (_, i) => ({ pos: ax.xOf(i * xs), label: formatTick(i * xs, xs) }))
      yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map(v => ({ pos: ax.yOf(v), label: v.toFixed(1) }))
    }
    drawFrame(ctx, pal, area, { w, h, xTicks, yTicks, xLabel: tr('graph.distAxis'), yLabel: tr('graph.parAxis') })

    ctx.save()
    ctx.beginPath()
    ctx.rect(area.left, area.top, area.width, area.height)
    ctx.clip()

    // 観測精度の限界線 (線形表示ではほぼ 0 に重なるので対数表示のみ)
    if (log) PRECISION_LEVELS.forEach(level => {
      if (level.key === 'naked') return
      const y = ax.yOf(level.limitArcsec)
      if (y < area.top || y > area.top + area.height) return
      ctx.save()
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = level.color
      ctx.globalAlpha = 0.8
      ctx.beginPath(); ctx.moveTo(area.left, y); ctx.lineTo(area.left + area.width, y); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = level.color
      ctx.font = '600 9px system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(tr('graph.limitLabel', { name: tr(`precision.${level.key}Short`), d: (1 / level.limitArcsec).toLocaleString('en-US') }), area.left + area.width - 4, y - 3)
      ctx.restore()
    })

    // d = 1/p
    ctx.beginPath()
    const N = 300
    for (let i = 0; i <= N; i++) {
      const d = log ? 10 ** ((i / N) * 5) : ax.dMin + (i / N) * (ax.dMax - ax.dMin)
      const x = ax.xOf(d)
      const y = ax.yOf(distanceToParallax(d))
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = pal.accent
    ctx.lineWidth = 2.2
    ctx.stroke()

    // ホバー
    if (hoverX !== null) {
      const d = ax.dAt(hoverX)
      if (d >= (log ? 1 : 0.5)) {
        const p = distanceToParallax(d)
        const x = ax.xOf(d)
        const y = ax.yOf(p)
        ctx.save()
        ctx.strokeStyle = pal.textMuted
        ctx.setLineDash([2, 3])
        ctx.beginPath(); ctx.moveTo(x, area.top + area.height); ctx.lineTo(x, y); ctx.lineTo(area.left, y); ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = pal.accent
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill()
        ctx.font = '600 10px ui-monospace, monospace'
        ctx.fillStyle = pal.text
        const label = `d=${+d.toPrecision(3)} pc → p=${formatParallax(p)}`
        const tw = ctx.measureText(label).width
        ctx.textAlign = 'left'
        ctx.fillText(label, Math.min(x + 8, area.left + area.width - tw - 4), Math.max(area.top + 12, y - 8))
        ctx.restore()
      }
    }

    // 恒星
    stars.forEach(star => {
      const d = star.distancePc
      const p = distanceToParallax(d)
      if (d > ax.dMax) return
      const x = ax.xOf(d)
      const y = ax.yOf(p)
      const isSel = star.id === selected.id
      ctx.beginPath()
      ctx.arc(x, y, isSel ? 6 : 4.5, 0, Math.PI * 2)
      ctx.fillStyle = star.color
      ctx.fill()
      ctx.strokeStyle = theme === 'dark' ? '#fff' : '#0f172a'
      ctx.lineWidth = isSel ? 2 : 1
      ctx.stroke()
      ctx.fillStyle = readableStarColor(star.color, theme)
      ctx.font = `${isSel ? 600 : 500} 10px system-ui, sans-serif`
      ctx.textAlign = 'left'
      ctx.fillText(getStarName(star, language), x + 8, y - 6)
    })
    ctx.restore()
  }, [stars, theme, language, log, hoverX, selected, tr, maxStarD])

  const dFromEvent = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const area = plotArea(rect.width, rect.height, PAD)
    const ax = makeAxes(area, log, maxStarD)
    return { x: e.clientX - rect.left, d: ax.dAt(e.clientX - rect.left), area }
  }

  return (
    <div className="absolute inset-0">
      <canvas
        ref={ref}
        className="absolute inset-0 w-full h-full block cursor-crosshair"
        onPointerMove={e => setHoverX(dFromEvent(e).x)}
        onPointerLeave={() => setHoverX(null)}
        onPointerDown={e => {
          const { d } = dFromEvent(e)
          if (d >= 1 && d <= 1e5) {
            updateStar(selected.id, { distancePc: +d.toPrecision(3) })
            markMission('distance')
            markMission('graphClick')
          }
        }}
        role="img"
        aria-label={tr('graph.tabCurve')}
      />
      <div className="absolute top-1.5 right-2 flex items-center gap-2">
        <span className="text-[10px] text-subtle hidden sm:inline">
          {hiddenFar ? tr('graph.farHidden') : tr('graph.clickToSetDist')}
        </span>
        <div className="flex rounded-md overflow-hidden border border-line text-[11px]">
          {[false, true].map(v => (
            <button
              key={String(v)}
              onClick={() => setLog(v)}
              aria-pressed={log === v}
              className={`px-2 py-0.5 ${log === v ? 'bg-accent-strong text-white' : 'bg-panel text-muted hover:bg-hover'}`}
            >
              {v ? tr('graph.logScale') : tr('graph.linearScale')}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
