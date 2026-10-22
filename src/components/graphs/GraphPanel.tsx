import { useState } from 'react'
import { useSimStore, useSelectedStar } from '../../store/simulationStore'
import {
  getApparentOffset, distanceToParallax, formatParallax, formatDistance,
  formatSignedArcsec, simplestDetector, angleToDate,
} from '../../utils/astronomy'
import { useI18n } from '../../hooks/useI18n'
import PathPlot from './PathPlot'
import TimePlot from './TimePlot'
import CurvePlot from './CurvePlot'

type GraphTab = 'path' | 'time' | 'curve'

export default function GraphPanel() {
  const { tr } = useI18n()
  const [tab, setTab] = useState<GraphTab>('path')

  return (
    <div className="h-full flex flex-col bg-panel text-fg">
      <div className="flex border-b border-line shrink-0 px-2" role="tablist">
        {(['path', 'time', 'curve'] as const).map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={tab === t ? 'tab-on' : 'tab-off'}
          >
            {tr(`graph.${t === 'path' ? 'tabPath' : t === 'time' ? 'tabTime' : 'tabCurve'}`)}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-[140px] relative">
        {tab === 'path' && <PathPlot />}
        {tab === 'time' && <TimePlot />}
        {tab === 'curve' && <CurvePlot />}
      </div>

      <InfoBar />
    </div>
  )
}

// ─── 数値バー ────────────────────────────────────────────────────────────────

function InfoBar() {
  const { tr, trArr } = useI18n()
  const star = useSelectedStar()
  const distanceUnit = useSimStore(s => s.distanceUnit)
  const earthAngleDeg = useSimStore(s => s.earthAngleDeg)
  const months = trArr('months')

  const ap = getApparentOffset(star, earthAngleDeg)
  const p = distanceToParallax(star.distancePc)
  const detector = simplestDetector(p)
  const { month, day } = angleToDate(earthAngleDeg)
  const digits = p >= 0.01 ? 4 : 6

  const Item = ({ label, value, className = 'text-fg' }: { label: string; value: string; className?: string }) => (
    <span className="whitespace-nowrap">
      <span className="text-subtle">{label} </span>
      <span className={`font-mono ${className}`}>{value}</span>
    </span>
  )

  return (
    <div className="shrink-0 px-3 py-1.5 border-t border-line bg-card/60 text-[11px] flex flex-wrap gap-x-4 gap-y-0.5 items-center">
      <Item label="📅" value={tr('timeline.date', { month: months[month] ?? '', day })} />
      <Item label={tr('info.distance')} value={formatDistance(star.distancePc, distanceUnit)} />
      <Item label={tr('info.parallax')} value={`p = ${formatParallax(p)}`} className="text-accent font-semibold" />
      <Item label={tr('info.dLon')} value={formatSignedArcsec(ap.dLon, digits)} />
      <Item label={tr('info.dLat')} value={formatSignedArcsec(ap.dLat, digits)} />
      <span className="text-accent font-mono">d = 1 / p</span>
      {detector ? (
        <span className="whitespace-nowrap font-medium" style={{ color: detector.color }}>
          ● {tr('info.measurableBy', { name: tr(`precision.${detector.key}Short`) })}
        </span>
      ) : (
        <span className="text-subtle">● {tr('info.notMeasurable')}</span>
      )}
    </div>
  )
}
