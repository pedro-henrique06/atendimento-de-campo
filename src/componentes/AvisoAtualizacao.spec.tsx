import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProvedorI18n } from '../i18n';

const atualizar = vi.fn();
const estado = { precisaAtualizar: false };

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [estado.precisaAtualizar, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: atualizar,
  }),
}));

const { AvisoAtualizacao } = await import('./AvisoAtualizacao');

function renderizar() {
  return render(
    <ProvedorI18n>
      <AvisoAtualizacao />
    </ProvedorI18n>,
  );
}

/** Finge que o aparelho perdeu ou recuperou o sinal. */
function definirSinal(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true });
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  });
}

beforeEach(() => {
  localStorage.setItem('atendimento.idioma', 'Pt');
  estado.precisaAtualizar = false;
  definirSinal(true);
});

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('AvisoAtualizacao', () => {
  it('não ocupa espaço quando está tudo em ordem', () => {
    const { container } = renderizar();

    expect(container).toBeEmptyDOMElement();
  });

  it('avisa da versão nova e só atualiza quando pedem', async () => {
    // Recarregar sozinho apagaria o formulário que a pessoa está preenchendo.
    estado.precisaAtualizar = true;

    const usuario = userEvent.setup();
    renderizar();

    expect(screen.getByRole('status')).toHaveTextContent(/versão nova/i);
    expect(atualizar).not.toHaveBeenCalled();

    await usuario.click(screen.getByRole('button', { name: 'Atualizar' }));

    expect(atualizar).toHaveBeenCalledWith(true);
  });

  it('avisa da falta de sinal antes de a pessoa perder o trabalho', () => {
    // Instalado, o app abre normalmente offline: nada denunciaria a falta de
    // rede até alguém tentar salvar.
    definirSinal(false);
    renderizar();

    expect(screen.getByRole('status')).toHaveTextContent(/Sem sinal/i);
  });

  it('some sozinho quando o sinal volta', () => {
    definirSinal(false);
    renderizar();
    expect(screen.getByRole('status')).toBeInTheDocument();

    definirSinal(true);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('versão nova tem precedência sobre a falta de sinal', () => {
    // Sem sinal não dá para baixar versão nenhuma, mas se o aviso já apareceu
    // é porque o download terminou — e aí ele é o que importa.
    estado.precisaAtualizar = true;
    definirSinal(false);
    renderizar();

    expect(screen.getByRole('status')).toHaveTextContent(/versão nova/i);
  });
});
