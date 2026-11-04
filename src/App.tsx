import type { ComponentType } from 'react';
import { canVisit, SCREENS_BY_MODE, type Mode, type Screen } from './app/reducer';
import { dispatch, useAppState } from './app/store';
import { Alert, Button, Layout, type Step, type Tab } from './components/ui';
import {
  AnalyzeScreen,
  CompressScreen,
  DecompressScreen,
  InspectScreen,
  SourceScreen,
  TreeScreen,
} from './components/screens/index';

const TABS: Tab[] = [
  { id: 'compress', label: 'Comprimir' },
  { id: 'decompress', label: 'Descomprimir' },
];

const STEP_LABELS: Record<Screen, string> = {
  source: 'Fuente',
  analyze: 'Frecuencias',
  tree: 'Árbol',
  compress: 'Comprimir',
  inspect: 'Inspeccionar',
  decompress: 'Descomprimir',
};

const SCREENS: Record<Screen, ComponentType> = {
  source: SourceScreen,
  analyze: AnalyzeScreen,
  tree: TreeScreen,
  compress: CompressScreen,
  inspect: InspectScreen,
  decompress: DecompressScreen,
};

function App() {
  const mode = useAppState((s) => s.mode);
  const screen = useAppState((s) => s.screen);
  const error = useAppState((s) => s.error);
  // El estado completo solo se usa para saber qué pasos se pueden visitar
  const state = useAppState((s) => s);

  const steps: Step[] = SCREENS_BY_MODE[mode].map((id) => ({
    id,
    label: STEP_LABELS[id],
    enabled: canVisit(state, id),
  }));

  const Current = SCREENS[screen];

  return (
    <Layout
      tabs={TABS}
      activeTab={mode}
      onTabChange={(id) => dispatch({ type: 'SET_MODE', mode: id as Mode })}
      steps={steps}
      activeStep={screen}
      onStepChange={(id) => dispatch({ type: 'NAVIGATE', screen: id as Screen })}
    >
      {error && (
        <div className="mb-6">
          <Alert
            tone="error"
            title={error.title}
            action={
              <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'DISMISS_ERROR' })}>
                Cerrar
              </Button>
            }
          >
            {error.message}
          </Alert>
        </div>
      )}
      <Current />
    </Layout>
  );
}

export default App;
