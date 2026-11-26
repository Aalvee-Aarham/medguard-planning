import { LockScreen } from './app/LockScreen';
import { AppRoutes } from './app/routes';
import { useIdleLock } from './app/useIdleLock';
import { Toasts } from './components/Toasts';
import { DevPanel } from './dev/DevPanel';
import { StoreProvider, useStore } from './state/store';

function Root() {
  const { session } = useStore();
  const locked = session === 'locked';
  useIdleLock();

  return (
    <>
      {/* While locked, the page stays mounted (input is kept) but cannot be clicked or tabbed to. */}
      <div inert={locked} aria-hidden={locked}>
        <AppRoutes />
      </div>
      {locked && <LockScreen />}
      <Toasts />
      {/* Testing tool: only in npm run dev, removed from the real build. */}
      {import.meta.env.DEV && <DevPanel />}
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Root />
    </StoreProvider>
  );
}
