/**
 * Home body explorer (H17): an anatomical figure with every skeletal muscle and bone.
 *
 * Model: public/models/anatomy/{muscles,bones}.glb, CC BY-SA 4.0, derived from Z-Anatomy and
 * BodyParts3D (see public/models/anatomy/README.md). Metres, +Y up, anterior +Z, left = +X,
 * feet at y = 0, 1.71 m tall. About 1 million triangles in ~800 parts.
 *
 * On load, every part is moved into world space and merged by material into a few meshes
 * (base muscle, bone, and one muscle mesh per body area) so it draws in about ten calls and the
 * selected area can glow on its own.
 *
 * Layered separation (web3d-integration-patterns): this module owns Three.js only. React owns the
 * hotspot buttons and receives their screen positions through onFrame(). Renders only while something
 * moves, and stops when the canvas is off screen or the tab is hidden.
 */
import {
  ACESFilmicToneMapping, AmbientLight, BufferAttribute, BufferGeometry, Color, DirectionalLight, Float32BufferAttribute, Group, Mesh,
  MeshBasicMaterial, MeshPhysicalMaterial, PerspectiveCamera, PMREMGenerator, Points, PointsMaterial, RingGeometry, Scene, SphereGeometry,
  Vector3, WebGLRenderer, type Object3D,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export type AreaKey = 'brain' | 'eyes' | 'heart' | 'lungs' | 'metabolic' | 'kidneys' | 'blood'

export interface HotspotPoint {
  x: number
  y: number
  front: boolean
}

export interface BodyScene {
  setSelected: (id: AreaKey | null) => void
  setAutoRotate: (on: boolean) => void
  zoomBy: (f: number) => void
  rotateBy: (rad: number) => void
  reset: () => void
  dispose: () => void
}

const PRIMARY = new Color('#1D5FBF')
const BODY_H = 1.71 // metres
const WORLD_H = 3.9 // scene units, feet at y = -2
const SCALE = WORLD_H / BODY_H
const MODEL_URL = '/models/anatomy/'

/** Positions are in model metres. Areas also claim the muscles around them for the highlight. */
export function initBodyScene(
  canvas: HTMLCanvasElement,
  opts: {
    areas: { id: AreaKey; pos: [number, number, number] }[]
    onFrame: (pts: Partial<Record<AreaKey, HotspotPoint>>) => void
    onProgress?: (pct: number) => void
    onReady?: () => void
    onError?: () => void
    reduced: boolean
  },
): BodyScene | null {
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.95

  const scene = new Scene()
  const pmrem = new PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const envTex = pmrem.fromScene(room, 0.04).texture
  scene.environment = envTex
  scene.environmentIntensity = 0.55
  room.dispose()

  const camera = new PerspectiveCamera(28, 1, 0.1, 60)
  scene.add(new AmbientLight(0xffffff, 0.35))
  const key = new DirectionalLight(0xffffff, 2.2)
  key.position.set(2.5, 4, 5)
  scene.add(key)
  const rim = new DirectionalLight(0xd6e6fb, 1.6)
  rim.position.set(-3, 2, -4)
  scene.add(rim)

  const disposables: { dispose: () => void }[] = [envTex, pmrem]
  const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x)

  // Figure: model metres -> scene units, feet on the floor ring
  const body = new Group()
  body.scale.setScalar(SCALE)
  body.position.y = -2.0
  scene.add(body)

  const muscleMat = () =>
    track(
      new MeshPhysicalMaterial({
        color: '#8e2a22', roughness: 0.42, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.35,
        sheen: 0.7, sheenColor: new Color('#e2735f'), sheenRoughness: 0.4, emissive: new Color('#ff5a3c'), emissiveIntensity: 0,
      }),
    )
  const boneMat = track(new MeshPhysicalMaterial({ color: '#e9dcc6', roughness: 0.55, clearcoat: 0.15 }))
  const areaMats = new Map<AreaKey, MeshPhysicalMaterial>()

  // ---- Floor: orbit ring + dotted disc + satellites
  const ring = new Mesh(track(new RingGeometry(1.25, 1.27, 128)), track(new MeshBasicMaterial({ color: PRIMARY, transparent: true, opacity: 0.55 })))
  ring.rotation.x = -Math.PI / 2
  ring.position.y = -2.0
  scene.add(ring)
  const dotsGeo = track(new BufferGeometry())
  const dp: number[] = []
  for (let r = 0.3; r < 1.2; r += 0.15) for (let a = 0; a < Math.PI * 2; a += 0.22 / r) dp.push(Math.cos(a) * r, -2.0, Math.sin(a) * r)
  dotsGeo.setAttribute('position', new Float32BufferAttribute(dp, 3))
  scene.add(new Points(dotsGeo, track(new PointsMaterial({ color: '#D6E6FB', size: 0.03 }))))
  const satGeo = track(new SphereGeometry(1, 16, 12))
  const satMat = track(new MeshBasicMaterial({ color: PRIMARY }))
  const satellites = [0, 1, 2].map(() => {
    const m = new Mesh(satGeo, satMat)
    m.scale.setScalar(0.035)
    scene.add(m)
    return m
  })

  // ---- Load and merge the anatomy
  let ready = false
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  const files = ['muscles.glb', 'bones.glb']
  const progress = [0, 0]
  const load = (f: string, i: number) =>
    loader.loadAsync(MODEL_URL + f, (e) => {
      if (e.total) {
        progress[i] = e.loaded / e.total
        opts.onProgress?.(Math.round(((progress[0] + progress[1]) / 2) * 100))
      }
    })

  /** Dequantise to float, bake the part's transform, keep position + normal only (so parts merge) */
  const bake = (o: Object3D) => {
    const out: { geo: BufferGeometry; center: Vector3 }[] = []
    o.updateMatrixWorld(true)
    o.traverse((c) => {
      const m = c as Mesh
      if (!m.isMesh) return
      const src = m.geometry
      const pos = src.getAttribute('position')
      const nor = src.getAttribute('normal')
      const g = new BufferGeometry()
      const p = new Float32Array(pos.count * 3)
      for (let i = 0; i < pos.count; i++) {
        p[i * 3] = pos.getX(i)
        p[i * 3 + 1] = pos.getY(i)
        p[i * 3 + 2] = pos.getZ(i)
      }
      g.setAttribute('position', new BufferAttribute(p, 3))
      if (nor) {
        const n = new Float32Array(nor.count * 3)
        for (let i = 0; i < nor.count; i++) {
          n[i * 3] = nor.getX(i)
          n[i * 3 + 1] = nor.getY(i)
          n[i * 3 + 2] = nor.getZ(i)
        }
        g.setAttribute('normal', new BufferAttribute(n, 3))
      }
      // every part needs an index so they can all merge
      g.setIndex(src.index ? Array.from(src.index.array as ArrayLike<number>) : Array.from({ length: pos.count }, (_, i) => i))
      g.applyMatrix4(m.matrixWorld)
      if (!nor) g.computeVertexNormals()
      g.computeBoundingSphere()
      out.push({ geo: g, center: g.boundingSphere!.center.clone() })
      src.dispose()
    })
    return out
  }

  const addMerged = (geos: BufferGeometry[], mat: MeshPhysicalMaterial) => {
    if (!geos.length) return
    const merged = mergeGeometries(geos, false)
    geos.forEach((g) => g.dispose())
    if (!merged) return
    track(merged)
    body.add(new Mesh(merged, mat))
  }

  Promise.all(files.map(load))
    .then(([muscles, bones]) => {
      if (disposed) return
      // muscles: claim parts near each area (xy distance in metres), the rest go to the base mesh
      const base: BufferGeometry[] = []
      const byArea = new Map<AreaKey, BufferGeometry[]>()
      for (const { geo, center } of bake(muscles.scene)) {
        let owner: AreaKey | null = null
        let best = 0.085
        for (const a of opts.areas) {
          const d = Math.hypot(center.x - a.pos[0], center.y - a.pos[1])
          if (d < best && Math.abs(center.z - a.pos[2]) < 0.2) {
            best = d
            owner = a.id
          }
        }
        if (owner) (byArea.get(owner) ?? byArea.set(owner, []).get(owner)!).push(geo)
        else base.push(geo)
      }
      const baseMat = muscleMat()
      addMerged(base, baseMat)
      for (const [id, geos] of byArea) {
        const mat = muscleMat()
        areaMats.set(id, mat)
        addMerged(geos, mat)
      }
      addMerged(
        bake(bones.scene).map((b) => b.geo),
        boneMat,
      )
      ready = true
      st.intro = opts.reduced ? 1 : 0
      opts.onReady?.()
      kick()
    })
    .catch(() => !disposed && opts.onError?.())

  // ---- State with damping
  const st = {
    rotY: -0.9, rotYT: 0.25, rotX: 0, rotXT: 0, zoom: 1, zoomT: 1,
    auto: !opts.reduced, dragging: false, intro: 0, selected: null as AreaKey | null, t: 0,
  }
  if (opts.reduced) st.rotY = st.rotYT
  let w = 0
  let h = 0
  let baseZ = 9
  let disposed = false

  const resize = () => {
    const r = canvas.getBoundingClientRect()
    if (!r.width || !r.height) return
    w = r.width
    h = r.height
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const tanHalf = Math.tan((camera.fov * Math.PI) / 360)
    baseZ = Math.max(2.12 / tanHalf, 1.3 / (tanHalf * camera.aspect))
    camera.updateProjectionMatrix()
    kick()
  }

  // ---- Interaction: drag to turn, inertia
  let lastX = 0
  let lastY = 0
  let vel = 0
  const down = (e: PointerEvent) => {
    st.dragging = true
    lastX = e.clientX
    lastY = e.clientY
    vel = 0
    canvas.setPointerCapture(e.pointerId)
    kick()
  }
  const move = (e: PointerEvent) => {
    if (!st.dragging) return
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    vel = dx * 0.01
    st.rotYT += vel
    st.rotXT = Math.max(-0.3, Math.min(0.3, st.rotXT + dy * 0.004))
    kick()
  }
  const up = () => {
    st.dragging = false
    kick()
  }
  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('pointercancel', up)

  // ---- Loop (only while something moves)
  let raf = 0
  let visible = true
  let last = performance.now()
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    if (visible) kick()
  })
  io.observe(canvas)
  const onVis = () => !document.hidden && kick()
  document.addEventListener('visibilitychange', onVis)

  const tmp = new Vector3()
  const center = new Vector3()
  function project() {
    const pts: Partial<Record<AreaKey, HotspotPoint>> = {}
    if (ready) {
      center.set(0, 0, 0)
      for (const a of opts.areas) {
        tmp.set(...a.pos)
        body.localToWorld(tmp)
        const front = tmp.z - center.z > -0.08
        tmp.project(camera)
        pts[a.id] = { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h, front }
      }
    }
    opts.onFrame(pts)
  }

  function frame(now: number) {
    raf = 0
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    st.t += dt
    let moving = !ready // keep the ring turning while the model loads
    if (ready && st.intro < 1) {
      st.intro = Math.min(1, st.intro + dt / 1.2)
      moving = true
    }
    if (st.auto && !st.dragging) {
      st.rotYT += dt * 0.25
      moving = true
    }
    if (!st.dragging && Math.abs(vel) > 0.0005) {
      st.rotYT += vel
      vel *= 0.92
      moving = true
    }
    const k = 1 - Math.pow(0.001, dt)
    st.rotY += (st.rotYT - st.rotY) * k
    st.rotX += (st.rotXT - st.rotX) * k
    st.zoom += (st.zoomT - st.zoom) * k
    if (Math.abs(st.rotYT - st.rotY) > 0.001 || Math.abs(st.zoomT - st.zoom) > 0.001 || Math.abs(st.rotXT - st.rotX) > 0.001) moving = true

    const e = 1 - Math.pow(1 - st.intro, 3)
    body.visible = ready
    body.rotation.y = st.rotY
    body.rotation.x = st.rotX
    body.position.y = -2.0 - 0.25 * (1 - e)
    body.scale.setScalar(SCALE * (0.92 + 0.08 * e))
    ring.scale.setScalar(0.4 + 0.6 * (ready ? e : 0.5 + 0.5 * Math.sin(st.t * 2) * 0.2))
    ;(ring.material as MeshBasicMaterial).opacity = 0.55 * (ready ? e : 0.6)
    camera.position.set(0, 0.05, baseZ / st.zoom)
    camera.lookAt(0, 0, 0)
    satellites.forEach((m, i) => {
      const a = st.t * 0.6 + (i * Math.PI * 2) / 3
      m.position.set(Math.cos(a) * 1.26 * ring.scale.x, -2.0, Math.sin(a) * 1.26 * ring.scale.x)
    })

    // selected area glows blue; breathes while turning
    for (const [id, mat] of areaMats) {
      const on = id === st.selected
      const target = on ? 0.28 + (st.auto ? Math.sin(st.t * 3) * 0.1 : 0) : 0
      mat.emissiveIntensity += (target - mat.emissiveIntensity) * k
    }
    if (st.selected && st.auto) moving = true

    renderer.render(scene, camera)
    project()
    if (moving && visible && !document.hidden) raf = requestAnimationFrame(frame)
  }
  function kick() {
    if (!raf && w && !disposed) {
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()

  return {
    setSelected(id) {
      st.selected = id
      kick()
    },
    setAutoRotate(on) {
      st.auto = on
      kick()
    },
    zoomBy(f) {
      st.zoomT = Math.max(0.8, Math.min(2.4, st.zoomT * f))
      kick()
    },
    rotateBy(rad) {
      st.rotYT += rad
      kick()
    },
    reset() {
      st.rotYT = Math.round(st.rotY / (Math.PI * 2)) * Math.PI * 2 + 0.25
      st.rotXT = 0
      st.zoomT = 1
      kick()
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
    },
  }
}
