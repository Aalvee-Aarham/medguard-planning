import { AppRoutes } from './app/routes';
import { Toasts } from './components/Toasts';
import { DevPanel } from './dev/DevPanel';
import { StoreProvider } from './state/store';

export default function App() {
  return (
    <StoreProvider>
      <AppRoutes />
      <Toasts />
      <DevPanel />
    </StoreProvider>
  );
}
