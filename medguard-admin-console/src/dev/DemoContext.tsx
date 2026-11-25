import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type PageState = 'ready' | 'loading' | 'error';

const DemoContext = createContext<{
  pageState: PageState;
  setPageState: (value: PageState) => void;
  maintenance: boolean;
  setMaintenance: (value: boolean) => void;
  forcedUpdate: boolean;
  setForcedUpdate: (value: boolean) => void;
  simulatedOffline: boolean;
  setSimulatedOffline: (value: boolean) => void;
  offline: boolean;
} | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [pageState, setPageState] = useState<PageState>('ready');
  const [maintenance, setMaintenance] = useState(false);
  const [forcedUpdate, setForcedUpdate] = useState(false);
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const [connected, setConnected] = useState(() => navigator.onLine);

  useEffect(() => {
    const sync = () => setConnected(navigator.onLine);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  return (
    <DemoContext.Provider value={{
      pageState, setPageState, maintenance, setMaintenance, forcedUpdate, setForcedUpdate,
      simulatedOffline, setSimulatedOffline, offline: simulatedOffline || !connected,
    }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const demo = useContext(DemoContext);
  if (!demo) throw new Error('DemoProvider is missing.');
  return demo;
}
