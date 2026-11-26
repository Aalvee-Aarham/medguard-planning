// Confirmations only ("Alert acknowledged"). Gone after 4 seconds. Never for errors that need action.
import { CircleCheck } from 'lucide-react';
import { useStore } from '../state/store';

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="flex items-center gap-2 rounded-card bg-ink-900 px-4 py-3 text-surface shadow-float">
          <CircleCheck size={20} aria-hidden className="text-success-border" />
          {t.text}
        </div>
      ))}
    </div>
  );
}
