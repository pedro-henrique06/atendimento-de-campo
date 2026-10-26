import { describe, expect, it } from 'vitest';
import { FILAS_POR_FUNCAO, FUNCOES_PARA_LENTE } from './filas';
import { FILAS, FUNCOES_PARA_CADASTRO } from './tipos';

/**
 * A cópia que o app tem de `FilasDaFuncao`.
 *
 * Esta é uma das duas guardas contra as duas pontas divergirem: aqui prende-se
 * a cópia, e o roteiro de ponta a ponta prende o servidor, entrando com as
 * dezessete contas e conferindo as filas que a API devolve. Uma fila nova que
 * entre só de um lado derruba uma das duas.
 */
describe('filas por profissão', () => {
  it('toda profissão tem pelo menos uma fila', () => {
    const vazias = Object.entries(FILAS_POR_FUNCAO)
      .filter(([, filas]) => filas.length === 0)
      .map(([funcao]) => funcao);

    // Profissão sem fila é conta que entra e não vê nada — e o sistema não tem
    // como dizer isso para quem está do outro lado do aparelho.
    expect(vazias).toEqual([]);
  });

  it('só aponta para filas que existem', () => {
    const inventadas = Object.values(FILAS_POR_FUNCAO)
      .flat()
      .filter((fila) => !FILAS.includes(fila));

    expect([...new Set(inventadas)]).toEqual([]);
  });

  it('não repete fila dentro da mesma profissão', () => {
    const repetidas = Object.entries(FILAS_POR_FUNCAO)
      .filter(([, filas]) => new Set(filas).size !== filas.length)
      .map(([funcao]) => funcao);

    // A ordem importa — a primeira é a que abre —, e repetida ela vira duas
    // abas iguais na barra.
    expect(repetidas).toEqual([]);
  });

  it('toda profissão que o cadastro oferece está na tabela', () => {
    const faltando = FUNCOES_PARA_CADASTRO.filter((funcao) => !FILAS_POR_FUNCAO[funcao]);

    expect(faltando).toEqual([]);
  });

  it('as profissões com mais de uma fila são as que têm razão para isso', () => {
    const comVarias = Object.entries(FILAS_POR_FUNCAO)
      .filter(([, filas]) => filas.length > 1)
      .map(([funcao]) => funcao)
      .sort();

    /*
      Duas filas não são exceção à regra de uma fila por profissão: a enfermagem
      começa o plantão triando, o anestesista avalia antes e acompanha durante,
      e quem coordena enxerga a operação inteira. "Médico" é a conta anterior às
      especialidades, que cai em três até a coordenação reclassificar.

      Qualquer nome novo nesta lista é uma decisão, e não um acidente.
    */
    expect(comVarias).toEqual([
      'Anestesista',
      'Coordenacao',
      'Enfermeiro',
      'Medico',
      'Outro',
      'TecnicoEnfermagem',
    ]);
  });

  it('a enfermagem abre na triagem, e não na própria fila', () => {
    // É a ordem do plantão: tria primeiro, atende depois.
    expect(FILAS_POR_FUNCAO.Enfermeiro).toEqual(['Triagem', 'Enfermagem']);
    expect(FILAS_POR_FUNCAO.TecnicoEnfermagem).toEqual(['Triagem', 'Enfermagem']);
  });

  it('o anestesista abre na anestesia, com a cirurgia ao lado', () => {
    expect(FILAS_POR_FUNCAO.Anestesista).toEqual(['Anestesia', 'Cirurgia']);
  });

  it('quem enxerga a operação inteira enxerga as treze', () => {
    expect(FILAS_POR_FUNCAO.Coordenacao).toEqual(FILAS);
    expect(FILAS_POR_FUNCAO.Outro).toEqual(FILAS);
  });

  it('a lente não oferece "Médico"', () => {
    /*
      Pelo mesmo motivo do cadastro: existe só para as contas anteriores às
      especialidades, e oferecê-lo recriaria a confusão de uma "profissão" que
      cai em três filas.
    */
    expect(FUNCOES_PARA_LENTE).not.toContain('Medico');
    expect(FUNCOES_PARA_LENTE.every((funcao) => funcao in FILAS_POR_FUNCAO)).toBe(true);
  });
});
