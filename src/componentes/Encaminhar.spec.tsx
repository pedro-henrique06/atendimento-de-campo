import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ErroApi } from '../api/cliente';
import type { Prontuario } from '../api/tipos';
import { ProvedorI18n } from '../i18n';
import { Encaminhar } from './Encaminhar';

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
      dataNascimento: null,
      idade: 34,
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
    queixaPrincipal: 'Dor de dente',
    localizacao: null,
    criadoPor: 'Ana Enfermeira',
    criadoEm: '2026-07-26T12:00:00Z',
    finalizadoPor: null,
    finalizadoEm: null,
    triagem: null,
    consultas: [],
    odontologia: null,
    enfermagem: null,
    etapas: [
      {
        id: 'e1',
        especialidade: 'Triagem',
        status: 'Concluida',
        profissional: 'Ana Enfermeira',
        iniciadaEm: '2026-07-26T12:05:00Z',
        concluidaEm: '2026-07-26T12:10:00Z',
      },
      {
        id: 'e2',
        especialidade: 'ClinicaGeral',
        status: 'Aguardando',
        profissional: null,
        iniciadaEm: null,
        concluidaEm: null,
      },
    ],
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
  localStorage.clear();
});

describe('Encaminhar', () => {
  it('mostra a fila aberta e oferece encaminhar', () => {
    renderizar();

    expect(screen.getByText('Clínica Geral')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Encaminhar para outra fila' }),
    ).toBeInTheDocument();
  });

  it('não oferece a própria fila como destino', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Encaminhar para outra fila' }));

    const opcoes = Array.from(
      screen.getByLabelText(/Encaminhar para/).querySelectorAll('option'),
    ).map((o) => o.textContent);

    // Encaminhar para a fila onde já se está não é encaminhar.
    expect(opcoes).not.toContain('Clínica Geral');
    expect(opcoes).toContain('Odontologia');
  });

  it('exige o motivo antes de deixar enviar', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Encaminhar para outra fila' }));
    await usuario.selectOptions(screen.getByLabelText(/Encaminhar para/), 'Odontologia');

    // Sem motivo, o paciente circula entre filas e ninguém entende o caminho.
    const enviar = screen.getAllByRole('button', { name: 'Encaminhar para outra fila' })[0];
    expect(enviar).toBeDisabled();
  });

  it('encaminha e devolve o prontuário atualizado', async () => {
    const atualizado = prontuario({ id: 'a1' });
    const encaminhar = vi.spyOn(api, 'encaminhar').mockResolvedValue(atualizado);
    const aoEncaminhar = vi.fn();

    const usuario = userEvent.setup();
    renderizar(prontuario(), aoEncaminhar);

    await usuario.click(screen.getByRole('button', { name: 'Encaminhar para outra fila' }));
    await usuario.selectOptions(screen.getByLabelText(/Encaminhar para/), 'Odontologia');
    await usuario.type(screen.getByLabelText(/Motivo/), 'Queixa é dor de dente.');
    await usuario.click(screen.getAllByRole('button', { name: 'Encaminhar para outra fila' })[0]);

    expect(encaminhar).toHaveBeenCalledWith('a1', 'ClinicaGeral', {
      destino: 'Odontologia',
      motivo: 'Queixa é dor de dente.',
    });
    expect(aoEncaminhar).toHaveBeenCalledWith(atualizado);
  });

  it('mostra a recusa do servidor', async () => {
    vi.spyOn(api, 'encaminhar').mockRejectedValue(
      new ErroApi(400, ['Esta etapa ja foi concluida.']),
    );

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: 'Encaminhar para outra fila' }));
    await usuario.selectOptions(screen.getByLabelText(/Encaminhar para/), 'Odontologia');
    await usuario.type(screen.getByLabelText(/Motivo/), 'Tentativa.');
    await usuario.click(screen.getAllByRole('button', { name: 'Encaminhar para outra fila' })[0]);

    expect(await screen.findByText(/ja foi concluida/)).toBeInTheDocument();
  });

  it('some quando não há fila aberta', () => {
    // Sem etapa pendente não há de onde encaminhar.
    const { container } = renderizar(
      prontuario({
        etapas: [
          {
            id: 'e1',
            especialidade: 'Triagem',
            status: 'Concluida',
            profissional: 'Ana Enfermeira',
            iniciadaEm: null,
            concluidaEm: '2026-07-26T12:10:00Z',
          },
        ],
      }),
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('some em atendimento finalizado', () => {
    const { container } = renderizar(
      prontuario({ finalizadoEm: '2026-07-26T14:00:00Z', status: 'Finalizado' }),
    );

    expect(container).toBeEmptyDOMElement();
  });
});
