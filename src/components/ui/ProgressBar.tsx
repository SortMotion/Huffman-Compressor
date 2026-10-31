interface ProgressBarProps {
  /** Bytes (o unidades) completados. */
  value: number;
  /** Total esperado; `null` muestra una barra indeterminada. */
  max: number | null;
  label?: string;
  detail?: string;
}

export function ProgressBar({ value, max, label, detail }: ProgressBarProps) {
  const percent = max ? Math.min(100, Math.round((value / max) * 100)) : null;
  return (
    <div className="w-full">
      {(label || detail) && (
        <div className="mb-2 flex justify-between gap-4 font-mono text-[0.7rem] uppercase tracking-[0.15em] text-zinc-400">
          <span>{label}</span>
          <span className="tabular-nums text-zinc-200">
            {detail ?? (percent !== null ? `${percent} %` : '')}
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
      >
        <div
          className="bg-brand absolute inset-y-0 left-0 rounded-full shadow-[0_0_20px_rgb(236_72_153/0.6)] transition-[width] duration-300"
          style={{ width: percent !== null ? `${percent}%` : '40%' }}
        />
        <div
          className="animate-shimmer absolute inset-0 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.35),transparent)] bg-[length:50%_100%] bg-no-repeat"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
