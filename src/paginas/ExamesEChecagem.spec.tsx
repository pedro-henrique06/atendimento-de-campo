import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/cliente';
import type { Dispensacao, Prontuario } from '../api/tipos';
import { ProvedorI18n } from '../i18n';
import { Atendimento } from './Atendimento';
import { Prontuario as TelaProntuario } from './Prontuario';

/**
 * O que faltava da página "Prescrição Médica": os exames que a consulta pede,
 * os procedimentos feitos ali mesmo, e a assinatura ao lado de cada linha da
 * prescrição.
 */

function item(sobre: Partial<Dispensacao> = {}): Dispensacao {
  return {
    id: 'd1',
    item: 'Dipirona 500 mg',
    quantidade: 10,
    unidade: 'Comprimido',
    via: 'Oral',
    posologia: '1 comprimido de 6/6 h se dor.',
    foraDoCatalogo: false,
    checadaPor: null,
    checadaEm: null,
    ...sobre,
  };
}

function prontuario(sobre: Partial<Prontuario> = {}): Prontuario {
  return {
    id: 'a1',
    codigo: 'ACA-4K7Z',
    base: { id: 'b1', nome: 'Acampamento Panamá', prefixoCodigo: 'ACA', ativa: true },
    paciente: {
      id: 'pa1',
      nome: 'Yesenia Navarro',
      idade: 45,
      alerta: { exibir: false, texto: null },
      condicoesCronicas: [],
      vulnerabilidades: [],
    },
    status: 'EmAndamento',
    consultas: [],
    odontologia: null,
    enfermagem: null,
    ultrassom: null,
    farmacia: null,
    cirurgia: null,
    sinaisVitais: [],
    tipoMissao: null,
    etapas: [
      {
        id: 'e1',
        especialidade: 'ClinicaGeral',
        status: 'EmAndamento',
        profissional: 'Carlos Clínico',
        iniciadaEm: '2026-07-26T12:05:00Z',
        concluidaEm: null,
        assumidaEm: '2026-07-26T12:05:00Z',
        encaminhadaPor: null,
        encaminhadaDe: null,
        entrouNaFilaEm: null,
      },
    ],
    tempoNasFilas: [],
    historico: [],
    ...sobre,
  } as unknown as Prontuario;
}

function consulta(sobre: Record<string, unknown> = {}) {
  return {
    etapaId: 'e1',
    especialidade: 'ClinicaGeral',
    profissional: { nome: 'Carlos Clínico', conselho: 'Crm', registro: '10001' },
    sintomasDescricao: 'Dor lombar.',
    historiaClinica: null,
    exameFisico: null,
    cid10Codigo: 'M54.5',
    cid10Descricao: 'Dor lombar baixa',
    diagnosticoObservacao: null,
    conduta: null,
    orientacoesGerais: null,
    desfecho: null,
    encaminhadoPara: null,
    ortopedia: null,
    ginecologia: null,
    sintomasSaudeMental: [],
    perdasVivenciadas: [],
    exameLaboratorialSolicitado: false,
    exameLaboratorialDescricao: null,
    papanicolauSolicitado: false,
    papanicolauObservacao: null,
    outroExameSolicitado: null,
    procedimentos: [],
    procedimentosObservacao: null,
    dispensacoes: [],
    concluidaEm: null,
    ...sobre,
  };
}

function renderizarConsulta() {
  return render(
    <ProvedorI18n>
      <MemoryRouter initialEntries={['/atendimentos/a1/consulta/ClinicaGeral']}>
        <Routes>
          <Route
            path="/atendimentos/:id/consulta/:especialidade"
            element={<Atendimento modo="consulta" />}
          />
          <Route path="/atendimentos/:id" element={<p>prontuário</p>} />
        </Routes>
      </MemoryRouter>
    </ProvedorI18n>,
  );
}

function renderizarProntuario() {
  return render(
    <ProvedorI18n>
      <MemoryRouter initialEntries={['/atendimentos/a1']}>
        <Routes>
          <Route path="/atendimentos/:id" element={<TelaProntuario />} />
        </Routes>
      </MemoryRouter>
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

describe('Exames complementares e procedimentos na consulta', () => {
  it('"quais exames" só é pedido depois do sim', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(api, 'prontuario').mockResolvedValue(prontuario());
    vi.spyOn(api, 'cid10').mockResolvedValue([]);

    renderizarConsulta();

    await screen.findByLabelText(/Exame laboratorial/);
    expect(screen.queryByLabelText(/Quais exames/)).not.toBeInTheDocument();

    await usuario.click(screen.getByLabelText(/Exame laboratorial/));

    // Perguntar quais exames sem ter pedido nenhum é linha vazia em toda ficha.
    expect(await screen.findByLabelText(/Quais exames/)).toBeInTheDocument();
  });

  it('o ultrassom não é oferecido como caixa: ele é a fila', async () => {
    vi.spyOn(api, 'prontuario').mockResolvedValue(prontuario());
    vi.spyOn(api, 'cid10').mockResolvedValue([]);

    renderizarConsulta();

    await screen.findByLabelText(/Exame laboratorial/);

    /*
      Pedir um USG é encaminhar para a fila do ultrassom, no desfecho. Uma
      caixa aqui seria um segundo registro do mesmo pedido, sem nada que os
      mantivesse de acordo — e na hora de contar quantos exames a missão pediu,
      os dois números discordariam.
    */
    const dentroDosExames = screen
      .getByRole('heading', { name: 'Exames complementares' })
      .closest('section');

    expect(dentroDosExames).not.toBeNull();
    expect(dentroDosExames!.textContent).not.toMatch(/ultrassom/i);
  });

  it('a observação dos procedimentos só aparece quando houve algum', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(api, 'prontuario').mockResolvedValue(prontuario());
    vi.spyOn(api, 'cid10').mockResolvedValue([]);

    renderizarConsulta();

    const curativo = await screen.findByRole('button', { name: 'Curativo' });

    expect(screen.queryByLabelText(/Onde foi o curativo/)).not.toBeInTheDocument();

    await usuario.click(curativo);

    expect(await screen.findByLabelText(/Onde foi o curativo/)).toBeInTheDocument();
  });

  it('os exames e os procedimentos vão para a API', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(api, 'prontuario').mockResolvedValue(prontuario());
    vi.spyOn(api, 'cid10').mockResolvedValue([]);
    const salvar = vi.spyOn(api, 'registrarConsulta').mockResolvedValue(undefined);

    renderizarConsulta();

    await usuario.click(await screen.findByLabelText(/Exame laboratorial/));
    await usuario.type(await screen.findByLabelText(/Quais exames/), 'Hemograma.');
    await usuario.click(screen.getByRole('button', { name: 'Passagem de DIU' }));
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(salvar).toHaveBeenCalled());

    expect(salvar).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({
        exameLaboratorialSolicitado: true,
        exameLaboratorialDescricao: 'Hemograma.',
        procedimentos: ['PassagemDiu'],
      }),
    );
  });
});

describe('Checagem da prescrição', () => {
  it('a ficha que prescreve não oferece checar', async () => {
    vi.spyOn(api, 'prontuario').mockResolvedValue(prontuario());
    vi.spyOn(api, 'cid10').mockResolvedValue([]);

    renderizarConsulta();

    await screen.findByLabelText(/Exame laboratorial/);

    // Checar o que se acabou de escrever, na mesma tela, seria assinar que foi
    // dado antes de alguém dar.
    expect(screen.queryByRole('button', { name: 'Checar' })).not.toBeInTheDocument();
  });

  it('no prontuário, checar assina a linha', async () => {
    const usuario = userEvent.setup();

    const semChecar = prontuario({ consultas: [consulta({ dispensacoes: [item()] })] } as never);
    const checada = prontuario({
      consultas: [
        consulta({
          dispensacoes: [
            item({
              checadaPor: { nome: 'Joel Tavares', conselho: 'Coren', registro: '30001' },
              checadaEm: '2026-07-26T15:40:00Z',
            }),
          ],
        }),
      ],
    } as never);

    const ler = vi
      .spyOn(api, 'prontuario')
      .mockResolvedValueOnce(semChecar)
      .mockResolvedValue(checada);

    const checar = vi.spyOn(api, 'checarPrescricao').mockResolvedValue(item());

    renderizarProntuario();

    await usuario.click(await screen.findByRole('button', { name: 'Checar' }));

    await waitFor(() => expect(checar).toHaveBeenCalledWith('a1', 'd1', true));
    await waitFor(() => expect(ler).toHaveBeenCalledTimes(2));

    // Quem e quando, e não só um tique: o tique diz que alguém deu, e a
    // pergunta depois é quem.
    expect(await screen.findByText(/Checado por Joel Tavares/)).toBeInTheDocument();
  });

  it('atendimento finalizado não oferece checar', async () => {
    vi.spyOn(api, 'prontuario').mockResolvedValue(
      prontuario({
        status: 'Finalizado',
        finalizadoEm: '2026-07-26T16:00:00Z',
        finalizadoPor: 'Carlos Clínico',
        consultas: [consulta({ dispensacoes: [item()] })],
      } as never),
    );

    renderizarProntuario();

    await screen.findByText(/Dipirona/);

    // Depois do fecho, o prontuário é leitura: corrigir exige reabrir, com
    // justificativa.
    expect(screen.queryByRole('button', { name: 'Checar' })).not.toBeInTheDocument();
  });
});
