// Contratos da API. Os enums viajam como texto, entao sao uniões de string
// literal: o compilador rejeita um valor que o backend nao conhece.

export type Idioma = 'Pt' | 'Es' | 'En';

/**
 * Profissao de quem opera o sistema. E ela que decide em que fila a pessoa cai.
 *
 * `Medico` sem especialidade existe apenas para as contas criadas antes de
 * clinico geral, pediatra e ortopedista serem profissoes separadas — a API
 * recusa em cadastro novo. Ver `FUNCOES_PARA_CADASTRO`.
 */
export type FuncaoProfissional =
  | 'Medico'
  | 'Enfermeiro'
  | 'TecnicoEnfermagem'
  | 'Dentista'
  | 'Psicologo'
  | 'Fisioterapeuta'
  | 'Farmaceutico'
  | 'Recepcao'
  | 'Coordenacao'
  | 'Outro'
  | 'ClinicoGeral'
  | 'Pediatra'
  | 'Ortopedista';

/**
 * Profissoes oferecidas num cadastro novo, na ordem em que a tela lista.
 * Espelha `FilasDaFuncao.ParaCadastro` no backend.
 */
export const FUNCOES_PARA_CADASTRO: FuncaoProfissional[] = [
  'ClinicoGeral',
  'Pediatra',
  'Ortopedista',
  'Dentista',
  'Enfermeiro',
  'TecnicoEnfermagem',
  'Psicologo',
  'Fisioterapeuta',
  'Farmaceutico',
  'Recepcao',
  'Coordenacao',
  'Outro',
];

export type ConselhoTipo = 'Nenhum' | 'Crm' | 'Coren' | 'Cro' | 'Crp' | 'Crefito' | 'Crf';

export type Especialidade =
  | 'Triagem'
  | 'ClinicaGeral'
  | 'Pediatria'
  | 'Ortopedia'
  | 'Odontologia'
  | 'Enfermagem'
  | 'SaudeMental';

export type Sexo = 'NaoInformado' | 'Feminino' | 'Masculino' | 'Outro';

export type TipoDocumento =
  | 'SemDocumento'
  | 'CedulaIdentidade'
  | 'Passaporte'
  | 'Cpf'
  | 'Rg'
  | 'CarteiraEstrangeiro'
  | 'CertidaoNascimento'
  | 'Outro';

export type ClassificacaoRisco = 'Vermelho' | 'Amarelo' | 'Verde' | 'Preto';

export type StatusAtendimento = 'Aberto' | 'EmAndamento' | 'Finalizado' | 'Evadido' | 'Cancelado';

export type StatusEtapa = 'Aguardando' | 'EmAndamento' | 'Concluida' | 'Cancelada';

export type DesfechoConsulta = 'Alta' | 'Encaminhado' | 'Retorno' | 'Evasao';

export type Sintoma =
  | 'Dor'
  | 'Tosse'
  | 'Febre'
  | 'Diarreia'
  | 'Vomito'
  | 'ErupcaoCutanea'
  | 'FaltaDeAr'
  | 'Cefaleia'
  | 'Outro';

export type CondicaoCronica =
  | 'Hipertensao'
  | 'Diabetes'
  | 'Asma'
  | 'Obesidade'
  | 'Cardiopatia'
  | 'Epilepsia'
  | 'Outro';

export type Vulnerabilidade =
  | 'Idoso65Mais'
  | 'Gestante'
  | 'Lactante'
  | 'CriancaMenor5'
  | 'AuxilioMobilidade'
  | 'Deficiencia'
  | 'Desacompanhado'
  | 'Outro';

export type SintomaSaudeMental =
  | 'Tristeza'
  | 'Ansiedade'
  | 'Insonia'
  | 'Luto'
  | 'IdeacaoSuicida'
  | 'Agitacao'
  | 'Outro';

export type PerdaVivenciada =
  | 'Casa'
  | 'Familiar'
  | 'AnimalEstimacao'
  | 'Trabalho'
  | 'Documentos'
  | 'Outro';

/** Ver a nota sobre o alerta de alergia em `AlertaAlergia` no backend. */
export type StatusAlergia = 'NaoPerguntado' | 'SemAlergiaConhecida' | 'PossuiAlergia';

export type ViaAdministracao =
  | 'Oral'
  | 'Intramuscular'
  | 'Intravenosa'
  | 'Subcutanea'
  | 'Topica'
  | 'Inalatoria'
  | 'Oftalmica'
  | 'Otologica'
  | 'Retal'
  | 'Nasal';

export type FormaFarmaceutica =
  | 'Comprimido'
  | 'Capsula'
  | 'Xarope'
  | 'Suspensao'
  | 'SolucaoOral'
  | 'Ampola'
  | 'Frasco'
  | 'Sache'
  | 'Creme'
  | 'Pomada'
  | 'Colirio'
  | 'Inalador'
  | 'Supositorio'
  | 'Insumo';

export type UnidadeDispensacao =
  | 'Comprimido'
  | 'Capsula'
  | 'Frasco'
  | 'Ampola'
  | 'Sache'
  | 'Tubo'
  | 'Dose'
  | 'Unidade'
  | 'Ml';

export type CategoriaItem = 'Medicamento' | 'Insumo' | 'Material' | 'Ortese';

export type FaceDentaria =
  | 'Mesial'
  | 'Distal'
  | 'Oclusal'
  | 'Vestibular'
  | 'Lingual'
  | 'Incisal'
  | 'Cervical';

export type EstadoDente =
  | 'Higido'
  | 'Carie'
  | 'Restaurado'
  | 'Ausente'
  | 'ExtracaoIndicada'
  | 'Fratura'
  | 'Selante'
  | 'Protese'
  | 'Implante'
  | 'RestoRadicular';

export type ProcedimentoOdontologico =
  | 'ProfilaxiaLimpeza'
  | 'OrientacaoHigieneBucal'
  | 'Restauracao'
  | 'Exodontia'
  | 'DrenagemAbscesso'
  | 'AplicacaoFluor'
  | 'Raspagem'
  | 'Outro';

export type ProcedimentoEnfermagem =
  | 'Curativo'
  | 'AdministracaoMedicamento'
  | 'AfericaoSinaisVitais'
  | 'GlicemiaCapilar'
  | 'Nebulizacao'
  | 'RetiradaPontos'
  | 'Imobilizacao'
  | 'Orientacao'
  | 'Outro';

export type StatusConta = 'Pendente' | 'Ativa' | 'Recusada' | 'Desativada';

/** Por que o login foi recusado. Vem como código; a tela é que traduz. */
export type MotivoRecusaLogin =
  | 'CredenciaisInvalidas'
  | 'ContaPendente'
  | 'ContaRecusada'
  | 'ContaDesativada';

export type AcaoAuditoria =
  | 'CriouAtendimento'
  | 'IniciouEtapa'
  | 'Editou'
  | 'ConcluiuEtapa'
  | 'FinalizouAtendimento'
  | 'ReabriuAtendimento'
  | 'EditouAposFinalizacao'
  | 'Cancelou'
  | 'AssumiuEtapa'
  | 'LiberouEtapa'
  | 'EncaminhouParaOutraFila'
  /**
   * Assumiu um paciente numa fila que não é da profissão dele. É permitido — em
   * campo as funções se cobrem — mas fica registrado, porque exceção sem rastro
   * vira rotina silenciosa.
   */
  | 'AssumiuForaDaSuaFila';

// ---------------------------------------------------------------------------

export interface Profissional {
  id: string;
  usuario: string;
  nome: string;
  email: string | null;
  funcao: FuncaoProfissional;
  conselhoTipo: ConselhoTipo;
  registro: string | null;
  idioma: Idioma;
  status: StatusConta;
  ehAdministrador: boolean;
  motivoRecusa: string | null;
  criadoEm: string;
  /**
   * Filas da profissao, na ordem em que a tela deve oferece-las. A primeira e a
   * que abre por padrao.
   *
   * Nao e tranca: ver e agir fora dela continua possivel, porque em campo as
   * funcoes se cobrem. O que muda e o rastro — assumir um paciente fora daqui
   * fica gravado no historico do atendimento.
   */
  filas: Especialidade[];
  /**
   * A senha ainda e a provisoria que a coordenacao entregou. Enquanto for
   * verdadeiro, a API recusa tudo menos a troca de senha.
   */
  precisaTrocarSenha: boolean;
}

/**
 * Conta recem-criada e a senha do primeiro acesso.
 *
 * A senha aparece so nesta resposta: nao ha como consulta-la depois, porque o
 * servidor guarda apenas o hash.
 */
export interface ContaCriada {
  profissional: Profissional;
  senhaProvisoria: string;
}

export interface RespostaLogin {
  token: string;
  expiraEm: string;
  profissional: Profissional;
}

export interface UsuarioDisponivel {
  usuario: string;
  disponivel: boolean;
}

export interface Base {
  id: string;
  nome: string;
  prefixoCodigo: string;
  ativa: boolean;
}

export interface AlertaAlergia {
  exibir: boolean;
  texto: string | null;
}

export interface Paciente {
  id: string;
  /** Codigo que o paciente leva anotado, ex.: "4K7Z-2YAP". */
  codigo: string;
  nome: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string | null;
  dataNascimento: string | null;
  idade: number | null;
  sexo: Sexo;
  statusAlergia: StatusAlergia;
  alergias: string | null;
  alerta: AlertaAlergia;
  condicoesCronicas: CondicaoCronica[];
  vulnerabilidades: Vulnerabilidade[];
  consentimentoRegistro: boolean;
}

/**
 * A base como a coordenacao a ve. `totalAtendimentos` explica por que o prefixo
 * travou; `atendimentosAbertos`, por que a desativacao foi recusada.
 */
export interface BaseAdmin {
  id: string;
  nome: string;
  prefixoCodigo: string;
  ativa: boolean;
  criadaEm: string;
  totalAtendimentos: number;
  atendimentosAbertos: number;
  prefixoEditavel: boolean;
}

/** O que a tela mostra para confirmar que e a pessoa certa antes de reabrir. */
export interface PacienteConhecido {
  paciente: Paciente;
  totalAtendimentos: number;
  ultimoAtendimentoEm: string | null;
  ultimaBase: string | null;
}

/**
 * Quem assinou o ato clínico.
 *
 * O nome sozinho não basta numa ficha: o registro no conselho é o que identifica
 * a pessoa fora do sistema, e é o que a equipe e a auditoria procuram quando
 * precisam saber quem atendeu.
 */
export interface Autor {
  nome: string;
  conselho: ConselhoTipo;
  registro: string | null;
}

export interface EtapaResumo {
  id: string;
  especialidade: Especialidade;
  status: StatusEtapa;
  profissional: string | null;
  iniciadaEm: string | null;
  concluidaEm: string | null;
}

export interface AtendimentoResumo {
  id: string;
  codigo: string;
  pacienteNome: string;
  status: StatusAtendimento;
  classificacaoRisco: ClassificacaoRisco | null;
  resumo: string | null;
  etapas: EtapaResumo[];
  criadoEm: string;
  finalizadoEm: string | null;
}

export interface EsperaFila {
  especialidade: Especialidade;
  entrouEm: string;
  saiuEm: string | null;
  esperaMinutos: number | null;
}

export interface RegistroAuditoria {
  profissional: string;
  acao: AcaoAuditoria;
  especialidade: Especialidade | null;
  campo: string | null;
  valorAnterior: string | null;
  valorNovo: string | null;
  criadaEm: string;
}

export interface Localizacao {
  latitude: number;
  longitude: number;
  precisaoMetros: number | null;
}

export interface Triagem {
  etapaId: string;
  profissional: Autor | null;
  pressaoSistolica: number | null;
  pressaoDiastolica: number | null;
  frequenciaCardiaca: number | null;
  frequenciaRespiratoria: number | null;
  saturacaoO2: number | null;
  temperaturaCelsius: number | null;
  glicemiaCapilar: number | null;
  sintomas: Sintoma[];
  outroSintoma: string | null;
  medicamentosEmUso: string | null;
  statusAlergia: StatusAlergia;
  alergias: string | null;
  classificacaoRisco: ClassificacaoRisco;
  encaminhamento: Especialidade | null;
  observacoes: string | null;
  concluidaEm: string | null;
}

export interface Dispensacao {
  id: string;
  item: string;
  quantidade: number;
  unidade: UnidadeDispensacao;
  via: ViaAdministracao | null;
  posologia: string | null;
  foraDoCatalogo: boolean;
}

export interface Ortopedia {
  localizacao: string | null;
  mecanismoTrauma: string | null;
  imobilizacao: boolean;
  necessitaRaioX: boolean;
}

export interface Consulta {
  etapaId: string;
  especialidade: Especialidade;
  profissional: Autor | null;
  sintomasDescricao: string | null;
  cid10Codigo: string | null;
  cid10Descricao: string | null;
  diagnosticoObservacao: string | null;
  conduta: string | null;
  desfecho: DesfechoConsulta | null;
  encaminhadoPara: Especialidade | null;
  ortopedia: Ortopedia | null;
  dispensacoes: Dispensacao[];
  concluidaEm: string | null;
}

export interface MarcacaoDente {
  dente: number;
  estado: EstadoDente;
  faces: FaceDentaria[];
}

export interface Odontologia {
  etapaId: string;
  profissional: Autor | null;
  queixa: string | null;
  cid10Codigo: string | null;
  cid10Descricao: string | null;
  procedimentos: ProcedimentoOdontologico[];
  outroProcedimento: string | null;
  desfecho: DesfechoConsulta | null;
  odontograma: MarcacaoDente[];
  resumoOdontograma: string;
  dispensacoes: Dispensacao[];
  concluidaEm: string | null;
}

export interface Enfermagem {
  etapaId: string;
  profissional: Autor | null;
  procedimentos: ProcedimentoEnfermagem[];
  outroProcedimento: string | null;
  observacoes: string | null;
  desfecho: DesfechoConsulta | null;
  dispensacoes: Dispensacao[];
  concluidaEm: string | null;
}

export interface Prontuario {
  id: string;
  codigo: string;
  base: Base;
  paciente: Paciente;
  status: StatusAtendimento;
  classificacaoRisco: ClassificacaoRisco | null;
  queixaPrincipal: string | null;
  localizacao: Localizacao | null;
  criadoPor: string;
  criadoEm: string;
  finalizadoPor: string | null;
  finalizadoEm: string | null;
  triagem: Triagem | null;
  consultas: Consulta[];
  odontologia: Odontologia | null;
  enfermagem: Enfermagem | null;
  etapas: EtapaResumo[];
  tempoNasFilas: EsperaFila[];
  historico: RegistroAuditoria[];
}

export interface SugestaoStart {
  sugerida: ClassificacaoRisco;
  motivo: string;
  divergente: boolean;
}

export interface ItemCatalogo {
  id: string;
  nome: string;
  principioAtivo: string | null;
  concentracao: string | null;
  forma: FormaFarmaceutica;
  unidade: UnidadeDispensacao;
  categoria: CategoriaItem;
  viasPermitidas: ViaAdministracao[];
}

export interface Cid10 {
  codigo: string;
  descricao: string;
  capitulo: string | null;
}

/** Quanto uma pessoa produziu numa fila, no período. */
export interface ProducaoPorFila {
  especialidade: Especialidade;
  atendimentos: number;
  minutosTotais: number;
}

/**
 * Produção de um profissional no período.
 *
 * Conta etapas concluídas, e não pacientes: quem viu a mesma pessoa na triagem e
 * depois na enfermagem fez dois atendimentos, porque foram dois atos.
 */
export interface ProducaoProfissional {
  profissionalId: string;
  nome: string;
  funcao: FuncaoProfissional;
  conselho: ConselhoTipo;
  registro: string | null;
  atendimentos: number;
  minutosTotais: number;
  /** Mediana, e não média: uma ficha esquecida aberta deformaria a média. */
  minutosMedianos: number | null;
  porFila: ProducaoPorFila[];
}
