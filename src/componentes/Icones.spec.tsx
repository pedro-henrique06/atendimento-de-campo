import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  IconeAlerta,
  IconeConcluido,
  IconeLocal,
  IconeLua,
  IconeOlho,
  IconeOlhoFechado,
  IconePendente,
  IconeSeta,
  IconeSol,
} from './Icones';

const TODOS = {
  IconeAlerta,
  IconeConcluido,
  IconeLocal,
  IconeLua,
  IconeOlho,
  IconeOlhoFechado,
  IconePendente,
  IconeSeta,
  IconeSol,
};

describe('Ícones', () => {
  it.each(Object.entries(TODOS))('%s desenha um SVG que herda a cor do texto', (_, Icone) => {
    const { container } = render(<Icone />);
    const svg = container.querySelector('svg');

    expect(svg).not.toBeNull();
    // `currentColor` e o que faz o icone acompanhar o texto ao lado, no tema
    // claro e no escuro, sem uma cor fixa em cada ponto de uso.
    expect(svg?.getAttribute('stroke')).toBe('currentColor');
  });

  it.each(Object.entries(TODOS))('%s é decorativo, não anunciado', (_, Icone) => {
    // Quem nomeia o controle é o texto ou o aria-label do botão em volta. Um
    // ícone com nome próprio faria o leitor de tela ler a mesma coisa duas
    // vezes.
    const { container } = render(<Icone />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden');
  });
});

/**
 * Emoji é fonte, não desenho: cada sistema entrega o seu, então o mesmo botão
 * sai diferente no Android, no iPhone e no navegador do posto. Este teste
 * impede que um volte para a interface sem querer.
 */
describe('Sem emoji na interface', () => {
  const FAIXAS: [number, number][] = [
    [0x2300, 0x23ff],
    [0x25a0, 0x27bf],
    [0x2b00, 0x2bff],
    [0x1f000, 0x1faff],
    [0xfe0f, 0xfe0f],
  ];

  // Lido pelo proprio Vite, e nao por `node:fs`: evita puxar @types/node so
  // para um teste.
  const fontes = import.meta.glob('../**/*.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  const telas = Object.entries(fontes).filter(([caminho]) => !caminho.endsWith('.spec.tsx'));

  it('encontra as telas para varrer', () => {
    // Um glob que nao casa com nada passaria os testes abaixo por vacuidade.
    expect(telas.length).toBeGreaterThan(10);
  });

  it.each(telas)('%s não usa emoji', (_, fonte) => {
    const achados = [...fonte].filter((c) =>
      FAIXAS.some(([a, b]) => c.codePointAt(0)! >= a && c.codePointAt(0)! <= b),
    );

    expect(achados).toEqual([]);
  });
});
