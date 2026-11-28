// Shared GSAP motion (root README "Animation"): card and list entrances, stat counters, header parallax.
// Fast (150–250 ms, power2.out) and off for "reduce motion" via gsap.matchMedia.
// Never use these on the fall alarm, Give dose, the allergy strip or confirm dialogs: those must act instantly.
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef, type RefObject } from 'react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const MOTION_OK = '(prefers-reduced-motion: no-preference)';

/** Children matching `selector` inside `scope` rise in one after another when `ready` turns true. */
export function useEntrance(scope: RefObject<HTMLElement | null>, selector: string, ready = true) {
  useGSAP(
    () => {
      if (!ready) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(selector, { opacity: 0, y: 8, duration: 0.2, ease: 'power2.out', stagger: 0.03, clearProps: 'opacity,transform' });
      });
      return () => mm.revert();
    },
    { scope, dependencies: [ready] },
  );
}

/** Counts up to `value` when it first appears and eases to each new value. Text like "92%" keeps its suffix. */
export function CountUp({ value }: { value: string | number }) {
  const el = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  const match = String(value).match(/^(\d+)(.*)$/);
  const target = match ? Number(match[1]) : NaN;
  const suffix = match ? match[2] : '';

  useGSAP(
    () => {
      const node = el.current;
      if (!node) return;
      const write = (n: number) => { node.textContent = `${Math.round(n)}${suffix}`; };
      if (Number.isNaN(target)) { node.textContent = String(value); return; }
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const counter = { n: shown.current };
        write(counter.n);
        gsap.to(counter, { n: target, duration: 0.6, ease: 'power2.out', onUpdate: () => { shown.current = counter.n; write(counter.n); } });
      });
      mm.add('(prefers-reduced-motion: reduce)', () => { write(target); shown.current = target; });
      return () => mm.revert();
    },
    { dependencies: [target, suffix, value] },
  );

  // The animated digits are written by GSAP, outside React; screen readers get the real value.
  return (
    <>
      <span className="sr-only">{value}</span>
      <span aria-hidden ref={el} />
    </>
  );
}

/** Layers inside `scope` with data-speed move at different speeds as the page scrolls (dashboard headers, empty states). */
export function useParallax(scope: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.utils.toArray<HTMLElement>('[data-speed]', scope.current).forEach((layer) => {
          gsap.to(layer, {
            y: () => Number(layer.dataset.speed) * 60,
            ease: 'none',
            scrollTrigger: { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: true },
          });
        });
      });
      return () => mm.revert();
    },
    { scope },
  );
}
