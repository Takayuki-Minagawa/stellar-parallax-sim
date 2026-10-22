import { useMemo, type MouseEvent } from 'react'
import { useSimStore } from '../../store/simulationStore'
import {
  getApparentOffset, computeTrail, getStarName, getAberration, computeAberrationTrail,
  distanceToParallax, formatParallax, niceStep, offsetSeparation, ABERRATION_KAPPA,
} from '../../utils/astronomy'
import {
  getPalette, hexToRgba, drawGlowStar, makeBackgroundStars, readableStarColor, drawLabel, fitFont,
} from '../../utils/canvas'
import { useCanvas } from '../../hooks/useCanvas'
import { useI18n } from '../../hooks/useI18n'
import type { ApparentOffset } from '../../types'

const BG_STARS = makeBackgroundStars(260, 42)

/** 角度の目盛り値を読みやすく */
function fmtArc(v: number): string {
  return formatParallax(v)
}

/**
 * 地球視点ビュー
 * 各恒星の「太陽から見た方向」(＋印) を中心に、地球から見た見かけの位置を描く。
 * 全恒星で同じ角度スケールを使うので、近い星ほど大きく揺れることが比較できる。
 */
export default function ObserverView() {
  const { tr, trArr } = useI18n()
  const earthAngleDeg = useSimStore(s => s.earthAngleDeg)
  const stars = useSimStore(s => s.stars)
  const selectedStarId = useSimStore(s => s.selectedStarId)
  const showTrail = useSimStore(s => s.showTrail)
  const compareMode = useSimStore(s => s.compareMode)
  const showAberration = useSimStore(s => s.showAberration)
  const theme = useSimStore(s => s.theme)
  const language = useSimStore(s => s.language)
  const selectStar = useSimStore(s => s.selectStar)

  const trails = useMemo(() => stars.map(star => computeTrail(star, 180)), [stars])
  const monthDots = useMemo(
    () => stars.map(star => Array.from({ length: 12 }, (_, m) => getApparentOffset(star, (m / 12) * 360))),
    [stars]
  )
  const selected = stars.find(s => s.id === selectedStarId) ?? stars[0]
  const aberTrail = useMemo(() => (selected ? computeAberrationTrail(selected, 120) : []), [selected])
  const months = trArr('monthsShort')

  // レイアウト (クリック判定でも使う)
  const insetSize = (w: number, h: number) => Math.min(150, w * 0.3, h * 0.42)
  const layout = (w: number, h: number) => {
    const n = stars.length
    // 光行差のインセットを表示するときは右側を空ける
    const usableW = showAberration ? w - insetSize(w, h) - 16 : w
    const cols = Math.min(n, usableW < 520 ? 2 : n <= 3 ? n : Math.ceil(n / 2))
    const rows = Math.ceil(n / cols)
    const top = 40
    const bottom = 44
    const cw = usableW / cols
    const ch = (h - top - bottom) / rows
    const cells = stars.map((_, i) => {
      const c = i % cols
      const r = Math.floor(i / cols)
      return { x: c * cw, y: top + r * ch, w: cw, h: ch, cx: c * cw + cw / 2, cy: top + r * ch + ch / 2 - 6 }
    })
    const maxP = Math.max(...stars.map(s => distanceToParallax(s.distancePc)))
    const radius = Math.max(10, Math.min(cw * 0.42, ch * 0.36))
    return { cells, scale: radius / maxP, maxP }
  }

  const canvasRef = useCanvas((ctx, w, h, time) => {
    const pal = getPalette(theme)
    const isDark = theme === 'dark'

    // ─── 背景 ──────────────────────────────────────────────
    ctx.fillStyle = pal.bg
    ctx.fillRect(0, 0, w, h)
    for (const s of BG_STARS) {
      const tw = 0.75 + 0.25 * Math.sin(time / 650 + s.phase)
      ctx.fillStyle = `rgba(${pal.bgStar},${s.a * tw * (isDark ? 0.85 : 0.5)})`
      ctx.beginPath()
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2)
      ctx.fill()
    }

    if (stars.length === 0) return
    const { cells, scale } = layout(w, h)
    // 空を見上げた向き (北が上・東が左) で描く
    const toXY = (cell: { cx: number; cy: number }, ap: ApparentOffset) =>
      [cell.cx - ap.dLon * scale, cell.cy - ap.dLat * scale] as const

    stars.forEach((star, idx) => {
      const cell = cells[idx]
      const color = readableStarColor(star.color, theme)
      const textColor = color
      const isSel = star.id === selected?.id
      const p = distanceToParallax(star.distancePc)

      // 選択中のセル
      if (isSel && stars.length > 1) {
        ctx.save()
        ctx.strokeStyle = hexToRgba(isDark ? '#60a5fa' : '#2563eb', 0.35)
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.roundRect(cell.x + 6, cell.y + 4, cell.w - 12, cell.h - 8, 10)
        ctx.stroke()
        ctx.restore()
      }

      // 基準方向 (太陽から見た方向) の十字
      ctx.save()
      ctx.strokeStyle = pal.axis
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cell.cx - 7, cell.cy); ctx.lineTo(cell.cx + 7, cell.cy)
      ctx.moveTo(cell.cx, cell.cy - 7); ctx.lineTo(cell.cx, cell.cy + 7)
      ctx.stroke()
      ctx.restore()

      // 1 年間の軌跡と月の目印
      if (showTrail) {
        ctx.save()
        ctx.beginPath()
        trails[idx].forEach((ap, i) => {
          const [x, y] = toXY(cell, ap)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.strokeStyle = hexToRgba(color, isDark ? 0.55 : 0.8)
        ctx.lineWidth = 1.5
        ctx.stroke()
        const dots = monthDots[idx]
        const big = p * scale > 40
        dots.forEach((ap, m) => {
          const [x, y] = toXY(cell, ap)
          ctx.fillStyle = hexToRgba(color, 0.8)
          ctx.beginPath()
          ctx.arc(x, y, 2.2, 0, Math.PI * 2)
          ctx.fill()
          if (big && isSel) {
            const ox = x - cell.cx
            const oy = y - cell.cy
            const len = Math.hypot(ox, oy) || 1
            ctx.fillStyle = pal.textMuted
            ctx.font = '10px system-ui, sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(months[m] ?? '', x + (ox / len) * 13, y + (oy / len) * 11)
          }
        })
        ctx.restore()
      }

      // 半年比較
      const curr = getApparentOffset(star, earthAngleDeg)
      const [px, py] = toXY(cell, curr)
      if (compareMode) {
        const half = getApparentOffset(star, earthAngleDeg + 180)
        const [qx, qy] = toXY(cell, half)
        ctx.save()
        ctx.strokeStyle = pal.compare
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 3])
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(qx, qy); ctx.stroke()
        ctx.restore()
        ctx.save()
        ctx.strokeStyle = pal.compare
        ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(qx, qy, 6, 0, Math.PI * 2); ctx.stroke()
        ctx.restore()
        const sep = offsetSeparation(curr, half)
        // ラベルは軌跡の上側に置き、恒星や軌跡に重ならないようにする
        const labelY = Math.max(cell.y + 12, cell.cy - p * scale - 16)
        drawLabel(
          ctx, tr('view.halfYearSep', { v: fmtArc(sep) }), cell.cx, labelY,
          '#fff', hexToRgba(pal.compare, 0.85), 'center', { min: cell.x + 4, max: cell.x + cell.w - 4 }
        )
      }

      // 現在位置
      drawGlowStar(ctx, px, py, color, isSel ? 7 : 5.5)

      // セル下部の説明
      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = textColor
      const name = getStarName(star, language) || tr('view.nearStar')
      fitFont(ctx, name, cell.w - 10, 12, isSel ? '600' : '500')
      ctx.fillText(name, cell.cx, cell.y + cell.h - 18)
      ctx.font = '11px ui-monospace, monospace'
      ctx.fillStyle = pal.textMuted
      ctx.fillText(`p = ${formatParallax(p)}`, cell.cx, cell.y + cell.h - 4)
      ctx.restore()
    })

    // ─── スケールバー ──────────────────────────────────────
    const barArc = niceStep(90 / scale)
    const barPx = barArc * scale
    ctx.save()
    const bx = 14
    const by = h - 14
    ctx.strokeStyle = pal.text
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(bx, by - 4); ctx.lineTo(bx, by); ctx.lineTo(bx + barPx, by); ctx.lineTo(bx + barPx, by - 4)
    ctx.stroke()
    ctx.fillStyle = pal.text
    ctx.font = '600 11px ui-monospace, monospace'
    ctx.textAlign = 'left'
    ctx.fillText(fmtArc(barArc), bx + barPx + 6, by)
    // 方位 (天球を見上げた向き)
    ctx.fillStyle = pal.textMuted
    ctx.font = '10px system-ui, sans-serif'
    ctx.fillText(tr('view.compass'), bx, by - 14)
    ctx.restore()

    // ─── 年周光行差との比較 (インセット) ────────────────────
    if (showAberration && selected) {
      const size = insetSize(w, h)
      const ix = w - size - 12
      const iy = 48
      const icx = ix + size / 2
      const icy = iy + size / 2 + 6
      const R = size * 0.34
      ctx.save()
      ctx.fillStyle = isDark ? 'rgba(10,16,30,0.85)' : 'rgba(255,255,255,0.9)'
      ctx.strokeStyle = hexToRgba(isDark ? '#fb923c' : '#ea580c', 0.5)
      ctx.beginPath()
      ctx.roundRect(ix, iy, size, size + 30, 8)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = pal.aberration
      ctx.textAlign = 'center'
      fitFont(ctx, tr('view.aberInsetTitle'), size - 12, 11)
      ctx.fillText(tr('view.aberInsetTitle'), icx, iy + 14)
      ctx.fillStyle = pal.textMuted
      fitFont(ctx, tr('view.aberInsetSub'), size - 12, 9.5, '400')
      ctx.fillText(tr('view.aberInsetSub'), icx, iy + 26)

      // 視差 (正規化)
      const pSel = distanceToParallax(selected.distancePc)
      const selIdx = stars.findIndex(s => s.id === selected.id)
      ctx.beginPath()
      trails[selIdx].forEach((ap, i) => {
        const x = icx - (ap.dLon / pSel) * R
        const y = icy - (ap.dLat / pSel) * R
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = hexToRgba(readableStarColor(selected.color, theme), 0.6)
      ctx.lineWidth = 1.5
      ctx.stroke()
      // 光行差 (正規化)
      ctx.beginPath()
      aberTrail.forEach((ap, i) => {
        const x = icx - (ap.dLon / ABERRATION_KAPPA) * R
        const y = icy - (ap.dLat / ABERRATION_KAPPA) * R
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = pal.aberration
      ctx.setLineDash([4, 3])
      ctx.stroke()
      ctx.setLineDash([])

      const cp = getApparentOffset(selected, earthAngleDeg)
      const ca = getAberration(selected, earthAngleDeg)
      ctx.strokeStyle = pal.axis
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(icx, icy); ctx.lineTo(icx - (cp.dLon / pSel) * R, icy - (cp.dLat / pSel) * R)
      ctx.moveTo(icx, icy); ctx.lineTo(icx - (ca.dLon / ABERRATION_KAPPA) * R, icy - (ca.dLat / ABERRATION_KAPPA) * R)
      ctx.stroke()
      drawGlowStar(ctx, icx - (cp.dLon / pSel) * R, icy - (cp.dLat / pSel) * R, readableStarColor(selected.color, theme), 4)
      drawGlowStar(ctx, icx - (ca.dLon / ABERRATION_KAPPA) * R, icy - (ca.dLat / ABERRATION_KAPPA) * R, '#fb923c', 4)

      ctx.textAlign = 'left'
      const parText = `● ${tr('view.parallaxShort')} ${formatParallax(pSel)}`
      const abText = `● ${tr('view.aberrationShort')} ${ABERRATION_KAPPA.toFixed(1)}″`
      ctx.fillStyle = readableStarColor(selected.color, theme)
      fitFont(ctx, parText, size - 14, 10, '400')
      ctx.fillText(parText, ix + 8, iy + size + 8)
      ctx.fillStyle = pal.aberration
      fitFont(ctx, abText, size - 14, 10, '400')
      ctx.fillText(abText, ix + 8, iy + size + 22)
      ctx.restore()
    }
  }, [], true)

  // クリックで恒星を選択
  const onClick = (e: MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const { cells } = layout(rect.width, rect.height)
    const i = cells.findIndex(c => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h)
    if (i >= 0) selectStar(stars[i].id)
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={onClick}
      className={`absolute inset-0 w-full h-full block ${stars.length > 1 ? 'cursor-pointer' : ''}`}
      role="img"
      aria-label={tr('views.observerDesc')}
    />
  )
}
