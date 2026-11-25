import type { RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const motionAllowed = '(prefers-reduced-motion: no-preference)';

export function useLoginMotion(scope: RefObject<HTMLDivElement | null>, stage: string) {
  useGSAP(() => {
    const motion = gsap.matchMedia();
    motion.add(motionAllowed, () => {
      gsap.from('.admin-login-step', { opacity: 0, y: 8, duration: 0.2, ease: 'power2.out', clearProps: 'transform,opacity' });
      gsap.to('[data-login-parallax]', {
        y: 12,
        ease: 'none',
        scrollTrigger: { trigger: '.admin-login-intro', start: 'top top', end: 'bottom top', scrub: true },
      });
    });
    return () => motion.revert();
  }, { scope, dependencies: [stage], revertOnUpdate: true });
}

export function usePageMotion(scope: RefObject<HTMLElement | null>, route: string) {
  useGSAP(() => {
    const motion = gsap.matchMedia();
    motion.add(motionAllowed, () => {
      const content = scope.current?.firstElementChild;
      if (!content) return;
      gsap.from(content, { opacity: 0.65, y: 4, duration: 0.18, ease: 'power2.out', clearProps: 'transform,opacity' });
      if (route === '/hospital' || route === '/medguard') {
        const tiles = content.querySelectorAll('[data-stat-tile]');
        if (tiles.length) gsap.from(tiles, { y: 6, duration: 0.18, stagger: 0.02, ease: 'power2.out', clearProps: 'transform' });
        const heading = content.querySelector('[data-page-heading] h1');
        if (heading) {
          gsap.to(heading, {
            y: 8,
            ease: 'none',
            scrollTrigger: { trigger: content, start: 'top 64px', end: 'top top', scrub: true },
          });
        }
      }
    });
    return () => motion.revert();
  }, { scope, dependencies: [route], revertOnUpdate: true });
}
