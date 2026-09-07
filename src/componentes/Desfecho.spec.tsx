import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ErroApi } from '../api/cliente';
import type { EtapaResumo, Prontuario } from '../api/tipos';
import { ProvedorI18n } from '../i18n';
import { Encaminhar } from './Encaminhar';
import { Cronometro, formatarDuracao, minutosDesde } from './Cronometro';

function etapa(sobre: Partial<EtapaResumo> = {}): EtapaResumo {
  return {
    id: 'e2',
    especialidade: 'ClinicaGeral',
    status: 'EmAndamento',
    profissional: 'Carlos Clínico',
    iniciadaEm: '2026-07-26T12:20:00Z',
    concluidaEm: null,
    assumidaEm: null,
    encaminhadaPor: null,
    encaminhadaDe: null,
    ...sobre,
  };
}

function prontuario(sobre: Partial<Prontuario> = {}): Prontuario {
  return {
    id: 'a1',
    codigo: 'ACA-4K7Z',
    base: { id: 'b1', nome: 'Acampamento Panamá', prefixoCodigo: 'ACA', ativa: true },
    paciente: {
      id: 'p1',
      codigo: '4K7Z-2YAP',
      nome: 'Yesenia Navarro',
      tipoDocumento: 'SemDocumento',
      numeroDocumento: null,
      cartaoSus: null,
      comunidadeId: null,
      comunidade: null,
      nomeDaMae: null,
      endereco: null,
      dataNascimento: null,
      idade: 34,
      ehMenor: false,
      sexo: 'Feminino',
      statusAlergia: 'NaoPerguntado',
      alergias: null,
      alerta: { exibir: false, texto: null },
      condicoesCronicas: [],
      vulnerabilidades: [],
      consentimentoRegistro: true,
    },
    status: 'EmAndamento',
    classificacaoRisco: 'Verde',
    queixaPrincipal: 'Dor de cabeça',
    localizacao: null,
    criadoPor: 'Ana Enfermeira',
    criadoEm: '2026-07-26T12:00:00Z',
    finalizadoPor: null,
    finalizadoEm: null,
    desfecho: null,
    desfechoDetalhe: null,
    triagem: null,
    consultas: [],
    odontologia: null,
    enfermagem: null,
    etapas: [etapa()],
    tempoNasFilas: [],
    historico: [],
    ...sobre,
  } as Prontuario;
}

function renderizar(dados = prontuario(), aoEncaminhar = vi.fn()) {
  return render(
    <ProvedorI18n>
      <Encaminhar prontuario={dados} aoEncaminhar={aoEncaminhar} />
    </ProvedorI18n>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('atendimento.idioma', 'Pt');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

describe('Cronômetro', () => {
  it('formata como a equipe fala', () => {
    expect(formatarDuracao(8)).toBe('8 min');
    expect(formatarDuracao(59)).toBe('59 min');
    expect(formatarDuracao(60)).toBe('1h');
    expect(formatarDuracao(90)).toBe('1h30');

    // Sem o zero à esquerda, "1h5" se lê como uma hora e cinquenta.
    expect(formatarDuracao(65)).toBe('1h05');
  });

  it('relógio atrasado não produz tempo negativo', () => {
    const futuro = new Date(Date.now() + 5 * 60_000).toISOString();

    // O aparelho em campo atrasa em relação ao servidor, e "-5 min" na ficha
    // assusta sem informar nada.
    expect(minutosDesde(futuro)).toBe(0);
  });

  it('conta a partir de quando o profissional assumiu', () => {
    const vinteMinutos = new Date(Date.now() - 20 * 60_000).toISOString();

    render(
      <ProvedorI18n>
        <Cronometro assumidaEm={vinteMinutos} />
      </ProvedorI18n>,
    );

    expect(screen.getByText('20 min')).toBeInTheDocument();
  });

  it('sem ninguém atendendo, não mostra nada', () => {
    const { container } = render(
      <ProvedorI18n>
        <Cronometro assumidaEm={null} />
      </ProvedorI18n>,
    );

    // A espera na fila não é tempo de atendimento, e mostrar "0 min" ali diria
    // que alguém está com o paciente quando ninguém está.
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Desfecho do atendimento', () => {
  it('oferece alta e encaminhamento, e o cronômetro do que está em curso', () => {
    const dezMinutos = new Date(Date.now() - 10 * 60_000).toISOString();

    renderizar(prontuario({ etapas: [etapa({ assumidaEm: dezMinutos })] }));

    expect(screen.getByRole('button', { name: 'Encerrar atendimento' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Encaminhar/ })).toBeInTheDocument();
    expect(screen.getByText('10 min')).toBeInTheDocument();
  });

  it('só oferece devolver quando o paciente veio de outra fila', () => {
    renderizar();

    // Sem origem não há para onde devolver: a triagem é a porta de entrada.
    expect(screen.queryByRole('button', { name: /Devolver a quem/ })).not.toBeInTheDocument();
  });

  it('mostra quem encaminhou e devolve para essa fila', async () => {
    const aoEncaminhar = vi.fn();
    const devolver = vi.spyOn(api, 'devolver').mockResolvedValue(prontuario());

    const usuario = userEvent.setup();

    renderizar(
      prontuario({
        etapas: [
          etapa({
            especialidade: 'Pediatria',
            encaminhadaPor: 'Carlos Clínico',
            encaminhadaDe: 'ClinicaGeral',
          }),
        ],
      }),
      aoEncaminhar,
    );

    expect(screen.getByText('Carlos Clínico')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Devolver a quem/ }));
    await usuario.type(screen.getByLabelText(/Motivo da devolução/), 'Adulto, não é pediatria.');
    await usuario.click(screen.getByRole('button', { name: /^Devolver a quem/ }));

    // O destino não vai no pedido: quem devolve não precisa lembrar de onde o
    // paciente veio.
    expect(devolver).toHaveBeenCalledWith('a1', 'Pediatria', 'Adulto, não é pediatria.');
    expect(aoEncaminhar).toHaveBeenCalled();
  });

  it('não devolve sem motivo', async () => {
    const usuario = userEvent.setup();

    renderizar(
      prontuario({
        etapas: [
          etapa({
            especialidade: 'Pediatria',
            encaminhadaPor: 'Carlos Clínico',
            encaminhadaDe: 'ClinicaGeral',
          }),
        ],
      }),
    );

    await usuario.click(screen.getByRole('button', { name: /Devolver a quem/ }));

    // Quem encaminhou precisa saber por que o paciente voltou.
    expect(screen.getByRole('button', { name: /^Devolver a quem/ })).toBeDisabled();
  });

  it('não devolve para a triagem quem já foi triado', () => {
    renderizar(
      prontuario({
        etapas: [
          {
            id: 'e1',
            especialidade: 'Triagem',
            status: 'Concluida',
            profissional: 'Ana Enfermeira',
            iniciadaEm: '2026-07-26T12:05:00Z',
            concluidaEm: '2026-07-26T12:10:00Z',
            assumidaEm: null,
            encaminhadaPor: null,
            encaminhadaDe: null,
          },
          etapa({ encaminhadaPor: 'Ana Enfermeira', encaminhadaDe: 'Triagem' }),
        ],
      }),
    );

    // Reabrir a triagem joga o paciente para o começo da fila e faz o risco ser
    // classificado de novo. A API recusa, e botão que só serve para receber
    // erro é pior que botão nenhum.
    expect(screen.queryByRole('button', { name: /Devolver a quem/ })).not.toBeInTheDocument();
  });

  it('a triagem sai da lista de destinos de quem já foi triado', async () => {
    const usuario = userEvent.setup();

    renderizar(
      prontuario({
        etapas: [
          {
            id: 'e1',
            especialidade: 'Triagem',
            status: 'Concluida',
            profissional: 'Ana Enfermeira',
            iniciadaEm: '2026-07-26T12:05:00Z',
            concluidaEm: '2026-07-26T12:10:00Z',
            assumidaEm: null,
            encaminhadaPor: null,
            encaminhadaDe: null,
          },
          etapa(),
        ],
      }),
    );

    await usuario.click(screen.getByRole('button', { name: /Encaminhar/ }));

    // Bloquear só a devolução deixaria o mesmo efeito a um clique de distância.
    expect(screen.queryByRole('option', { name: 'Triagem' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pediatria' })).toBeInTheDocument();
  });

  it('quem nunca foi triado ainda pode ser mandado para a triagem', async () => {
    const usuario = userEvent.setup();

    renderizar(
      prontuario({
        // A clínica geral primeiro: é ela a fila aberta em que o profissional
        // está: a triagem, nunca feita, é o destino possível.
        etapas: [
          etapa(),
          etapa({ id: 'e1', especialidade: 'Triagem', status: 'Aguardando', profissional: null }),
        ],
      }),
    );

    await usuario.click(screen.getByRole('button', { name: /Encaminhar/ }));

    // Acontece quando o médico atende direto quem chega passando mal: mandar
    // para a triagem depois não é voltar, é ir pela primeira vez.
    expect(screen.getByRole('option', { name: 'Triagem' })).toBeInTheDocument();
  });

  it('avisa que o encerramento vale para o atendimento inteiro', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Encerrar atendimento' }));

    // Antes o desfecho fechava só a etapa; quem clica precisa saber que agora
    // fecha tudo.
    expect(screen.getByText(/vale para o atendimento inteiro/i)).toBeInTheDocument();
  });

  it('lista as filas pendentes antes de cancelá-las', async () => {
    const usuario = userEvent.setup();

    renderizar(
      prontuario({
        etapas: [
          etapa(),
          etapa({ id: 'e3', especialidade: 'Odontologia', status: 'Aguardando', profissional: null }),
        ],
      }),
    );

    await usuario.click(screen.getByRole('button', { name: 'Encerrar atendimento' }));

    // Sumir com a fila da odontologia sem avisar é o tipo de coisa que só se
    // descobre quando o paciente volta procurando o dentista.
    expect(screen.getByText(/ainda está nestas filas/i)).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('Odontologia');
  });

  it('confirmada, a alta cancela as pendentes', async () => {
    const encerrar = vi.spyOn(api, 'encerrar').mockResolvedValue(prontuario());
    const usuario = userEvent.setup();

    renderizar(
      prontuario({
        etapas: [
          etapa(),
          etapa({ id: 'e3', especialidade: 'Odontologia', status: 'Aguardando', profissional: null }),
        ],
      }),
    );

    await usuario.click(screen.getByRole('button', { name: 'Encerrar atendimento' }));
    await usuario.click(screen.getByRole('button', { name: 'Dar alta e encerrar' }));

    expect(encerrar).toHaveBeenCalledWith('a1', 'ClinicaGeral', {
      desfecho: 'Alta',
      detalhe: undefined,
      cancelarPendentes: true,
    });
  });

  it('sem pendência, a alta não pede confirmação de cancelamento', async () => {
    const encerrar = vi.spyOn(api, 'encerrar').mockResolvedValue(prontuario());
    const usuario = userEvent.setup();

    renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Encerrar atendimento' }));

    expect(screen.queryByText(/ainda está nestas filas/i)).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Dar alta e encerrar' }));

    expect(encerrar).toHaveBeenCalledWith('a1', 'ClinicaGeral', {
      desfecho: 'Alta',
      detalhe: undefined,
      cancelarPendentes: false,
    });
  });

  it('mostra a recusa do servidor em vez de engolir', async () => {
    vi.spyOn(api, 'encerrar').mockRejectedValue(
      new ErroApi(400, ['Ha filas pendentes: Odontologia.']),
    );

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Encerrar atendimento' }));
    await usuario.click(screen.getByRole('button', { name: 'Dar alta e encerrar' }));

    expect(await screen.findByText(/Ha filas pendentes/)).toBeInTheDocument();
  });

  it('oferece os quatro desfechos, com a alta escolhida de saída', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Encerrar atendimento' }));

    // Alta é o caso comum: obrigar a escolher transformaria o clique mais
    // frequente do plantão em dois.
    expect(screen.getByRole('button', { name: 'Alta' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Transferência hospitalar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Óbito' })).toBeInTheDocument();
  });

  it('registra o óbito e encerra', async () => {
    const encerrar = vi.spyOn(api, 'encerrar').mockResolvedValue(prontuario());
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Encerrar atendimento' }));
    await usuario.click(screen.getByRole('button', { name: 'Óbito' }));
    await usuario.click(screen.getByRole('button', { name: 'Confirmar encerramento' }));

    expect(encerrar).toHaveBeenCalledWith('a1', 'ClinicaGeral', {
      desfecho: 'Obito',
      detalhe: undefined,
      cancelarPendentes: false,
    });
  });

  it('o óbito não pede destino nem motivo', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Encerrar atendimento' }));
    await usuario.click(screen.getByRole('button', { name: 'Óbito' }));

    expect(screen.queryByLabelText(/Para onde/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Motivo do encerramento/)).not.toBeInTheDocument();
  });

  it('a transferência não sai sem destino', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Encerrar atendimento' }));
    await usuario.click(screen.getByRole('button', { name: 'Transferência hospitalar' }));

    // Sem o destino, ninguém consegue ir atrás do paciente depois — que é a
    // única razão de registrar a transferência.
    expect(screen.getByRole('button', { name: 'Confirmar encerramento' })).toBeDisabled();
  });

  it('a transferência leva o destino', async () => {
    const encerrar = vi.spyOn(api, 'encerrar').mockResolvedValue(prontuario());
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Encerrar atendimento' }));
    await usuario.click(screen.getByRole('button', { name: 'Transferência hospitalar' }));
    await usuario.type(screen.getByLabelText(/Para onde/), 'Hospital Regional');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar encerramento' }));

    expect(encerrar).toHaveBeenCalledWith('a1', 'ClinicaGeral', {
      desfecho: 'TransferenciaHospitalar',
      detalhe: 'Hospital Regional',
      cancelarPendentes: false,
    });
  });

  it('"outro" pede a descrição', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Encerrar atendimento' }));
    await usuario.click(screen.getByRole('button', { name: 'Outro' }));

    expect(screen.getByLabelText(/Motivo do encerramento/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar encerramento' })).toBeDisabled();
  });

  it('some quando o atendimento já foi finalizado', () => {
    const { container } = renderizar(
      prontuario({ finalizadoEm: '2026-07-26T13:00:00Z', finalizadoPor: 'Carlos Clínico' }),
    );

    // Não há desfecho a dar num atendimento encerrado.
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Cronômetro na fila', () => {
  it('o número avança sozinho, sem recarregar a tela', async () => {
    vi.useFakeTimers();

    const inicio = new Date(Date.now() - 5 * 60_000).toISOString();

    render(
      <ProvedorI18n>
        <Cronometro assumidaEm={inicio} />
      </ProvedorI18n>,
    );

    expect(screen.getByText('5 min')).toBeInTheDocument();

    // Sem isto o número congelaria no valor do carregamento e passaria a mentir
    // quanto mais tempo a tela ficasse aberta — que é o caso que interessa.
    await act(() => vi.advanceTimersByTimeAsync(60_000));

    expect(screen.getByText('6 min')).toBeInTheDocument();
  });
});

describe('Aviso de atendimento esquecido', () => {
  it('passa a destacar depois de uma hora', () => {
    const duasHoras = new Date(Date.now() - 120 * 60_000).toISOString();

    const { container } = render(
      <ProvedorI18n>
        <Cronometro assumidaEm={duasHoras} />
      </ProvedorI18n>,
    );

    const cronometro = within(container).getByText('2h');

    // Duas horas com o mesmo paciente é quase sempre ficha esquecida aberta, e
    // é isso que deforma o tempo medido de todo mundo.
    expect(cronometro.className).toContain('text-vermelho');
  });
});
