import { describe, expect, it } from 'vitest';
import { IDIOMAS } from './index';
import { camposAuditoria, traduzirCampoAuditoria, traduzirValorAuditoria } from './auditoria';

describe('tradução do histórico de alterações', () => {
  it('cobre os mesmos campos nos três idiomas', () => {
    const referencia = Object.keys(camposAuditoria.Pt).sort();

    for (const idioma of IDIOMAS) {
      expect(Object.keys(camposAuditoria[idioma]).sort(), idioma).toEqual(referencia);
    }
  });

  it('traduz o rótulo do campo', () => {
    expect(traduzirCampoAuditoria('triagem.classificacaoRisco', 'Pt')).toBe(
      'Classificação de risco (START)',
    );
    expect(traduzirCampoAuditoria('triagem.classificacaoRisco', 'Es')).toBe(
      'Clasificación de riesgo (START)',
    );
  });

  it('traduz lista de enums em vez de exibir o identificador cru', () => {
    // O sistema de referência mostrava `consulta_medica` cru; aqui o
    // equivalente seria "ProfilaxiaLimpeza, OrientacaoHigieneBucal".
    const valor = traduzirValorAuditoria(
      'odontologia.procedimentos',
      'ProfilaxiaLimpeza,OrientacaoHigieneBucal',
      'Pt',
    );

    expect(valor).toBe('Profilaxia / limpeza, Orientação de higiene bucal');
    expect(valor).not.toMatch(/ProfilaxiaLimpeza/);
  });

  it('traduz o odontograma canônico', () => {
    expect(
      traduzirValorAuditoria('odontologia.odontograma', 'Carie:38(M,O);ExtracaoIndicada:38', 'Pt'),
    ).toBe('Cárie: 38(M,O); Extração indicada: 38');
  });

  it('não parte as faces ao separar vários dentes', () => {
    // `38(M,O),41` são dois dentes: a vírgula dentro dos parênteses separa
    // faces do mesmo dente, não dentes diferentes.
    expect(
      traduzirValorAuditoria('odontologia.odontograma', 'Carie:38(M,O),41(I)', 'Pt'),
    ).toBe('Cárie: 38(M,O), 41(I)');
  });

  it('traduz booleanos', () => {
    expect(traduzirValorAuditoria('ortopedia.imobilizacao', 'true', 'Pt')).toBe('Sim');
    expect(traduzirValorAuditoria('ortopedia.imobilizacao', 'false', 'En')).toBe('No');
  });

  it('valor ausente vira travessão', () => {
    expect(traduzirValorAuditoria('triagem.sintomas', null, 'Pt')).toBe('—');
  });

  it('texto livre passa intacto', () => {
    expect(traduzirValorAuditoria('consulta.conduta', 'Repouso e hidratação', 'Pt')).toBe(
      'Repouso e hidratação',
    );
  });

  it('nenhum rótulo de campo devolve a própria chave canônica', () => {
    for (const idioma of IDIOMAS) {
      for (const chave of Object.keys(camposAuditoria.Pt)) {
        expect(traduzirCampoAuditoria(chave, idioma), `${chave} em ${idioma}`).not.toBe(chave);
      }
    }
  });
});
