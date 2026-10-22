import { useMemo, useState } from 'react'
import { useSimStore, nextStarId } from '../../store/simulationStore'
import { useI18n } from '../../hooks/useI18n'
import {
  computeTrail, getApparentOffset, distanceToParallax, niceStep, formatTick, formatParallax,
} from '../../utils/astronomy'
import { getPalette, hexToRgba, drawGlowStar, readableStarColor } from '../../utils/canvas'
import { useCanvas } from '../../hooks/useCanvas'
import { drawFrame, symmetricTicks } from '../graphs/plotUtils'
import type { Star } from '../../types'

const TOLERANCE = 0.12
const COLORS = ['#ff9de2', '#8be9fd', '#ffd36e', '#a6f39a', '#c4a7ff']

function makeMystery(level: 'easy' | 'hard'): Star {
  const [lo, hi] = level === 'easy' ? [1.2, 6] : [6, 40]
  const d = +(10 ** (Math.log10(lo) + Math.random() * (Math.log10(hi) - Math.log10(lo)))).toPrecision(2)
  return {
    id: 'mystery',
    name: '謎の恒星',
    nameEn: 'Mystery Star',
    distancePc: d,
    eclLatDeg: Math.round(-75 + Math.random() * 150),
    eclLonDeg: Math.round(Math.random() * 360),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }
}

/** 観測チャレンジ: 見かけの軌跡のグラフから視差角を読み取り、距離を求める */
export default function ChallengeTab() {
  const { tr, trArr } = useI18n()
  const theme = useSimStore(s => s.theme)
  const markMission = useSimStore(s => s.markMission)
  const [level, setLevel] = useState<'easy' | 'hard'>('easy')
  const [star, setStar] = useState(() => makeMystery('easy'))
  const [pText, setPText] = useState('')
  const [dText, setDText] = useState('')
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [solved, setSolved] = useState(0)
  const [added, setAdded] = useState(false)
  const months = trArr('monthsShort')

  const p = distanceToParallax(star.distancePc)
  const trail = useMemo(() => computeTrail(star, 180), [star])

  const ref = useCanvas((ctx, w, h) => {
    const pal = getPalette(theme)
    const color = readableStarColor(star.color, theme)
    const size = Math.min(w - 44, h - 30)
    const area = { left: (w - size) / 2 + 14, top: 6, width: size, height: size }
    const cx = area.left + size / 2
    const cy = area.top + size / 2
    const step = niceStep(p / (level === 'easy' ? 3 : 2.5))
    const range = Math.ceil((p * 1.15) / step) * step
    const scale = size / 2 / range
    const ticks = symmetricTicks(range, step)
    drawFrame(ctx, pal, area, {
      w, h,
      yLabelX: Math.max(11, area.left - 36),
      xTicks: ticks.map(v => ({ pos: cx - v * scale, label: v === 0 || Math.abs(v) === range ? formatTick(v, step) : '', major: v === 0 })),
      yTicks: ticks.map(v => ({ pos: cy - v * scale, label: formatTick(v, step), major: v === 0 })),
      xLabel: tr('graph.xEastLeft'),
      yLabel: '″',
    })
    // 細かい目盛り (x 軸上)
    ctx.save()
    ctx.strokeStyle = pal.axis
    for (let v = -range; v <= range + 1e-9; v += step / 5) {
      const x = cx + v * scale
      ctx.beginPath(); ctx.moveTo(x, cy - 3); ctx.lineTo(x, cy + 3); ctx.stroke()
      const y = cy - v * scale
      ctx.beginPath(); ctx.moveTo(cx - 3, y); ctx.lineTo(cx + 3, y); ctx.stroke()
    }
    ctx.restore()

    ctx.beginPath()
    trail.forEach((ap, i) => {
      const x = cx - ap.dLon * scale
      const y = cy - ap.dLat * scale
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = hexToRgba(color, 0.9)
    ctx.lineWidth = 1.8
    ctx.stroke()
    for (let m = 0; m < 12; m++) {
      const ap = getApparentOffset(star, (m / 12) * 360)
      const x = cx - ap.dLon * scale
      const y = cy - ap.dLat * scale
      drawGlowStar(ctx, x, y, color, 2.6)
      const ox = x - cx
      const oy = y - cy
      const len = Math.hypot(ox, oy)
      if (len > 16) {
        ctx.fillStyle = pal.textMuted
        ctx.font = '9px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(months[m] ?? '', x + (ox / len) * 11, y + (oy / len) * 9)
      }
    }
  }, [star, trail, theme, level, months, p])

  const check = () => {
    const d = parseFloat(dText)
    if (!(d > 0)) return
    const ok = Math.abs(d - star.distancePc) / star.distancePc <= TOLERANCE
    setResult(ok ? 'correct' : 'wrong')
    if (ok && result !== 'correct') {
      setSolved(n => n + 1)
      markMission('challenge')
    }
  }

  const fillDFromP = () => {
    const pv = parseFloat(pText)
    if (pv > 0) setDText(String(+(1 / pv).toPrecision(3)))
  }

  const newStar = (lv = level) => {
    setStar(makeMystery(lv))
    setPText('')
    setDText('')
    setResult(null)
    setShowHint(false)
    setAdded(false)
  }

  const addToSim = () => {
    const st = useSimStore.getState()
    const n = st.stars.filter(s => s.name.startsWith(star.name)).length + 1
    const s: Star = { ...star, id: nextStarId(), name: `${star.name} ${n}`, nameEn: `${star.nameEn} ${n}` }
    st.setStars([...st.stars, s], st.stars.length)
    setAdded(true)
  }

  return (
    <div className="px-3 py-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted">{tr('challenge.solved', { n: solved })}</div>
        <div className="flex rounded-md overflow-hidden border border-line text-[11px]">
          {(['easy', 'hard'] as const).map(lv => (
            <button
              key={lv}
              onClick={() => { setLevel(lv); newStar(lv) }}
              aria-pressed={level === lv}
              className={`px-2 py-0.5 ${level === lv ? 'bg-accent-strong text-white' : 'bg-panel text-muted hover:bg-hover'}`}
            >
              {tr(`challenge.${lv}`)}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted leading-relaxed">{tr('challenge.intro')}</p>

      <div className="relative w-full aspect-square max-h-[300px] mx-auto rounded-md overflow-hidden border border-line">
        <canvas ref={ref} className="absolute inset-0 w-full h-full block" role="img" aria-label={tr('challenge.plotLabel')} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-muted space-y-1">
          <span>{tr('challenge.inputP')}</span>
          <input
            type="number" step="any" min={0} inputMode="decimal"
            value={pText}
            onChange={e => setPText(e.target.value)}
            onBlur={fillDFromP}
            className="field w-full font-mono"
            placeholder="0.00"
          />
        </label>
        <label className="text-[11px] text-muted space-y-1">
          <span>{tr('challenge.inputD')}</span>
          <input
            type="number" step="any" min={0} inputMode="decimal"
            value={dText}
            onChange={e => setDText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') check() }}
            className="field w-full font-mono"
            placeholder="0.0"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button onClick={check} className="btn-primary flex-1 py-2 text-sm" disabled={!(parseFloat(dText) > 0)}>
          {tr('challenge.check')}
        </button>
        <button onClick={() => setShowHint(v => !v)} className="btn-ghost px-3 py-2">💡 {tr('challenge.hint')}</button>
      </div>

      {showHint && (
        <div className="rounded-md p-2.5 text-[11px] text-muted bg-amber-400/10 border border-amber-400/30 leading-relaxed animate-fade-in">
          {tr('challenge.hintText')}
        </div>
      )}

      {result && (
        <div className={`rounded-md p-3 text-xs border-l-4 animate-fade-in space-y-1.5 ${
          result === 'correct' ? 'bg-green-500/10 border-green-500' : 'bg-red-500/10 border-red-500'
        }`}>
          <div className={`font-semibold ${result === 'correct' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
            {result === 'correct' ? `🎉 ${tr('challenge.correct')}` : `🤔 ${tr('challenge.wrong')}`}
          </div>
          {result === 'correct' && (
            <div className="text-muted leading-relaxed">
              {tr('challenge.solution', { p: formatParallax(p), d: star.distancePc, ly: +(star.distancePc * 3.26).toPrecision(3) })}
            </div>
          )}
          {result === 'correct' ? (
            <div className="flex gap-2 pt-1">
              <button onClick={() => newStar()} className="btn-primary flex-1 py-1.5">{tr('challenge.next')} →</button>
              <button onClick={addToSim} disabled={added} className="btn-ghost flex-1 py-1.5">
                {added ? `✓ ${tr('challenge.added')}` : tr('challenge.addToSim')}
              </button>
            </div>
          ) : (
            <button onClick={() => setResult(null)} className="btn-ghost w-full py-1.5">{tr('challenge.retry')}</button>
          )}
        </div>
      )}

      {!result && (
        <button onClick={() => newStar()} className="w-full text-[11px] text-subtle hover:text-fg underline-offset-2 hover:underline">
          {tr('challenge.skip')}
        </button>
      )}
    </div>
  )
}
