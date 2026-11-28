// Compact EN | BN switch, like most dashboards. Each button keeps its full language name
// for screen readers and as a tooltip.
import { useStore, useT, type Lang } from '../state/store';

const LANGS: { id: Lang; short: string; name: string }[] = [
  { id: 'en', short: 'EN', name: 'English' },
  { id: 'bn', short: 'BN', name: 'বাংলা' },
];

export function LangToggle() {
  const { lang, dispatch } = useStore();
  const t = useT();
  return (
    <div role="group" aria-label={t('top.language')} className="flex rounded-control border border-border-input p-1">
      {LANGS.map(({ id, short, name }) => (
        <button
          key={id}
          type="button"
          lang={id}
          aria-pressed={lang === id}
          aria-label={name}
          title={name}
          onClick={() => dispatch({ type: 'set-lang', lang: id })}
          className={`h-8 min-w-10 rounded-[6px] px-2 text-sm font-semibold tracking-wide ${lang === id ? 'bg-primary-100 text-primary-700' : 'text-ink-700 hover:bg-page'}`}
        >
          {short}
        </button>
      ))}
    </div>
  );
}
