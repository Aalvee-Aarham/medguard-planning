import { useStore, useT, type Lang } from '../state/store';

export function LangToggle() {
  const { lang, dispatch } = useStore();
  const t = useT();
  return (
    <div role="group" aria-label={t('top.language')} className="flex rounded-control border border-border-input p-1">
      {(['en', 'bn'] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => dispatch({ type: 'set-lang', lang: l })}
          className={`h-8 rounded-[6px] px-3 text-sm font-semibold ${lang === l ? 'bg-primary-100 text-primary-700' : 'text-ink-700 hover:bg-page'}`}
        >
          {l === 'en' ? 'English' : 'বাংলা'}
        </button>
      ))}
    </div>
  );
}
