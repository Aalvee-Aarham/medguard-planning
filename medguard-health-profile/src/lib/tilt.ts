import { useEffect, type RefObject } from 'react'
import { prefersReduced } from './motion'

/**
 * Pointer-driven 3D tilt. Writes --rx/--ry (degrees) and --sx/--sy (pointer %, for sheen)
 * straight to the element; pair with the `.tilt` class. Off on touch-only devices and under reduced motion.
 */
export function useTilt(ref: RefObject<HTMLElement | null>, max = 8) {
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReduced() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    let raf = 0
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width
      const py = (e.clientY - r.top) / r.height
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.classList.add('is-tilting')
        el.style.setProperty('--ry', `${(px - 0.5) * 2 * max}deg`)
        el.style.setProperty('--rx', `${(0.5 - py) * 2 * max}deg`)
        el.style.setProperty('--sx', `${px * 100}%`)
        el.style.setProperty('--sy', `${py * 100}%`)
      })
    }
    const leave = () => {
      cancelAnimationFrame(raf)
      el.classList.remove('is-tilting')
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [ref, max])
}
