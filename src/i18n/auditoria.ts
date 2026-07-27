import type { Idioma } from '../api/tipos';
import {
  classificacoes,
  desfechos,
  especialidades,
  estadosDente,
  perdasVivenciadas,
  procedimentosEnfermagem,
  procedimentosOdontologicos,
  sintomas,
  sintomasSaudeMental,
  statusAlergia,
} from './enums';

/**
 * Tradução do histórico de alterações.
 *
 * A auditoria grava chave de campo e valor canônicos — `triagem.classificacaoRisco`
 * e `Vermelho`, nunca "Classificação de risco (START)" e "Vermelho — emergência".
 * A tradução acontece aqui, no idioma de quem está lendo.
 *
 * Duas razões. Primeiro, um registro feito por alguém operando em espanhol
 * apareceria em espanhol para quem revisa em português meses depois. Segundo, e
 * mais importante: gravar o nome do enum e exibi-lo direto é exatamente o
 * defeito que motivou este projeto, o `consulta_medica` cru no relatório de
 * encaminhamentos do sistema de referência.
 */

type Rotulos = Record<Idioma, Record<string, string>>;

export const camposAuditoria: Rotulos = {
  Pt: {
    'triagem.pressaoArterial': 'Pressão arterial (mmHg)',
    'triagem.frequenciaCardiaca': 'Frequência cardíaca (bpm)',
    'triagem.frequenciaRespiratoria': 'Frequência respiratória (irpm)',
    'triagem.saturacaoO2': 'Saturação O₂ (%)',
    'triagem.temperatura': 'Temperatura (°C)',
    'triagem.glicemia': 'Glicemia capilar (mg/dL)',
    'triagem.sintomas': 'Sintomas atuais',
    'triagem.outroSintoma': 'Outro sintoma',
    'triagem.medicamentosEmUso': 'Medicamentos em uso',
    'triagem.statusAlergia': 'Alergia',
    'triagem.alergias': 'Quais alergias',
    'triagem.classificacaoRisco': 'Classificação de risco (START)',
    'triagem.encaminhamento': 'Encaminhamento',
    'atendimento.fila': 'Fila',
    'atendimento.motivoEncaminhamento': 'Motivo do encaminhamento',
    'triagem.observacoes': 'Observações',
    'triagem.divergenciaStart': 'Divergência da sugestão do protocolo',
    'consulta.sintomas': 'Sintomas',
    'consulta.cid10': 'Diagnóstico (CID-10)',
    'consulta.diagnosticoObservacao': 'Observação do diagnóstico',
    'consulta.conduta': 'Conduta',
    'consulta.desfecho': 'Desfecho da consulta',
    'consulta.encaminhadoPara': 'Encaminhado para',
    'consulta.sintomasSaudeMental': 'Sintomas de saúde mental',
    'consulta.perdasVivenciadas': 'Perdas vivenciadas',
    'ortopedia.localizacao': 'Localização',
    'ortopedia.mecanismoTrauma': 'Mecanismo do trauma',
    'ortopedia.imobilizacao': 'Imobilização',
    'ortopedia.necessitaRaioX': 'Necessita raio-X',
    'odontologia.queixa': 'Queixa / observações',
    'odontologia.cid10': 'Diagnóstico (CID-10)',
    'odontologia.procedimentos': 'Procedimentos realizados',
    'odontologia.outroProcedimento': 'Outro procedimento',
    'odontologia.odontograma': 'Odontograma',
    'odontologia.desfecho': 'Desfecho da consulta',
    'enfermagem.procedimentos': 'Procedimentos',
    'enfermagem.outroProcedimento': 'Outro procedimento',
    'enfermagem.observacoes': 'Observações',
    'enfermagem.desfecho': 'Desfecho da consulta',
    'atendimento.justificativaReabertura': 'Justificativa da reabertura',
  },
  Es: {
    'triagem.pressaoArterial': 'Presión arterial (mmHg)',
    'triagem.frequenciaCardiaca': 'Frecuencia cardíaca (lpm)',
    'triagem.frequenciaRespiratoria': 'Frecuencia respiratoria (rpm)',
    'triagem.saturacaoO2': 'Saturación O₂ (%)',
    'triagem.temperatura': 'Temperatura (°C)',
    'triagem.glicemia': 'Glucemia capilar (mg/dL)',
    'triagem.sintomas': 'Síntomas actuales',
    'triagem.outroSintoma': 'Otro síntoma',
    'triagem.medicamentosEmUso': 'Medicamentos en uso',
    'triagem.statusAlergia': 'Alergia',
    'triagem.alergias': 'Cuáles alergias',
    'triagem.classificacaoRisco': 'Clasificación de riesgo (START)',
    'triagem.encaminhamento': 'Derivación',
    'atendimento.fila': 'Fila',
    'atendimento.motivoEncaminhamento': 'Motivo de la derivación',
    'triagem.observacoes': 'Observaciones',
    'triagem.divergenciaStart': 'Divergencia de la sugerencia del protocolo',
    'consulta.sintomas': 'Síntomas',
    'consulta.cid10': 'Diagnóstico (CIE-10)',
    'consulta.diagnosticoObservacao': 'Observación del diagnóstico',
    'consulta.conduta': 'Conducta',
    'consulta.desfecho': 'Desenlace de la consulta',
    'consulta.encaminhadoPara': 'Derivado a',
    'consulta.sintomasSaudeMental': 'Síntomas de salud mental',
    'consulta.perdasVivenciadas': 'Pérdidas vividas',
    'ortopedia.localizacao': 'Localización',
    'ortopedia.mecanismoTrauma': 'Mecanismo del trauma',
    'ortopedia.imobilizacao': 'Inmovilización',
    'ortopedia.necessitaRaioX': 'Necesita radiografía',
    'odontologia.queixa': 'Motivo / observaciones',
    'odontologia.cid10': 'Diagnóstico (CIE-10)',
    'odontologia.procedimentos': 'Procedimientos realizados',
    'odontologia.outroProcedimento': 'Otro procedimiento',
    'odontologia.odontograma': 'Odontograma',
    'odontologia.desfecho': 'Desenlace de la consulta',
    'enfermagem.procedimentos': 'Procedimientos',
    'enfermagem.outroProcedimento': 'Otro procedimiento',
    'enfermagem.observacoes': 'Observaciones',
    'enfermagem.desfecho': 'Desenlace de la consulta',
    'atendimento.justificativaReabertura': 'Justificación de la reapertura',
  },
  En: {
    'triagem.pressaoArterial': 'Blood pressure (mmHg)',
    'triagem.frequenciaCardiaca': 'Heart rate (bpm)',
    'triagem.frequenciaRespiratoria': 'Respiratory rate (bpm)',
    'triagem.saturacaoO2': 'O₂ saturation (%)',
    'triagem.temperatura': 'Temperature (°C)',
    'triagem.glicemia': 'Capillary glucose (mg/dL)',
    'triagem.sintomas': 'Current symptoms',
    'triagem.outroSintoma': 'Other symptom',
    'triagem.medicamentosEmUso': 'Medications in use',
    'triagem.statusAlergia': 'Allergy',
    'triagem.alergias': 'Which allergies',
    'triagem.classificacaoRisco': 'Risk classification (START)',
    'triagem.encaminhamento': 'Referral',
    'atendimento.fila': 'Queue',
    'atendimento.motivoEncaminhamento': 'Reason for referral',
    'triagem.observacoes': 'Notes',
    'triagem.divergenciaStart': 'Divergence from protocol suggestion',
    'consulta.sintomas': 'Symptoms',
    'consulta.cid10': 'Diagnosis (ICD-10)',
    'consulta.diagnosticoObservacao': 'Diagnosis note',
    'consulta.conduta': 'Plan',
    'consulta.desfecho': 'Consultation outcome',
    'consulta.encaminhadoPara': 'Referred to',
    'consulta.sintomasSaudeMental': 'Mental health symptoms',
    'consulta.perdasVivenciadas': 'Losses experienced',
    'ortopedia.localizacao': 'Site',
    'ortopedia.mecanismoTrauma': 'Injury mechanism',
    'ortopedia.imobilizacao': 'Immobilisation',
    'ortopedia.necessitaRaioX': 'X-ray needed',
    'odontologia.queixa': 'Complaint / notes',
    'odontologia.cid10': 'Diagnosis (ICD-10)',
    'odontologia.procedimentos': 'Procedures performed',
    'odontologia.outroProcedimento': 'Other procedure',
    'odontologia.odontograma': 'Odontogram',
    'odontologia.desfecho': 'Consultation outcome',
    'enfermagem.procedimentos': 'Procedures',
    'enfermagem.outroProcedimento': 'Other procedure',
    'enfermagem.observacoes': 'Notes',
    'enfermagem.desfecho': 'Consultation outcome',
    'atendimento.justificativaReabertura': 'Reason for reopening',
  },
};

const SIM_NAO: Record<Idioma, { true: string; false: string }> = {
  Pt: { true: 'Sim', false: 'Não' },
  Es: { true: 'Sí', false: 'No' },
  En: { true: 'Yes', false: 'No' },
};

/** Campos cujo valor canônico é uma lista de enums separada por vírgula. */
const TABELA_POR_CAMPO: Record<string, Record<Idioma, Record<string, string>>> = {
  'triagem.sintomas': sintomas,
  'triagem.statusAlergia': statusAlergia,
  'triagem.classificacaoRisco': classificacoes,
  'triagem.encaminhamento': especialidades,
  'atendimento.fila': especialidades,
  'triagem.divergenciaStart': classificacoes,
  'consulta.desfecho': desfechos,
  'consulta.encaminhadoPara': especialidades,
  'consulta.sintomasSaudeMental': sintomasSaudeMental,
  'consulta.perdasVivenciadas': perdasVivenciadas,
  'odontologia.procedimentos': procedimentosOdontologicos,
  'odontologia.desfecho': desfechos,
  'enfermagem.procedimentos': procedimentosEnfermagem,
  'enfermagem.desfecho': desfechos,
};

const CAMPOS_BOOLEANOS = new Set(['ortopedia.imobilizacao', 'ortopedia.necessitaRaioX']);

export function traduzirCampoAuditoria(campo: string | null, idioma: Idioma): string {
  if (!campo) return '';
  return camposAuditoria[idioma][campo] ?? campo;
}

/**
 * Traduz o odontograma canônico `Carie:38(M,O);ExtracaoIndicada:38` para
 * `Cárie: 38(M,O); Extração indicada: 38`.
 */
function traduzirOdontograma(valor: string, idioma: Idioma): string {
  return valor
    .split(';')
    .map((parte) => {
      const separador = parte.indexOf(':');
      if (separador < 0) return parte;

      const estado = parte.slice(0, separador);
      const dentes = parte.slice(separador + 1);
      const rotulo = estadosDente[idioma][estado as keyof (typeof estadosDente)['Pt']] ?? estado;

      return `${rotulo}: ${separarDentes(dentes).join(', ')}`;
    })
    .join('; ');
}

/**
 * Separa a lista de dentes preservando as faces entre parênteses.
 *
 * `38(M,O),41` são dois dentes, não três: a vírgula dentro dos parênteses
 * separa faces do mesmo dente. Um `split(',')` ingênuo parte `38(M,O)` ao meio.
 */
function separarDentes(lista: string): string[] {
  const partes: string[] = [];
  let atual = '';
  let dentroDeParenteses = false;

  for (const caractere of lista) {
    if (caractere === '(') dentroDeParenteses = true;
    if (caractere === ')') dentroDeParenteses = false;

    if (caractere === ',' && !dentroDeParenteses) {
      partes.push(atual);
      atual = '';
      continue;
    }

    atual += caractere;
  }

  if (atual !== '') partes.push(atual);

  return partes;
}

export function traduzirValorAuditoria(
  campo: string | null,
  valor: string | null,
  idioma: Idioma,
): string {
  if (valor === null || valor === '') return '—';
  if (!campo) return valor;

  if (campo === 'odontologia.odontograma') {
    return traduzirOdontograma(valor, idioma);
  }

  if (CAMPOS_BOOLEANOS.has(campo)) {
    return SIM_NAO[idioma][valor === 'true' ? 'true' : 'false'];
  }

  const tabela = TABELA_POR_CAMPO[campo];

  if (!tabela) return valor;

  // Listas de enum chegam separadas por vírgula.
  return valor
    .split(',')
    .map((item) => tabela[idioma][item.trim()] ?? item.trim())
    .join(', ');
}
