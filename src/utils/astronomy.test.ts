import { describe, it, expect } from 'vitest'
import {
  getApparentOffset, getAberration, computeTrail, distanceToParallax, parallaxToDistance,
  maxShiftAngleDeg, offsetSeparation, angleToDate, monthToAngle, stepMonth, formatParallax, niceStep,
  simplestDetector, ABERRATION_KAPPA,
} from './astronomy'
import type { Star } from '../types'

const star = (patch: Partial<Star> = {}): Star => ({
  id: 't', name: 't', nameEn: 't', distancePc: 2, eclLonDeg: 30, eclLatDeg: 40, color: '#ffffff', ...patch,
})

const extent = (s: Star) => {
  const trail = computeTrail(s, 720)
  const r = trail.map(a => Math.hypot(a.dLon, a.dLat))
  return { max: Math.max(...r), min: Math.min(...r) }
}

describe('parallax geometry', () => {
  it('d = 1/p', () => {
    expect(distanceToParallax(4)).toBeCloseTo(0.25)
    expect(parallaxToDistance(0.1)).toBeCloseTo(10)
  })

  it('apparent ellipse has semi-major axis p for any latitude', () => {
    for (const beta of [0, 25, -60, 90]) {
      const s = star({ eclLatDeg: beta })
      expect(extent(s).max).toBeCloseTo(0.5, 3)
    }
  })

  it('semi-minor axis is p |sin β|: circle at the pole, line on the ecliptic', () => {
    expect(extent(star({ eclLatDeg: 90 })).min).toBeCloseTo(0.5, 3)
    expect(extent(star({ eclLatDeg: 0 })).min).toBeLessThan(0.002)
    expect(extent(star({ eclLatDeg: 30 })).min).toBeCloseTo(0.25, 2)
  })

  it('maximum half-year separation is 2p at maxShiftAngleDeg', () => {
    const s = star({ distancePc: 5, eclLonDeg: 200, eclLatDeg: 10 })
    const a = maxShiftAngleDeg(s)
    const sep = offsetSeparation(getApparentOffset(s, a), getApparentOffset(s, a + 180))
    expect(sep).toBeCloseTo(2 / 5, 4)
  })

  it('aberration is κ regardless of distance and 90° out of phase with parallax', () => {
    const near = star({ distancePc: 1.3, eclLatDeg: 90 })
    const far = star({ distancePc: 800, eclLatDeg: 90 })
    for (const a of [0, 77, 200]) {
      const an = getAberration(near, a)
      expect(Math.hypot(an.dLon, an.dLat)).toBeCloseTo(ABERRATION_KAPPA, 6)
      expect(getAberration(far, a)).toEqual(an)
      const par = getApparentOffset(near, a)
      // 極方向の星では視差と光行差のずれベクトルは直交する
      expect(par.dLon * an.dLon + par.dLat * an.dLat).toBeCloseTo(0, 6)
    }
  })
})

describe('calendar', () => {
  it('maps angles to dates and back', () => {
    expect(angleToDate(0)).toEqual({ month: 0, day: 1 })
    expect(angleToDate(monthToAngle(6)).month).toBe(6)
    expect(angleToDate(359.9).month).toBe(11)
    expect(angleToDate(-1).month).toBe(11)
  })

  it('month starts map back to day 1 of the same month', () => {
    for (let m = 0; m < 12; m++) {
      expect(angleToDate(monthToAngle(m))).toEqual({ month: m, day: 1 })
      // 共有 URL では小数 2 桁に丸めて保存される
      expect(angleToDate(+monthToAngle(m).toFixed(2))).toEqual({ month: m, day: 1 })
    }
  })

  it('stepMonth visits every month (including February) in order', () => {
    let a = 0
    const seen: number[] = []
    for (let i = 0; i < 12; i++) {
      a = stepMonth(a, 1)
      seen.push(angleToDate(a).month)
    }
    expect(seen).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0])
    // 戻す: 月の途中なら今月の 1 日、1 日ならその前の月の 1 日
    expect(angleToDate(stepMonth(monthToAngle(2) + 5, -1))).toEqual({ month: 2, day: 1 })
    expect(angleToDate(stepMonth(monthToAngle(2), -1))).toEqual({ month: 1, day: 1 })
    expect(angleToDate(stepMonth(0, -1))).toEqual({ month: 11, day: 1 })
  })
})

describe('formatting & helpers', () => {
  it('formats parallax with sensible units', () => {
    expect(formatParallax(0.3792)).toBe('0.3792″')
    expect(formatParallax(0.00125)).toBe('1.25 mas')
    expect(formatParallax(0.000005)).toBe('5.00 µas')
  })

  it('picks 1-2-5 steps', () => {
    expect(niceStep(0.13)).toBeCloseTo(0.1)
    expect(niceStep(0.3)).toBeCloseTo(0.2)
    expect(niceStep(4)).toBeCloseTo(5)
  })

  it('finds the simplest instrument that can measure a parallax', () => {
    expect(simplestDetector(0.38)?.key).toBe('ground')
    expect(simplestDetector(0.005)?.key).toBe('hipparcos')
    expect(simplestDetector(0.0001)?.key).toBe('gaia')
    expect(simplestDetector(1e-6)).toBeUndefined()
  })
})
