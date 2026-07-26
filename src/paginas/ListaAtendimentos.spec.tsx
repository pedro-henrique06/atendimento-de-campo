import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ErroApi } from '../api/cliente';
import type { AtendimentoResumo, Profissional } from '../api/tipos';
import { ProvedorSessao } from '../hooks/useSessao';
import { ProvedorI18n } from '../i18n';
import { ListaAtendimentos } from './ListaAtendimentos';

const DENTISTA: Profissional = {
  id: 'p1',
  usuario: 'ana.dentista',
  nome: 'Ana Dentista',
  email: null,
  funcao: 'Dentista',
  conselhoTipo: 'Cro',
  registro: '1234',
  idioma: 'Pt',
  status: 'Ativa',
  ehAdministrador: false,
  motivoRecusa: null,
  criadoEm: '2026-01-01T12:00:00Z',
  filas: ['Odontologia'],
};

function atendimento(sobre: Partial<AtendimentoResumo> = {}): AtendimentoResumo {
  return {
    id: 'a1',
    codigo: 'ACA-4K7Z',
    pacienteNome: 'Yesenia Navarro',
    status: 'EmAndamento',
    classificacaoRisco: 'Verde',
    resumo: 'Dor de dente',
    etapas: [
      {
        id: 'e1',
        especialidade: 'Odontologia',
        status: 'Aguardando',
        profissional: null,
        iniciadaEm: null,
        concluidaEm: null,
      },
    ],
    criadoEm: '2026-07-26T12:00:00Z',
    finalizadoEm: null,
    ...sobre,
  };
}

/** Coloca a sessão no ar antes de renderizar, como o login faria. */
function renderizar(profissional: Profissional = DENTISTA) {
  localStorage.setItem('atendimento.token', 'token-de-teste');
  localStorage.setItem('atendimento.profissional', JSON.stringify(profissional));
  localStorage.setItem(
    'atendimento.base',
    JSON.stringify({ id: 'b1', nome: 'Acampamento Panamá', prefixoCodigo: 'ACA', ativa: true }),
  );

  return render(
    <ProvedorI18n>
      <ProvedorSessao>
        <MemoryRouter>
          <ListaAtendimentos />
        </MemoryRouter>
      </ProvedorSessao>
    </ProvedorI18n>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('atendimento.idioma', 'Pt');
  vi.spyOn(api, 'atendimentos').mockResolvedValue([atendimento()]);
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('Fila de atendimentos', () => {
  it('abre na fila da função de quem entrou', async () => {
    // Antes abria sempre em "Triagem": o dentista via a fila da enfermagem e
    // tinha que descobrir sozinho onde ficava a dele.
    renderizar();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Odontologia' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );

    await waitFor(() =>
      expect(api.atendimentos).toHaveBeenCalledWith(
        expect.objectContaining({ fila: 'Odontologia', ocultarAssumidos: true }),
      ),
    );
  });

  it('não esconde as outras filas — em campo as funções se cobrem', async () => {
    renderizar();

    expect(await screen.findByRole('button', { name: 'Todas as filas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Triagem' })).toBeInTheDocument();
  });

  it('mostra quem está com o paciente e não oferece assumir', async () => {
    vi.spyOn(api, 'atendimentos').mockResolvedValue([
      atendimento({
        etapas: [
          {
            id: 'e1',
            especialidade: 'Odontologia',
            status: 'EmAndamento',
            profissional: 'Carlos Dentista',
            iniciadaEm: '2026-07-26T12:30:00Z',
            concluidaEm: null,
          },
        ],
      }),
    ]);

    renderizar();

    expect(await screen.findByText('Carlos Dentista')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assumir' })).not.toBeInTheDocument();
  });

  it('assume o paciente e recarrega a fila', async () => {
    const assumir = vi.spyOn(api, 'assumirEtapa').mockResolvedValue(atendimento());

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Assumir' }));

    expect(assumir).toHaveBeenCalledWith('a1', 'Odontologia');
  });

  it('assumir não navega para o prontuário', async () => {
    // O cartão inteiro é um link; sem parar o evento, o clique faria as duas
    // coisas e a pessoa sairia da fila sem querer.
    vi.spyOn(api, 'assumirEtapa').mockResolvedValue(atendimento());

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Assumir' }));

    expect(await screen.findByRole('button', { name: 'Odontologia' })).toBeInTheDocument();
  });

  it('mostra a recusa do servidor com o nome de quem já pegou', async () => {
    vi.spyOn(api, 'assumirEtapa').mockRejectedValue(
      new ErroApi(400, ['Este atendimento ja esta com Carlos Dentista.']),
    );

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Assumir' }));

    // Sem o nome, a equipe fica sem saber a quem perguntar.
    expect(await screen.findByText(/Carlos Dentista/)).toBeInTheDocument();
  });

  it('no que já é meu, o botão devolve para a fila', async () => {
    vi.spyOn(api, 'atendimentos').mockResolvedValue([
      atendimento({
        etapas: [
          {
            id: 'e1',
            especialidade: 'Odontologia',
            status: 'EmAndamento',
            profissional: 'Ana Dentista',
            iniciadaEm: '2026-07-26T12:30:00Z',
            concluidaEm: null,
          },
        ],
      }),
    ]);
    const liberar = vi.spyOn(api, 'liberarEtapa').mockResolvedValue(atendimento());

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Devolver à fila' }));

    expect(liberar).toHaveBeenCalledWith('a1', 'Odontologia');
  });

  it('em "Todas" não oferece assumir, porque a lista mistura filas', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Todas as filas' }));

    await waitFor(() =>
      expect(api.atendimentos).toHaveBeenCalledWith(
        expect.objectContaining({ fila: null, ocultarAssumidos: false }),
      ),
    );

    expect(screen.queryByRole('button', { name: 'Assumir' })).not.toBeInTheDocument();
  });

  it('em "Todas" ainda mostra quem está com o paciente', async () => {
    // É ali que a coordenação olha a operação inteira: esconder o dono deixaria
    // parecer que ninguém pegou.
    vi.spyOn(api, 'atendimentos').mockResolvedValue([
      atendimento({
        etapas: [
          {
            id: 'e1',
            especialidade: 'Odontologia',
            status: 'EmAndamento',
            profissional: 'Carlos Dentista',
            iniciadaEm: '2026-07-26T12:30:00Z',
            concluidaEm: null,
          },
        ],
      }),
    ]);

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Todas as filas' }));

    expect(await screen.findByText('Carlos Dentista')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assumir' })).not.toBeInTheDocument();
  });

  it('"Meus" lista só o que esta pessoa assumiu', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Meus' }));

    await waitFor(() =>
      expect(api.atendimentos).toHaveBeenCalledWith(expect.objectContaining({ meus: true })),
    );
  });
});

describe('Fila sem função definida', () => {
  it('cai em "Todas" quando a função não mapeia fila nenhuma', async () => {
    // Conta antiga, gravada antes das filas existirem: não pode abrir vazia.
    renderizar({ ...DENTISTA, filas: [] });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Todas as filas' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
  });
});
