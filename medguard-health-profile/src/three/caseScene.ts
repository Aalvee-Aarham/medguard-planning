/**
 * Similar-cases disclaimer (H41): a holographic skeleton being scanned, with three published case
 * reports orbiting it. Each report is wired to a point on the body by a light thread, and its outcome
 * is locked, which is what the disclaimer says.
 *
 * Model: public/models/anatomy/bones.glb (CC BY-SA 4.0, same file as the Home body explorer, so it is
 * usually already cached). Its vertices become a point cloud drawn with one additive shader.
 *
 * This module owns Three.js only. React owns the HUD, the controls and all the text a reader needs;
 * the card textures are decoration (the canvas is aria-hidden). Renders only while visible, and under
 * reduced motion it draws a still frame and redraws only on drag.
 */
import {
  AdditiveBlending, BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, Group, Line, LineBasicMaterial, Mesh,
  MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Points, RingGeometry, Scene, ShaderMaterial, SphereGeometry,
  SRGBColorSpace, Vector3, WebGLRenderer, type Object3D,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

export interface CaseCardText {
  kicker: string // "Published case"
  title: string // "Stroke, age 58"
  meta: string // "Written by doctors"
  foot: string // "Outcome hidden"
  icon: 'doc' | 'lock' | 'share'
}

export interface CaseScene {
  /** Bring one report to the front (null: all orbit evenly) */
  setFocus: (i: number | null) => void
  /** The reader ticked the box: the scan turns green */
  setAccepted: (on: boolean) => void
  setPaused: (on: boolean) => void
  dispose: () => void
}

const BODY_H = 1.71
const WORLD_H = 3.6
const SCALE = WORLD_H / BODY_H
const FLOOR = -1.85
const BLUE = new Color('#5aa2ff')
const HOT = new Color('#d6f0ff')
const GREEN = new Color('#3ee6a0')
const ORBIT_R = 1.75

/** Body points the threads start from, in model metres (same frame as bodyAreas.ts) */
const ANCHORS: [number, number, number][] = [
  [-0.05, 1.69, 0.06], // brain
  [0.055, 1.3, 0.128], // heart
  [-0.1, 0.5, 0.06], // knee
]

const POINT_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uScan;
  uniform float uSize;
  uniform float uIntro;
  attribute float aRand;
  varying float vGlow;
  varying float vRand;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    // intro: points rise from the floor, staggered by height
    float rise = clamp(uIntro * 2.2 - (wp.y + 2.0) * 0.18 - aRand * 0.25, 0.0, 1.0);
    rise = 1.0 - pow(1.0 - rise, 3.0);
    wp.y = mix(${FLOOR.toFixed(2)}, wp.y, rise);
    wp.xz *= mix(1.8, 1.0, rise);
    float d = wp.y - uScan;
    vGlow = exp(-d * d * 30.0) + 0.12 * step(0.985, fract(aRand * 91.0 + uTime * 0.35));
    vRand = aRand * rise;
    vec4 mv = viewMatrix * wp;
    gl_PointSize = uSize * (0.55 + aRand * 0.7) * (1.0 + vGlow * 1.8) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`
const POINT_FRAG = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uHot;
  varying float vGlow;
  varying float vRand;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.0, r);
    vec3 col = mix(uBase, uHot, clamp(vGlow, 0.0, 1.0));
    gl_FragColor = vec4(col, a * (0.11 + vGlow * 0.6) * (0.4 + 0.6 * vRand));
  }
`
/** Horizontal scan sheet: a soft disc that fades out to its rim */
const SHEET_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float rings = 0.5 + 0.5 * sin(r * 40.0 - uTime * 6.0);
    float a = smoothstep(1.0, 0.0, r) * (0.10 + 0.16 * rings) + smoothstep(0.03, 0.0, abs(r - 0.92)) * 0.5;
    gl_FragColor = vec4(uColor, a);
  }
`
const SHEET_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

/** Draw one case report on a 2D canvas. Decorative: the same words are in the page text. */
function drawCard(c: CaseCardText, seed: number) {
  const W = 512
  const H = 640
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d')!
  const font = (w: number, s: number) => `${w} ${s}px "Noto Sans", "Noto Sans Bengali", system-ui, sans-serif`
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    g.beginPath()
    g.roundRect(x, y, w, h, r)
  }
  // glass body
  const bg = g.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, 'rgba(214,230,251,0.30)')
  bg.addColorStop(1, 'rgba(29,95,191,0.16)')
  rr(6, 6, W - 12, H - 12, 36)
  g.fillStyle = bg
  g.fill()
  g.lineWidth = 3
  g.strokeStyle = 'rgba(190,222,255,0.85)'
  g.stroke()
  // header band
  rr(6, 6, W - 12, 96, 36)
  g.fillStyle = 'rgba(90,162,255,0.28)'
  g.fill()
  g.fillStyle = '#eaf2fd'
  g.font = font(700, 26)
  g.fillText(c.kicker.toUpperCase(), 40, 66)
  g.fillStyle = 'rgba(234,242,253,0.7)'
  g.font = font(600, 22)
  g.textAlign = 'right'
  g.fillText(`PMC-${(7340000 + seed * 15731).toString().slice(0, 7)}`, W - 40, 66)
  g.textAlign = 'left'
  // title + meta
  g.fillStyle = '#ffffff'
  g.font = font(700, 40)
  g.fillText(c.title, 40, 168, W - 80)
  g.fillStyle = 'rgba(214,230,251,0.85)'
  g.font = font(600, 26)
  g.fillText(c.meta, 40, 210, W - 80)
  // fake text lines and a mini chart, like a report
  let rnd = seed * 9301 + 49297
  const rand = () => ((rnd = (rnd * 9301 + 49297) % 233280) / 233280)
  g.fillStyle = 'rgba(214,230,251,0.35)'
  for (let i = 0; i < 5; i++) {
    rr(40, 246 + i * 30, (W - 80) * (0.55 + rand() * 0.45), 12, 6)
    g.fill()
  }
  g.strokeStyle = 'rgba(62,230,160,0.9)'
  g.lineWidth = 4
  g.beginPath()
  for (let i = 0; i <= 12; i++) {
    const x = 40 + (i * (W - 80)) / 12
    const y = 440 - 40 * Math.sin(i * 0.9 + seed) * (0.6 + rand() * 0.4)
    if (i) g.lineTo(x, y)
    else g.moveTo(x, y)
  }
  g.stroke()
  // footer strip: locked outcome / share
  rr(28, H - 136, W - 56, 100, 24)
  const fg = g.createLinearGradient(0, H - 136, W, H - 36)
  fg.addColorStop(0, c.icon === 'share' ? 'rgba(62,230,160,0.32)' : 'rgba(254,200,75,0.30)')
  fg.addColorStop(1, 'rgba(255,255,255,0.06)')
  g.fillStyle = fg
  g.fill()
  // blurred bars = hidden outcome
  g.save()
  g.filter = 'blur(6px)'
  g.fillStyle = 'rgba(255,255,255,0.55)'
  rr(130, H - 112, 300, 16, 8)
  g.fill()
  rr(130, H - 80, 220, 16, 8)
  g.fill()
  g.restore()
  // icon
  g.strokeStyle = c.icon === 'share' ? '#3ee6a0' : '#fec84b'
  g.lineWidth = 6
  g.lineCap = 'round'
  g.lineJoin = 'round'
  const ix = 78
  const iy = H - 86
  if (c.icon === 'share') {
    g.beginPath()
    g.arc(ix - 16, iy, 8, 0, Math.PI * 2)
    g.arc(ix + 16, iy - 18, 8, 0, Math.PI * 2)
    g.stroke()
    g.beginPath()
    g.arc(ix + 16, iy + 18, 8, 0, Math.PI * 2)
    g.stroke()
    g.beginPath()
    g.moveTo(ix - 9, iy - 4)
    g.lineTo(ix + 9, iy - 14)
    g.moveTo(ix - 9, iy + 4)
    g.lineTo(ix + 9, iy + 14)
    g.stroke()
  } else {
    rr(ix - 20, iy - 6, 40, 32, 6)
    g.stroke()
    g.beginPath()
    g.arc(ix, iy - 8, 13, Math.PI, 0)
    g.stroke()
  }
  g.fillStyle = '#ffffff'
  g.font = font(700, 30)
  g.fillText(c.foot, 130, H - 70, W - 170)
  const tex = new CanvasTexture(cv)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export function initCaseScene(
  canvas: HTMLCanvasElement,
  opts: { cards: CaseCardText[]; reduced: boolean; onProgress?: (pct: number) => void; onReady?: () => void; onError?: () => void },
): CaseScene | null {
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch {
    return null
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)

  const scene = new Scene()
  const camera = new PerspectiveCamera(32, 1, 0.1, 50)
  const disposables: { dispose: () => void }[] = []
  const track = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x)

  // ---- Hologram skeleton
  const rig = new Group() // turned by drag
  scene.add(rig)
  const body = new Group()
  body.scale.setScalar(SCALE)
  body.position.y = FLOOR
  rig.add(body)
  const pointMat = track(
    new ShaderMaterial({
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uScan: { value: 0 }, uSize: { value: 30 }, uIntro: { value: opts.reduced ? 1 : 0 },
        uBase: { value: BLUE.clone() }, uHot: { value: HOT.clone() },
      },
    }),
  )

  // ---- Floor: rings, dotted disc, rising motes
  const floor = new Group()
  floor.position.y = FLOOR
  scene.add(floor)
  const ringMat = track(new MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.7, blending: AdditiveBlending, depthWrite: false }))
  const rings = [1.0, 1.35, 1.75].map((r, i) => {
    const m = new Mesh(track(new RingGeometry(r, r + (i === 1 ? 0.035 : 0.012), 160, 1, 0, i === 1 ? Math.PI * 1.4 : Math.PI * 2)), ringMat)
    m.rotation.x = -Math.PI / 2
    floor.add(m)
    return m
  })
  const moteGeo = track(new BufferGeometry())
  const MOTES = 260
  const mp = new Float32Array(MOTES * 3)
  const mr = new Float32Array(MOTES)
  for (let i = 0; i < MOTES; i++) {
    const a = Math.random() * Math.PI * 2
    const r = 0.3 + Math.random() * 1.6
    mp.set([Math.cos(a) * r, Math.random() * WORLD_H, Math.sin(a) * r], i * 3)
    mr[i] = Math.random()
  }
  moteGeo.setAttribute('position', new Float32BufferAttribute(mp, 3))
  moteGeo.setAttribute('aRand', new Float32BufferAttribute(mr, 1))
  const moteMat = track(
    new ShaderMaterial({
      vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uScan: { value: -99 }, uSize: { value: 22 }, uIntro: { value: 1 }, uBase: { value: BLUE.clone() }, uHot: { value: HOT.clone() } },
    }),
  )
  const motes = new Points(moteGeo, moteMat)
  floor.add(motes)

  // ---- Scan sheet
  const sheetMat = track(
    new ShaderMaterial({
      vertexShader: SHEET_VERT, fragmentShader: SHEET_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uColor: { value: BLUE.clone() }, uTime: { value: 0 } },
    }),
  )
  const sheet = new Mesh(track(new PlaneGeometry(2.4, 2.4)), sheetMat)
  sheet.rotation.x = -Math.PI / 2
  scene.add(sheet)

  // ---- Case reports + threads
  const cardGeo = track(new PlaneGeometry(1.02, 1.275))
  const threadMat = track(new LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.6, blending: AdditiveBlending, depthWrite: false }))
  const nodeGeo = track(new SphereGeometry(1, 16, 12))
  const nodeMat = track(new MeshBasicMaterial({ color: HOT, transparent: true, blending: AdditiveBlending, depthWrite: false }))
  const cards = opts.cards.map((c, i) => {
    const mat = track(new MeshBasicMaterial({ map: track(drawCard(c, i + 1)), transparent: true, depthWrite: false, opacity: 0 }))
    const mesh = new Mesh(cardGeo, mat)
    scene.add(mesh)
    const lineGeo = track(new BufferGeometry())
    lineGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(6), 3))
    const line = new Line(lineGeo, threadMat)
    scene.add(line)
    const node = new Mesh(nodeGeo, nodeMat)
    node.scale.setScalar(0.035)
    body.add(node)
    node.position.set(...ANCHORS[i % ANCHORS.length])
    node.scale.setScalar(0.035 / SCALE)
    return { mesh, mat, line, node, focus: 0, y: [1.05, 0.15, -0.85][i % 3] }
  })

  // ---- Load the skeleton as points
  let ready = false
  let disposed = false
  new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync('/models/anatomy/bones.glb', (e) => e.total && opts.onProgress?.(Math.round((e.loaded / e.total) * 100)))
    .then((gltf) => {
      if (disposed) return
      const root: Object3D = gltf.scene
      root.updateMatrixWorld(true)
      let total = 0
      root.traverse((o) => {
        const m = o as Mesh
        if (m.isMesh) total += m.geometry.getAttribute('position').count
      })
      const target = window.matchMedia('(max-width: 640px)').matches ? 45000 : 90000
      const stride = Math.max(1, Math.floor(total / target))
      const pos: number[] = []
      const rnd: number[] = []
      const v = new Vector3()
      root.traverse((o) => {
        const m = o as Mesh
        if (!m.isMesh) return
        const p = m.geometry.getAttribute('position')
        for (let i = Math.floor(Math.random() * stride); i < p.count; i += stride) {
          v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld)
          pos.push(v.x, v.y, v.z)
          rnd.push(Math.random())
        }
        m.geometry.dispose()
      })
      const geo = track(new BufferGeometry())
      geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
      geo.setAttribute('aRand', new Float32BufferAttribute(rnd, 1))
      body.add(new Points(geo, pointMat))
      ready = true
      opts.onReady?.()
      kick()
    })
    .catch(() => !disposed && opts.onError?.())

  // ---- State
  const st = {
    t: 0, intro: opts.reduced ? 1 : 0, rotY: 0.35, rotYT: 0.35, orbit: 0, focus: null as number | null,
    accept: 0, acceptT: 0, paused: opts.reduced, dragging: false, px: 0, py: 0, pxT: 0, pyT: 0,
  }
  let w = 0
  let h = 0
  let baseZ = 9

  const resize = () => {
    const r = canvas.getBoundingClientRect()
    if (!r.width || !r.height) return
    w = r.width
    h = r.height
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const tanHalf = Math.tan((camera.fov * Math.PI) / 360)
    baseZ = Math.max(2.25 / tanHalf, 2.45 / (tanHalf * camera.aspect))
    camera.updateProjectionMatrix()
    pointMat.uniforms.uSize.value = 19 * renderer.getPixelRatio() * (h / 600)
    moteMat.uniforms.uSize.value = 20 * renderer.getPixelRatio() * (h / 600)
    kick()
  }

  // ---- Drag to turn, pointer parallax
  let lastX = 0
  let vel = 0
  const down = (e: PointerEvent) => {
    st.dragging = true
    lastX = e.clientX
    vel = 0
    canvas.setPointerCapture(e.pointerId)
    kick()
  }
  const move = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    st.pxT = ((e.clientX - r.left) / r.width - 0.5) * 2
    st.pyT = ((e.clientY - r.top) / r.height - 0.5) * 2
    if (st.dragging) {
      vel = (e.clientX - lastX) * 0.01
      lastX = e.clientX
      st.rotYT += vel
    }
    kick()
  }
  const up = () => {
    st.dragging = false
    kick()
  }
  const leave = () => {
    st.pxT = 0
    st.pyT = 0
    kick()
  }
  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('pointercancel', up)
  canvas.addEventListener('pointerleave', leave)

  // ---- Loop
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

  const a = new Vector3()
  const col = new Color()
  function frame(now: number) {
    raf = 0
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    const live = !st.paused
    if (live) st.t += dt
    let moving = live || !ready
    const k = 1 - Math.pow(0.002, dt)

    if (ready && st.intro < 1) {
      st.intro = Math.min(1, st.intro + dt / 1.6)
      moving = true
    }
    if (live && !st.dragging) st.rotYT += dt * 0.18
    if (!st.dragging && Math.abs(vel) > 0.0005) {
      st.rotYT += vel
      vel *= 0.92
      moving = true
    }
    st.rotY += (st.rotYT - st.rotY) * k
    st.px += (st.pxT - st.px) * k
    st.py += (st.pyT - st.py) * k
    st.accept += (st.acceptT - st.accept) * k
    if (Math.abs(st.rotYT - st.rotY) + Math.abs(st.pxT - st.px) + Math.abs(st.pyT - st.py) + Math.abs(st.acceptT - st.accept) > 0.002) moving = true

    rig.rotation.y = st.rotY
    camera.position.set(st.px * 0.6, 0.15 - st.py * 0.35, baseZ)
    camera.lookAt(0, -0.05, 0)

    // scan sweeps head to toe and back; faster once accepted
    const scanY = FLOOR + (WORLD_H + 0.1) * (0.5 + 0.5 * Math.sin(st.t * (0.7 + st.accept * 0.5)))
    sheet.position.y = scanY
    sheet.scale.setScalar(0.75 + 0.25 * Math.sin((scanY - FLOOR) / WORLD_H * Math.PI))
    col.copy(BLUE).lerp(GREEN, st.accept)
    pointMat.uniforms.uBase.value.copy(col)
    pointMat.uniforms.uScan.value = scanY
    pointMat.uniforms.uTime.value = st.t
    pointMat.uniforms.uIntro.value = st.intro
    moteMat.uniforms.uBase.value.copy(col)
    moteMat.uniforms.uTime.value = st.t
    sheetMat.uniforms.uColor.value.copy(col)
    sheetMat.uniforms.uTime.value = st.t
    ringMat.color.copy(col)
    threadMat.color.copy(col)
    rings[0].rotation.z = st.t * 0.4
    rings[1].rotation.z = -st.t * 0.6
    rings[2].scale.setScalar(1 + 0.03 * Math.sin(st.t * 2))
    // motes drift up and wrap
    const p = moteGeo.getAttribute('position') as Float32BufferAttribute
    if (live) {
      for (let i = 0; i < MOTES; i++) {
        let y = p.getY(i) + dt * (0.15 + mr[i] * 0.35)
        if (y > WORLD_H) y = 0
        p.setY(i, y)
      }
      p.needsUpdate = true
    }

    // reports: orbit evenly, or bring the focused one forward
    st.orbit += live ? dt * 0.22 : 0
    const intro = 1 - Math.pow(1 - Math.min(1, st.intro * 1.4), 3)
    cards.forEach((c, i) => {
      const f = st.focus === i ? 1 : 0
      c.focus += (f - c.focus) * k
      if (Math.abs(f - c.focus) > 0.002) moving = true
      const ang = st.orbit + (i * Math.PI * 2) / cards.length
      const front = Math.PI / 2 // +z, toward the camera
      const theta = ang + (front - ang - Math.round((front - ang) / (Math.PI * 2)) * Math.PI * 2) * c.focus
      const r = ORBIT_R + 0.35 * c.focus
      const x = Math.cos(theta) * r + 0.95 * c.focus
      const z = Math.sin(theta) * r
      const y = c.y * (1 - c.focus) - 0.1 * c.focus + Math.sin(st.t * 1.3 + i * 2) * 0.06
      c.mesh.position.set(x, y, z)
      c.mesh.rotation.set(0, -0.25 * Math.cos(theta) * (1 - c.focus), Math.sin(st.t + i) * 0.03)
      const depth = (z + ORBIT_R) / (ORBIT_R * 2) // 0 back .. 1 front
      const dim = st.focus !== null && st.focus !== i ? 0.35 : 1
      c.mat.opacity = intro * (0.4 + 0.6 * depth) * dim
      c.mesh.scale.setScalar(0.82 + 0.2 * depth + 0.12 * c.focus)
      c.mesh.renderOrder = Math.round(depth * 10)
      // thread from the body point to the card's near edge
      c.node.getWorldPosition(a)
      const lp = c.line.geometry.getAttribute('position') as Float32BufferAttribute
      lp.setXYZ(0, a.x, a.y, a.z)
      lp.setXYZ(1, x - 0.5 * Math.sign(x || 1) * c.mesh.scale.x, y, z)
      lp.needsUpdate = true
      c.line.visible = ready && intro > 0.5 && depth > 0.3
      c.node.visible = ready
      const pulse = 1 + 0.4 * Math.sin(st.t * 4 + i) + c.focus * 0.8
      c.node.scale.setScalar((0.035 * pulse) / SCALE)
    })
    threadMat.opacity = 0.35 + 0.4 * (st.focus !== null ? 1 : 0)

    renderer.render(scene, camera)
    if (moving && visible && !document.hidden && !disposed) raf = requestAnimationFrame(frame)
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
    setFocus(i) {
      st.focus = i
      kick()
    },
    setAccepted(on) {
      st.acceptT = on ? 1 : 0
      kick()
    },
    setPaused(on) {
      st.paused = on
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
      canvas.removeEventListener('pointerleave', leave)
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
    },
  }
}
