import { useMemo, useRef, type PointerEvent } from 'react'
import { useSimStore, useSelectedStar } from '../../store/simulationStore'
import {
  getApparentOffset, getAberration, distanceToParallax, niceStep, formatTick,
  monthToAngle, ABERRATION_KAPPA,
} from '../../utils/astronomy'
import { getPalette, hexToRgba, readableStarColor } from '../../utils/canvas'
import { useCanvas } from '../../hooks/useCanvas'
import { useI18n } from '../../hooks/useI18n'
import { drawFrame, plotArea, symmetricTicks } from './plotUtils'

const PAD = { l: 46, r: 46, t: 22, b: 30 }

/** 見かけの位置の時系列 (クリック/ドラッグで時刻を移動できる) */
export default function TimePlot() {
  const { tr, trArr } = useI18n()
  const earthAngleDeg = useSimStore(s => s.earthAngleDeg)
  const setEarthAngle = useSimStore(s => s.setEarthAngle)
  const setPlaying = useSimStore(s => s.setPlaying)
  const showAberration = useSimStore(s => s.showAberration)
  const markMission = useSimStore(s => s.markMission)
  const theme = useSimStore(s => s.theme)
  const star = useSelectedStar()
  const months = trArr('monthsShort')
  const dragging = useRef(false)

  const series = useMemo(
    () => Array.from({ length: 181 }, (_, i) => {
      const a = (i / 180) * 360
      return { a, par: getApparentOffset(star, a), ab: getAberration(star, a) }
    }),
    [star]
  )

  const ref = useCanvas((ctx, w, h) => {
    const pal = getPalette(theme)
    const color = readableStarColor(star.color, theme)
    const area = plotArea(w, h, PAD)
    const p = distanceToParallax(star.distancePc)
    const maxY = p * 1.25
    const step = niceStep(maxY / 2)
    const xOf = (a: number) => area.left + (a / 360) * area.width
    const yOf = (v: number) => area.top + area.height / 2 - (v / maxY) * (area.height / 2)
    const yAb = (v: number) => area.top + area.height / 2 - (v / (ABERRATION_KAPPA * 1.25)) * (area.height / 2)

    drawFrame(ctx, pal, area, {
      w, h,
      xTicks: Array.from({ length: 12 }, (_, m) => ({ pos: xOf(monthToAngle(m)), label: months[m] ?? '' })),
      yTicks: symmetricTicks(maxY, step).map(v => ({ pos: yOf(v), label: formatTick(v, step), major: v === 0 })),
      xLabel: '',
      yLabel: tr('graph.yTime'),
    })

    const line = (pick: (s: typeof series[number]) => number, y: (v: number) => number, color: string, width: number, dash: number[] = []) => {
      ctx.save()
      ctx.beginPath()
      series.forEach((s, i) => {
        const x = xOf(s.a)
        const yy = y(pick(s))
        if (i === 0) ctx.moveTo(x, yy)
        else ctx.lineTo(x, yy)
      })
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.setLineDash(dash)
      ctx.stroke()
      ctx.restore()
    }

    if (showAberration) {
      line(s => s.ab.dLon, yAb, hexToRgba(pal.aberration, 0.85), 1.5, [5, 3])
      // 右軸
      ctx.save()
      ctx.fillStyle = pal.aberration
      ctx.font = '10px ui-monospace, monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      for (const v of [-20, 0, 20]) ctx.fillText(`${v}″`, area.left + area.width + 5, yAb(v))
      ctx.restore()
    }
    line(s => s.par.dLat, yOf, hexToRgba(color, 0.6), 1.5, [2, 3])
    line(s => s.par.dLon, yOf, color, 2.2)

    // 現在時刻
    const cx = xOf(earthAngleDeg)
    ctx.save()
    ctx.strokeStyle = pal.accent
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(cx, area.top); ctx.lineTo(cx, area.top + area.height); ctx.stroke()
    const now = getApparentOffset(star, earthAngleDeg)
    for (const [v, c] of [[now.dLon, color], [now.dLat, hexToRgba(color, 0.7)]] as const) {
      ctx.fillStyle = c
      ctx.beginPath(); ctx.arc(cx, yOf(v), 4, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()

    // 凡例
    ctx.save()
    ctx.font = '10px system-ui, sans-serif'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    let lx = area.left + 4
    const ly = 10
    const entries: [string, string, number[]][] = [
      [tr('graph.seriesLon'), color, []],
      [tr('graph.seriesLat'), hexToRgba(color, 0.6), [2, 3]],
      ...(showAberration ? [[tr('graph.seriesAber'), pal.aberration, [5, 3]] as [string, string, number[]]] : []),
    ]
    for (const [label, color, dash] of entries) {
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.setLineDash(dash)
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 16, ly); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = pal.text
      ctx.fillText(label, lx + 20, ly)
      lx += 28 + ctx.measureText(label).width
    }
    ctx.fillStyle = pal.textMuted
    ctx.textAlign = 'right'
    ctx.fillText(tr('graph.clickToSeek'), area.left + area.width, ly)
    ctx.restore()
  }, [earthAngleDeg, star, series, showAberration, theme, tr, months])

  const seek = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const area = plotArea(rect.width, rect.height, PAD)
    const f = (e.clientX - rect.left - area.left) / area.width
    if (f < 0 || f > 1) return
    setPlaying(false)
    setEarthAngle(f * 360)
    markMission('graphClick')
  }

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full block cursor-ew-resize touch-none"
      onPointerDown={e => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); seek(e) }}
      onPointerMove={e => { if (dragging.current) seek(e) }}
      onPointerUp={() => { dragging.current = false }}
      onPointerCancel={() => { dragging.current = false }}
      role="img"
      aria-label={tr('graph.tabTime')}
    />
  )
}
