import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/cliente';
import { NovaConta } from '../componentes/NovaConta';
import { ProvedorSessao } from '../hooks/useSessao';
import { ProvedorI18n } from '../i18n';
import { Login } from './Login';
import { TrocarSenha } from './TrocarSenha';

function renderizar(rota: string) {
  return render(
    <ProvedorI18n>
      <ProvedorSessao>
        <MemoryRouter initialEntries={[rota]}>
          <Routes>
            <Route path="/entrar" element={<Login tema="escuro" alternarTema={() => {}} />} />
            <Route path="/nova-conta" element={<NovaConta aoCriar={() => {}} />} />
            <Route
              path="/trocar-senha"
              element={<TrocarSenha tema="escuro" alternarTema={() => {}} />}
            />
          </Routes>
        </MemoryRouter>
      </ProvedorSessao>
    </ProvedorI18n>,
  );
}

function profissional(sobre: Partial<Parameters<typeof api.criarConta>[0]> = {}) {
  return {
    id: '1',
    usuario: 'claudia.luz',
    nome: 'Claudia Luz',
    email: null,
    funcao: 'Enfermeiro' as const,
    conselhoTipo: 'Coren' as const,
    registro: '52728',
    idioma: 'Pt' as const,
    status: 'Ativa' as const,
    ehAdministrador: false,
    motivoRecusa: null,
    criadoEm: new Date().toISOString(),
    filas: ['Triagem' as const, 'Enfermagem' as const],
    precisaTrocarSenha: false,
    ...sobre,
  };
}

beforeEach(() => {
  localStorage.clear();
  // Sem fixar o idioma, o provedor cai no do navegador — que no jsdom é inglês,
  // e os rótulos deste arquivo estão em português.
  localStorage.setItem('atendimento.idioma', 'Pt');
  vi.spyOn(api, 'usuarioDisponivel').mockResolvedValue({ usuario: '', disponivel: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
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

  it('não oferece criar conta — quem cadastra é a coordenação', () => {
    renderizar('/entrar');

    // O link some, mas o aviso fica: sem ele, quem chega sem conta tentaria de
    // novo achando que errou a senha.
    expect(screen.queryByRole('link', { name: 'Criar conta' })).not.toBeInTheDocument();
    expect(screen.getByText(/Fale com a coordenação/i)).toBeInTheDocument();
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

describe('Cadastro pela coordenação', () => {
  it('sugere o usuário a partir do nome', async () => {
    const usuario = userEvent.setup();
    renderizar('/nova-conta');

    await usuario.type(screen.getByLabelText(/Nome completo/), 'Cláudia Cândido da Luz');

    // Acento removido e preposição descartada.
    await waitFor(() => expect(screen.getByLabelText(/^Usuário/)).toHaveValue('claudia.luz'));
  });

  it('para de sugerir depois que a pessoa edita o usuário', async () => {
    const pessoa = userEvent.setup();
    renderizar('/nova-conta');

    await pessoa.type(screen.getByLabelText(/Nome completo/), 'Maria Silva');
    await waitFor(() => expect(screen.getByLabelText(/^Usuário/)).toHaveValue('maria.silva'));

    const campoUsuario = screen.getByLabelText(/^Usuário/);
    await pessoa.clear(campoUsuario);
    await pessoa.type(campoUsuario, 'maria.enf');

    await pessoa.type(screen.getByLabelText(/Nome completo/), ' Souza');

    expect(campoUsuario).toHaveValue('maria.enf');
  });

  it('não pede senha: quem cadastra não escolhe a senha de outra pessoa', () => {
    renderizar('/nova-conta');

    expect(screen.queryByLabelText(/^Senha/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Confirmar senha/)).not.toBeInTheDocument();
  });

  it('mostra em que fila a profissão escolhida vai atender', async () => {
    const usuario = userEvent.setup();
    renderizar('/nova-conta');

    // A coordenação está decidindo onde a pessoa atende, não preenchendo um
    // rótulo. Sem isso na tela, a consequência da escolha fica invisível.
    await usuario.selectOptions(screen.getByLabelText(/Profissão/), 'Dentista');
    expect(screen.getByText(/Odontologia/)).toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText(/Profissão/), 'Pediatra');
    expect(screen.getByText(/Pediatria/)).toBeInTheDocument();
  });

  it('não oferece "médico" sem especialidade', () => {
    renderizar('/nova-conta');

    // Existe só para as contas anteriores. Oferecer recriaria o problema: uma
    // pessoa caindo em três filas.
    const opcoes = Array.from(
      screen.getByLabelText(/Profissão/).querySelectorAll('option'),
    ).map((o) => o.value);

    expect(opcoes).toContain('ClinicoGeral');
    expect(opcoes).not.toContain('Medico');
  });

  it('exige registro do conselho para profissão que tem conselho', async () => {
    const usuario = userEvent.setup();
    renderizar('/nova-conta');

    // Clínico geral é o padrão do formulário e exige CRM.
    expect(screen.getByLabelText(/CRM/)).toBeRequired();

    await usuario.selectOptions(screen.getByLabelText(/Profissão/), 'Recepcao');

    expect(screen.queryByLabelText(/CRM/)).not.toBeInTheDocument();
  });

  it('avisa quando o usuário já está em uso e bloqueia o envio', async () => {
    vi.spyOn(api, 'usuarioDisponivel').mockResolvedValue({
      usuario: 'maria.silva',
      disponivel: false,
    });

    const usuario = userEvent.setup();
    renderizar('/nova-conta');

    await usuario.type(screen.getByLabelText(/Nome completo/), 'Maria Silva');

    expect(await screen.findByText(/já está em uso/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeDisabled();
  });

  it('mostra a senha provisória uma vez, com o aviso de que não volta', async () => {
    vi.spyOn(api, 'criarConta').mockResolvedValue({
      profissional: profissional({ precisaTrocarSenha: true }),
      senhaProvisoria: 'KHTP-2R9M-BXQ4',
    });

    const usuario = userEvent.setup();
    renderizar('/nova-conta');

    await usuario.type(screen.getByLabelText(/Nome completo/), 'Claudia Luz');
    await usuario.type(screen.getByLabelText(/CRM/), '52728');
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar' }));

    // O servidor guarda só o hash: se a senha se perder aqui, o caminho é
    // sortear outra.
    expect(await screen.findByText('KHTP-2R9M-BXQ4')).toBeInTheDocument();
    expect(screen.getByText(/não aparece de novo/i)).toBeInTheDocument();
  });

  it('limpa o formulário depois de cadastrar, para a próxima pessoa da fila', async () => {
    vi.spyOn(api, 'criarConta').mockResolvedValue({
      profissional: profissional(),
      senhaProvisoria: 'KHTP-2R9M-BXQ4',
    });

    const usuario = userEvent.setup();
    renderizar('/nova-conta');

    await usuario.type(screen.getByLabelText(/Nome completo/), 'Claudia Luz');
    await usuario.type(screen.getByLabelText(/CRM/), '52728');
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await screen.findByText('KHTP-2R9M-BXQ4');

    // Cadastro em campo é feito em série. Sem limpar, o nome anterior fica no
    // campo e vira uma conta duplicada por descuido.
    expect(screen.getByLabelText(/Nome completo/)).toHaveValue('');
  });
});

describe('Troca da senha provisória', () => {
  it('explica por que a troca é obrigatória', () => {
    renderizar('/trocar-senha');

    expect(screen.getByText(/coordenação e ela a conhece/i)).toBeInTheDocument();
  });

  it('bloqueia o envio quando as senhas não conferem', async () => {
    const usuario = userEvent.setup();
    renderizar('/trocar-senha');

    await usuario.type(screen.getByLabelText(/Nova senha/), 'plantao-2026');
    await usuario.type(screen.getByLabelText(/Confirmar senha/), 'outra-coisa');

    expect(screen.getByRole('button', { name: 'Trocar senha' })).toBeDisabled();
  });

  it('bloqueia o envio com senha curta', async () => {
    const usuario = userEvent.setup();
    renderizar('/trocar-senha');

    await usuario.type(screen.getByLabelText(/Nova senha/), 'curta');

    expect(screen.getByRole('button', { name: 'Trocar senha' })).toBeDisabled();
  });

  it('guarda o token novo, senão a pessoa ficaria presa nesta tela', async () => {
    vi.spyOn(api, 'trocarSenha').mockResolvedValue({
      token: 'token-sem-a-marca-de-trocar',
      expiraEm: new Date(Date.now() + 3600_000).toISOString(),
      profissional: profissional({ precisaTrocarSenha: false }),
    });

    const usuario = userEvent.setup();
    renderizar('/trocar-senha');

    await usuario.type(screen.getByLabelText(/Senha atual/), 'KHTP-2R9M-BXQ4');
    await usuario.type(screen.getByLabelText(/Nova senha/), 'plantao-do-sabado');
    await usuario.type(screen.getByLabelText(/Confirmar senha/), 'plantao-do-sabado');
    await usuario.click(screen.getByRole('button', { name: 'Trocar senha' }));

    // O token antigo diz "precisa trocar" e continuaria barrado pela API.
    await waitFor(() =>
      expect(localStorage.getItem('atendimento.token')).toBe('token-sem-a-marca-de-trocar'),
    );
  });
});
