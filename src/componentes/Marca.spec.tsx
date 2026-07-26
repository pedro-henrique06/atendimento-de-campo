import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INSTITUICAO_PADRAO, Marca } from './Marca';

// Cada teste declara o ambiente que quer. Sem isso, um `.env.local` na
// maquina de quem roda os testes decidiria o resultado.
beforeEach(() => {
  vi.stubEnv('VITE_LOGO_URL', '');
  vi.stubEnv('VITE_INSTITUICAO', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Marca', () => {
  it('usa a marca da instituição que vem empacotada com o app', () => {
    render(<Marca />);

    // Empacotada, não buscada de fora: em campo a rede cai e o logotipo
    // precisa continuar aparecendo.
    const logo = screen.getByRole('img', { name: INSTITUICAO_PADRAO });

    expect(logo.getAttribute('src')).not.toMatch(/^https?:/);
  });

  it('mostra só o símbolo no cabeçalho', () => {
    // O lockup é empilhado: na barra do celular o nome sairia ilegível.
    render(<Marca contexto="cabecalho" />);
    const cabecalho = screen.getByRole('img').getAttribute('src');

    render(<Marca contexto="cartao" />);
    const cartao = screen.getAllByRole('img')[1].getAttribute('src');

    expect(cabecalho).not.toBe(cartao);
  });

  it('troca a marca pela que a operação configurou', () => {
    vi.stubEnv('VITE_LOGO_URL', '/outra-marca.png');
    vi.stubEnv('VITE_INSTITUICAO', 'Hospital de Campanha');

    render(<Marca />);

    expect(screen.getByRole('img', { name: 'Hospital de Campanha' })).toHaveAttribute(
      'src',
      '/outra-marca.png',
    );
  });

  it('volta para a marca própria quando a arte não carrega', () => {
    // Um ícone de imagem quebrada no topo do login é pior que nenhuma imagem.
    vi.stubEnv('VITE_LOGO_URL', 'https://exemplo.invalido/logo.png');

    render(<Marca />);

    fireEvent.error(screen.getByRole('img'));

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    // Sem imagem, o nome escrito é a única coisa que diz quem opera a base.
    expect(screen.getByText(INSTITUICAO_PADRAO)).toBeInTheDocument();
  });
});
