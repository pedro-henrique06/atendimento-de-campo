import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Marca } from './Marca';

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
  it('usa a marca própria quando nenhuma instituição foi configurada', () => {
    render(<Marca />);

    // Nada de logotipo de terceiro embutido na build: sem configuração o app
    // mostra a marca dele mesmo.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('mostra o logotipo configurado, nomeado pela instituição', () => {
    vi.stubEnv('VITE_LOGO_URL', '/logo.png');
    vi.stubEnv('VITE_INSTITUICAO', 'Hospital de Campanha');

    render(<Marca />);

    const logo = screen.getByRole('img', { name: 'Hospital de Campanha' });

    expect(logo).toHaveAttribute('src', '/logo.png');
    // O nome não é repetido em texto: o logotipo já o traz escrito, e imprimir
    // os dois espremia o cabeçalho no celular.
    expect(screen.queryByText('Hospital de Campanha')).not.toBeInTheDocument();
  });

  it('escreve o nome da instituição quando não há logotipo', () => {
    // Sem imagem, o nome é a única coisa que diz quem opera a base.
    vi.stubEnv('VITE_INSTITUICAO', 'Hospital de Campanha');

    render(<Marca />);

    expect(screen.getByText('Hospital de Campanha')).toBeInTheDocument();
  });

  it('volta para a marca própria quando o logotipo não carrega', () => {
    // Em campo a rede cai. Um ícone de imagem quebrada no topo do login é
    // pior que nenhuma imagem.
    vi.stubEnv('VITE_LOGO_URL', 'https://exemplo.invalido/logo.png');
    vi.stubEnv('VITE_INSTITUICAO', 'Hospital de Campanha');

    render(<Marca />);

    fireEvent.error(screen.getByRole('img', { name: 'Hospital de Campanha' }));

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
