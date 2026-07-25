import { describe, expect, it } from 'vitest';
import { IDIOMAS } from './index';
import { tabelasDeEnum } from './enums';
import { textos } from './textos';

/**
 * O sistema de referência exibia `consulta_medica` cru no relatório de
 * encaminhamentos, no meio de rótulos traduzidos: a chave de tradução não
 * existia e a interface caiu no valor bruto do enum. Estes testes falham antes
 * de isso chegar na tela.
 */
describe('cobertura de tradução', () => {
  it('todo idioma tem exatamente as mesmas chaves de texto', () => {
    const referencia = Object.keys(textos.Pt).sort();

    for (const idioma of IDIOMAS) {
      expect(Object.keys(textos[idioma]).sort(), `idioma ${idioma}`).toEqual(referencia);
    }
  });

  it('nenhum texto está vazio', () => {
    for (const idioma of IDIOMAS) {
      for (const [chave, valor] of Object.entries(textos[idioma])) {
        expect(valor.trim(), `${idioma}.${chave}`).not.toBe('');
      }
    }
  });

  it('toda tabela de enum cobre os mesmos valores nos três idiomas', () => {
    for (const [nome, tabela] of Object.entries(tabelasDeEnum)) {
      const referencia = Object.keys(tabela.Pt).sort();

      for (const idioma of IDIOMAS) {
        expect(Object.keys(tabela[idioma]).sort(), `${nome} em ${idioma}`).toEqual(referencia);
      }
    }
  });

  it('nenhum rótulo de enum está vazio', () => {
    for (const [nome, tabela] of Object.entries(tabelasDeEnum)) {
      for (const idioma of IDIOMAS) {
        for (const [valor, rotulo] of Object.entries(tabela[idioma])) {
          expect(rotulo.trim(), `${nome}.${idioma}.${valor}`).not.toBe('');
        }
      }
    }
  });

  it('nenhum rótulo devolve o próprio valor do enum em snake_case', () => {
    // Um rótulo idêntico ao identificador técnico é o sintoma exato do defeito
    // observado: enum vazando para a interface.
    for (const [nome, tabela] of Object.entries(tabelasDeEnum)) {
      for (const idioma of IDIOMAS) {
        for (const rotulo of Object.values(tabela[idioma])) {
          expect(rotulo, `${nome} em ${idioma}`).not.toMatch(/^[a-z]+(_[a-z]+)+$/);
        }
      }
    }
  });
});
