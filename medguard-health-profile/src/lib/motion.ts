import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)
gsap.defaults({ ease: 'power2.out', duration: 0.2 })

export { gsap, ScrollTrigger, useGSAP }

export const REDUCE = '(prefers-reduced-motion: reduce)'
export const MOTION_OK = '(prefers-reduced-motion: no-preference)'

export const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia(REDUCE).matches
