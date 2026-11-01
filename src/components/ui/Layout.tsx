import type { ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
}

export interface Step {
  id: string;
  label: string;
  /** Se puede visitar (ya hay datos para mostrarlo). */
  enabled: boolean;
}

interface LayoutProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  steps: Step[];
  activeStep: string;
  onStepChange: (id: string) => void;
  children: ReactNode;
}

export function Layout({
  tabs,
  activeTab,
  onTabChange,
  steps,
  activeStep,
  onStepChange,
  children,
}: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-ink/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="leading-none">
              <span className="block font-display text-2xl italic text-white">Huffman</span>
              <span className="mt-1 block font-mono text-[0.6rem] uppercase tracking-[0.3em] text-zinc-500">
                compresor · .ycoma
              </span>
            </span>
          </div>
          <nav className="glass flex rounded-full p-1" aria-label="Modo">
            {tabs.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                    active
                      ? 'bg-brand text-white shadow-[0_4px_20px_-4px_rgb(168_85_247/0.8)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
        <Stepper steps={steps} active={activeStep} onChange={onStepChange} />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8 sm:py-14">
        {children}
      </main>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-zinc-500 sm:px-8">
          <p className="font-display text-base italic text-zinc-400">
            «Los símbolos frecuentes merecen códigos cortos.» — David A. Huffman, 1952
          </p>
          <p className="font-mono uppercase tracking-[0.2em]">
            Libros de{' '}
            <a
              className="text-zinc-300 underline decoration-fuchsia-400/50 underline-offset-4 hover:text-white"
              href="https://www.gutenberg.org"
              target="_blank"
              rel="noreferrer"
            >
              Project Gutenberg
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 40 40" className="size-10 shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#818cf8" />
          <stop offset="0.55" stopColor="#e879f9" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="12"
        fill="none"
        stroke="url(#logo-grad)"
        strokeOpacity="0.6"
      />
      <path
        d="M20 9 L12 20 L8 31 M12 20 L16 31 M20 9 L28 20 L32 31 M28 20 L24 31"
        stroke="url(#logo-grad)"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="20" cy="9" r="2.4" fill="#fdf4ff" />
      {[8, 16, 24, 32].map((x) => (
        <circle key={x} cx={x} cy="31" r="2.2" fill="url(#logo-grad)" />
      ))}
    </svg>
  );
}

interface StepperProps {
  steps: Step[];
  active: string;
  onChange: (id: string) => void;
}

function Stepper({ steps, active, onChange }: StepperProps) {
  const activeIndex = steps.findIndex((s) => s.id === active);
  return (
    <ol className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 sm:px-8">
      {steps.map((step, index) => {
        const current = index === activeIndex;
        const done = index < activeIndex;
        return (
          <li key={step.id} className="min-w-0 flex-1 basis-0">
            <button
              type="button"
              disabled={!step.enabled}
              onClick={() => onChange(step.id)}
              aria-current={current ? 'step' : undefined}
              className="group w-full min-w-max text-left disabled:cursor-not-allowed"
            >
              <span
                className={`block h-[2px] rounded-full transition-all duration-500 ${
                  current
                    ? 'bg-brand shadow-[0_0_14px_rgb(232_121_249/0.8)]'
                    : done
                      ? 'bg-white/40'
                      : 'bg-white/[0.08]'
                }`}
              />
              <span
                className={`mt-2 flex items-baseline gap-2 text-xs transition-colors sm:text-sm ${
                  current
                    ? 'text-white'
                    : step.enabled
                      ? 'text-zinc-400 group-hover:text-zinc-100'
                      : 'text-zinc-600'
                }`}
              >
                <span className="font-mono text-[0.65rem] tracking-widest text-fuchsia-300/70">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className={current ? 'font-display text-base italic sm:text-lg' : ''}>
                  {step.label}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
