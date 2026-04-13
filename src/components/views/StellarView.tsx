import { useRef, useEffect } from 'react'
import { useSimStore } from '../../store/simulationStore'
import { getEarthPosition } from '../../utils/astronomy'
import { useI18n } from '../../hooks/useI18n'

/**
 * 恒星視点ビュー (発展機能)
 * 近い恒星から地球・太陽を見たときの視点
 * Canvas 2D で太陽と地球の見え方を描画
 */
export default function StellarView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { tr } = useI18n()
  const stars = useSimStore(s => s.stars)
  const selectedStarId = useSimStore(s => s.selectedStarId)
  const earthAngleDeg = useSimStore(s => s.earthAngleDeg)
  const theme = useSimStore(s => s.theme)

  const star = stars.find(s => s.id === selectedStarId) ?? stars[0]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !star) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    const cx = w / 2
    const cy = h / 2

    const isDark = theme === 'dark'
    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = isDark ? '#050a14' : '#e8f0ff'
    ctx.fillRect(0, 0, w, h)

    // 恒星から見た座標系
    // 恒星位置: (cos(dir)*d, 0, sin(dir)*d) [au]
    const dAu = star.distancePc * 206265
    const starX = Math.cos(star.directionRad) * dAu
    const starZ = Math.sin(star.directionRad) * dAu

    // 太陽方向: 恒星→太陽
    const sunDX = 0 - starX
    const sunDZ = 0 - starZ
    const sunLen = Math.sqrt(sunDX * sunDX + sunDZ * sunDZ)

    // 太陽 (中心に表示)
    ctx.beginPath()
    ctx.arc(cx, cy, 12, 0, Math.PI * 2)
    ctx.fillStyle = '#ffe44d'
    ctx.shadowBlur = 20
    ctx.shadowColor = '#ffaa00'
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.fillStyle = isDark ? '#ffe44d' : '#cc8800'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(tr('view.sun'), cx + 15, cy + 4)

    // 地球 (太陽の周りを公転)
    const earthPos = getEarthPosition(earthAngleDeg)

    // 太陽に対する地球の方向ずれ (視差に対応)
    // 恒星から見た地球の見かけ方向
    const eDX = earthPos.x * dAu - starX  // [au * ... ] → au単位
    const eDZ = earthPos.z * dAu - starZ
    const eLen = Math.sqrt(eDX * eDX + eDZ * eDZ)
    const eNX = eDX / eLen
    const eNZ = eDZ / eLen

    // 太陽方向の正規化
    const sNX = sunDX / sunLen
    const sNZ = sunDZ / sunLen

    // 太陽方向と地球方向の差 (これが視差)
    // 横方向成分 (太陽方向に垂直)
    const perpX = -sNZ
    const perpZ = sNX
    const perpDiff = (eNX - sNX) * perpX + (eNZ - sNZ) * perpZ

    // 地球を視野内に表示 (誇張スケール)
    const exaggeration = 3000
    const ex = cx + perpDiff * exaggeration
    const ey = cy + (earthPos.z - 0) * 0.1

    ctx.beginPath()
    ctx.arc(ex, ey, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#4488ff'
    ctx.fill()

    ctx.fillStyle = '#88bbff'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(tr('view.earth'), ex + 9, ey + 4)

    // 地球の公転軌跡
    ctx.beginPath()
    let first = true
    for (let a = 0; a <= 360; a += 5) {
      const ep2 = getEarthPosition(a)
      const ed2X = ep2.x * dAu - starX
      const ed2Z = ep2.z * dAu - starZ
      const el2 = Math.sqrt(ed2X * ed2X + ed2Z * ed2Z)
      const en2X = ed2X / el2
      const en2Z = ed2Z / el2
      const pd2 = (en2X - sNX) * perpX + (en2Z - sNZ) * perpZ
      const tx = cx + pd2 * exaggeration
      const ty = cy + ep2.z * 0.1
      if (first) { ctx.moveTo(tx, ty); first = false }
      else ctx.lineTo(tx, ty)
    }
    ctx.closePath()
    ctx.strokeStyle = 'rgba(100,160,255,0.3)'
    ctx.lineWidth = 1
    ctx.stroke()

    // 説明テキスト
    ctx.fillStyle = isDark ? '#445566' : '#6688aa'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${tr('view.nearStar')}: ${star.name} から見た太陽系`, cx, 20)

    ctx.restore()
  }, [star, earthAngleDeg, theme, tr])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  )
}
