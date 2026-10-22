import { lazy, Suspense, useState } from 'react'
import { useSimStore, useSelectedStar } from '../../store/simulationStore'
import { useI18n } from '../../hooks/useI18n'
import { distanceToParallax, formatParallax, maxShiftAngleDeg, angleToDate } from '../../utils/astronomy'
import ObserverView from './ObserverView'
import StellarView from './StellarView'
import type { ViewMode } from '../../types'

// Three.js は大きいので遅延読み込み
const OverheadView = lazy(() => import('./OverheadView'))

const VIEW_ICONS: Record<ViewMode, string> = { overhead: '🪐', observer: '🔭', stellar: '✨' }

export default function ViewArea() {
  const { tr } = useI18n()
  const viewMode = useSimStore(s => s.viewMode)
  const setViewMode = useSimStore(s => s.setViewMode)

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#040811]">
      {viewMode === 'overhead' && (
        <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">{tr('views.loading')}</div>}>
          <OverheadView />
        </Suspense>
      )}
      {viewMode === 'observer' && <ObserverView />}
      {viewMode === 'stellar' && <StellarView />}

      {/* 視点切替タブ */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex rounded-lg overflow-hidden border border-white/15 bg-black/45 backdrop-blur-md shadow-lg" role="tablist">
        {(['overhead', 'observer', 'stellar'] as ViewMode[]).map((m, i) => (
          <button
            key={m}
            role="tab"
            aria-selected={viewMode === m}
            onClick={() => setViewMode(m)}
            title={`${tr(`views.${m}Desc`)} (${i + 1})`}
            className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              viewMode === m ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <span aria-hidden className="mr-1">{VIEW_ICONS[m]}</span>
            {tr(`views.${m}`)}
          </button>
        ))}
      </div>

      <Legend />
    </div>
  )
}

/** 視点ごとの凡例と読み取りのヒント */
function Legend() {
  const { tr, trArr } = useI18n()
  const viewMode = useSimStore(s => s.viewMode)
  const compareMode = useSimStore(s => s.compareMode)
  const star = useSelectedStar()
  const months = trArr('months')
  const [open, setOpen] = useState(false)

  if (viewMode === 'stellar') {
    return (
      <div className="absolute bottom-2 right-2 z-10 max-w-[300px] text-[11px] leading-snug rounded-md bg-black/55 backdrop-blur px-2.5 py-1.5 text-slate-200 pointer-events-none">
        {tr('views.stellarNote')}
      </div>
    )
  }

  const items: { color: string; label: string; dashed?: boolean }[] =
    viewMode === 'overhead'
      ? [
          { color: '#fde047', label: tr('legend.sightLine') },
          { color: '#94a3b8', label: tr('legend.sunLine'), dashed: true },
          { color: star.color, label: tr('legend.apparentPath') },
          { color: '#fb7185', label: tr('legend.parallaxAngle') },
          ...(compareMode ? [{ color: '#f472b6', label: tr('legend.halfYear') }] : []),
        ]
      : [
          { color: '#94a3b8', label: tr('legend.reference') },
          { color: star.color, label: tr('legend.observedPath') },
          ...(compareMode ? [{ color: '#f472b6', label: tr('legend.halfYear') }] : []),
        ]

  const a1 = maxShiftAngleDeg(star)
  const m1 = angleToDate(a1).month
  const m2 = angleToDate(a1 + 180).month

  return (
    <div className="absolute bottom-2 right-2 z-10 max-w-[260px] rounded-md bg-black/55 backdrop-blur px-2.5 py-1.5 text-[11px] text-slate-200 space-y-0.5">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 text-[10px] uppercase tracking-wider text-slate-400 hover:text-slate-200"
      >
        {tr('legend.title')}
        <span aria-hidden>{open ? '▾' : '▸'}</span>
      </button>
      {open && items.map(it => (
        <div key={it.label} className="flex items-center gap-2">
          <span
            className="w-4 h-0 shrink-0 border-t-2"
            style={{ borderColor: it.color, borderStyle: it.dashed ? 'dashed' : 'solid' }}
          />
          <span>{it.label}</span>
        </div>
      ))}
      {open && compareMode && (
        <div className="pt-1 text-pink-200">
          {tr('legend.maxPair', {
            m1: months[Math.min(m1, m2)] ?? '',
            m2: months[Math.max(m1, m2)] ?? '',
            v: formatParallax(2 * distanceToParallax(star.distancePc)),
          })}
        </div>
      )}
      {open && viewMode === 'overhead' && <div className="pt-1 text-slate-400">{tr('views.overheadNote')}</div>}
    </div>
  )
}
