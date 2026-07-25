import type { RiscoClassificacao, TipoEtapa } from '../types';

export type TipoCampo = 'texto' | 'texto-longo' | 'numero' | 'selecao' | 'multi-selecao';

export interface CampoFormulario {
  chave: string;
  rotulo: string;
  tipo: TipoCampo;
  opcoes?: string[];
  obrigatorio?: boolean;
  // só aparece se o campo `dependeDe` tiver o valor `dependeValor`
  dependeDe?: string;
  dependeValor?: string;
}

export const SETORES_LABEL: Record<TipoEtapa, string> = {
  Triagem: 'Triagem',
  ClinicaGeral: 'Clínica Geral',
  Enfermagem: 'Enfermagem',
  Pediatria: 'Pediatria',
};

export const RISCO_LABEL: Record<RiscoClassificacao, string> = {
  SemClassificacao: 'Sem classificação',
  Verde: 'Verde — não urgente',
  Amarelo: 'Amarelo — urgente',
  Vermelho: 'Vermelho — emergência (imediato)',
  Preto: 'Preto — óbito',
};

export const RISCO_COR: Record<RiscoClassificacao, string> = {
  SemClassificacao: 'bg-slate-500',
  Verde: 'bg-risco-verde',
  Amarelo: 'bg-risco-amarelo',
  Vermelho: 'bg-risco-vermelho',
  Preto: 'bg-risco-preto',
};

const ENCAMINHAMENTO_OPCOES: CampoFormulario = {
  chave: 'encaminhamento',
  rotulo: 'Encaminhamento',
  tipo: 'selecao',
  opcoes: ['ClinicaGeral', 'Enfermagem', 'Pediatria'],
  obrigatorio: true,
};

export const FORMULARIO_TRIAGEM: CampoFormulario[] = [
  { chave: 'pressaoArterial', rotulo: 'Pressão arterial (mmHg)', tipo: 'texto' },
  { chave: 'frequenciaCardiaca', rotulo: 'Frequência cardíaca (bpm)', tipo: 'numero' },
  { chave: 'saturacaoO2', rotulo: 'Saturação O2 (%)', tipo: 'numero' },
  {
    chave: 'sintomasAtuais',
    rotulo: 'Sintomas atuais',
    tipo: 'multi-selecao',
    opcoes: ['Dor', 'Febre', 'Tosse', 'Diarreia', 'Vômito', 'Erupção cutânea', 'Outro'],
  },
  {
    chave: 'outroSintoma',
    rotulo: 'Outro sintoma (especifique)',
    tipo: 'texto-longo',
    dependeDe: 'sintomasAtuais',
    dependeValor: 'Outro',
  },
  { chave: 'queixaPrincipal', rotulo: 'Queixa principal (resumo)', tipo: 'texto-longo', obrigatorio: true },
  { chave: 'medicamentosUso', rotulo: 'Quais medicamentos usa? Deixou de tomar alguma dose?', tipo: 'texto-longo' },
  { chave: 'alergias', rotulo: 'Possui alguma alergia?', tipo: 'texto' },
  {
    chave: 'classificacaoRisco',
    rotulo: 'Classificação de risco (START)',
    tipo: 'selecao',
    opcoes: ['Verde', 'Amarelo', 'Vermelho', 'Preto'],
    obrigatorio: true,
  },
  ENCAMINHAMENTO_OPCOES,
];

const DESFECHO: CampoFormulario = {
  chave: 'desfechoConsulta',
  rotulo: 'Desfecho da consulta',
  tipo: 'selecao',
  opcoes: ['Alta', 'Encaminhado', 'Retorno', 'Evasão'],
  obrigatorio: true,
};

const ENCAMINHAMENTO_CONDICIONAL: CampoFormulario = {
  ...ENCAMINHAMENTO_OPCOES,
  obrigatorio: false,
  dependeDe: 'desfechoConsulta',
  dependeValor: 'Encaminhado',
};

export const FORMULARIO_CLINICA_GERAL: CampoFormulario[] = [
  { chave: 'sintomas', rotulo: 'Descreva os sintomas', tipo: 'texto-longo', obrigatorio: true },
  { chave: 'diagnosticoCid', rotulo: 'Diagnóstico (CID)', tipo: 'texto' },
  { chave: 'insumosMedicamentos', rotulo: 'Insumos / medicamentos', tipo: 'texto-longo' },
  DESFECHO,
  ENCAMINHAMENTO_CONDICIONAL,
];

export const FORMULARIO_PEDIATRIA: CampoFormulario[] = FORMULARIO_CLINICA_GERAL;

export const FORMULARIO_ENFERMAGEM: CampoFormulario[] = [
  { chave: 'procedimentoRealizado', rotulo: 'Procedimento realizado', tipo: 'texto-longo', obrigatorio: true },
  { chave: 'insumosMedicamentos', rotulo: 'Insumos / medicamentos usados', tipo: 'texto-longo' },
  DESFECHO,
  ENCAMINHAMENTO_CONDICIONAL,
];

export const FORMULARIOS_POR_SETOR: Record<TipoEtapa, CampoFormulario[]> = {
  Triagem: FORMULARIO_TRIAGEM,
  ClinicaGeral: FORMULARIO_CLINICA_GERAL,
  Enfermagem: FORMULARIO_ENFERMAGEM,
  Pediatria: FORMULARIO_PEDIATRIA,
};
