import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { MarcacaoDente } from '../api/tipos';
import { ProvedorI18n } from '../i18n';
import { Odontograma, resumirOdontograma } from './Odontograma';

function Anfitriao({ inicial = [] }: { inicial?: MarcacaoDente[] }) {
  const [marcacoes, setMarcacoes] = useState<MarcacaoDente[]>(inicial);

  return (
    <ProvedorI18n>
      <Odontograma marcacoes={marcacoes} aoMudar={setMarcacoes} />
    </ProvedorI18n>
  );
}

describe('resumirOdontograma', () => {
  const traduzir = (estado: string) =>
    estado === 'Carie' ? 'Cárie' : estado === 'ExtracaoIndicada' ? 'Extração indicada' : estado;

  it('produz o mesmo formato do prontuário', () => {
    const marcacoes: MarcacaoDente[] = [
      { dente: 38, estado: 'Carie', faces: ['Mesial', 'Oclusal'] },
      { dente: 38, estado: 'ExtracaoIndicada', faces: [] },
    ];

    expect(resumirOdontograma(marcacoes, traduzir)).toBe(
      'Cárie: 38(M,O); Extração indicada: 38',
    );
  });

  it('ordena os estados igual ao backend, não pela ordem de marcação', () => {
    // Se seguisse a ordem de digitação, o prontuário e o histórico de
    // alterações — montado pelo servidor — mostrariam a mesma informação em
    // ordens diferentes na mesma tela.
    const marcacoes: MarcacaoDente[] = [
      { dente: 38, estado: 'ExtracaoIndicada', faces: [] },
      { dente: 38, estado: 'Carie', faces: ['Mesial', 'Oclusal'] },
    ];

    expect(resumirOdontograma(marcacoes, traduzir)).toBe(
      'Cárie: 38(M,O); Extração indicada: 38',
    );
  });

  it('ignora dentes hígidos', () => {
    const marcacoes: MarcacaoDente[] = [
      { dente: 11, estado: 'Higido', faces: [] },
      { dente: 21, estado: 'Carie', faces: ['Incisal'] },
    ];

    expect(resumirOdontograma(marcacoes, traduzir)).toBe('Cárie: 21(I)');
  });
});

describe('Odontograma', () => {
  it('mostra todos os dentes permanentes', () => {
    render(<Anfitriao />);

    // 32 dentes permanentes na notação FDI.
    expect(screen.getByRole('button', { name: /^11/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^48/ })).toBeInTheDocument();
  });

  it('mantém cárie e extração indicada no mesmo dente', async () => {
    // Este é o caso do dente 38 no prontuário analisado. No sistema antigo a
    // segunda marcação apagava a primeira do desenho.
    const usuario = userEvent.setup();

    render(
      <Anfitriao
        inicial={[{ dente: 38, estado: 'Carie', faces: ['Mesial', 'Oclusal'] }]}
      />,
    );

    await usuario.click(screen.getByRole('button', { name: /^38/ }));
    await usuario.click(screen.getByRole('button', { name: 'Extração indicada' }));

    const dente = screen.getByRole('button', { name: /^38/ });

    expect(dente).toHaveAccessibleName(expect.stringContaining('Cárie'));
    expect(dente).toHaveAccessibleName(expect.stringContaining('Extração indicada'));
  });

  it('marcar ausente remove os demais estados do dente', async () => {
    const usuario = userEvent.setup();

    render(<Anfitriao inicial={[{ dente: 36, estado: 'Carie', faces: [] }]} />);

    await usuario.click(screen.getByRole('button', { name: /^36/ }));
    await usuario.click(screen.getByRole('button', { name: 'Ausente' }));

    const dente = screen.getByRole('button', { name: /^36/ });

    expect(dente).toHaveAccessibleName(expect.stringContaining('Ausente'));
    expect(dente).not.toHaveAccessibleName(expect.stringContaining('Cárie'));
  });

  it('tocar duas vezes no mesmo estado desmarca', async () => {
    const usuario = userEvent.setup();

    render(<Anfitriao />);

    await usuario.click(screen.getByRole('button', { name: /^21/ }));
    await usuario.click(screen.getByRole('button', { name: 'Cárie' }));
    expect(screen.getByRole('button', { name: /^21/ })).toHaveAccessibleName(
      expect.stringContaining('Cárie'),
    );

    await usuario.click(screen.getByRole('button', { name: 'Cárie' }));
    expect(screen.getByRole('button', { name: /^21/ })).toHaveAccessibleName('21');
  });

  it('oferece face oclusal em molar e incisal em incisivo', async () => {
    const usuario = userEvent.setup();

    render(<Anfitriao />);

    await usuario.click(screen.getByRole('button', { name: /^36/ }));
    await usuario.click(screen.getByRole('button', { name: 'Cárie' }));

    expect(screen.getByRole('button', { name: 'Oclusal' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Incisal' })).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /^11/ }));
    await usuario.click(screen.getByRole('button', { name: 'Cárie' }));

    expect(screen.getByRole('button', { name: 'Incisal' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Oclusal' })).not.toBeInTheDocument();
  });

  it('exibe o resumo textual das marcações', async () => {
    const usuario = userEvent.setup();

    render(<Anfitriao inicial={[{ dente: 38, estado: 'Carie', faces: ['Mesial', 'Oclusal'] }]} />);

    await usuario.click(screen.getByRole('button', { name: /^38/ }));
    await usuario.click(screen.getByRole('button', { name: 'Extração indicada' }));

    expect(screen.getByText(/Cárie: 38\(M,O\); Extração indicada: 38/)).toBeInTheDocument();
  });

  it('cada dente descreve seus estados por texto, não só por cor', async () => {
    // Quem não distingue as cores, ou usa leitor de tela, precisa da informação.
    const usuario = userEvent.setup();

    render(<Anfitriao />);

    await usuario.click(screen.getByRole('button', { name: /^47/ }));
    await usuario.click(screen.getByRole('button', { name: 'Restaurado' }));

    expect(screen.getByRole('button', { name: '47: Restaurado' })).toBeInTheDocument();
  });

  it('limpar dente remove todas as marcações dele', async () => {
    const usuario = userEvent.setup();

    render(
      <Anfitriao
        inicial={[
          { dente: 38, estado: 'Carie', faces: [] },
          { dente: 38, estado: 'ExtracaoIndicada', faces: [] },
          { dente: 11, estado: 'Carie', faces: [] },
        ]}
      />,
    );

    await usuario.click(screen.getByRole('button', { name: /^38/ }));
    await usuario.click(screen.getByRole('button', { name: 'Limpar dente' }));

    expect(screen.getByRole('button', { name: '38' })).toBeInTheDocument();
    // O outro dente não é afetado.
    expect(screen.getByRole('button', { name: '11: Cárie' })).toBeInTheDocument();
  });

  it('em modo somente leitura não oferece edição', () => {
    render(
      <ProvedorI18n>
        <Odontograma
          marcacoes={[{ dente: 38, estado: 'Carie', faces: [] }]}
          somenteLeitura
        />
      </ProvedorI18n>,
    );

    expect(screen.queryByRole('button', { name: 'Limpar dente' })).not.toBeInTheDocument();
    expect(screen.getByText(/Cárie: 38/)).toBeInTheDocument();
  });
});

describe('faces por estado', () => {
  it('estado de dente inteiro não oferece faces', async () => {
    // Extração indicada é do dente todo; pedir face ali produziria dado sem
    // significado clínico.
    const usuario = userEvent.setup();

    render(<Anfitriao />);

    await usuario.click(screen.getByRole('button', { name: /^38/ }));
    await usuario.click(screen.getByRole('button', { name: 'Extração indicada' }));

    expect(screen.queryByText(/Faces — Extração indicada/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Oclusal' })).not.toBeInTheDocument();
  });

  it('cárie continua oferecendo faces', async () => {
    const usuario = userEvent.setup();

    render(<Anfitriao />);

    await usuario.click(screen.getByRole('button', { name: /^38/ }));
    await usuario.click(screen.getByRole('button', { name: /^Cárie$/ }));

    expect(screen.getByText(/Faces — Cárie/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Oclusal' })).toBeInTheDocument();
  });
});
