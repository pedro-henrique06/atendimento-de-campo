import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/cliente';
import { ProvedorSessao } from '../hooks/useSessao';
import { ProvedorI18n } from '../i18n';
import { CriarConta } from './CriarConta';
import { Login } from './Login';

function renderizar(rota: string) {
  return render(
    <ProvedorI18n>
      <ProvedorSessao>
        <MemoryRouter initialEntries={[rota]}>
          <Routes>
            <Route path="/entrar" element={<Login tema="escuro" alternarTema={() => {}} />} />
            <Route
              path="/criar-conta"
              element={<CriarConta tema="escuro" alternarTema={() => {}} />}
            />
          </Routes>
        </MemoryRouter>
      </ProvedorSessao>
    </ProvedorI18n>,
  );
}

beforeEach(() => {
  vi.spyOn(api, 'usuarioDisponivel').mockResolvedValue({ usuario: '', disponivel: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Login', () => {
  it('pede usuário e senha, não nome e função', () => {
    // Identificar por nome completo impedia homônimos de ter conta e obrigava a
    // digitar o nome inteiro no celular a cada plantão.
    renderizar('/entrar');

    expect(screen.getByLabelText(/Usuário/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Senha/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Sua função/)).not.toBeInTheDocument();
  });

  it('leva para a criação de conta', () => {
    renderizar('/entrar');

    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute(
      'href',
      '/criar-conta',
    );
  });

  it('explica que a conta ainda não foi aprovada', async () => {
    // Tratar conta pendente como senha errada faria a pessoa tentar de novo
    // várias vezes sem entender o que está acontecendo.
    const { ErroLogin } = await import('../api/cliente');
    vi.spyOn(api, 'login').mockRejectedValue(new ErroLogin('ContaPendente', null));

    const usuario = userEvent.setup();
    renderizar('/entrar');

    await usuario.type(screen.getByLabelText(/Usuário/), 'claudia.luz');
    await usuario.type(screen.getByLabelText(/Senha/), 'plantao-2026');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi aprovada/i);
  });

  it('mostra o motivo quando o acesso foi recusado', async () => {
    const { ErroLogin } = await import('../api/cliente');
    vi.spyOn(api, 'login').mockRejectedValue(
      new ErroLogin('ContaRecusada', 'Registro do conselho não confere.'),
    );

    const usuario = userEvent.setup();
    renderizar('/entrar');

    await usuario.type(screen.getByLabelText(/Usuário/), 'alguem');
    await usuario.type(screen.getByLabelText(/Senha/), 'plantao-2026');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    const alerta = await screen.findByRole('alert');

    expect(alerta).toHaveTextContent(/recusado/i);
    expect(alerta).toHaveTextContent('Registro do conselho não confere.');
  });

  it('avisa de falta de conexão em vez de acusar a senha', async () => {
    const { ErroDeRede } = await import('../api/cliente');
    vi.spyOn(api, 'login').mockRejectedValue(new ErroDeRede());

    const usuario = userEvent.setup();
    renderizar('/entrar');

    await usuario.type(screen.getByLabelText(/Usuário/), 'alguem');
    await usuario.type(screen.getByLabelText(/Senha/), 'plantao-2026');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Sem conexão/i);
  });
});

describe('Criar conta', () => {
  it('sugere o usuário a partir do nome', async () => {
    const usuario = userEvent.setup();
    renderizar('/criar-conta');

    await usuario.type(screen.getByLabelText(/Nome completo/), 'Cláudia Cândido da Luz');

    // Acento removido e preposição descartada.
    await waitFor(() =>
      expect(screen.getByLabelText(/^Usuário/)).toHaveValue('claudia.luz'),
    );
  });

  it('para de sugerir depois que a pessoa edita o usuário', async () => {
    const pessoa = userEvent.setup();
    renderizar('/criar-conta');

    await pessoa.type(screen.getByLabelText(/Nome completo/), 'Maria Silva');
    await waitFor(() => expect(screen.getByLabelText(/^Usuário/)).toHaveValue('maria.silva'));

    const campoUsuario = screen.getByLabelText(/^Usuário/);
    await pessoa.clear(campoUsuario);
    await pessoa.type(campoUsuario, 'maria.enf');

    await pessoa.type(screen.getByLabelText(/Nome completo/), ' Souza');

    expect(campoUsuario).toHaveValue('maria.enf');
  });

  it('exige registro do conselho para função que tem conselho', async () => {
    const usuario = userEvent.setup();
    renderizar('/criar-conta');

    // Enfermeiro é o padrão do formulário e exige COREN.
    expect(screen.getByLabelText(/COREN/)).toBeRequired();

    await usuario.selectOptions(screen.getByLabelText(/Sua função/), 'Recepcao');

    expect(screen.queryByLabelText(/COREN/)).not.toBeInTheDocument();
  });

  it('bloqueia o envio quando as senhas não conferem', async () => {
    const usuario = userEvent.setup();
    renderizar('/criar-conta');

    await usuario.type(screen.getByLabelText(/^Senha/), 'plantao-2026');
    await usuario.type(screen.getByLabelText(/Confirmar senha/), 'outra-coisa');

    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled();
  });

  it('bloqueia o envio com senha curta', async () => {
    const usuario = userEvent.setup();
    renderizar('/criar-conta');

    await usuario.type(screen.getByLabelText(/^Senha/), 'curta');

    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled();
  });

  it('avisa quando o usuário já está em uso e bloqueia o envio', async () => {
    vi.spyOn(api, 'usuarioDisponivel').mockResolvedValue({
      usuario: 'maria.silva',
      disponivel: false,
    });

    const usuario = userEvent.setup();
    renderizar('/criar-conta');

    await usuario.type(screen.getByLabelText(/Nome completo/), 'Maria Silva');

    expect(await screen.findByText(/já está em uso/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled();
  });

  it('depois de registrar, avisa que falta aprovação e não entra no app', async () => {
    // A conta nasce pendente: prometer acesso imediato aqui seria mentira.
    vi.spyOn(api, 'registrar').mockResolvedValue({
      id: '1',
      usuario: 'claudia.luz',
      nome: 'Claudia Luz',
      email: null,
      funcao: 'Enfermeiro',
      conselhoTipo: 'Coren',
      registro: '52728',
      idioma: 'Pt',
      status: 'Pendente',
      ehAdministrador: false,
      motivoRecusa: null,
      criadoEm: new Date().toISOString(),
      filas: ['Triagem', 'Enfermagem'],
    });

    const usuario = userEvent.setup();
    renderizar('/criar-conta');

    await usuario.type(screen.getByLabelText(/Nome completo/), 'Claudia Luz');
    await usuario.type(screen.getByLabelText(/COREN/), '52728');
    await usuario.type(screen.getByLabelText(/^Senha/), 'plantao-2026');
    await usuario.type(screen.getByLabelText(/Confirmar senha/), 'plantao-2026');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled(),
    );

    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText(/precisa aprovar seu acesso/i)).toBeInTheDocument();
    expect(localStorage.getItem('atendimento.token')).toBeNull();
  });
});
