import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useTema } from './useTema';

const CHAVE = 'atendimento.tema';

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.tema;
});

describe('useTema', () => {
  it('abre no claro quando ninguém escolheu nada', () => {
    const { result } = renderHook(() => useTema());

    expect(result.current.tema).toBe('claro');
    expect(document.documentElement.dataset.tema).toBe('claro');
  });

  it('respeita a escolha de quem já trocou', () => {
    localStorage.setItem(CHAVE, 'escuro');

    const { result } = renderHook(() => useTema());

    expect(result.current.tema).toBe('escuro');
  });

  it('não grava nada só por abrir o app', () => {
    // Gravar aqui transformaria o padrao em "escolha" de quem nunca escolheu, e
    // mudar o padrao depois nao alcancaria mais ninguem que ja tivesse aberto.
    renderHook(() => useTema());

    expect(localStorage.getItem(CHAVE)).toBeNull();
  });

  it('guarda a troca para a próxima abertura', () => {
    const { result, unmount } = renderHook(() => useTema());

    act(() => result.current.alternar());

    expect(result.current.tema).toBe('escuro');
    expect(localStorage.getItem(CHAVE)).toBe('escuro');

    unmount();

    expect(renderHook(() => useTema()).result.current.tema).toBe('escuro');
  });

  it('ignora um valor estragado no armazenamento e volta ao padrão', () => {
    localStorage.setItem(CHAVE, 'roxo');

    expect(renderHook(() => useTema()).result.current.tema).toBe('claro');
  });
});
