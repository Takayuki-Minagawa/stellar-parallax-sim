import { useSimStore } from '../../store/simulationStore'
import { useI18n } from '../../hooks/useI18n'
import type { MissionId } from '../../types'

/** 観察ミッション (上から順に取り組むと理解が深まる並び) */
export const MISSIONS: MissionId[] = [
  'playYear', 'observer', 'compare', 'distance', 'multi',
  'pole', 'ecliptic', 'graphClick', 'stellar', 'aberration', 'challenge', 'quiz',
]

export default function MissionsTab() {
  const { tr } = useI18n()
  const progress = useSimStore(s => s.progress)
  const resetProgress = useSimStore(s => s.resetProgress)
  const done = MISSIONS.filter(m => progress[m]).length
  const nextId = MISSIONS.find(m => !progress[m])
  const pct = Math.round((done / MISSIONS.length) * 100)

  return (
    <div className="px-3 py-3 space-y-3">
      <div className="card p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-fg">{tr('missions.progress', { done, total: MISSIONS.length })}</span>
          <span className="text-xs font-mono text-accent">{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-hover overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-amber-400 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[11px] text-subtle mt-2 leading-snug">
          {done === MISSIONS.length ? tr('missions.allDone') : tr('missions.intro')}
        </p>
      </div>

      <ol className="space-y-1.5">
        {MISSIONS.map((id, i) => {
          const ok = !!progress[id]
          const isNext = id === nextId
          return (
            <li
              key={id}
              className={`rounded-md border px-2.5 py-2 transition-colors ${
                ok ? 'border-green-500/30 bg-green-500/5'
                  : isNext ? 'border-accent/60 bg-accent/5'
                  : 'border-line bg-card'
              }`}
            >
              <div className="flex gap-2">
                <span
                  className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    ok ? 'bg-green-500 text-white animate-pop' : isNext ? 'bg-accent-strong text-white' : 'bg-hover text-subtle'
                  }`}
                  aria-label={ok ? tr('missions.done') : undefined}
                >
                  {ok ? '✓' : i + 1}
                </span>
                <div className="min-w-0">
                  <div className={`text-xs font-medium ${ok ? 'text-muted line-through decoration-green-500/50' : 'text-fg'}`}>
                    {tr(`missions.items.${id}.title`)}
                  </div>
                  {(!ok || isNext) && (
                    <div className="text-[11px] text-subtle leading-snug mt-0.5">{tr(`missions.items.${id}.hint`)}</div>
                  )}
                  {ok && (
                    <div className="text-[11px] text-green-600 dark:text-green-400 leading-snug mt-0.5">
                      💡 {tr(`missions.items.${id}.learned`)}
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      {done > 0 && (
        <button onClick={resetProgress} className="btn-ghost w-full py-1.5">
          {tr('missions.reset')}
        </button>
      )}
    </div>
  )
}
