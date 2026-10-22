import { useSimStore } from '../../store/simulationStore'
import { useI18n } from '../../hooks/useI18n'
import { angleToDate, monthToAngle } from '../../utils/astronomy'

const SPEED_OPTIONS = [1, 3, 6, 12, 30, 60]
const MONTH_DEG = 360 / 12

/** ビュー直下の再生・時刻コントロール */
export default function TimelineBar() {
  const { tr, trArr } = useI18n()
  const earthAngleDeg = useSimStore(s => s.earthAngleDeg)
  const setEarthAngle = useSimStore(s => s.setEarthAngle)
  const playing = useSimStore(s => s.playing)
  const setPlaying = useSimStore(s => s.setPlaying)
  const speed = useSimStore(s => s.speed)
  const setSpeed = useSimStore(s => s.setSpeed)

  const monthsShort = trArr('monthsShort')
  const { month, day } = angleToDate(earthAngleDeg)
  const secondsPerYear = 60 / speed

  const step = (dir: 1 | -1) => {
    setPlaying(false)
    setEarthAngle(Math.round((earthAngleDeg + dir * MONTH_DEG) / MONTH_DEG) * MONTH_DEG)
  }

  return (
    <div className="shrink-0 border-t border-line bg-panel px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {/* 再生ボタン群 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => step(-1)}
          className="btn-ghost w-8 h-8"
          title={tr('timeline.prevMonth')}
          aria-label={tr('timeline.prevMonth')}
        >
          ⏮
        </button>
        <button
          onClick={() => setPlaying(!playing)}
          className={`btn h-8 px-3 min-w-[84px] text-white ${playing ? 'bg-amber-500 hover:bg-amber-400' : 'bg-accent-strong hover:brightness-110'}`}
          aria-pressed={playing}
        >
          {playing ? `⏸ ${tr('timeline.pause')}` : `▶ ${tr('timeline.play')}`}
        </button>
        <button
          onClick={() => step(1)}
          className="btn-ghost w-8 h-8"
          title={tr('timeline.nextMonth')}
          aria-label={tr('timeline.nextMonth')}
        >
          ⏭
        </button>
      </div>

      {/* 日付 */}
      <div className="w-[88px] text-center">
        <div className="text-sm font-semibold text-fg tabular-nums leading-tight">
          {tr('timeline.date', { month: monthsShort[month] ?? '', day })}
        </div>
        <div className="text-[10px] text-subtle leading-tight">{tr('timeline.angle', { deg: Math.round(earthAngleDeg) })}</div>
      </div>

      {/* スライダー */}
      <div className="flex-1 min-w-[180px]">
        <input
          type="range"
          min={0}
          max={359.5}
          step={0.5}
          value={earthAngleDeg}
          onChange={e => { setPlaying(false); setEarthAngle(Number(e.target.value)) }}
          className="w-full block"
          aria-label={tr('timeline.slider')}
        />
        <div className="relative h-3 text-[9px] text-subtle select-none">
          {monthsShort.map((m, i) => (
            <button
              key={i}
              onClick={() => { setPlaying(false); setEarthAngle(monthToAngle(i)) }}
              className={`absolute -translate-x-1/2 hover:text-accent ${i === month ? 'text-accent font-semibold' : ''} ${i % 3 !== 0 ? 'hidden sm:block' : ''}`}
              style={{ left: `calc(${(monthToAngle(i) / 359.5) * 100}% + ${7 - (monthToAngle(i) / 359.5) * 14}px)` }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* 速度 */}
      <label className="flex items-center gap-1.5 text-xs text-muted">
        <span className="hidden sm:inline">{tr('timeline.speed')}</span>
        <select
          value={speed}
          onChange={e => setSpeed(Number(e.target.value))}
          className="field py-1"
          title={tr('timeline.speedHint', { sec: +secondsPerYear.toFixed(1) })}
        >
          {SPEED_OPTIONS.map(s => (
            <option key={s} value={s}>
              {s}× ({tr('timeline.perYear', { sec: +(60 / s).toFixed(1) })})
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
