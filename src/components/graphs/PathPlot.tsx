import { useMemo } from 'react'
import { useSimStore } from '../../store/simulationStore'
import {
  computeTrail, getApparentOffset, distanceToParallax, niceStep, formatTick,
} from '../../utils/astronomy'
import { getPalette, hexToRgba, drawGlowStar, readableStarColor } from '../../utils/canvas'
import { useCanvas } from '../../hooks/useCanvas'
import { useI18n } from '../../hooks/useI18n'
import { drawFrame, symmetricTicks } from './plotUtils'

/** 見かけの位置の x−y プロット (全恒星を同じスケールで) */
export default function PathPlot() {
  const { tr, trArr } = useI18n()
  const earthAngleDeg = useSimStore(s => s.earthAngleDeg)
  const stars = useSimStore(s => s.stars)
  const selectedStarId = useSimStore(s => s.selectedStarId)
  const theme = useSimStore(s => s.theme)
  const months = trArr('monthsShort')

  const trails = useMemo(() => stars.map(s => computeTrail(s, 180)), [stars])

  const ref = useCanvas((ctx, w, h) => {
    const pal = getPalette(theme)
    const maxP = Math.max(...stars.map(s => distanceToParallax(s.distancePc))) * 1.2
    const size = Math.min(w - 60, h - 42)
    const area = { left: (w - size) / 2 + 12, top: 10, width: size, height: size }
    const cx = area.left + size / 2
    const cy = area.top + size / 2
    const scale = size / 2 / maxP
    const step = niceStep(maxP / 2.5)
    const ticks = symmetricTicks(maxP, step)

    drawFrame(ctx, pal, area, {
      w, h,
      yLabelX: Math.max(11, area.left - 36),
      xTicks: ticks.map(v => ({ pos: cx + v * scale, label: formatTick(v, step), major: v === 0 })),
      yTicks: ticks.map(v => ({ pos: cy - v * scale, label: formatTick(v, step), major: v === 0 })),
      xLabel: tr('graph.xLon'),
      yLabel: tr('graph.yLat'),
    })

    stars.forEach((star, idx) => {
      const isSel = star.id === selectedStarId
      const color = readableStarColor(star.color, theme)
      ctx.save()
      ctx.beginPath()
      trails[idx].forEach((ap, i) => {
        const x = cx + ap.dLon * scale
        const y = cy - ap.dLat * scale
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = hexToRgba(color, isSel ? 0.9 : 0.45)
      ctx.lineWidth = isSel ? 2 : 1.2
      ctx.stroke()

      if (isSel) {
        for (let m = 0; m < 12; m++) {
          const ap = getApparentOffset(star, (m / 12) * 360)
          const x = cx + ap.dLon * scale
          const y = cy - ap.dLat * scale
          ctx.fillStyle = hexToRgba(color, 0.9)
          ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill()
          const ox = x - cx
          const oy = y - cy
          const len = Math.hypot(ox, oy)
          if (len > 20) {
            ctx.fillStyle = pal.textMuted
            ctx.font = '9px system-ui, sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(months[m] ?? '', x + (ox / len) * 12, y + (oy / len) * 10)
          }
        }
      }
      ctx.restore()
      const curr = getApparentOffset(star, earthAngleDeg)
      drawGlowStar(ctx, cx + curr.dLon * scale, cy - curr.dLat * scale, color, isSel ? 5 : 3.5)
    })
  }, [earthAngleDeg, stars, selectedStarId, theme, tr, trails, months])

  return <canvas ref={ref} className="absolute inset-0 w-full h-full block" role="img" aria-label={tr('graph.tabPath')} />
}
