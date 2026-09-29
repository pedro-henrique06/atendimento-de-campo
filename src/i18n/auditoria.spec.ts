import { describe, expect, it } from 'vitest';
import { IDIOMAS } from './index';
import { camposAuditoria, traduzirCampoAuditoria, traduzirValorAuditoria } from './auditoria';

/*
  Toda chave de campo que a API grava na auditoria.

  Espelha o que o servidor emite, e por isso vive aqui e não é derivada de nada:
  o dia em que a API passar a gravar uma chave nova, é este teste que avisa que
  falta o rótulo — antes que ela apareça crua na tela de quem revisa o
  prontuário, que é o defeito que este projeto existe para não repetir.

  Já aconteceu: a ficha cirúrgica inteira e sete campos da triagem gravavam
  auditoria sem rótulo nenhum, e o histórico mostrava `cirurgia.timeOutUm` e
  `triagem.escalaDor` para o usuário. O teste de baixo, que só compara os
  idiomas entre si, passava: os três estavam igualmente incompletos.
*/
const CHAVES_DA_API = [
  'atendimento.desfechoDetalhe',
  'atendimento.fila',
  'atendimento.justificativaReabertura',
  'atendimento.motivoEncaminhamento',
  'cirurgia.checkIn',
  'cirurgia.checkOut',
  'cirurgia.consentimento',
  'cirurgia.cuidadosRecuperacao',
  'cirurgia.desfecho',
  'cirurgia.indicacao',
  'cirurgia.intercorrencias',
  'cirurgia.jejumHoras',
  'cirurgia.lateralidade',
  'cirurgia.observacoesPreOperatorio',
  'cirurgia.observacoesRecuperacao',
  'cirurgia.procedimento',
  'cirurgia.timeOutDois',
  'cirurgia.timeOutUm',
  'consulta.cid10',
  'consulta.conduta',
  'consulta.desfecho',
  'consulta.diagnosticoObservacao',
  'consulta.encaminhadoPara',
  'consulta.exameFisico',
  'consulta.historiaClinica',
  'consulta.orientacoesGerais',
  'consulta.perdasVivenciadas',
  'consulta.sintomas',
  'consulta.sintomasSaudeMental',
  'enfermagem.desfecho',
  'enfermagem.observacoes',
  'enfermagem.outroProcedimento',
  'enfermagem.procedimentos',
  'farmacia.desfecho',
  'farmacia.observacoes',
  'farmacia.orientacoes',
  'ginecologia.abortos',
  'ginecologia.dum',
  'ginecologia.gestacoes',
  'ginecologia.gestante',
  'ginecologia.metodoContraceptivo',
  'ginecologia.partos',
  'ginecologia.semanasGestacao',
  'ginecologia.ultimoPreventivo',
  'odontologia.cid10',
  'odontologia.desfecho',
  'odontologia.odontograma',
  'odontologia.outroProcedimento',
  'odontologia.procedimentos',
  'odontologia.queixa',
  'ortopedia.imobilizacao',
  'ortopedia.localizacao',
  'ortopedia.mecanismoTrauma',
  'ortopedia.necessitaRaioX',
  'triagem.alergias',
  'triagem.altura',
  'triagem.circunferenciaCefalica',
  'triagem.cirurgiasPrevias',
  'triagem.classificacaoRisco',
  'triagem.divergenciaStart',
  'triagem.encaminhamento',
  'triagem.escalaDor',
  'triagem.frequenciaCardiaca',
  'triagem.frequenciaRespiratoria',
  'triagem.glicemia',
  'triagem.medicamentosEmUso',
  'triagem.observacoes',
  'triagem.outroSintoma',
  'triagem.peso',
  'triagem.pressaoArterial',
  'triagem.saturacaoO2',
  'triagem.sintomas',
  'triagem.statusAlergia',
  'triagem.temperatura',
  'triagem.testeRapidoCovid',
  'triagem.testeRapidoMalaria',
  'ultrassom.analise',
  'ultrassom.conclusao',
  'ultrassom.desfecho',
  'ultrassom.exameSolicitado',
  'ultrassom.indicacao',
];

describe('tradução do histórico de alterações', () => {
  it('tem rótulo para toda chave que a API grava, nos três idiomas', () => {
    for (const idioma of IDIOMAS) {
      const semRotulo = CHAVES_DA_API.filter((chave) => !camposAuditoria[idioma][chave]);
      expect(semRotulo, `${idioma} sem rótulo`).toEqual([]);
    }
  });

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
