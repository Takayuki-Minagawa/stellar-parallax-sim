import { useMemo } from 'react'
import { useSimStore, useSelectedStar } from '../../store/simulationStore'
import {
  getEarthPosition, getStarName, starUnitVector, skyAxes, distanceToParallax,
  formatParallax, formatDistance, niceStep, RAD_TO_ARCSEC, AU_PER_PC,
} from '../../utils/astronomy'
import { getPalette, drawGlowStar, makeBackgroundStars, drawLabel, hexToRgba } from '../../utils/canvas'
import { useCanvas } from '../../hooks/useCanvas'
import { useI18n } from '../../hooks/useI18n'
import type { Star } from '../../types'

const BG_STARS = makeBackgroundStars(220, 1234)

/** 恒星から見た地球の太陽からの角距離 [arcsec] (右 = 東, 上 = 北) */
function earthAsSeenFromStar(star: Star, angleDeg: number): { x: number; y: number } {
  const e = getEarthPosition(angleDeg)
  const { east, north } = skyAxes(star)
  const u = starUnitVector(star)
  const dAu = star.distancePc * AU_PER_PC
  // 地球位置の視線に垂直な成分 / 距離 (小角近似)
  const eu = e.x * u.x + e.y * u.y + e.z * u.z
  const k = RAD_TO_ARCSEC / (dAu - eu)
  return {
    x: (e.x * east.x + e.y * east.y + e.z * east.z) * k,
    y: (e.x * north.x + e.y * north.y + e.z * north.z) * k,
  }
}

/**
 * 恒星視点ビュー (発展)
 * 近い恒星から太陽系を望遠鏡で見たときの「太陽と地球の角距離」を表示する。
 * その最大値がちょうど年周視差 p に等しいことを確認できる。
 */
export default function StellarView() {
  const { tr, trArr } = useI18n()
  const star = useSelectedStar()
  const earthAngleDeg = useSimStore(s => s.earthAngleDeg)
  const theme = useSimStore(s => s.theme)
  const language = useSimStore(s => s.language)
  const distanceUnit = useSimStore(s => s.distanceUnit)
  const months = trArr('monthsShort')

  const orbit = useMemo(
    () => (star ? Array.from({ length: 181 }, (_, i) => earthAsSeenFromStar(star, (i / 180) * 360)) : []),
    [star]
  )
  const monthPts = useMemo(
    () => (star ? Array.from({ length: 12 }, (_, m) => earthAsSeenFromStar(star, (m / 12) * 360)) : []),
    [star]
  )

  const canvasRef = useCanvas((ctx, w, h, time) => {
    if (!star) return
    const pal = getPalette(theme)
    const isDark = theme === 'dark'
    const p = distanceToParallax(star.distancePc)

    ctx.fillStyle = isDark ? '#03060d' : pal.bg
    ctx.fillRect(0, 0, w, h)
    for (const s of BG_STARS) {
      const tw = 0.8 + 0.2 * Math.sin(time / 800 + s.phase)
      ctx.fillStyle = `rgba(${pal.bgStar},${s.a * tw * (isDark ? 0.8 : 0.45)})`
      ctx.beginPath()
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2)
      ctx.fill()
    }

    // 望遠鏡の視野
    const cx = w / 2
    const cy = h / 2 + 22
    const fov = Math.min(w * 0.46, (h - 70) * 0.5)
    ctx.save()
    ctx.strokeStyle = hexToRgba(isDark ? '#60a5fa' : '#2563eb', 0.25)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, fov, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    const scale = (fov * 0.66) / p
    const toXY = (pt: { x: number; y: number }) => [cx + pt.x * scale, cy - pt.y * scale] as const

    // 地球の公転軌道 (見かけ)
    ctx.save()
    ctx.beginPath()
    orbit.forEach((pt, i) => {
      const [x, y] = toXY(pt)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = hexToRgba(pal.earth, 0.55)
    ctx.lineWidth = 1.5
    ctx.stroke()
    monthPts.forEach((pt, m) => {
      const [x, y] = toXY(pt)
      ctx.fillStyle = hexToRgba(pal.earth, 0.7)
      ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill()
      const ox = x - cx
      const oy = y - cy
      const len = Math.hypot(ox, oy) || 1
      ctx.fillStyle = pal.textMuted
      ctx.font = '10px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      if (len > 18) ctx.fillText(months[m] ?? '', x + (ox / len) * 13, y + (oy / len) * 11)
    })
    ctx.restore()

    // 最大角距離 = p (楕円の長軸の端)
    const far = orbit.reduce((a, b) => (Math.hypot(b.x, b.y) > Math.hypot(a.x, a.y) ? b : a), orbit[0])
    const [fx, fy] = toXY(far)
    ctx.save()
    ctx.strokeStyle = hexToRgba('#fb7185', 0.8)
    ctx.setLineDash([3, 3])
    ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(fx, fy); ctx.stroke()
    ctx.restore()
    drawLabel(ctx, tr('view.stellarMax', { p: formatParallax(p) }), fx, fy + (fy > cy ? 16 : -16), '#fff', 'rgba(225,29,72,0.85)', 'center')

    // 太陽
    drawGlowStar(ctx, cx, cy, '#ffd84d', 9)
    ctx.fillStyle = pal.sun
    ctx.font = '600 12px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'right'
    ctx.fillText(tr('view.sun'), cx - 12, cy + 16)

    // 地球 (現在)
    const now = earthAsSeenFromStar(star, earthAngleDeg)
    const [ex, ey] = toXY(now)
    ctx.save()
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(15,23,42,0.7)'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke()
    ctx.restore()
    drawGlowStar(ctx, ex, ey, '#4f9bff', 6)

    // 地球のラベル (太陽と反対側に置く)
    const sep = Math.hypot(now.x, now.y)
    const len = Math.hypot(ex - cx, ey - cy) || 1
    drawLabel(
      ctx,
      `${tr('view.earth')}  ${tr('view.stellarNow', { v: formatParallax(sep) })}`,
      ex + ((ex - cx) / len) * 34, ey + ((ey - cy) / len) * 22,
      isDark ? '#bfdbfe' : '#1e3a8a', isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.92)', 'center'
    )

    // タイトル
    ctx.fillStyle = pal.text
    ctx.font = '600 13px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(tr('view.lookingFromStar', { name: getStarName(star, language) }), 14, 62)
    ctx.fillStyle = pal.textMuted
    ctx.font = '11px system-ui, sans-serif'
    ctx.fillText(
      tr('view.stellarDistance', {
        d: formatDistance(star.distancePc, distanceUnit),
        au: formatDistance(star.distancePc, 'au'),
      }),
      14, 79
    )

    // スケールバー
    const barArc = niceStep(90 / scale)
    const barPx = barArc * scale
    ctx.strokeStyle = pal.text
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(14, h - 18); ctx.lineTo(14, h - 14); ctx.lineTo(14 + barPx, h - 14); ctx.lineTo(14 + barPx, h - 18)
    ctx.stroke()
    ctx.fillStyle = pal.text
    ctx.font = '600 11px ui-monospace, monospace'
    ctx.textAlign = 'left'
    ctx.fillText(formatParallax(barArc), 20 + barPx, h - 14)
  }, [], true)

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block"
      role="img"
      aria-label={tr('views.stellarDesc')}
    />
  )
}
