import type { CanvasPalette } from '../../utils/canvas'

export interface PlotArea { left: number; top: number; width: number; height: number }

export function plotArea(w: number, h: number, pad = { l: 46, r: 14, t: 12, b: 30 }): PlotArea {
  return { left: pad.l, top: pad.t, width: Math.max(10, w - pad.l - pad.r), height: Math.max(10, h - pad.t - pad.b) }
}

/** 背景・グリッド・軸ラベルを描く */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  pal: CanvasPalette,
  area: PlotArea,
  opts: {
    xTicks: { pos: number; label: string; major?: boolean }[]
    yTicks: { pos: number; label: string; major?: boolean }[]
    xLabel: string
    yLabel: string
    w: number
    h: number
    /** y 軸ラベルの x 位置 (省略時は左端) */
    yLabelX?: number
  }
) {
  const { left, top, width, height } = area
  ctx.fillStyle = pal.plotBg
  ctx.fillRect(0, 0, opts.w, opts.h)

  ctx.save()
  ctx.lineWidth = 1
  for (const t of opts.xTicks) {
    ctx.strokeStyle = t.major ? pal.axis : pal.grid
    ctx.beginPath(); ctx.moveTo(t.pos, top); ctx.lineTo(t.pos, top + height); ctx.stroke()
  }
  for (const t of opts.yTicks) {
    ctx.strokeStyle = t.major ? pal.axis : pal.grid
    ctx.beginPath(); ctx.moveTo(left, t.pos); ctx.lineTo(left + width, t.pos); ctx.stroke()
  }
  ctx.strokeStyle = pal.axis
  ctx.strokeRect(left + 0.5, top + 0.5, width - 1, height - 1)

  ctx.fillStyle = pal.textMuted
  ctx.font = '10px ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (const t of opts.xTicks) if (t.label) ctx.fillText(t.label, t.pos, top + height + 4)
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (const t of opts.yTicks) if (t.label) ctx.fillText(t.label, left - 5, t.pos)

  ctx.fillStyle = pal.text
  ctx.font = '600 10px system-ui, sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.fillText(opts.xLabel, left + width, opts.h - 1)
  ctx.save()
  ctx.translate(opts.yLabelX ?? 11, top)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText(opts.yLabel, 0, 0)
  ctx.restore()
  ctx.restore()
}

/** -max..max の範囲で step 刻みの値 */
export function symmetricTicks(max: number, step: number): number[] {
  const n = Math.floor(max / step + 1e-9)
  return Array.from({ length: 2 * n + 1 }, (_, i) => (i - n) * step)
}
