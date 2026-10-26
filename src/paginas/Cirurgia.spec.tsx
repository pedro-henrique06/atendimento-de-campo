import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/cliente';
import type { Cirurgia as FichaCirurgica, Prontuario } from '../api/tipos';
import { ProvedorI18n } from '../i18n';
import { Cirurgia } from './Cirurgia';

function ficha(sobre: Partial<FichaCirurgica> = {}): FichaCirurgica {
  return {
    etapaId: 'e1',
    profissional: null,
    indicacao: null,
    procedimentoProposto: null,
    lateralidade: 'NaoSeAplica',
    jejumHoras: null,
    consentimentoAssinado: false,
    observacoesPreOperatorio: null,
    preparoCuidadosEnfermagem: null,
    preparoTricotomia: false,
    preparoTricotomiaLocal: null,
    preparoBanhoClorexidine: false,
    preparoPulseiraIdentificacao: false,
    preOpEcg: false,
    preOpLaboratorial: false,
    preOpUltrassom: false,
    preOpExamesObservacao: null,
    preOpAvaliacaoAnestesica: false,
    pertencesProteseDentaria: false,
    pertencesRoupasAcessorios: false,
    pertencesDestino: null,
    encaminhadoAoCentroEm: null,
    checkInIdentidadeConfirmada: false,
    checkInSitioMarcado: false,
    checkInConsentimentoConferido: false,
    checkInAlergiaConferida: false,
    checkInJejumConferido: false,
    checkInEm: null,
    timeOutUmEquipeApresentada: false,
    timeOutUmMonitorizacaoOk: false,
    timeOutUmViaAereaAvaliada: false,
    timeOutUmRiscoSangramentoAvaliado: false,
    timeOutUmEm: null,
    timeOutDoisPacienteSitioProcedimentoConfirmados: false,
    timeOutDoisAntibioticoProfilatico: false,
    timeOutDoisImagensDisponiveis: false,
    timeOutDoisEventosCriticosRevistos: false,
    timeOutDoisMaterialEsterilizado: false,
    timeOutDoisEm: null,
    checkOutProcedimentoRegistrado: false,
    checkOutContagemConfere: false,
    checkOutAmostrasIdentificadas: false,
    checkOutProblemasComEquipamento: false,
    checkOutCuidadosRecuperacao: null,
    checkOutEm: null,
    recuperacaoEntradaEm: null,
    recuperacaoSaidaEm: null,
    intercorrencias: null,
    observacoesRecuperacao: null,
    pertencesDevolvidos: false,
    recuperacaoDieta: null,
    desfecho: null,
    concluidaEm: null,
    ...sobre,
  };
}

function prontuario(cirurgia: FichaCirurgica | null = null): Prontuario {
  return {
    id: 'a1',
    codigo: 'ACA-4K7Z',
    base: { id: 'b1', nome: 'Acampamento Panamá', prefixoCodigo: 'ACA', ativa: true, tipoMissao: null },
    paciente: {
      id: 'pa1',
      nome: 'Yesenia Navarro',
      idade: 44,
      alerta: { exibir: true, texto: 'Alergia: dipirona' },
    },
    status: 'EmAndamento',
    consultas: [],
    odontologia: null,
    enfermagem: null,
    ultrassom: null,
    farmacia: null,
    cirurgia,
    sinaisVitais: [],
    tipoMissao: null,
    etapas: [
      {
        id: 'e1',
        especialidade: 'Cirurgia',
        status: 'EmAndamento',
        profissional: 'Carla Cirurgiã',
        iniciadaEm: '2026-07-26T12:05:00Z',
        concluidaEm: null,
        assumidaEm: '2026-07-26T12:05:00Z',
        encaminhadaPor: null,
        encaminhadaDe: null,
      },
    ],
    tempoNasFilas: [],
    historico: [],
  } as unknown as Prontuario;
}

function renderizar() {
  return render(
    <ProvedorI18n>
      <MemoryRouter initialEntries={['/atendimentos/a1/cirurgia']}>
        <Routes>
          <Route path="/atendimentos/:id/cirurgia" element={<Cirurgia />} />
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

describe('Ficha cirúrgica', () => {
  it('salvar uma parada não tira a pessoa da tela', async () => {
    const usuario = userEvent.setup();

    const salva = ficha({
      checkInIdentidadeConfirmada: true,
      checkInSitioMarcado: true,
      checkInConsentimentoConferido: true,
      checkInAlergiaConferida: true,
      checkInJejumConferido: true,
      checkInEm: '2026-07-26T12:10:00Z',
    });

    vi.spyOn(api, 'prontuario')
      .mockResolvedValueOnce(prontuario())
      .mockResolvedValue(prontuario(salva));

    const salvar = vi.spyOn(api, 'registrarCirurgia').mockResolvedValue(undefined);

    renderizar();

    await screen.findByLabelText(/Identidade do paciente confirmada/);
    await usuario.click(screen.getByLabelText(/Identidade do paciente confirmada/));
    await usuario.click(screen.getByRole('button', { name: 'Salvar parada' }));

    await waitFor(() => expect(salvar).toHaveBeenCalled());

    // A ficha é preenchida em quatro momentos: sair da tela a cada parada
    // obrigaria a voltar três vezes.
    expect(screen.queryByText('prontuário')).not.toBeInTheDocument();
    expect(await screen.findByText(/Parada salva/)).toBeInTheDocument();
  });

  it('o local da tricotomia só é pedido depois do sim', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(api, 'prontuario').mockResolvedValue(prontuario(ficha()));

    renderizar();

    // Perguntar onde foi feito o que não foi feito é linha vazia em toda ficha.
    await screen.findByLabelText(/Tricotomia realizada/);
    expect(screen.queryByLabelText(/Local da tricotomia/)).not.toBeInTheDocument();

    await usuario.click(screen.getByLabelText(/Tricotomia realizada/));

    expect(await screen.findByLabelText(/Local da tricotomia/)).toBeInTheDocument();
  });

  it('devolver pertences só aparece quando houve o que guardar', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(api, 'prontuario').mockResolvedValue(prontuario(ficha()));

    renderizar();

    await screen.findByLabelText(/Prótese dentária retirada/);
    expect(screen.queryByLabelText(/Pertences devolvidos/)).not.toBeInTheDocument();

    await usuario.click(screen.getByLabelText(/Prótese dentária retirada/));

    // Sem este par, o registro diria o que foi tirado e nunca o que voltou.
    expect(await screen.findByLabelText(/Pertences devolvidos/)).toBeInTheDocument();
  });

  it('o preparo da enfermagem é salvo sem carimbar a parada', async () => {
    const usuario = userEvent.setup();

    vi.spyOn(api, 'prontuario').mockResolvedValue(prontuario(ficha()));
    const salvar = vi.spyOn(api, 'registrarCirurgia').mockResolvedValue(undefined);

    renderizar();

    await screen.findByLabelText(/Tricotomia realizada/);
    await usuario.click(screen.getByLabelText(/Tricotomia realizada/));
    await usuario.type(
      await screen.findByLabelText(/Local da tricotomia/),
      'Inguinal direita',
    );
    await usuario.click(screen.getByLabelText(/Pulseira de identificação/));
    await usuario.click(screen.getByRole('button', { name: 'Salvar parada' }));

    await waitFor(() => expect(salvar).toHaveBeenCalled());

    /*
      O preparo acontece na enfermaria; o check-in, na porta da sala. Se o
      preparo entrasse na primeira parada, a lista de verificação passaria a
      carimbar uma hora que não é a dela.
    */
    expect(salvar).toHaveBeenCalledWith(
      'a1',
      expect.objectContaining({
        preparoTricotomia: true,
        preparoTricotomiaLocal: 'Inguinal direita',
        preparoPulseiraIdentificacao: true,
        checkInIdentidadeConfirmada: false,
      }),
    );
  });

  it('mostra a hora de cada parada concluída, e o que ainda falta', async () => {
    vi.spyOn(api, 'prontuario').mockResolvedValue(
      prontuario(ficha({ checkInEm: '2026-07-26T12:10:00Z' })),
    );

    renderizar();

    // A hora é o ponto: quatro carimbos no mesmo minuto contam a história de
    // uma lista preenchida de uma vez no fim.
    expect(await screen.findByText(/Concluída às/)).toBeInTheDocument();
    expect(screen.getAllByText('Pendente')).toHaveLength(3);
  });

  it('com desfecho, o botão muda e a tela volta ao prontuário', async () => {
    const usuario = userEvent.setup();

    vi.spyOn(api, 'prontuario').mockResolvedValue(prontuario());
    const salvar = vi.spyOn(api, 'registrarCirurgia').mockResolvedValue(undefined);

    renderizar();

    await screen.findByLabelText(/Identidade do paciente confirmada/);
    await usuario.click(screen.getByRole('button', { name: /^Alta$/ }));

    expect(screen.getByRole('button', { name: 'Salvar e encerrar' })).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Salvar e encerrar' }));

    await waitFor(() => expect(salvar).toHaveBeenCalled());
    expect(salvar.mock.calls[0][1]).toMatchObject({ desfecho: 'Alta' });
    expect(await screen.findByText('prontuário')).toBeInTheDocument();
  });

  it('traz de volta o que a API já gravou, e não o rascunho de quem abriu antes', async () => {
    // A ficha passa por várias mãos. O rascunho de quem fez o check-in não pode
    // sobrescrever o time out que outra pessoa registrou.
    localStorage.setItem(
      'atendimento.rascunho.cirurgia-a1',
      JSON.stringify({ procedimentoProposto: 'Procedimento do rascunho antigo' }),
    );

    vi.spyOn(api, 'prontuario').mockResolvedValue(
      prontuario(ficha({ procedimentoProposto: 'Herniorrafia inguinal', lateralidade: 'Direito' })),
    );

    renderizar();

    expect(await screen.findByDisplayValue('Herniorrafia inguinal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Direito' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('mostra o alerta de alergia enquanto se preenche a lista', async () => {
    vi.spyOn(api, 'prontuario').mockResolvedValue(prontuario());

    renderizar();

    expect(await screen.findByText(/dipirona/)).toBeInTheDocument();
  });
});
