import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useSimStore, useSelectedStar } from '../../store/simulationStore'
import { useI18n } from '../../hooks/useI18n'
import { STAR_PRESETS, DIST_MIN_PC, DIST_MAX_PC } from '../../data/starPresets'
import {
  formatDistance, formatParallax, getStarName, distanceToParallax,
  AU_PER_PC, LY_PER_PC,
} from '../../utils/astronomy'
import Toggle from '../common/Toggle'
import type { DistanceUnit, CameraPreset, Star } from '../../types'

const UNIT_FACTOR: Record<DistanceUnit, number> = { pc: 1, ly: LY_PER_PC, au: AU_PER_PC }
const LOG_MIN = Math.log10(DIST_MIN_PC)
const LOG_MAX = Math.log10(DIST_MAX_PC)

export default function ControlPanel() {
  const { tr } = useI18n()
  const [tab, setTab] = useState<'stars' | 'display'>('stars')

  return (
    <div className="h-full flex flex-col bg-panel text-fg text-sm">
      <div className="flex border-b border-line px-2 shrink-0" role="tablist">
        {(['stars', 'display'] as const).map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={tab === t ? 'tab-on' : 'tab-off'}
          >
            {t === 'stars' ? `✦ ${tr('controls.tabStars')}` : `◑ ${tr('controls.tabDisplay')}`}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
        {tab === 'stars' ? <StarsTab /> : <DisplayTab />}
      </div>
    </div>
  )
}

// ─── 恒星タブ ─────────────────────────────────────────────────────────────────

function StarsTab() {
  const { tr } = useI18n()
  const stars = useSimStore(s => s.stars)
  const selectedStarId = useSimStore(s => s.selectedStarId)
  const selectStar = useSimStore(s => s.selectStar)
  const removeStar = useSimStore(s => s.removeStar)
  const addPreset = useSimStore(s => s.addPreset)
  const addCustomStar = useSimStore(s => s.addCustomStar)
  const distanceUnit = useSimStore(s => s.distanceUnit)
  const language = useSimStore(s => s.language)
  const selected = useSelectedStar()

  return (
    <div className="space-y-4">
      {/* 恒星リスト */}
      <section className="space-y-1.5">
        <div className="section-title">{tr('controls.starList')}</div>
        {stars.map(star => {
          const active = selectedStarId === star.id
          return (
            <div
              key={star.id}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              onClick={() => selectStar(star.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectStar(star.id) } }}
              className={`group rounded-md border px-2.5 py-1.5 cursor-pointer transition-colors ${
                active ? 'border-accent bg-accent/10' : 'border-line bg-card hover:border-subtle'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/20" style={{ background: star.color }} />
                  <span className="font-medium text-xs truncate">{getStarName(star, language)}</span>
                </span>
                {stars.length > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); removeStar(star.id) }}
                    className="text-subtle hover:text-red-500 text-xs px-1 opacity-60 group-hover:opacity-100"
                    aria-label={`${tr('controls.remove')}: ${getStarName(star, language)}`}
                    title={tr('controls.remove')}
                  >✕</button>
                )}
              </div>
              <div className="text-[11px] text-subtle mt-0.5 font-mono">
                {formatDistance(star.distancePc, distanceUnit)} · p = {formatParallax(distanceToParallax(star.distancePc))}
              </div>
            </div>
          )
        })}

        <div className="flex gap-1.5 pt-1">
          <select
            className="field flex-1 min-w-0"
            value=""
            onChange={e => { if (e.target.value) addPreset(e.target.value) }}
            aria-label={tr('controls.addPreset')}
          >
            <option value="" disabled>{`＋ ${tr('controls.addPreset')}`}</option>
            {STAR_PRESETS.map(p => (
              <option key={p.id} value={p.id}>
                {getStarName(p, language)} ({formatDistance(p.distancePc, 'pc')})
              </option>
            ))}
          </select>
          <button onClick={addCustomStar} className="btn-ghost px-2 shrink-0" title={tr('controls.addCustom')}>
            ＋ {tr('controls.custom')}
          </button>
        </div>
      </section>

      {selected && <StarEditor star={selected} />}
    </div>
  )
}

function StarEditor({ star }: { star: Star }) {
  const { tr } = useI18n()
  const updateStar = useSimStore(s => s.updateStar)
  const markMission = useSimStore(s => s.markMission)
  const distanceUnit = useSimStore(s => s.distanceUnit)
  const setDistanceUnit = useSimStore(s => s.setDistanceUnit)
  const language = useSimStore(s => s.language)

  const setDistance = (pc: number) => {
    const d = Math.max(0.1, Math.min(1e5, pc))
    updateStar(star.id, { distancePc: d })
    markMission('distance')
  }

  const isCustom = !star.presetId
  const p = distanceToParallax(star.distancePc)

  return (
    <section className="space-y-3 border-t border-line pt-3">
      <div className="flex items-center justify-between gap-2">
        <div className="section-title">{tr('controls.editSelected')}</div>
        <span className="flex items-center gap-1.5 text-xs text-muted min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: star.color }} />
          <span className="truncate">{getStarName(star, language)}</span>
        </span>
      </div>

      {isCustom && (
        <div className="flex gap-1.5">
          <input
            className="field flex-1 min-w-0"
            value={getStarName(star, language)}
            onChange={e => updateStar(star.id, language === 'en' ? { nameEn: e.target.value } : { name: e.target.value })}
            aria-label={tr('controls.name')}
            placeholder={tr('controls.name')}
            maxLength={40}
          />
          <input
            type="color"
            value={star.color}
            onChange={e => updateStar(star.id, { color: e.target.value })}
            className="w-8 h-8 rounded border border-line bg-panel cursor-pointer shrink-0"
            aria-label={tr('controls.color')}
            title={tr('controls.color')}
          />
        </div>
      )}

      {/* 距離 */}
      <div className="card p-2.5 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted">{tr('controls.distance')}</span>
          <span className="text-[11px] font-mono text-accent">p = {formatParallax(p)}</span>
        </div>
        <div className="flex gap-1.5 items-center">
          <DistanceInput star={star} unit={distanceUnit} onCommit={setDistance} />
          <div className="flex rounded-md overflow-hidden border border-line shrink-0" role="group" aria-label={tr('controls.distanceUnit')}>
            {(['pc', 'ly', 'au'] as DistanceUnit[]).map(u => (
              <button
                key={u}
                onClick={() => setDistanceUnit(u)}
                aria-pressed={distanceUnit === u}
                title={tr(`controls.unitNames.${u}`)}
                className={`px-2 py-1 text-[11px] ${distanceUnit === u ? 'bg-accent-strong text-white' : 'bg-panel text-muted hover:bg-hover'}`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <input
          type="range"
          min={LOG_MIN}
          max={LOG_MAX}
          step={0.001}
          value={Math.log10(Math.max(DIST_MIN_PC, Math.min(DIST_MAX_PC, star.distancePc)))}
          onChange={e => setDistance(+(10 ** Number(e.target.value)).toPrecision(3))}
          className="w-full block"
          aria-label={tr('controls.distanceSlider')}
        />
        <div className="flex justify-between text-[10px] text-subtle -mt-1">
          <span>1 pc</span><span>10</span><span>100</span><span>1000 pc</span>
        </div>
        <div className="flex gap-1.5">
          <button className="btn-ghost flex-1 py-1" onClick={() => setDistance(star.distancePc / 2)}>
            {tr('controls.halve')}
          </button>
          <button className="btn-ghost flex-1 py-1" onClick={() => setDistance(star.distancePc * 2)}>
            {tr('controls.double')}
          </button>
        </div>
      </div>

      {/* 方向 */}
      <div className="card p-2.5 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted">{tr('controls.eclLat')}</span>
          <span className="text-xs font-mono text-fg">β = {star.eclLatDeg.toFixed(1)}°</span>
        </div>
        <input
          type="range" min={-90} max={90} step={0.5}
          value={star.eclLatDeg}
          onChange={e => updateStar(star.id, { eclLatDeg: Number(e.target.value) })}
          className="w-full block"
          aria-label={tr('controls.eclLat')}
        />
        <div className="grid grid-cols-3 gap-1">
          {[
            { v: 0, label: tr('controls.latEcliptic') },
            { v: 45, label: '45°' },
            { v: 90, label: tr('controls.latPole') },
          ].map(o => (
            <button
              key={o.v}
              onClick={() => updateStar(star.id, { eclLatDeg: o.v })}
              className={Math.abs(star.eclLatDeg - o.v) < 0.01 ? 'chip-on' : 'chip-off'}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-subtle leading-snug">{tr('controls.eclLatHint')}</p>

        <div className="flex items-baseline justify-between pt-1">
          <span className="text-xs text-muted">{tr('controls.eclLon')}</span>
          <span className="text-xs font-mono text-fg">λ = {star.eclLonDeg.toFixed(0)}°</span>
        </div>
        <input
          type="range" min={0} max={359} step={1}
          value={star.eclLonDeg}
          onChange={e => updateStar(star.id, { eclLonDeg: Number(e.target.value) })}
          className="w-full block"
          aria-label={tr('controls.eclLon')}
        />
        <p className="text-[11px] text-subtle leading-snug">{tr('controls.eclLonHint')}</p>
      </div>
    </section>
  )
}

/** 単位付きの距離入力 (Enter / フォーカスアウトで確定) */
function DistanceInput({ star, unit, onCommit }: {
  star: Star
  unit: DistanceUnit
  onCommit: (pc: number) => void
}) {
  const { tr } = useI18n()
  const shown = star.distancePc * UNIT_FACTOR[unit]
  const fmt = (v: number) => String(+v.toPrecision(unit === 'au' ? 6 : 4))
  const [text, setText] = useState(fmt(shown))

  useEffect(() => { setText(fmt(shown)) }, [shown]) // eslint-disable-line react-hooks/exhaustive-deps

  const commit = () => {
    const v = parseFloat(text)
    if (v > 0 && isFinite(v)) onCommit(v / UNIT_FACTOR[unit])
    else setText(fmt(shown))
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step="any"
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit() }}
      className="field flex-1 min-w-0 font-mono"
      aria-label={`${tr('controls.distance')} (${unit})`}
    />
  )
}

// ─── 表示タブ ─────────────────────────────────────────────────────────────────

function DisplayTab() {
  const { tr } = useI18n()
  const s = useSimStore(useShallow(st => ({
    showTrail: st.showTrail, setShowTrail: st.setShowTrail,
    showParallaxLine: st.showParallaxLine, setShowParallaxLine: st.setShowParallaxLine,
    compareMode: st.compareMode, setCompareMode: st.setCompareMode,
    showAberration: st.showAberration, setShowAberration: st.setShowAberration,
    cameraPreset: st.cameraPreset, setCameraPreset: st.setCameraPreset,
    viewMode: st.viewMode, setViewMode: st.setViewMode,
  })))

  return (
    <div className="space-y-4">
      <section className="space-y-3">
        <div className="section-title">{tr('controls.overlays')}</div>
        <Toggle label={tr('controls.showTrail')} hint={tr('controls.showTrailHint')} value={s.showTrail} onChange={s.setShowTrail} shortcut="T" />
        <Toggle label={tr('controls.showParallaxLine')} hint={tr('controls.showParallaxLineHint')} value={s.showParallaxLine} onChange={s.setShowParallaxLine} />
        <Toggle label={tr('controls.compareMode')} hint={tr('controls.compareModeHint')} value={s.compareMode} onChange={s.setCompareMode} shortcut="C" />
        <Toggle label={tr('controls.showAberration')} hint={tr('controls.showAberrationHint')} value={s.showAberration} onChange={s.setShowAberration} shortcut="A" />
      </section>

      <section className="space-y-2 border-t border-line pt-3">
        <div className="section-title">{tr('controls.camera')}</div>
        <p className="text-[11px] text-subtle">{tr('controls.cameraHint')}</p>
        <div className="grid grid-cols-3 gap-1">
          {(['oblique', 'top', 'edge'] as CameraPreset[]).map(p => (
            <button
              key={p}
              onClick={() => { s.setCameraPreset(p); s.setViewMode('overhead') }}
              className={s.cameraPreset === p && s.viewMode === 'overhead' ? 'chip-on' : 'chip-off'}
            >
              {tr(`controls.cameraPresets.${p}`)}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
