import type { ReactNode } from 'react';

interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Numeración editorial opcional, p. ej. "I", "02". */
  eyebrow?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function Card({
  title,
  description,
  actions,
  eyebrow,
  className = '',
  children,
}: CardProps) {
  return (
    <section
      className={`glass relative overflow-hidden rounded-3xl p-5 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.9)] sm:p-7 ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/40 to-transparent"
      />
      {(title || actions) && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {eyebrow && (
              <p className="mb-1 font-mono text-[0.68rem] uppercase tracking-[0.25em] text-fuchsia-300/80">
                {eyebrow}
              </p>
            )}
            {title && <h2 className="font-display text-2xl leading-tight text-white">{title}</h2>}
            {description && <p className="mt-1 text-sm text-zinc-400">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

interface StatProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'good' | 'bad' | 'brand';
}

const TONES = {
  default: 'text-white',
  good: 'text-emerald-300',
  bad: 'text-rose-300',
  brand: 'text-gradient',
};

/** Métrica con número grande en serif. */
export function Stat({ label, value, hint, tone = 'default' }: StatProps) {
  return (
    <div className="glass rounded-2xl px-4 py-4 sm:px-5">
      <dt className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">{label}</dt>
      <dd
        className={`mt-1.5 font-display text-3xl leading-none tabular-nums sm:text-4xl ${TONES[tone]}`}
      >
        {value}
      </dd>
      {hint && <dd className="mt-2 truncate text-xs text-zinc-500">{hint}</dd>}
    </div>
  );
}
