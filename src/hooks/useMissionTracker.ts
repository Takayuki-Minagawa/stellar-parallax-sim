import { useEffect } from 'react'
import { useSimStore } from '../store/simulationStore'

/** 操作状態を監視して観察ミッションの達成を記録する */
export function useMissionTracker() {
  const viewMode = useSimStore(s => s.viewMode)
  const compareMode = useSimStore(s => s.compareMode)
  const showAberration = useSimStore(s => s.showAberration)
  const stars = useSimStore(s => s.stars)
  const markMission = useSimStore(s => s.markMission)

  useEffect(() => {
    if (viewMode === 'observer') markMission('observer')
    if (viewMode === 'stellar') markMission('stellar')
  }, [viewMode, markMission])

  useEffect(() => { if (compareMode) markMission('compare') }, [compareMode, markMission])
  useEffect(() => { if (showAberration) markMission('aberration') }, [showAberration, markMission])

  useEffect(() => {
    if (stars.length >= 2) markMission('multi')
    if (stars.some(s => Math.abs(s.eclLatDeg) >= 80)) markMission('pole')
    if (stars.some(s => Math.abs(s.eclLatDeg) <= 3)) markMission('ecliptic')
  }, [stars, markMission])
}
