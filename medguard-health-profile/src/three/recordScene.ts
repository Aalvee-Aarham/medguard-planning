/**
 * Welcome (H3) scene: "many papers -> one record -> similar cases -> private".
 * Layered separation (web3d-integration-patterns, pattern 1): this module owns Three.js only.
 * GSAP ScrollTrigger calls setProgress(); React owns the text overlay.
 * Look: white pages drawn with blue edge lines, the 3D version of the "simple blue line illustrations"
 * the design system allows on onboarding. No gradients, no glow.
 */
import {
  AmbientLight, BoxGeometry, Color, DirectionalLight, EdgesGeometry, ExtrudeGeometry, Group, LineBasicMaterial, LineSegments,
  Mesh, MeshLambertMaterial, MeshBasicMaterial, PerspectiveCamera, Quaternion, Scene, Shape, Vector3, WebGLRenderer, Euler,
} from 'three'

const BLUE = new Color('#1D5FBF')
const BLUE_SOFT = new Color('#D6E6FB')
const N = 7 // pages

interface Pose {
  p: Vector3
  q: Quaternion
}
const pose = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): Pose => ({
  p: new Vector3(x, y, z),
  q: new Quaternion().setFromEuler(new Euler(rx, ry, rz)),
})

export interface RecordScene {
  setProgress: (p: number) => void
  resize: () => void
  dispose: () => void
}

export function initRecordScene(canvas: HTMLCanvasElement): RecordScene | null {
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' })
  } catch {
    return null // no WebGL: caller keeps the static illustration
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const scene = new Scene()
  const camera = new PerspectiveCamera(35, 1, 0.1, 50)
  camera.position.set(0, 0.3, 7)
  camera.lookAt(0, 0, 0)

  scene.add(new AmbientLight(0xffffff, 2.2))
  const key = new DirectionalLight(0xffffff, 1.2)
  key.position.set(2, 4, 5)
  scene.add(key)

  // Pages: thin boxes with edge lines
  const pageGeo = new BoxGeometry(1.15, 1.55, 0.03)
  const edgeGeo = new EdgesGeometry(pageGeo)
  const pages: { g: Group; line: LineBasicMaterial; bars: MeshBasicMaterial }[] = []
  const lineGeo = new BoxGeometry(0.7, 0.06, 0.001)
  for (let i = 0; i < N; i++) {
    const g = new Group()
    const body = new Mesh(pageGeo, new MeshLambertMaterial({ color: 0xffffff }))
    const line = new LineBasicMaterial({ color: BLUE.clone(), transparent: true, opacity: 0.9 })
    g.add(body, new LineSegments(edgeGeo, line))
    // "text lines" on the page: soft blue bars, no real text in images
    const bars = new MeshBasicMaterial({ color: BLUE_SOFT.clone() })
    for (let k = 0; k < 5; k++) {
      const b = new Mesh(lineGeo, bars)
      b.scale.x = k === 0 ? 0.55 : 0.6 + ((i * 3 + k * 5) % 4) * 0.12
      b.position.set(-0.42 + (b.scale.x * 0.7) / 2, 0.55 - k * 0.2, 0.017)
      g.add(b)
    }
    scene.add(g)
    pages.push({ g, line, bars })
  }

  // Shield outline (slide 3: private)
  const sh = new Shape()
  sh.moveTo(0, 1.25)
  sh.lineTo(-1.05, 0.85)
  sh.lineTo(-1.05, 0.05)
  sh.bezierCurveTo(-1.05, -0.75, -0.5, -1.2, 0, -1.4)
  sh.bezierCurveTo(0.5, -1.2, 1.05, -0.75, 1.05, 0.05)
  sh.lineTo(1.05, 0.85)
  sh.closePath()
  const hole = new Shape()
  const k = 0.88
  hole.moveTo(0, 1.25 * k)
  hole.lineTo(-1.05 * k, 0.85 * k)
  hole.lineTo(-1.05 * k, 0.05 * k)
  hole.bezierCurveTo(-1.05 * k, -0.75 * k, -0.5 * k, -1.2 * k, 0, -1.4 * k)
  hole.bezierCurveTo(0.5 * k, -1.2 * k, 1.05 * k, -0.75 * k, 1.05 * k, 0.05 * k)
  hole.lineTo(1.05 * k, 0.85 * k)
  hole.closePath()
  sh.holes.push(hole)
  const shieldGeo = new ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false })
  shieldGeo.center()
  const shieldMat = new MeshLambertMaterial({ color: BLUE, transparent: true, opacity: 0 })
  const shield = new Mesh(shieldGeo, shieldMat)
  shield.scale.setScalar(1.35)
  scene.add(shield)

  // Poses for each state
  const seeded = (i: number, m: number) => ((Math.sin(i * 91.7 + m * 13.3) + 1) / 2) * 2 - 1
  const scatter: Pose[] = pages.map((_, i) => pose(seeded(i, 1) * 2.4, seeded(i, 2) * 1.8, seeded(i, 3) * 1.5 - 0.5, seeded(i, 4) * 0.9, seeded(i, 5) * 1.2, seeded(i, 6) * 0.8))
  const stack: Pose[] = pages.map((_, i) => pose(0, -0.02 * i, 2.2 + 0.04 * (N - i), -0.15, 0.35, 0))
  const fan: Pose[] = pages.map((_, i) => {
    if (i === 0) return pose(0, 0, 0.6, 0, 0, 0)
    const a = ((i - 1) / (N - 1)) * Math.PI * 2 + 0.3
    return pose(Math.cos(a) * 2.1, Math.sin(a) * 1.25, -0.6, 0, -Math.cos(a) * 0.5, 0)
  })
  const locked: Pose[] = pages.map((_, i) => pose(0, -0.01 * i, 0.02 * (N - i), 0, 0, 0))
  const states = [scatter, stack, fan, locked]
  const MATCH = new Set([1, 3, 5]) // cases that "match" on slide 2

  let w = 0
  let h = 0
  const resize = () => {
    const r = canvas.getBoundingClientRect()
    if (r.width === w && r.height === h) return
    w = r.width
    h = r.height
    renderer.setSize(w, h, false)
    camera.aspect = w / Math.max(h, 1)
    // keep the scene inside narrow phones
    camera.position.z = camera.aspect < 0.8 ? 9.5 : 10.5
    camera.updateProjectionMatrix()
    render()
  }

  const tmpQ = new Quaternion()
  const tmpP = new Vector3()
  const ease = (t: number) => t * t * (3 - 2 * t)
  let progress = 0

  function apply() {
    // progress runs -1..2 : -1 scatter -> 0 stack -> 1 fan -> 2 locked
    const x = Math.min(Math.max(progress + 1, 0), 3)
    const seg = Math.min(Math.floor(x), 2)
    const t = ease(x - seg)
    const A = states[seg]
    const B = states[seg + 1]
    pages.forEach((pg, i) => {
      // stagger pages a little inside each segment
      const ti = ease(Math.min(Math.max(t * 1.25 - i * 0.035, 0), 1))
      tmpP.lerpVectors(A[i].p, B[i].p, ti)
      tmpQ.slerpQuaternions(A[i].q, B[i].q, ti)
      pg.g.position.copy(tmpP)
      pg.g.quaternion.copy(tmpQ)
      // slide 2: matching cases light up blue
      const fanAmt = x <= 1 ? 0 : x <= 2 ? ease(x - 1) : 1 - ease(x - 2)
      const hot = MATCH.has(i) ? fanAmt : 0
      pg.bars.color.copy(BLUE_SOFT).lerp(BLUE, hot * 0.85)
      pg.line.opacity = 0.9 - (i > 0 && !MATCH.has(i) ? fanAmt * 0.55 : 0)
    })
    const lockAmt = x <= 2 ? 0 : ease(x - 2)
    shieldMat.opacity = lockAmt
    shield.scale.setScalar(1.6 - 0.25 * lockAmt)
    shield.rotation.y = (1 - lockAmt) * 0.8
    shield.position.z = 0.4
  }

  function render() {
    apply()
    renderer.render(scene, camera)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()

  return {
    setProgress(p: number) {
      progress = p
      render()
    },
    resize,
    dispose() {
      ro.disconnect()
      pageGeo.dispose()
      edgeGeo.dispose()
      lineGeo.dispose()
      shieldGeo.dispose()
      pages.forEach((p) => {
        p.line.dispose()
        p.bars.dispose()
        ;((p.g.children[0] as Mesh).material as MeshLambertMaterial).dispose()
      })
      shieldMat.dispose()
      renderer.dispose()
    },
  }
}
