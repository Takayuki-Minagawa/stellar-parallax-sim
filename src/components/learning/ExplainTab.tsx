import { useState, type ReactNode } from 'react'
import { useSimStore, useSelectedStar } from '../../store/simulationStore'
import { useI18n } from '../../hooks/useI18n'
import {
  distanceToParallax, formatParallax, formatDistance, getStarName, getApparentOffset,
  parallaxEllipse, angleToDate, maxShiftAngleDeg, PRECISION_LEVELS, ABERRATION_KAPPA, LY_PER_PC, AU_PER_PC,
} from '../../utils/astronomy'
import { findPreset } from '../../data/starPresets'

export default function ExplainTab() {
  return (
    <div className="px-3 py-3 space-y-3">
      <StarCard />
      <NowCard />
      <Concepts />
      <Calculator />
    </div>
  )
}

// ─── 選択中の恒星 ─────────────────────────────────────────────────────────────

function StarCard() {
  const { tr } = useI18n()
  const star = useSelectedStar()
  const language = useSimStore(s => s.language)
  const p = distanceToParallax(star.distancePc)
  const { ratio } = parallaxEllipse(star)
  const preset = findPreset(star.presetId)
  const shapeKey = ratio > 0.95 ? 'circle' : ratio < 0.08 ? 'line' : 'ellipse'

  return (
    <div className="card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full ring-2 ring-white/10" style={{ background: star.color, boxShadow: `0 0 10px ${star.color}` }} />
        <span className="font-semibold text-sm">{getStarName(star, language)}</span>
      </div>
      {preset?.noteKey && <p className="text-[11px] text-muted leading-snug">{tr(preset.noteKey)}</p>}

      <div className="grid grid-cols-3 gap-1 text-center">
        {(['pc', 'ly', 'au'] as const).map(u => (
          <div key={u} className="rounded bg-panel border border-line px-1 py-1">
            <div className="text-[10px] text-subtle">{tr(`controls.unitNames.${u}`)}</div>
            <div className="text-[11px] font-mono text-fg truncate">{formatDistance(star.distancePc, u)}</div>
          </div>
        ))}
      </div>

      <div className="rounded-md bg-accent/10 border border-accent/30 px-2.5 py-2 font-mono text-xs text-fg">
        <div className="text-[10px] font-sans text-subtle mb-0.5">{tr('explain.formulaTitle')}</div>
        p = 1 / d = 1 / {+star.distancePc.toPrecision(4)} = <b className="text-accent">{formatParallax(p)}</b>
      </div>

      <div className="flex gap-2 items-center">
        <EllipseIcon ratio={ratio} color={star.color} />
        <p className="text-[11px] text-muted leading-snug">
          {tr(`explain.shape.${shapeKey}`, { beta: star.eclLatDeg.toFixed(0), ratio: ratio.toFixed(2) })}
        </p>
      </div>
    </div>
  )
}

function EllipseIcon({ ratio, color }: { ratio: number; color: string }) {
  return (
    <svg width="44" height="30" viewBox="-22 -15 44 30" className="shrink-0" aria-hidden>
      <line x1="-20" y1="0" x2="20" y2="0" stroke="currentColor" className="text-line" />
      <line x1="0" y1="-13" x2="0" y2="13" stroke="currentColor" className="text-line" />
      <ellipse rx="17" ry={Math.max(0.6, 13 * ratio)} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  )
}

// ─── いま起きていること ───────────────────────────────────────────────────────

function NowCard() {
  const { tr, trArr } = useI18n()
  const star = useSelectedStar()
  const earthAngleDeg = useSimStore(s => s.earthAngleDeg)
  const viewMode = useSimStore(s => s.viewMode)
  const compareMode = useSimStore(s => s.compareMode)
  const stars = useSimStore(s => s.stars)
  const months = trArr('months')

  const p = distanceToParallax(star.distancePc)
  const ap = getApparentOffset(star, earthAngleDeg)
  const frac = Math.hypot(ap.dLon, ap.dLat) / p
  const { month } = angleToDate(earthAngleDeg)
  const a1 = maxShiftAngleDeg(star)
  const m1 = angleToDate(a1).month
  const m2 = angleToDate(a1 + 180).month

  const tips: string[] = [tr(`explain.view.${viewMode}`)]
  if (star.distancePc < 3) tips.push(tr('explain.tipNear'))
  else if (star.distancePc > 50) tips.push(tr('explain.tipFar'))
  if (compareMode) tips.push(tr('explain.tipCompare', { m1: months[Math.min(m1, m2)], m2: months[Math.max(m1, m2)], v: formatParallax(2 * p) }))
  else tips.push(tr('explain.tipTryCompare'))
  if (stars.length === 1) tips.push(tr('explain.tipAddStar'))

  return (
    <div className="space-y-1.5">
      <div className="section-title">{tr('explain.nowTitle')}</div>
      <div className="rounded-md border-l-2 border-accent bg-card px-3 py-2 text-xs text-fg leading-relaxed">
        {tr('explain.now', {
          month: months[month] ?? '',
          pct: Math.round(frac * 100),
        })}
        <div className="mt-1.5 h-1.5 rounded-full bg-hover overflow-hidden" aria-hidden>
          <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${Math.min(100, frac * 100)}%` }} />
        </div>
      </div>
      {tips.map((t, i) => (
        <div key={i} className="flex gap-2 text-[11px] text-muted leading-snug px-1">
          <span className="text-accent shrink-0">›</span>
          <span>{t}</span>
        </div>
      ))}
    </div>
  )
}

// ─── 概念カード ───────────────────────────────────────────────────────────────

function Concept({ icon, title, children, defaultOpen = false, tone = 'default' }: {
  icon: string
  title: string
  children: ReactNode
  defaultOpen?: boolean
  tone?: 'default' | 'indigo' | 'amber' | 'green'
}) {
  const toneCls = {
    default: 'border-line bg-card',
    indigo: 'border-indigo-500/30 bg-indigo-500/5',
    amber: 'border-amber-500/30 bg-amber-500/5',
    green: 'border-emerald-500/30 bg-emerald-500/5',
  }[tone]
  return (
    <details className={`group rounded-md border ${toneCls}`} open={defaultOpen}>
      <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none list-none text-xs font-semibold text-fg [&::-webkit-details-marker]:hidden">
        <span aria-hidden>{icon}</span>
        <span className="flex-1">{title}</span>
        <span className="text-subtle transition-transform group-open:rotate-90" aria-hidden>›</span>
      </summary>
      <div className="px-3 pb-3 text-[11px] text-muted leading-relaxed space-y-1.5">{children}</div>
    </details>
  )
}

function Concepts() {
  const { tr } = useI18n()
  const star = useSelectedStar()
  const p = distanceToParallax(star.distancePc)

  return (
    <div className="space-y-1.5">
      <div className="section-title">{tr('explain.conceptsTitle')}</div>

      <Concept icon="🌍" title={tr('concepts.what.title')} defaultOpen tone="indigo">
        <p>{tr('concepts.what.body')}</p>
        <ParallaxDiagram />
      </Concept>

      <Concept icon="📐" title={tr('concepts.parsec.title')} tone="indigo">
        <p>{tr('concepts.parsec.body')}</p>
        <div className="font-mono text-accent">1 pc ≈ 3.26 ly ≈ 206,265 au</div>
        <p>{tr('concepts.parsec.scale')}</p>
      </Concept>

      <Concept icon="⭕" title={tr('concepts.shape.title')}>
        <p>{tr('concepts.shape.body')}</p>
        <p>{tr('concepts.shape.twoP')}</p>
      </Concept>

      <Concept icon="🌀" title={tr('concepts.aberration.title')} tone="amber">
        <p>{tr('concepts.aberration.body')}</p>
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="text-subtle">
              <th className="text-left font-medium py-0.5"></th>
              <th className="text-left font-medium">{tr('concepts.aberration.colParallax')}</th>
              <th className="text-left font-medium">{tr('concepts.aberration.colAberration')}</th>
            </tr>
          </thead>
          <tbody className="text-fg">
            {['cause', 'size', 'distance', 'phase'].map(row => (
              <tr key={row} className="border-t border-line">
                <td className="py-1 pr-1 text-subtle whitespace-nowrap">{tr(`concepts.aberration.rows.${row}.label`)}</td>
                <td className="py-1 pr-1">{tr(`concepts.aberration.rows.${row}.parallax`, { p: formatParallax(p) })}</td>
                <td className="py-1">{tr(`concepts.aberration.rows.${row}.aberration`, { k: ABERRATION_KAPPA.toFixed(1) })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Concept>

      <Concept icon="🔭" title={tr('concepts.precision.title')} tone="green">
        <p>{tr('concepts.precision.body')}</p>
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="text-subtle">
              <th className="text-left font-medium py-0.5">{tr('concepts.precision.colMethod')}</th>
              <th className="text-right font-medium">{tr('concepts.precision.colLimit')}</th>
              <th className="text-right font-medium">{tr('concepts.precision.colRange')}</th>
              <th className="text-center font-medium">{tr('concepts.precision.colThis')}</th>
            </tr>
          </thead>
          <tbody>
            {PRECISION_LEVELS.map(l => {
              const ok = p >= l.limitArcsec
              const range = 1 / l.limitArcsec
              return (
                <tr key={l.key} className="border-t border-line">
                  <td className="py-1 font-medium" style={{ color: l.color }}>{tr(`precision.${l.key}Short`)}</td>
                  <td className="py-1 text-right font-mono text-fg">{formatParallax(l.limitArcsec)}</td>
                  <td className="py-1 text-right font-mono text-fg">{range < 1 ? '—' : `${range.toLocaleString('en-US')} pc`}</td>
                  <td className="py-1 text-center">{ok ? <span className="text-green-500">✓</span> : <span className="text-subtle">✕</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p>{tr('concepts.precision.naked')}</p>
      </Concept>

      <Concept icon="📜" title={tr('concepts.history.title')}>
        {tr('concepts.history.items').split('\n').map((line, i) => {
          const [year, text] = line.split('|')
          return (
            <div key={i} className="flex gap-2">
              <span className="font-mono text-accent shrink-0 w-10">{year}</span>
              <span>{text}</span>
            </div>
          )
        })}
      </Concept>

      <Concept icon="⚠️" title={tr('concepts.model.title')}>
        <p>{tr('concepts.model.body')}</p>
      </Concept>
    </div>
  )
}

/** 年周視差の定義図 (1 au と p の関係) */
function ParallaxDiagram() {
  const { tr } = useI18n()
  return (
    <svg viewBox="0 0 260 110" className="w-full h-auto mt-1" role="img" aria-label={tr('concepts.what.diagram')}>
      <defs>
        <marker id="pd-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 0 L6 3 L0 6 z" fill="currentColor" />
        </marker>
      </defs>
      <ellipse cx="45" cy="60" rx="30" ry="30" fill="none" stroke="#5b7bb5" strokeDasharray="3 3" />
      <circle cx="45" cy="60" r="7" fill="#fbbf24" />
      <circle cx="45" cy="30" r="4.5" fill="#3b82f6" />
      <line x1="45" y1="60" x2="45" y2="30" stroke="#94a3b8" strokeWidth="1.2" />
      <text x="30" y="48" fontSize="9" fill="#94a3b8">1 au</text>
      <circle cx="235" cy="60" r="5" fill="#f472b6" />
      <line x1="45" y1="60" x2="235" y2="60" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 3" />
      <line x1="45" y1="30" x2="235" y2="60" stroke="#fde047" strokeWidth="1.2" />
      <path d="M 205 60 A 30 30 0 0 1 205.4 55.3" fill="none" stroke="#fb7185" strokeWidth="2" />
      <text x="196" y="52" fontSize="11" fontWeight="bold" fill="#fb7185">p</text>
      <text x="45" y="83" fontSize="9" fill="#fbbf24" textAnchor="middle">{tr('view.sun')}</text>
      <text x="45" y="20" fontSize="9" fill="#60a5fa" textAnchor="middle">{tr('view.earth')}</text>
      <text x="235" y="78" fontSize="9" fill="#f472b6" textAnchor="middle">{tr('view.nearStar')}</text>
      <text x="140" y="100" fontSize="9" fill="#94a3b8" textAnchor="middle">d = 1 / p</text>
    </svg>
  )
}

// ─── 計算ツール ───────────────────────────────────────────────────────────────

function Calculator() {
  const { tr } = useI18n()
  const [pText, setPText] = useState('0.1')
  const [unit, setUnit] = useState<'arcsec' | 'mas'>('arcsec')
  const pv = parseFloat(pText)
  const p = unit === 'mas' ? pv / 1000 : pv
  const valid = p > 0 && isFinite(p)
  const d = valid ? 1 / p : NaN

  return (
    <div className="card p-3 space-y-2">
      <div className="section-title">🧮 {tr('calc.title')}</div>
      <div className="flex gap-1.5 items-center">
        <span className="text-xs text-muted shrink-0">p =</span>
        <input
          type="number" step="any" min={0} inputMode="decimal"
          value={pText}
          onChange={e => setPText(e.target.value)}
          className="field flex-1 min-w-0 font-mono"
          aria-label={tr('calc.input')}
        />
        <div className="flex rounded-md overflow-hidden border border-line text-[11px] shrink-0">
          {(['arcsec', 'mas'] as const).map(u => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              aria-pressed={unit === u}
              className={`px-2 py-1 ${unit === u ? 'bg-accent-strong text-white' : 'bg-panel text-muted hover:bg-hover'}`}
            >
              {u === 'arcsec' ? '″' : 'mas'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 text-center">
        {[
          { label: 'pc', v: d },
          { label: tr('controls.unitNames.ly'), v: d * LY_PER_PC },
          { label: 'au', v: d * AU_PER_PC },
        ].map(o => (
          <div key={o.label} className="rounded bg-panel border border-line px-1 py-1">
            <div className="text-[10px] text-subtle">{o.label}</div>
            <div className="text-[11px] font-mono text-fg truncate">
              {valid ? (+o.v.toPrecision(4)).toLocaleString('en-US') : '—'}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-subtle">{tr('calc.note')}</p>
    </div>
  )
}
