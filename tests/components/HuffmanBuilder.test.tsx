import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HuffmanBuilder } from '../../src/components/algorithm';
import { example1, example2 } from '../../src/fixtures/sample';

class FakeResizeObserver {
  observe() {}
  disconnect() {}
}

describe('<HuffmanBuilder />', () => {
  beforeEach(() => vi.stubGlobal('ResizeObserver', FakeResizeObserver));
  afterEach(() => vi.unstubAllGlobals());

  it('muestra las hojas sueltas y la primera pareja que se va a unir', () => {
    render(<HuffmanBuilder freqs={example1.freqs} codes={example1.codes} />);
    expect(screen.getByText('Paso 0 de 4')).toBeInTheDocument();
    expect(screen.getByText(/5 hojas sueltas/)).toBeInTheDocument();
    expect(screen.getByText(/Siguiente: «c» \(1\) \+/)).toBeInTheDocument();
  });

  it('avanza paso a paso y describe cada unión', () => {
    render(<HuffmanBuilder freqs={example1.freqs} codes={example1.codes} />);
    fireEvent.click(screen.getByLabelText('Paso siguiente'));
    expect(screen.getByText('Paso 1 de 4')).toBeInTheDocument();
    expect(screen.getByText('Se unieron «c» y «d»: 1 + 1 = 2.')).toBeInTheDocument();
  });

  it('al final muestra el árbol terminado con la raíz igual al tamaño del archivo', () => {
    render(<HuffmanBuilder freqs={example1.freqs} codes={example1.codes} />);
    fireEvent.click(screen.getByLabelText('Al final'));
    expect(screen.getByText(/Árbol terminado\. La raíz pesa 11/)).toBeInTheDocument();
    expect(screen.getByText(/Cola de prioridad · 1 raíz/)).toBeInTheDocument();
  });

  it('al elegir una hoja muestra su camino y su código del .ycoma', () => {
    render(<HuffmanBuilder freqs={example1.freqs} codes={example1.codes} />);
    fireEvent.click(screen.getByLabelText('Al final'));
    const leaf = [...document.querySelectorAll('svg title')].find((t) =>
      t.textContent?.startsWith('a (0x61)')
    );
    fireEvent.click(leaf!.parentElement!);
    expect(screen.getByText('Código en el .ycoma')).toBeInTheDocument();
    // a (5) contra el resto (6): a va a la izquierda de la raíz
    expect(screen.getByText('Camino en este árbol').nextSibling?.textContent).toBe('0');
  });

  it('un solo símbolo: no hay nada que unir', () => {
    render(<HuffmanBuilder freqs={example2.freqs} codes={example2.codes} />);
    expect(screen.getByText(/su código es 0/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Reproducir')).not.toBeInTheDocument();
  });
});
