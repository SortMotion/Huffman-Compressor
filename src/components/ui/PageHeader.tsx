import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** Número o etiqueta corta del paso, p. ej. "02 — Frecuencias". */
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

/** Encabezado editorial de cada pantalla: etiqueta en mono, título en serif grande. */
export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="animate-rise flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-2xl">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.3em] text-fuchsia-300/80">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-display text-4xl leading-[1.05] text-white sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-zinc-400">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
