import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/cliente';
import type { ProducaoProfissional, Profissional } from '../api/tipos';
import { ProvedorSessao } from '../hooks/useSessao';
import { ProvedorI18n } from '../i18n';
import { Producao } from './Producao';

const ENFERMEIRA: Profissional = {
  id: 'p1',
  usuario: 'claudia.luz',
  nome: 'Cláudia Luz',
  email: null,
  funcao: 'Enfermeiro',
  conselhoTipo: 'Coren',
  registro: '52728',
  idioma: 'Pt',
  status: 'Ativa',
  ehAdministrador: false,
  motivoRecusa: null,
  criadoEm: '2026-01-01T12:00:00Z',
  filas: ['Triagem', 'Enfermagem'],
  precisaTrocarSenha: false,
};

function linha(sobre: Partial<ProducaoProfissional> = {}): ProducaoProfissional {
  return {
    profissionalId: 'p1',
    nome: 'Cláudia Luz',
    funcao: 'Enfermeiro',
    conselho: 'Coren',
    registro: '52728',
    atendimentos: 3,
    minutosTotais: 90,
    minutosMedianos: 12,
    porFila: [{ especialidade: 'Triagem', atendimentos: 3, minutosTotais: 90 }],
    ...sobre,
  };
}

function renderizar(profissional: Profissional = ENFERMEIRA) {
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
          <Producao />
        </MemoryRouter>
      </ProvedorSessao>
    </ProvedorI18n>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('atendimento.idioma', 'Pt');
  vi.spyOn(api, 'producao').mockResolvedValue([linha()]);
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('Produção', () => {
  it('mostra o tempo típico, e não a média', async () => {
    vi.spyOn(api, 'producao').mockResolvedValue([
      linha({ minutosTotais: 622, minutosMedianos: 12 }),
    ]);

    renderizar();

    // A média daria 207 minutos por causa de uma ficha esquecida aberta, e a
    // tabela mentiria sobre o dia inteiro.
    expect(await screen.findByText('Tempo típico')).toBeInTheDocument();
    expect(screen.getByText('12min')).toBeInTheDocument();
    expect(screen.queryByText(/Média/i)).not.toBeInTheDocument();
  });

  it('mostra horas quando o total passa de sessenta minutos', async () => {
    vi.spyOn(api, 'producao').mockResolvedValue([
      linha({
        minutosTotais: 90,
        minutosMedianos: 60,
        porFila: [{ especialidade: 'Triagem', atendimentos: 3, minutosTotais: 45 }],
      }),
    ]);

    renderizar();

    // "90min" obrigaria quem lê a fazer a conta de cabeça no meio do plantão.
    expect(await screen.findByText('1h30')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument();

    // Abaixo de uma hora continua em minutos: "0h45" seria pior de ler.
    expect(screen.getByText('45min')).toBeInTheDocument();
  });

  it('separa a produção por fila', async () => {
    vi.spyOn(api, 'producao').mockResolvedValue([
      linha({
        porFila: [
          { especialidade: 'Triagem', atendimentos: 2, minutosTotais: 20 },
          { especialidade: 'Enfermagem', atendimentos: 1, minutosTotais: 70 },
        ],
      }),
    ]);

    renderizar();

    // Sem isso não dá para saber que fila consome o plantão, que é o que
    // decide escala.
    expect(await screen.findByText(/Triagem/)).toBeInTheDocument();
    expect(screen.getByText(/Enfermagem/)).toBeInTheDocument();
  });

  it('traz o registro do conselho junto do nome', async () => {
    renderizar();

    // Produção vira relatório para financiador; o nome sozinho não identifica
    // ninguém fora do sistema.
    expect(await screen.findByText(/COREN 52728/)).toBeInTheDocument();
  });

  it('diz a quem pertence a tabela', async () => {
    renderizar();
    expect(await screen.findByText(/Seus atendimentos/i)).toBeInTheDocument();
  });

  it('para a coordenação, fala da equipe', async () => {
    renderizar({ ...ENFERMEIRA, ehAdministrador: true });
    expect(await screen.findByText(/pela equipe/i)).toBeInTheDocument();
  });

  it('"Hoje" pede a partir da meia-noite local, não da UTC', async () => {
    const buscar = vi.spyOn(api, 'producao').mockResolvedValue([linha()]);

    const usuario = userEvent.setup();
    renderizar();

    await screen.findByText('Cláudia Luz');
    await usuario.click(screen.getByRole('button', { name: 'Hoje' }));

    await waitFor(() => expect(buscar).toHaveBeenCalledTimes(2));

    const { de } = buscar.mock.calls[1][0];
    const meiaNoiteLocal = new Date();
    meiaNoiteLocal.setHours(0, 0, 0, 0);

    // Cortar em UTC faria o relatório da manhã no Panamá mostrar metade da
    // véspera.
    expect(de?.getTime()).toBe(meiaNoiteLocal.getTime());
  });

  it('avisa quando ninguém concluiu nada no período', async () => {
    vi.spyOn(api, 'producao').mockResolvedValue([]);

    renderizar();

    expect(await screen.findByText(/Nenhum atendimento concluído/i)).toBeInTheDocument();
  });
});
