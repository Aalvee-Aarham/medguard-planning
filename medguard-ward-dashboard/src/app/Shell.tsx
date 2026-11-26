// Sidebar + top bar + alerts panel around every page.
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ServerBanner } from '../components/States';
import { AlertsPanel } from './AlertsPanel';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function Shell() {
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);

  // Quick page entrance. Turned off for "reduce motion".
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(main.current, { opacity: 0, y: 8, duration: 0.2, ease: 'power2.out' });
      });
      return () => mm.revert();
    },
    { dependencies: [pathname], scope: main },
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <ServerBanner />
        <main ref={main} className="mx-auto w-full max-w-[1440px] flex-1 p-8">
          <Outlet />
        </main>
      </div>
      <AlertsPanel />
    </div>
  );
}
