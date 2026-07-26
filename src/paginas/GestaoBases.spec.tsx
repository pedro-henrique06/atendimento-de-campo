import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ErroApi } from '../api/cliente';
import type { BaseAdmin } from '../api/tipos';
import { ProvedorSessao } from '../hooks/useSessao';
import { ProvedorI18n } from '../i18n';
import { GestaoBases } from './GestaoBases';

const NOVA: BaseAdmin = {
  id: 'b1',
  nome: 'Acampamento Panamá',
  prefixoCodigo: 'ACA',
  ativa: true,
  criadaEm: '2026-01-10T12:00:00Z',
  totalAtendimentos: 0,
  atendimentosAbertos: 0,
  prefixoEditavel: true,
};

const COM_HISTORICO: BaseAdmin = {
  id: 'b2',
  nome: 'Escuela Zoe',
  prefixoCodigo: 'ESC',
  ativa: true,
  criadaEm: '2026-01-11T12:00:00Z',
  totalAtendimentos: 42,
  atendimentosAbertos: 3,
  prefixoEditavel: false,
};

function renderizar() {
  return render(
    <ProvedorI18n>
      <ProvedorSessao>
        <MemoryRouter>
          <GestaoBases />
        </MemoryRouter>
      </ProvedorSessao>
    </ProvedorI18n>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('atendimento.idioma', 'Pt');
  vi.spyOn(api, 'todasAsBases').mockResolvedValue([NOVA, COM_HISTORICO]);
  vi.spyOn(api, 'prefixoSugerido').mockResolvedValue({ prefixo: 'QUI' });
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('Gestão de bases', () => {
  it('lista as bases com o que a coordenação precisa para decidir', async () => {
    renderizar();

    expect(await screen.findByText('Acampamento Panamá')).toBeInTheDocument();
    // O total explica por que o prefixo trava; os abertos, por que a
    // desativação é recusada.
    expect(screen.getByText(/42 atendimentos · 3 em aberto/)).toBeInTheDocument();
    expect(screen.getByText(/Nenhum atendimento ainda/)).toBeInTheDocument();
  });

  it('sugere o prefixo a partir do nome da base nova', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Nova base' }));
    await usuario.type(screen.getByLabelText(/Nome da base/), 'Quinta Esperança');

    await waitFor(() => expect(screen.getByLabelText(/Prefixo/)).toHaveValue('QUI'));
  });

  it('para de sugerir depois que a coordenação edita o prefixo', async () => {
    // Sem isso, cada letra digitada no nome apagaria o prefixo escolhido à mão.
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Nova base' }));

    const prefixo = screen.getByLabelText(/Prefixo/);
    await usuario.type(prefixo, 'QNT');
    await usuario.type(screen.getByLabelText(/Nome da base/), 'Quinta Esperança');

    expect(prefixo).toHaveValue('QNT');
  });

  it('trava o prefixo de base que já emitiu códigos, mas deixa renomear', async () => {
    const usuario = userEvent.setup();
    renderizar();

    const cartao = (await screen.findByText('Escuela Zoe')).closest('li')!;
    await usuario.click(within(cartao).getByRole('button', { name: 'Editar' }));

    // O prefixo está impresso em papéis já distribuídos.
    expect(screen.getByLabelText(/Prefixo/)).toBeDisabled();
    expect(screen.getByText(/não pode mudar/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome da base/)).toBeEnabled();
  });

  it('deixa o prefixo editável enquanto a base não tem atendimento', async () => {
    const usuario = userEvent.setup();
    renderizar();

    const cartao = (await screen.findByText('Acampamento Panamá')).closest('li')!;
    await usuario.click(within(cartao).getByRole('button', { name: 'Editar' }));

    expect(screen.getByLabelText(/Prefixo/)).toBeEnabled();
  });

  it('mostra o motivo quando o servidor recusa a desativação', async () => {
    // A regra mora no servidor; a tela precisa dizer o porquê em vez de um erro
    // genérico.
    vi.spyOn(api, 'definirBaseAtiva').mockRejectedValue(
      new ErroApi(400, ['Esta base tem 3 atendimentos em aberto. Finalize-os antes de desativar.']),
    );

    const usuario = userEvent.setup();
    renderizar();

    const cartao = (await screen.findByText('Escuela Zoe')).closest('li')!;
    await usuario.click(within(cartao).getByRole('button', { name: 'Desativar' }));

    expect(await screen.findByText(/3 atendimentos em aberto/)).toBeInTheDocument();
  });

  it('oferece ativar, e não apagar, para base inativa', async () => {
    // Base não se apaga: o histórico dos atendimentos aponta para ela.
    vi.spyOn(api, 'todasAsBases').mockResolvedValue([{ ...NOVA, ativa: false }]);

    renderizar();

    expect(await screen.findByRole('button', { name: 'Ativar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Excluir|Apagar/ })).not.toBeInTheDocument();
  });
});
