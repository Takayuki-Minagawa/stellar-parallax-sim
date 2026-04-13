import { useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useSimStore } from '../../store/simulationStore'
import { getEarthPosition, computeTrail, getStarName } from '../../utils/astronomy'
import { useI18n } from '../../hooks/useI18n'
import type { Star, Language } from '../../types'

// ─── 定数 ─────────────────────────────────────────────────────────────────────
const SCALE = 4          // 1 au → 4 scene units
const STAR_SCALE = 0.04  // 恒星の 3D 座標スケール (pc → scene units)

// ─── 地球 ──────────────────────────────────────────────────────────────────────
function Earth() {
  const earthAngleDeg = useSimStore(s => s.earthAngleDeg)
  const pos = getEarthPosition(earthAngleDeg)
  return (
    <mesh position={[pos.x * SCALE, 0, pos.z * SCALE]}>
      <sphereGeometry args={[0.18, 24, 24]} />
      <meshStandardMaterial color="#4488ff" emissive="#224488" />
    </mesh>
  )
}

// ─── 公転軌道 ─────────────────────────────────────────────────────────────────
function OrbitRing() {
  const points = useMemo(() => {
    return Array.from({ length: 361 }, (_, i) => {
      const a = (i / 360) * Math.PI * 2
      return new THREE.Vector3(Math.cos(a) * SCALE, 0, Math.sin(a) * SCALE)
    })
  }, [])
  return <Line points={points} color="#556688" lineWidth={1} dashed={false} />
}

// ─── 近傍恒星 ──────────────────────────────────────────────────────────────────
function NearStar({ star }: { star: Star }) {
  const sx = Math.cos(star.directionRad) * star.distancePc * STAR_SCALE * 100
  const sz = Math.sin(star.directionRad) * star.distancePc * STAR_SCALE * 100
  return (
    <mesh position={[sx, 0, sz]}>
      <sphereGeometry args={[0.22, 16, 16]} />
      <meshStandardMaterial color={star.color} emissive={star.color} emissiveIntensity={0.8} />
    </mesh>
  )
}

// ─── 残像軌跡 ─────────────────────────────────────────────────────────────────
function ParallaxTrail({ star }: { star: Star }) {
  const showTrail = useSimStore(s => s.showTrail)
  if (!showTrail) return null

  // 観測者ビューの見かけ方向を3D空間の補助として表示
  // 俯瞰ではシンプルに恒星の方向変化を可視化
  const trail = useMemo(() => computeTrail(star, 180), [star.id, star.distancePc]) // eslint-disable-line react-hooks/exhaustive-deps
  const baseX = Math.cos(star.directionRad)
  const baseZ = Math.sin(star.directionRad)
  const d = star.distancePc * STAR_SCALE * 100
  const perp = 0.5  // 視差の誇張スケール

  const points = useMemo(() =>
    trail.map(ap => new THREE.Vector3(
      baseX * d + (-baseZ) * ap.deltaRA * perp,
      ap.deltaDec * perp,
      baseZ * d + baseX * ap.deltaRA * perp
    )), [trail, baseX, baseZ, d, perp])

  return <Line points={points} color={star.color} lineWidth={2} dashed={false} />
}

// ─── 視差補助線 ───────────────────────────────────────────────────────────────
function ParallaxLines({ star }: { star: Star }) {
  const showParallaxLine = useSimStore(s => s.showParallaxLine)
  const earthAngleDeg = useSimStore(s => s.earthAngleDeg)
  if (!showParallaxLine) return null

  const ep = getEarthPosition(earthAngleDeg)
  const sx = Math.cos(star.directionRad) * star.distancePc * STAR_SCALE * 100
  const sz = Math.sin(star.directionRad) * star.distancePc * STAR_SCALE * 100
  const ex = ep.x * SCALE
  const ez = ep.z * SCALE

  const linePoints = [
    new THREE.Vector3(ex, 0, ez),
    new THREE.Vector3(sx, 0, sz),
  ]
  return <Line points={linePoints} color="#ffff44" lineWidth={1.5} dashed />
}

// ─── ラベル ────────────────────────────────────────────────────────────────────
function StarLabel({ star, tr, language }: { star: Star; tr: (k: string) => string; language: Language }) {
  const sx = Math.cos(star.directionRad) * star.distancePc * STAR_SCALE * 100
  const sz = Math.sin(star.directionRad) * star.distancePc * STAR_SCALE * 100
  return (
    <Html position={[sx + 0.3, 0.3, sz]} style={{ pointerEvents: 'none' }}>
      <span style={{ color: star.color, fontSize: '11px', whiteSpace: 'nowrap', textShadow: '0 0 4px #000' }}>
        {getStarName(star, language) || tr('view.nearStar')}
      </span>
    </Html>
  )
}

// ─── シーン ────────────────────────────────────────────────────────────────────
function Scene() {
  const { tr } = useI18n()
  const stars = useSimStore(s => s.stars)
  const playing = useSimStore(s => s.playing)
  const speed = useSimStore(s => s.speed)
  const setEarthAngle = useSimStore(s => s.setEarthAngle)
  const earthAngleDeg = useSimStore(s => s.earthAngleDeg)
  const language = useSimStore(s => s.language)

  useFrame((_, delta) => {
    if (!playing) return
    setEarthAngle(earthAngleDeg + delta * speed * 60)
  })

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#fffde0" />
      <Stars radius={300} depth={80} count={3000} factor={4} saturation={0.5} fade />

      {/* 太陽 */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color="#ffe44d" emissive="#ffaa00" emissiveIntensity={1} />
      </mesh>
      <Html position={[0.5, 0.5, 0]} style={{ pointerEvents: 'none' }}>
        <span style={{ color: '#ffe44d', fontSize: '11px', textShadow: '0 0 4px #000' }}>
          {tr('view.sun')}
        </span>
      </Html>

      <OrbitRing />
      <Earth />

      {/* 地球ラベル */}
      <EarthLabel tr={tr} />

      {stars.map(star => (
        <group key={star.id}>
          <NearStar star={star} />
          <ParallaxTrail star={star} />
          <ParallaxLines star={star} />
          <StarLabel star={star} tr={tr} language={language} />
        </group>
      ))}

      <OrbitControls
        enablePan={true}
        maxPolarAngle={Math.PI * 0.9}
        minPolarAngle={0.05}
        minDistance={2}
        maxDistance={120}
      />
    </>
  )
}

function EarthLabel({ tr }: { tr: (k: string) => string }) {
  const earthAngleDeg = useSimStore(s => s.earthAngleDeg)
  const pos = getEarthPosition(earthAngleDeg)
  return (
    <Html position={[pos.x * SCALE + 0.25, 0.25, pos.z * SCALE]} style={{ pointerEvents: 'none' }}>
      <span style={{ color: '#88bbff', fontSize: '11px', textShadow: '0 0 4px #000' }}>
        {tr('view.earth')}
      </span>
    </Html>
  )
}

// ─── エクスポート ──────────────────────────────────────────────────────────────
export default function OverheadView() {
  const theme = useSimStore(s => s.theme)
  const bg = theme === 'dark' ? '#050a14' : '#0d1b2a'

  return (
    <div className="w-full h-full" style={{ background: bg }}>
      <Canvas
        camera={{ position: [0, 30, 0], fov: 50 }}
        gl={{ antialias: true }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
