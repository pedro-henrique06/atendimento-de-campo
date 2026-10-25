import { useEffect, useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/cliente';
import type { Base, Profissional } from '../api/tipos';
import { Cabecalho } from '../componentes/Cabecalho';
import { ProvedorSessao, useSessao } from '../hooks/useSessao';
import { ProvedorI18n } from '../i18n';
import { SelecaoBase } from './SelecaoBase';

const ENFERMEIRA: Profissional = {
  id: 'p1',
  usuario: 'elza.enfermeira',
  nome: 'Elza Enfermeira',
  email: null,
  funcao: 'Enfermeiro',
  conselhoTipo: 'Coren',
  registro: '60602',
  idioma: 'Pt',
  status: 'Ativa',
  ehAdministrador: false,
  motivoRecusa: null,
  criadoEm: '2026-01-10T12:00:00Z',
  filas: ['Triagem', 'Enfermagem'],
  precisaTrocarSenha: false,
};

function base(sobre: Partial<Base> = {}): Base {
  return {
    id: 'b1',
    nome: 'Acampamento Panamá',
    prefixoCodigo: 'ACA',
    ativa: true,
    tipoMissao: null,
    ...sobre,
  };
}

/**
 * A mesma guarda do `App`: sem base, resolve uma sozinha antes de renderizar.
 *
 * Copiada aqui, e não importada, porque `ComBase` é interna ao `App` e montar o
 * `App` inteiro traria o `BrowserRouter` junto — o que impediria o teste de
 * começar numa rota escolhida.
 */
function ComBase() {
  const { base: atual, definirBase } = useSessao();
  const [semBase, setSemBase] = useState(false);

  useEffect(() => {
    if (atual) return;

    let cancelado = false;

    api
      .bases()
      .then((lista) => {
        if (cancelado) return;
        if (lista.length > 0) definirBase(lista[0]);
        else setSemBase(true);
      })
      .catch(() => {
        if (!cancelado) setSemBase(true);
      });

    return () => {
      cancelado = true;
    };
  }, [atual, definirBase]);

  if (!atual) {
    return semBase ? <Navigate to="/bases" replace /> : <p>carregando</p>;
  }

  return (
    <>
      <Cabecalho tema="claro" alternarTema={() => {}} />
      <Outlet />
    </>
  );
}

function renderizar(rota = '/atendimentos') {
  localStorage.setItem('atendimento.token', 'token-de-teste');
  localStorage.setItem('atendimento.profissional', JSON.stringify(ENFERMEIRA));

  return render(
    <ProvedorI18n>
      <ProvedorSessao>
        <MemoryRouter initialEntries={[rota]}>
          <Routes>
            <Route path="/bases" element={<SelecaoBase />} />
            <Route element={<ComBase />}>
              <Route path="/atendimentos" element={<p>fila de atendimentos</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ProvedorSessao>
    </ProvedorI18n>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('atendimento.idioma', 'Pt');
  vi.spyOn(api, 'contarPendentes').mockResolvedValue(0);
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('Entrada na base', () => {
  it('leva direto para a fila, sem parar na escolha de base', async () => {
    vi.spyOn(api, 'bases').mockResolvedValue([base()]);

    renderizar();

    // Antes, quem entrava escolhia a única base da lista e apertava continuar —
    // três toques até chegar onde ia trabalhar.
    expect(await screen.findByText('fila de atendimentos')).toBeInTheDocument();
    expect(screen.queryByText(/Escolha a base/)).not.toBeInTheDocument();
  });

  it('mostra no cabeçalho a base que resolveu', async () => {
    vi.spyOn(api, 'bases').mockResolvedValue([base({ nome: 'Abrigo da Enchente' })]);

    renderizar();

    // Com várias bases a primeira é a escolha, então o cabeçalho precisa dizer
    // qual ficou — é por ele que a pessoa percebe e troca.
    expect(await screen.findByText('Abrigo da Enchente')).toBeInTheDocument();
  });

  it('guarda a base escolhida, e na volta seguinte já entra com ela', async () => {
    vi.spyOn(api, 'bases').mockResolvedValue([base({ nome: 'Abrigo da Enchente' })]);

    const { unmount } = renderizar();
    await screen.findByText('fila de atendimentos');
    unmount();

    // Na segunda vez a base vem do aparelho: a sessão ainda pergunta as bases à
    // API, mas para outra coisa — conferir se a guardada foi desativada entre
    // um plantão e outro.
    expect(localStorage.getItem('atendimento.base')).toContain('Abrigo da Enchente');

    renderizar();
    expect(await screen.findByText('fila de atendimentos')).toBeInTheDocument();
    expect(screen.getByText('Abrigo da Enchente')).toBeInTheDocument();
  });

  it('sem base ativa, manda para a seleção e diz o motivo', async () => {
    vi.spyOn(api, 'bases').mockResolvedValue([]);

    renderizar();

    // Seletor vazio sem explicação deixa a pessoa sem saber o que fazer.
    expect(await screen.findByText(/Nenhuma base ativa/)).toBeInTheDocument();
  });

  it('sem conexão, manda para a seleção em vez de travar no carregando', async () => {
    vi.spyOn(api, 'bases').mockRejectedValue(new Error('sem rede'));

    renderizar();

    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});

describe('Troca de missão pelo cabeçalho', () => {
  function duasBases() {
    vi.spyOn(api, 'bases').mockResolvedValue([
      base({ tipoMissao: 'Programada' }),
      base({
        id: 'b2',
        nome: 'Escuela Zoe',
        prefixoCodigo: 'ESC',
        tipoMissao: 'Catastrofe',
      }),
    ]);
  }

  it('troca de base sem sair da fila', async () => {
    const usuario = userEvent.setup();
    duasBases();

    renderizar();
    await screen.findByText('fila de atendimentos');

    await usuario.click(screen.getByRole('button', { name: 'Trocar base' }));
    const lista = await screen.findByRole('menu');
    await usuario.click(within(lista).getByRole('menuitem', { name: /Escuela Zoe/ }));

    // Era uma página: seletor, "continuar" e a fila fora da tela para escolher
    // o que quase sempre tem uma opção só.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Trocar base' })).toHaveTextContent('Escuela Zoe'),
    );
    expect(screen.getByText('fila de atendimentos')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument();
  });

  it('diz o tipo de missão de cada base, e qual é a de agora', async () => {
    const usuario = userEvent.setup();
    duasBases();

    renderizar();
    await screen.findByText('fila de atendimentos');

    await usuario.click(screen.getByRole('button', { name: 'Trocar base' }));
    const lista = await screen.findByRole('menu');

    // Entrar numa base de catástrofe é um turno diferente de entrar numa missão
    // programada, e no botão só cabe o nome.
    expect(within(lista).getByText('Catástrofe')).toBeInTheDocument();
    expect(within(lista).getAllByText('Missão programada').length).toBeGreaterThan(0);
  });

  it('fechar sem escolher não mexe na base', async () => {
    const usuario = userEvent.setup();
    duasBases();

    renderizar();
    await screen.findByText('fila de atendimentos');

    await usuario.click(screen.getByRole('button', { name: 'Trocar base' }));
    await screen.findByRole('menu');
    await usuario.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Trocar base' })).toHaveTextContent(
      'Acampamento Panamá',
    );
  });
});
