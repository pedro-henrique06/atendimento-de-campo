export type RiscoClassificacao = 'SemClassificacao' | 'Verde' | 'Amarelo' | 'Vermelho' | 'Preto';
export type StatusAtendimento = 'EmAndamento' | 'Finalizado';
export type StatusEtapa = 'Aguardando' | 'EmAndamento' | 'Concluida';
export type TipoEtapa = 'Triagem' | 'ClinicaGeral' | 'Enfermagem' | 'Pediatria';

export interface BaseDto {
  id: string;
  nome: string;
}

export interface UsuarioDto {
  id: string;
  nome: string;
  funcao: string;
  registro?: string | null;
}

export interface LoginResponse {
  token: string;
  usuario: UsuarioDto;
  base: BaseDto;
}

export interface AtendimentoResumo {
  id: string;
  codigo: string;
  pacienteNome: string;
  queixaPrincipal?: string | null;
  risco: RiscoClassificacao;
  status: StatusAtendimento;
  setorAtual?: string | null;
  criadoEm: string;
  finalizadoEm?: string | null;
}

export interface Etapa {
  id: string;
  tipo: TipoEtapa;
  status: StatusEtapa;
  ordem: number;
  usuarioResponsavelNome?: string | null;
  dados: Record<string, unknown>;
  entrouEm: string;
  iniciadoEm?: string | null;
  concluidoEm?: string | null;
}

export interface Historico {
  acao: string;
  etapa?: TipoEtapa | null;
  campo?: string | null;
  valorAnterior?: string | null;
  valorNovo?: string | null;
  usuarioNome: string;
  criadoEm: string;
}

export interface AtendimentoDetalhe {
  id: string;
  codigo: string;
  consentimentoRegistro: boolean;
  pacienteNome: string;
  pacienteDocumentoTipo?: string | null;
  pacienteDocumentoNumero?: string | null;
  pacienteDataNascimento?: string | null;
  pacienteSexo?: string | null;
  pacienteAlergias?: string | null;
  risco: RiscoClassificacao;
  status: StatusAtendimento;
  queixaPrincipal?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  precisaoMetros?: number | null;
  criadoEm: string;
  finalizadoEm?: string | null;
  etapas: Etapa[];
  historico: Historico[];
}

export interface PainelResumo {
  total: number;
  vermelho: number;
  amarelo: number;
  verde: number;
  preto: number;
  semClassificacao: number;
}
