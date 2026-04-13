import { useState } from 'react'
import { useSimStore } from '../../store/simulationStore'
import { useI18n } from '../../hooks/useI18n'
import { STAR_PRESETS, DEFAULT_CUSTOM_STAR } from '../../data/starPresets'
import { formatDistance, formatParallax, getStarName } from '../../utils/astronomy'
import type { ViewMode, DistanceUnit } from '../../types'

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 5, 10, 30, 60]

export default function ControlPanel() {
  const { tr, trArr } = useI18n()
  const {
    earthAngleDeg, setEarthAngle,
    playing, setPlaying,
    speed, setSpeed,
    stars, addStar, removeStar, updateStar, selectStar, selectedStarId,
    viewMode, setViewMode,
    distanceUnit, setDistanceUnit,
    showTrail, setShowTrail,
    showParallaxLine, setShowParallaxLine,
    compareMode, setCompareMode,
    showAberration, setShowAberration,
    language,
  } = useSimStore()

  const [activeTab, setActiveTab] = useState<'playback' | 'star' | 'display'>('playback')

  const selectedStar = stars.find(s => s.id === selectedStarId) ?? stars[0]
  const month = Math.floor((earthAngleDeg / 360) * 12)
  const months = trArr('months')

  return (
    <div className="h-full flex flex-col bg-gray-900 dark:bg-gray-950 text-gray-100 text-sm select-none overflow-y-auto">
      <div className="px-3 pt-3 pb-1 font-semibold text-xs text-gray-400 uppercase tracking-wider">
        {tr('controls.title')}
      </div>

      {/* タブ */}
      <div className="flex border-b border-gray-700 mx-2">
        {(['playback', 'star', 'display'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'playback' ? tr('controls.tabPlayback') : tab === 'star' ? tr('controls.tabStar') : tr('controls.tabDisplay')}
          </button>
        ))}
      </div>

      <div className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {/* ─── 再生タブ ─────────────────────────────── */}
        {activeTab === 'playback' && (
          <>
            {/* 再生コントロール */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlaying(!playing)}
                  className={`flex-1 py-2 rounded font-medium text-sm transition-colors ${
                    playing
                      ? 'bg-yellow-600 hover:bg-yellow-500'
                      : 'bg-blue-600 hover:bg-blue-500'
                  }`}
                >
                  {playing ? `⏸ ${tr('controls.pause')}` : `▶ ${tr('controls.play')}`}
                </button>
              </div>

              {/* 速度 */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  {tr('controls.speed')}: {speed}{tr('controls.speedUnit')}
                </label>
                <div className="flex gap-1 flex-wrap">
                  {SPEED_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        speed === s
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 時刻スライダー */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                {tr('controls.monthLabel')}: <span className="text-white font-medium">{months[month]}</span>
              </label>
              <input
                type="range"
                min={0}
                max={359}
                value={Math.round(earthAngleDeg)}
                onChange={e => { setPlaying(false); setEarthAngle(Number(e.target.value)) }}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                {trArr('controls.sliderMonthMarkers').map((m, i) => (
                  <span key={i}>{m}</span>
                ))}
              </div>
            </div>

            {/* 視点切替 */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">{tr('controls.viewMode')}</label>
              <div className="grid grid-cols-3 gap-1">
                {(['overhead', 'observer', 'stellar'] as ViewMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={`py-1.5 rounded text-xs transition-colors ${
                      viewMode === m
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    {m === 'overhead' ? tr('controls.viewOverhead') : m === 'observer' ? tr('controls.viewObserver') : tr('controls.viewStellar')}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ─── 恒星タブ ─────────────────────────────── */}
        {activeTab === 'star' && (
          <>
            {/* 恒星リスト */}
            <div className="space-y-2">
              {stars.map(star => (
                <div
                  key={star.id}
                  onClick={() => selectStar(star.id)}
                  className={`rounded border p-2 cursor-pointer transition-colors ${
                    selectedStarId === star.id
                      ? 'border-blue-500 bg-blue-950'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: star.color }}
                      />
                      <span className="font-medium text-xs truncate max-w-[120px]">{getStarName(star, language)}</span>
                    </span>
                    {stars.length > 1 && (
                      <button
                        onClick={e => { e.stopPropagation(); removeStar(star.id) }}
                        className="text-gray-500 hover:text-red-400 text-xs ml-1"
                      >✕</button>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {formatDistance(star.distancePc, distanceUnit)} ／ p={formatParallax(star.parallaxArcsec)}
                  </div>
                </div>
              ))}
            </div>

            {/* プリセット選択 */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">{tr('controls.preset')}</label>
              <select
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-gray-200"
                onChange={e => {
                  const preset = STAR_PRESETS.find(p => p.id === e.target.value)
                  if (preset) addStar({ ...preset })
                  e.target.value = ''
                }}
                defaultValue=""
              >
                <option value="" disabled>{tr('controls.addPlaceholder')}</option>
                {STAR_PRESETS.map(p => (
                  <option key={p.id} value={p.id}>{getStarName(p, language)}</option>
                ))}
              </select>
            </div>

            {/* 選択中の恒星を編集 */}
            {selectedStar && (
              <div className="space-y-3 border-t border-gray-700 pt-3">
                <div className="text-xs text-gray-400 font-medium">{tr('controls.selectedStar')}: {getStarName(selectedStar, language)}</div>

                {/* 距離スライダー */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    {tr('controls.distanceLabel')}: <span className="text-white">{formatDistance(selectedStar.distancePc, distanceUnit)}</span>
                    <span className="text-gray-500 ml-2">p = {formatParallax(selectedStar.parallaxArcsec)}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={200}
                    step={0.5}
                    value={selectedStar.distancePc}
                    onChange={e => updateStar(selectedStar.id, { distancePc: Number(e.target.value) })}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{tr('controls.distanceSliderMin')}</span>
                    <span>{tr('controls.distanceSliderMax')}</span>
                  </div>
                </div>

                {/* 距離単位 */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{tr('controls.distanceUnit')}</label>
                  <div className="flex gap-1">
                    {(['pc', 'ly', 'au'] as DistanceUnit[]).map(u => (
                      <button
                        key={u}
                        onClick={() => setDistanceUnit(u)}
                        className={`flex-1 py-1 rounded text-xs transition-colors ${
                          distanceUnit === u
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* カスタム追加 */}
            <button
              onClick={() => addStar({
                ...DEFAULT_CUSTOM_STAR,
                directionRad: Math.random() * Math.PI * 2,
              })}
              className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors"
            >
              + {tr('controls.addStar')}
            </button>
          </>
        )}

        {/* ─── 表示タブ ─────────────────────────────── */}
        {activeTab === 'display' && (
          <div className="space-y-3">
            <Toggle label={tr('controls.showTrail')} value={showTrail} onChange={setShowTrail} />
            <Toggle label={tr('controls.showParallaxLine')} value={showParallaxLine} onChange={setShowParallaxLine} />
            <Toggle label={tr('controls.compareMode')} value={compareMode} onChange={setCompareMode} />
            <Toggle label={tr('controls.showAberration')} value={showAberration} onChange={setShowAberration} />
          </div>
        )}
      </div>
    </div>
  )
}

function Toggle({ label, value, onChange }: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <span className="relative inline-flex w-9 h-5">
        <input
          type="checkbox"
          className="sr-only"
          checked={value}
          onChange={e => onChange(e.target.checked)}
        />
        <span className={`absolute inset-0 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-gray-600'}`} />
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'translate-x-4' : ''}`} />
      </span>
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  )
}
