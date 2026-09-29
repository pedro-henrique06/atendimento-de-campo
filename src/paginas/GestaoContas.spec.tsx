import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/cliente';
import type { Profissional } from '../api/tipos';
import { ProvedorSessao } from '../hooks/useSessao';
import { ProvedorI18n } from '../i18n';
import { GestaoContas } from './GestaoContas';

const COORDENACAO: Profissional = {
  id: 'p0',
  usuario: 'coordenacao',
  nome: 'Marina Salgado',
  email: null,
  funcao: 'Coordenacao',
  conselhoTipo: 'Nenhum',
  registro: null,
  idioma: 'Pt',
  status: 'Ativa',
  ehAdministrador: true,
  motivoRecusa: null,
  criadoEm: '2026-01-01T12:00:00Z',
  filas: ['Triagem'],
  precisaTrocarSenha: false,
};

function conta(sobre: Partial<Profissional> = {}): Profissional {
  return { ...COORDENACAO, id: 'p1', usuario: 'cluz', nome: 'Claudia Luz', ehAdministrador: false, ...sobre };
}

function renderizar() {
  localStorage.setItem('atendimento.token', 'token-de-teste');
  localStorage.setItem('atendimento.profissional', JSON.stringify(COORDENACAO));

  return render(
    <ProvedorI18n>
      <ProvedorSessao>
        <MemoryRouter>
          <GestaoContas />
        </MemoryRouter>
      </ProvedorSessao>
    </ProvedorI18n>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('atendimento.idioma', 'Pt');
  vi.spyOn(api, 'profissionais').mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('Gestão de contas', () => {
  /*
    A senha provisória existe uma vez só: o servidor guarda o hash, e não há
    tela onde consultá-la depois. Quem cadastra precisa vê-la na tela em que
    cadastrou — se ela some junto com o formulário, a conta nasce inacessível e
    a única saída é sortear outra senha.
  */
  it('mantém a senha provisória na tela depois de cadastrar', async () => {
    vi.spyOn(api, 'criarConta').mockResolvedValue({
      profissional: conta({ precisaTrocarSenha: true }),
      senhaProvisoria: 'KHTP-2R9M-BXQ4',
    });

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Cadastrar profissional' }));
    await usuario.type(screen.getByLabelText(/Nome completo/), 'Claudia Luz');
    await usuario.type(screen.getByLabelText(/CRM/), '52728');
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(await screen.findByText('KHTP-2R9M-BXQ4')).toBeInTheDocument();
    expect(screen.getByText(/não aparece de novo/i)).toBeInTheDocument();
  });

  /*
    Cadastro em campo é feito em série, uma pessoa atrás da outra. O formulário
    limpa e continua aberto para a próxima.
  */
  it('segue com o formulário aberto e limpo para a próxima pessoa', async () => {
    vi.spyOn(api, 'criarConta').mockResolvedValue({
      profissional: conta(),
      senhaProvisoria: 'KHTP-2R9M-BXQ4',
    });

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Cadastrar profissional' }));
    await usuario.type(screen.getByLabelText(/Nome completo/), 'Claudia Luz');
    await usuario.type(screen.getByLabelText(/CRM/), '52728');
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await screen.findByText('KHTP-2R9M-BXQ4');
    expect(screen.getByLabelText(/Nome completo/)).toHaveValue('');
  });

  /** A lista recarrega, senão a conta recém-criada só apareceria ao recarregar a página. */
  it('recarrega a lista depois de cadastrar', async () => {
    vi.spyOn(api, 'criarConta').mockResolvedValue({
      profissional: conta(),
      senhaProvisoria: 'KHTP-2R9M-BXQ4',
    });

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Cadastrar profissional' }));
    await usuario.type(screen.getByLabelText(/Nome completo/), 'Claudia Luz');
    await usuario.type(screen.getByLabelText(/CRM/), '52728');

    const antes = vi.mocked(api.profissionais).mock.calls.length;
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() =>
      expect(vi.mocked(api.profissionais).mock.calls.length).toBeGreaterThan(antes),
    );
  });
});
