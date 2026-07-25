import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

/*
  O idioma inicial segue o aparelho quando não há escolha guardada, e o jsdom
  se apresenta como en-US. Fixar PT deixa as asserções de texto determinísticas
  sem depender do ambiente onde a suíte roda.
*/
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('atendimento.idioma', 'Pt');
});
