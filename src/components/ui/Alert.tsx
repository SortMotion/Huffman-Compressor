import type { ReactNode } from 'react';

type Tone = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  tone?: Tone;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}

const TONES: Record<Tone, { bar: string; glyph: string; text: string }> = {
  info: { bar: 'from-indigo-400 to-sky-400', glyph: '◆', text: 'text-indigo-200' },
  success: { bar: 'from-emerald-300 to-teal-400', glyph: '✦', text: 'text-emerald-200' },
  warning: { bar: 'from-amber-300 to-orange-400', glyph: '◐', text: 'text-amber-200' },
  error: { bar: 'from-rose-400 to-fuchsia-500', glyph: '✕', text: 'text-rose-200' },
};

export function Alert({ tone = 'info', title, children, action }: AlertProps) {
  const { bar, glyph, text } = TONES[tone];
  return (
    <div
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      className="glass animate-rise relative flex flex-wrap items-start gap-3 overflow-hidden rounded-2xl py-4 pl-6 pr-4 text-sm"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${bar}`}
      />
      <span aria-hidden="true" className={`mt-0.5 font-mono ${text}`}>
        {glyph}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${text}`}>{title}</p>
        {children && <div className="mt-1 leading-relaxed text-zinc-300">{children}</div>}
      </div>
      {action}
    </div>
  );
}
