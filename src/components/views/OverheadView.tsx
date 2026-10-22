import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useSimStore, useSelectedStar } from '../../store/simulationStore'
import {
  getEarthPosition, getStarName, starUnitVector, monthToAngle,
} from '../../utils/astronomy'
import { seededRandom } from '../../utils/canvas'
import { useI18n } from '../../hooks/useI18n'
import type { Line2 } from 'three-stdlib'
import type { Star, Vec3, CameraPreset } from '../../types'

// ─── 縮尺 (教育用に誇張) ──────────────────────────────────────────────────────
/** 1 au → scene units */
const ORBIT_R = 4
/** 背景の天球 (遠い星を投影するスクリーン) までの距離 */
const SCREEN_DIST = 20
/** 恒星の表示距離: 実距離を対数で圧縮 (1e5 pc でも背景の天球より手前に収める) */
const starSceneDist = (pc: number) => Math.min(SCREEN_DIST - 1, 6 + 2.6 * Math.log10(1 + pc))

/** 黄道座標 (z = 北) → three.js 座標 (y = 上) */
const toScene = (v: Vec3, k = 1) => new THREE.Vector3(v.x * k, v.z * k, -v.y * k)

/** 初期カメラ (CameraRig が選択中の恒星に合わせて動かす) */
const INITIAL_CAMERA: [number, number, number] = [0, 17, 25]

/**
 * 選択中の恒星に合わせたカメラ位置
 * 太陽—恒星—背景の天球を横から見る配置にすると、教科書の図と同じ見え方になる
 */
function cameraFor(preset: CameraPreset, star: Star, aspect: number): { pos: THREE.Vector3; target: THREE.Vector3 } {
  const u = toScene(starUnitVector(star))
  const target = u.clone().multiplyScalar(SCREEN_DIST * 0.45)
  const side = new THREE.Vector3(-u.z, 0, u.x)
  if (side.lengthSq() < 1e-6) side.set(0, 0, 1)
  side.normalize()
  // カメラは常に手前 (+z 側) から見る
  if (side.z < 0) side.negate()
  // 縦長の画面では横方向が狭くなるので離れて見る
  const D = 27 * Math.min(2, Math.max(1, 1.5 / aspect))
  const up = new THREE.Vector3(0, 1, 0)
  if (preset === 'top') {
    target.y = 0
    return { pos: target.clone().add(up.multiplyScalar(D * 1.3)).add(side.multiplyScalar(0.01)), target }
  }
  if (preset === 'edge') {
    target.y = 0
    return { pos: target.clone().add(side.multiplyScalar(D)).add(up.multiplyScalar(0.6)), target }
  }
  return { pos: target.clone().add(side.multiplyScalar(D * 0.8)).add(up.multiplyScalar(D * 0.55)), target }
}

const LABEL_Z: [number, number] = [20, 0]

// ─── カメラ ───────────────────────────────────────────────────────────────────
function CameraRig() {
  const preset = useSimStore(s => s.cameraPreset)
  const nonce = useSimStore(s => s.cameraNonce)
  const selectedStarId = useSimStore(s => s.selectedStarId)
  const camera = useThree(s => s.camera)
  const size = useThree(s => s.size)
  const controls = useThree(s => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null)

  // プリセット変更・恒星の選択時にカメラを向け直す (距離や方向のスライダー操作では動かさない)
  useEffect(() => {
    const st = useSimStore.getState()
    const star = st.stars.find(s => s.id === selectedStarId) ?? st.stars[0]
    if (star) goal.current = cameraFor(preset, star, size.width / Math.max(1, size.height))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, nonce, selectedStarId])

  useFrame((_, dt) => {
    const g = goal.current
    if (!g || !controls) return
    const k = Math.min(1, dt * 4)
    camera.position.lerp(g.pos, k)
    controls.target.lerp(g.target, k)
    controls.update()
    if (camera.position.distanceTo(g.pos) < 0.02 && controls.target.distanceTo(g.target) < 0.02) goal.current = null
  })
  return null
}

// ─── 公転に追従する要素 ───────────────────────────────────────────────────────
// 再生中に毎フレーム React を再レンダリングすると drei の <Line> がジオメトリと
// マテリアルを作り直す (シェーダーの再コンパイルが走る) ため、角度に依存する要素は
// useFrame の中で位置だけを直接書き換える。

const currentAngle = () => useSimStore.getState().earthAngleDeg
const earthScenePos = (angleDeg: number) => toScene(getEarthPosition(angleDeg), ORBIT_R)

/** 既存の Line2 ジオメトリの頂点を、バッファを作り直さずに上書きする */
function writeLinePoints(line: Line2, pts: THREE.Vector3[]) {
  const attr = line.geometry.attributes.instanceStart as THREE.InterleavedBufferAttribute | undefined
  if (!attr) return
  const arr = attr.data.array as Float32Array
  const n = Math.min(pts.length - 1, Math.floor(arr.length / 6))
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    arr[i * 6] = a.x; arr[i * 6 + 1] = a.y; arr[i * 6 + 2] = a.z
    arr[i * 6 + 3] = b.x; arr[i * 6 + 4] = b.y; arr[i * 6 + 5] = b.z
  }
  attr.data.needsUpdate = true
}

/** 公転角度に応じて頂点が変わる線 (頂点数は一定であること) */
function DynamicLine({ compute, color, lineWidth = 1, opacity = 1 }: {
  compute: (angleDeg: number) => THREE.Vector3[]
  color: string
  lineWidth?: number
  opacity?: number
}) {
  const ref = useRef<Line2>(null)
  // 初期頂点はマウント時に一度だけ作る (以降は useFrame で書き換え)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => compute(currentAngle()), [])
  // 負の優先度: 描画や子の Html より先に頂点を更新する
  useFrame(() => {
    if (ref.current) writeLinePoints(ref.current, compute(currentAngle()))
  }, -1)
  return (
    <Line
      ref={ref}
      points={initial}
      color={color}
      lineWidth={lineWidth}
      transparent={opacity < 1}
      opacity={opacity}
      frustumCulled={false}
    />
  )
}

/** 公転角度に応じて位置が変わるグループ (メッシュや Html ラベルを入れる) */
function FollowGroup({ position, children }: {
  position: (angleDeg: number) => THREE.Vector3
  children: ReactNode
}) {
  const ref = useRef<THREE.Group>(null)
  // 負の優先度: 子の Html ラベルが位置を計算する前に動かす (1 フレーム遅れ防止)
  useFrame(() => {
    ref.current?.position.copy(position(currentAngle()))
  }, -1)
  return <group ref={ref} position={position(currentAngle())}>{children}</group>
}

// ─── 太陽・地球 ───────────────────────────────────────────────────────────────
function Sun({ label }: { label: string }) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshBasicMaterial color="#ffe066" />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.0, 32, 32]} />
        <meshBasicMaterial color="#ffb300" transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <Html position={[0.7, 0.7, 0]} zIndexRange={LABEL_Z}>
        <span className="scene-label" style={{ color: '#ffe066' }}>{label}</span>
      </Html>
    </group>
  )
}

function Earth({ offsetDeg = 0, ghost = false, label }: { offsetDeg?: number; ghost?: boolean; label?: string }) {
  return (
    <FollowGroup position={a => earthScenePos(a + offsetDeg)}>
      <mesh>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshStandardMaterial
          color={ghost ? '#f472b6' : '#4f9bff'}
          emissive={ghost ? '#831843' : '#1d3f80'}
          transparent={ghost}
          opacity={ghost ? 0.55 : 1}
        />
      </mesh>
      {label && (
        <Html position={[0.3, 0.35, 0]} zIndexRange={LABEL_Z}>
          <span className="scene-label" style={{ color: ghost ? '#f9a8d4' : '#93c5fd' }}>{label}</span>
        </Html>
      )}
    </FollowGroup>
  )
}

function Orbit({ monthsShort, auLabel }: { monthsShort: string[]; auLabel: string }) {
  const ring = useMemo(
    () => Array.from({ length: 181 }, (_, i) => earthScenePos((i / 180) * 360)),
    []
  )
  const origin = useMemo(() => new THREE.Vector3(0, 0, 0), [])
  return (
    <group>
      <Line points={ring} color="#5b7bb5" lineWidth={1.2} />
      {/* 黄道面の目安 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 16, 64]} />
        <meshBasicMaterial color="#3b5a99" transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* 1 au の半径線 */}
      <DynamicLine compute={a => [origin, earthScenePos(a)]} color="#7da3e0" lineWidth={1} opacity={0.6} />
      <FollowGroup position={a => earthScenePos(a).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.35, 0))}>
        <Html center zIndexRange={LABEL_Z}>
          <span className="scene-label" style={{ color: '#9db8e8', fontWeight: 500 }}>{auLabel}</span>
        </Html>
      </FollowGroup>
      {/* 月の目盛り */}
      {[0, 3, 6, 9].map(m => {
        const p = toScene(getEarthPosition(monthToAngle(m)), ORBIT_R * 1.22)
        return (
          <Html key={m} position={p} center zIndexRange={LABEL_Z}>
            <span className="scene-label" style={{ color: '#7f94bd', fontWeight: 500 }}>{monthsShort[m]}</span>
          </Html>
        )
      })}
    </group>
  )
}

// ─── 恒星 ─────────────────────────────────────────────────────────────────────
function NearStar({ star, selected, label }: { star: Star; selected: boolean; label: string }) {
  const pos = useMemo(() => toScene(starUnitVector(star), starSceneDist(star.distancePc)), [star])
  const foot = useMemo(() => new THREE.Vector3(pos.x, 0, pos.z), [pos])
  const drop = useMemo(() => [pos, foot], [pos, foot])
  const r = selected ? 0.4 : 0.28
  return (
    <group>
      <mesh position={pos}>
        <sphereGeometry args={[r, 20, 20]} />
        <meshBasicMaterial color={star.color} />
      </mesh>
      <mesh position={pos}>
        <sphereGeometry args={[r * 2.2, 20, 20]} />
        <meshBasicMaterial color={star.color} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* 黄道面への垂線 (黄緯を立体的に把握するため) */}
      {Math.abs(pos.y) > 0.3 && (
        <Line points={drop} color={star.color} lineWidth={0.8} dashed dashSize={0.4} gapSize={0.3} transparent opacity={0.4} />
      )}
      <Html position={[pos.x + 0.5, pos.y + 0.5, pos.z]} zIndexRange={LABEL_Z}>
        <span className="scene-label" style={{ color: star.color, fontSize: selected ? 12 : 11, opacity: selected ? 1 : 0.8 }}>
          {label}
        </span>
      </Html>
    </group>
  )
}

/** 地球→恒星の視線を背景の天球に延長したときの交点 */
function screenHit(u: THREE.Vector3, starPos: THREE.Vector3, earth: THREE.Vector3): THREE.Vector3 {
  const eu = earth.dot(u)
  const t = (SCREEN_DIST - eu) / (starPos.dot(u) - eu)
  return earth.clone().add(starPos.clone().sub(earth).multiplyScalar(t))
}

/** 恒星から見た「太陽方向」と「地球方向」のなす角の弧 (その瞬間の視差) */
const ARC_R = 1.6
function parallaxArc(starPos: THREE.Vector3, earth: THREE.Vector3): THREE.Vector3[] {
  const a = new THREE.Vector3().sub(starPos).normalize()
  const b = earth.clone().sub(starPos).normalize()
  return Array.from({ length: 17 }, (_, i) =>
    starPos.clone().add(a.clone().lerp(b, i / 16).normalize().multiplyScalar(ARC_R)))
}

/** 選択中の恒星: 視線・背景の天球・軌跡・視差角 */
function SightGeometry({ star, labels }: {
  star: Star
  labels: { screen: string; p: string; apparent: string }
}) {
  const showTrail = useSimStore(s => s.showTrail)
  const showParallaxLine = useSimStore(s => s.showParallaxLine)
  const compareMode = useSimStore(s => s.compareMode)

  const u = useMemo(() => toScene(starUnitVector(star)), [star])
  const starPos = useMemo(() => u.clone().multiplyScalar(starSceneDist(star.distancePc)), [u, star.distancePc])
  const center = useMemo(() => u.clone().multiplyScalar(SCREEN_DIST), [u])
  const origin = useMemo(() => new THREE.Vector3(0, 0, 0), [])
  const sunToScreen = useMemo(() => [origin, center], [origin, center])
  const sunToStar = useMemo(() => [origin, starPos], [origin, starPos])

  const trail = useMemo(
    () => Array.from({ length: 121 }, (_, i) => screenHit(u, starPos, earthScenePos((i / 120) * 360))),
    [u, starPos]
  )
  const trailRadius = useMemo(() => Math.max(...trail.map(p => p.distanceTo(center))), [trail, center])
  const screenRadius = Math.max(3.5, trailRadius * 1.45)

  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), u), [u])
  const bgPoints = useMemo(() => {
    const rnd = seededRandom(7)
    const arr = new Float32Array(160 * 3)
    for (let i = 0; i < 160; i++) {
      const r = Math.sqrt(rnd()) * 0.97
      const a = rnd() * Math.PI * 2
      arr[i * 3] = Math.cos(a) * r
      arr[i * 3 + 1] = Math.sin(a) * r
      arr[i * 3 + 2] = 0.01
    }
    return arr
  }, [])

  const hitAt = (a: number) => screenHit(u, starPos, earthScenePos(a))

  return (
    // 恒星の位置が変わったら公転追従の要素も初期化し直す
    <group key={`${u.x},${u.y},${u.z},${starPos.length()}`}>
      {/* 背景の天球 (遠い恒星のスクリーン) */}
      <group position={center} quaternion={quat}>
        <mesh>
          <circleGeometry args={[screenRadius, 48]} />
          <meshBasicMaterial color="#1e3a6e" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <points scale={[screenRadius, screenRadius, 1]}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[bgPoints, 3]} />
          </bufferGeometry>
          <pointsMaterial color="#cfe0ff" size={0.12} sizeAttenuation transparent opacity={0.8} />
        </points>
        <Html position={[0, screenRadius + 0.8, 0]} center zIndexRange={LABEL_Z}>
          <span className="scene-label" style={{ color: '#8fb0e8', fontWeight: 500 }}>{labels.screen}</span>
        </Html>
      </group>

      {/* 太陽から見た方向 (基準) */}
      <Line points={sunToScreen} color="#94a3b8" lineWidth={1} dashed dashSize={0.6} gapSize={0.5} transparent opacity={0.55} />
      <mesh position={center}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshBasicMaterial color="#94a3b8" />
      </mesh>

      {/* 背景天球上の見かけの軌跡 */}
      {showTrail && <Line points={trail} color={star.color} lineWidth={2} transparent opacity={0.85} />}

      {/* 地球からの視線 (恒星より先は背景の天球まで延長) */}
      <DynamicLine compute={a => [earthScenePos(a), starPos]} color="#fde047" lineWidth={1.8} />
      <DynamicLine compute={a => [starPos, hitAt(a)]} color="#fde047" lineWidth={1.2} opacity={0.55} />
      <FollowGroup position={hitAt}>
        <mesh>
          <sphereGeometry args={[0.32, 16, 16]} />
          <meshBasicMaterial color={star.color} />
        </mesh>
        <Html position={[0, 0.7, 0]} center zIndexRange={LABEL_Z}>
          <span className="scene-label" style={{ color: '#fde047', fontWeight: 500 }}>{labels.apparent}</span>
        </Html>
      </FollowGroup>

      {compareMode && (
        <>
          <Earth offsetDeg={180} ghost />
          <DynamicLine compute={a => [earthScenePos(a + 180), hitAt(a + 180)]} color="#f472b6" lineWidth={1.2} opacity={0.7} />
          <FollowGroup position={a => hitAt(a + 180)}>
            <mesh>
              <sphereGeometry args={[0.26, 16, 16]} />
              <meshBasicMaterial color="#f472b6" />
            </mesh>
          </FollowGroup>
          <DynamicLine compute={a => [hitAt(a), hitAt(a + 180)]} color="#f472b6" lineWidth={2} />
        </>
      )}

      {/* 視差角 p */}
      {showParallaxLine && (
        <>
          <Line points={sunToStar} color="#94a3b8" lineWidth={1.2} />
          <DynamicLine compute={a => parallaxArc(starPos, earthScenePos(a))} color="#fb7185" lineWidth={2.5} />
          <FollowGroup
            position={a => {
              const mid = parallaxArc(starPos, earthScenePos(a))[8]
              return mid.clone().add(mid.clone().sub(starPos).multiplyScalar(0.45))
            }}
          >
            <Html center zIndexRange={LABEL_Z}>
              <span className="scene-label" style={{ color: '#fb7185', fontSize: 13 }}>{labels.p}</span>
            </Html>
          </FollowGroup>
        </>
      )}
    </group>
  )
}

// ─── シーン ───────────────────────────────────────────────────────────────────
// earthAngleDeg は購読しない (公転は上の useFrame 系コンポーネントで反映)
function Scene() {
  const { tr, trArr } = useI18n()
  const stars = useSimStore(s => s.stars)
  const language = useSimStore(s => s.language)
  const selected = useSelectedStar()

  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 0, 0]} intensity={60} decay={1.6} color="#fff4d6" />
      <Stars radius={160} depth={60} count={2500} factor={4} saturation={0.4} fade speed={0.4} />

      <Sun label={tr('view.sun')} />
      <Orbit monthsShort={trArr('monthsShort')} auLabel="1 au" />
      <Earth label={tr('view.earth')} />

      {stars.map(star => (
        <NearStar
          key={star.id}
          star={star}
          selected={star.id === selected?.id}
          label={getStarName(star, language) || tr('view.nearStar')}
        />
      ))}
      {selected && (
        <SightGeometry
          star={selected}
          labels={{ screen: tr('view.screen'), p: tr('view.parallaxP'), apparent: tr('view.apparentPos') }}
        />
      )}

      <OrbitControls
        makeDefault
        enablePan
        maxPolarAngle={Math.PI * 0.95}
        minDistance={4}
        maxDistance={120}
      />
      <CameraRig />
    </>
  )
}

export default function OverheadView() {
  return (
    <div className="absolute inset-0 bg-[#040811]">
      <Canvas camera={{ position: INITIAL_CAMERA, fov: 45, near: 0.1, far: 1000 }} gl={{ antialias: true }} dpr={[1, 2]}>
        <Scene />
      </Canvas>
    </div>
  )
}
