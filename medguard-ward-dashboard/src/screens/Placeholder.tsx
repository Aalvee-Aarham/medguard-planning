// Stand-in for a screen until its build step replaces it. Shows what the plan says will be there,
// plus links to the other screens in the same section so every screen is reachable now.
import { Construction } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { SCREENS, type Screen } from '../app/screens';
import { useT } from '../state/store';

export function Placeholder({ screen }: { screen: Screen }) {
  const t = useT();
  const params = useParams();
  const siblings = SCREENS.filter((s) => s.section === screen.section);
  const paramText = Object.entries(params).map(([k, v]) => `${k} = ${v}`).join(', ');

  return (
    <div className="space-y-6">
      <div>
        <span className="rounded-full bg-primary-100 px-3 py-1 text-sm font-semibold text-primary-700">{screen.id}</span>
        <h1 className="mt-3 text-2xl font-semibold">{t(`screen.${screen.id}.title`)}</h1>
        <p className="mt-1 text-ink-700">{t(`screen.${screen.id}.about`)}</p>
        {paramText && <p className="mt-1 text-sm text-ink-500 tabular-nums">{t('placeholder.params', { params: paramText })}</p>}
      </div>

      <div className="flex items-center gap-3 rounded-card border border-dashed border-border-input bg-surface p-6 text-ink-700">
        <Construction size={24} strokeWidth={1.75} aria-hidden className="shrink-0 text-primary-600" />
        <span>{t('placeholder.note', { step: screen.step })}</span>
      </div>

      {siblings.length > 1 && (
        <div>
          <h2 className="mb-2 font-semibold">{t('placeholder.siblings')}</h2>
          <div className="flex flex-wrap gap-2">
            {siblings.map((s) => (
              <Link
                key={s.id}
                to={s.href}
                aria-current={s.id === screen.id ? 'page' : undefined}
                className={`rounded-control border px-3 py-2 text-sm font-semibold ${
                  s.id === screen.id ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-border-subtle bg-surface hover:border-primary-600'
                }`}
              >
                {s.id} {t(`screen.${s.id}.title`)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
