import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MedicaoSinaisVitais } from '../api/tipos';
import { ProvedorI18n } from '../i18n';
import { FolhaDeObservacao } from './FolhaDeObservacao';

function medicao(sobre: Partial<MedicaoSinaisVitais> = {}): MedicaoSinaisVitais {
  return {
    id: 'm1',
    medidaEm: '2026-07-26T12:00:00Z',
    registradaPor: 'Elza Enfermeira',
    pressaoSistolica: 120,
    pressaoDiastolica: 80,
    frequenciaCardiaca: 78,
    frequenciaRespiratoria: 16,
    saturacaoO2: 98,
    temperaturaCelsius: 36.5,
    glicemiaCapilar: 95,
    escalaDor: 2,
    observacao: null,
    foraDaFaixa: [],
    ...sobre,
  };
}

function renderizar(medicoes: MedicaoSinaisVitais[], aoRemover?: (id: string) => void) {
  return render(
    <ProvedorI18n>
      <FolhaDeObservacao medicoes={medicoes} aoRemover={aoRemover} />
    </ProvedorI18n>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('atendimento.idioma', 'Pt');
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('Folha de observação', () => {
  it('diz quando ainda não há medida, em vez de mostrar tabela vazia', () => {
    renderizar([]);

    expect(screen.getByText('Nenhuma medida registrada.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('mostra a pressão como um par, e não como duas medidas', () => {
    renderizar([medicao()]);

    // 120x80 é uma medida só: separada em duas colunas, deixa de ser lida
    // como par.
    expect(screen.getByText('120×80')).toBeInTheDocument();
  });

  it('marca a medida fora da faixa, e não a linha inteira', () => {
    renderizar([
      medicao({
        pressaoSistolica: 82,
        saturacaoO2: 88,
        foraDaFaixa: ['PressaoSistolica', 'SaturacaoO2'],
      }),
    ]);

    // A pergunta de quem olha é *qual* medida saiu: uma linha toda destacada
    // não responde isso.
    const linha = screen.getAllByRole('row')[1];
    const marcadas = within(linha)
      .getAllByText(/Fora da faixa de referência/)
      .length;

    expect(marcadas).toBe(2);

    // A frequência cardíaca estava normal e não pode ter sido marcada junto.
    expect(within(linha).getByText('78')).not.toHaveClass('text-amarelo');
  });

  it('não marca nada quando a faixa não se aplica', () => {
    // É o que chega para criança: o corte é de adulto, e a API manda a lista
    // vazia em vez de acender a linha de um bebê saudável.
    renderizar([medicao({ frequenciaCardiaca: 130, frequenciaRespiratoria: 30, foraDaFaixa: [] })]);

    expect(screen.queryByText(/Fora da faixa/)).not.toBeInTheDocument();
  });

  it('mostra um travessão onde a medida não foi feita', () => {
    renderizar([medicao({ glicemiaCapilar: null, escalaDor: null })]);

    // Nulo é "não medi", e a célula vazia pareceria erro de renderização.
    expect(screen.getAllByText('—').length).toBe(2);
  });

  it('diz quem mediu e deixa remover quando a tela permite', async () => {
    const usuario = userEvent.setup();
    const remover = vi.fn();

    renderizar([medicao({ observacao: 'Paciente sonolento.' })], remover);

    expect(screen.getByText(/Elza Enfermeira/)).toBeInTheDocument();
    expect(screen.getByText(/Paciente sonolento\./)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Remover' }));

    expect(remover).toHaveBeenCalledWith('m1');
  });

  it('não oferece remover quando a tela é só de leitura', () => {
    renderizar([medicao()]);

    expect(screen.queryByRole('button', { name: 'Remover' })).not.toBeInTheDocument();
  });
});
