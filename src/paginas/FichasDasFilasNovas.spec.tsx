import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/cliente';
import type { EtapaResumo, Prontuario } from '../api/tipos';
import { rotaDaFicha } from '../componentes/FichaDeEtapa';
import { ProvedorI18n } from '../i18n';
import { Farmacia } from './Farmacia';
import { Ultrassom } from './Ultrassom';

function etapa(sobre: Partial<EtapaResumo> = {}): EtapaResumo {
  return {
    id: 'e1',
    especialidade: 'Ultrassom',
    status: 'EmAndamento',
    profissional: 'Sônia Imagem',
    iniciadaEm: '2026-07-26T12:05:00Z',
    concluidaEm: null,
    assumidaEm: '2026-07-26T12:05:00Z',
    encaminhadaPor: 'Carlos Clínico',
    encaminhadaDe: 'ClinicaGeral',
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
      alerta: { exibir: true, texto: 'Alergia: dipirona' },
    },
    status: 'EmAndamento',
    consultas: [],
    odontologia: null,
    enfermagem: null,
    ultrassom: null,
    farmacia: null,
    etapas: [etapa()],
    tempoNasFilas: [],
    historico: [],
    ...sobre,
  } as unknown as Prontuario;
}

function renderizar(tela: 'ultrassom' | 'farmacia') {
  return render(
    <ProvedorI18n>
      <MemoryRouter initialEntries={[`/atendimentos/a1/${tela}`]}>
        <Routes>
          <Route path="/atendimentos/:id/ultrassom" element={<Ultrassom />} />
          <Route path="/atendimentos/:id/farmacia" element={<Farmacia />} />
          <Route path="/atendimentos/:id" element={<p>prontuário</p>} />
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

describe('rota da ficha', () => {
  /*
    Antes o prontuário tinha três botões fixos, e o da consulta apontava sempre
    para a clínica geral: quem era da pediatria, da ginecologia ou do ultrassom
    não tinha como chegar na própria ficha.
  */
  it('leva cada fila à ficha dela', () => {
    expect(rotaDaFicha('a1', 'Triagem')).toBe('/atendimentos/a1/triagem');
    expect(rotaDaFicha('a1', 'Odontologia')).toBe('/atendimentos/a1/odontologia');
    expect(rotaDaFicha('a1', 'Enfermagem')).toBe('/atendimentos/a1/enfermagem');
    expect(rotaDaFicha('a1', 'Ultrassom')).toBe('/atendimentos/a1/ultrassom');
    expect(rotaDaFicha('a1', 'Farmacia')).toBe('/atendimentos/a1/farmacia');
  });

  it('manda as filas de consulta para a consulta da especialidade certa', () => {
    expect(rotaDaFicha('a1', 'Ginecologia')).toBe('/atendimentos/a1/consulta/Ginecologia');
    expect(rotaDaFicha('a1', 'Pediatria')).toBe('/atendimentos/a1/consulta/Pediatria');
    expect(rotaDaFicha('a1', 'Cirurgia')).toBe('/atendimentos/a1/consulta/Cirurgia');
  });
});

describe('Laudo do ultrassom', () => {
  it('guarda análise e conclusão em campos separados', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(api, 'prontuario').mockResolvedValue(prontuario());
    const salvar = vi.spyOn(api, 'registrarUltrassom').mockResolvedValue(undefined);

    renderizar('ultrassom');

    await screen.findByLabelText('Exame solicitado');

    await usuario.type(screen.getByLabelText('Exame solicitado'), 'USG de abdome total');
    await usuario.type(screen.getByLabelText('Análise'), 'Vesícula com cálculo móvel.');
    await usuario.type(screen.getByLabelText('Conclusão'), 'Colelitíase.');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(salvar).toHaveBeenCalled());

    // Separadas porque é a conclusão que quem pediu lê primeiro. Juntas numa
    // caixa só, ela vira o último parágrafo de um texto corrido.
    expect(salvar.mock.calls[0][1]).toMatchObject({
      exameSolicitado: 'USG de abdome total',
      analise: 'Vesícula com cálculo móvel.',
      conclusao: 'Colelitíase.',
    });
  });

  it('mostra o alerta de alergia enquanto se preenche', async () => {
    vi.spyOn(api, 'prontuario').mockResolvedValue(prontuario());

    renderizar('ultrassom');

    expect(await screen.findByText(/dipirona/)).toBeInTheDocument();
  });

  it('oferece devolver quem pediu o exame como destino', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(api, 'prontuario').mockResolvedValue(prontuario());
    const salvar = vi.spyOn(api, 'registrarUltrassom').mockResolvedValue(undefined);

    renderizar('ultrassom');

    await screen.findByLabelText('Análise');

    await usuario.click(screen.getByRole('button', { name: 'Encaminhado' }));
    await usuario.click(screen.getByRole('button', { name: 'Clínica Geral' }));
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(salvar).toHaveBeenCalled());

    expect(salvar.mock.calls[0][1]).toMatchObject({
      desfecho: 'Encaminhado',
      encaminhadoPara: 'ClinicaGeral',
    });
  });
});

describe('Farmácia', () => {
  it('mostra o que foi prescrito para conferir contra o que sai', async () => {
    vi.spyOn(api, 'prontuario').mockResolvedValue(
      prontuario({
        etapas: [etapa({ especialidade: 'Farmacia' })],
        consultas: [
          {
            etapaId: 'e0',
            especialidade: 'ClinicaGeral',
            profissional: null,
            dispensacoes: [
              {
                id: 'd1',
                item: 'Dipirona 500 mg',
                quantidade: 10,
                unidade: 'Comprimido',
                via: null,
                posologia: '1 a cada 6 h',
                foraDoCatalogo: false,
              },
            ],
          } as unknown as Prontuario['consultas'][number],
        ],
      }),
    );

    renderizar('farmacia');

    // A receita é de quem atendeu: a farmácia lê a mesma lista, não uma cópia
    // que poderia ficar diferente sem ninguém notar.
    expect(await screen.findByText(/Dipirona 500 mg/)).toBeInTheDocument();
    expect(screen.getByText('Prescrito')).toBeInTheDocument();
  });

  it('registra a orientação e o que fugiu do previsto', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(api, 'prontuario').mockResolvedValue(
      prontuario({ etapas: [etapa({ especialidade: 'Farmacia' })] }),
    );
    const salvar = vi.spyOn(api, 'registrarFarmacia').mockResolvedValue(undefined);

    renderizar('farmacia');

    await screen.findByLabelText('Orientação farmacêutica');

    await usuario.type(screen.getByLabelText('Orientação farmacêutica'), 'Tomar após as refeições.');
    await usuario.type(screen.getByLabelText('Observações'), 'Só havia comprimido de 500 mg.');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(salvar).toHaveBeenCalled());

    expect(salvar.mock.calls[0][1]).toMatchObject({
      orientacoes: 'Tomar após as refeições.',
      observacoes: 'Só havia comprimido de 500 mg.',
    });
  });
});
