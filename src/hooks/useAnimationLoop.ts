import { useEffect } from 'react'
import { useSimStore } from '../store/simulationStore'

/** 1× のときの公転速度 [deg/s] (1 年 = 60 秒) */
export const BASE_DEG_PER_SEC = 6

/**
 * 公転アニメーションのドライバ
 * どの視点モードでも再生できるよう、ビューとは独立して App で 1 回だけ使う
 */
export function useAnimationLoop() {
  const playing = useSimStore(s => s.playing)

  useEffect(() => {
    if (!playing) return
    let frame = 0
    let last = performance.now()
    let traveled = 0

    const tick = (now: number) => {
      // タブが非表示だった場合などの大きなジャンプを抑える
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const { earthAngleDeg, speed, setEarthAngle, markMission } = useSimStore.getState()
      const step = dt * speed * BASE_DEG_PER_SEC
      setEarthAngle(earthAngleDeg + step)
      traveled += step
      if (traveled >= 360) markMission('playYear')
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])
}
