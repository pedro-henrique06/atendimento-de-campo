import type {
  AcaoAuditoria,
  ClassificacaoRisco,
  CondicaoCronica,
  ConselhoTipo,
  DesfechoAtendimento,
  DesfechoConsulta,
  EstadoDente,
  Especialidade,
  FaixaImc,
  FaceDentaria,
  FormaFarmaceutica,
  FuncaoProfissional,
  Idioma,
  ProcedimentoEnfermagem,
  ProcedimentoOdontologico,
  PerdaVivenciada,
  Sexo,
  Sintoma,
  SintomaSaudeMental,
  StatusAlergia,
  StatusAtendimento,
  StatusConta,
  StatusEtapa,
  TipoDocumento,
  UnidadeDispensacao,
  ViaAdministracao,
  Vulnerabilidade,
} from '../api/tipos';

type Traducao<T extends string> = Record<Idioma, Record<T, string>>;

/**
 * Rótulos de cada valor de enum nos três idiomas.
 *
 * O sistema de referência exibia `consulta_medica` cru no relatório de
 * encaminhamentos, no meio de rótulos traduzidos: faltava a chave e a interface
 * caiu no valor bruto. `enums.spec.ts` percorre estas tabelas e falha se algum
 * valor ficar sem tradução em algum idioma, para que isso não volte a acontecer
 * em silêncio.
 */

export const especialidades: Traducao<Especialidade> = {
  Pt: {
    Triagem: 'Triagem',
    ClinicaGeral: 'Clínica Geral',
    Pediatria: 'Pediatria',
    Ortopedia: 'Ortopedia',
    Odontologia: 'Odontologia',
    Enfermagem: 'Enfermagem',
    SaudeMental: 'Saúde Mental',
  },
  Es: {
    Triagem: 'Triaje',
    ClinicaGeral: 'Medicina General',
    Pediatria: 'Pediatría',
    Ortopedia: 'Ortopedia',
    Odontologia: 'Odontología',
    Enfermagem: 'Enfermería',
    SaudeMental: 'Salud Mental',
  },
  En: {
    Triagem: 'Triage',
    ClinicaGeral: 'General Practice',
    Pediatria: 'Paediatrics',
    Ortopedia: 'Orthopaedics',
    Odontologia: 'Dentistry',
    Enfermagem: 'Nursing',
    SaudeMental: 'Mental Health',
  },
};

export const funcoes: Traducao<FuncaoProfissional> = {
  Pt: {
    Medico: 'Médico(a) (sem especialidade)',
    ClinicoGeral: 'Clínico(a) geral',
    Pediatra: 'Pediatra',
    Ortopedista: 'Ortopedista',
    Enfermeiro: 'Enfermeiro(a)',
    TecnicoEnfermagem: 'Técnico(a) de enfermagem',
    Dentista: 'Dentista',
    Psicologo: 'Psicólogo(a)',
    Fisioterapeuta: 'Fisioterapeuta',
    Farmaceutico: 'Farmacêutico(a)',
    Recepcao: 'Recepção',
    Coordenacao: 'Coordenação',
    Outro: 'Outro',
  },
  Es: {
    Medico: 'Médico(a) (sin especialidad)',
    ClinicoGeral: 'Médico(a) general',
    Pediatra: 'Pediatra',
    Ortopedista: 'Traumatólogo(a)',
    Enfermeiro: 'Enfermero(a)',
    TecnicoEnfermagem: 'Técnico(a) de enfermería',
    Dentista: 'Dentista',
    Psicologo: 'Psicólogo(a)',
    Fisioterapeuta: 'Fisioterapeuta',
    Farmaceutico: 'Farmacéutico(a)',
    Recepcao: 'Recepción',
    Coordenacao: 'Coordinación',
    Outro: 'Otro',
  },
  En: {
    Medico: 'Doctor (no specialty)',
    ClinicoGeral: 'General practitioner',
    Pediatra: 'Paediatrician',
    Ortopedista: 'Orthopaedist',
    Enfermeiro: 'Nurse',
    TecnicoEnfermagem: 'Nursing technician',
    Dentista: 'Dentist',
    Psicologo: 'Psychologist',
    Fisioterapeuta: 'Physiotherapist',
    Farmaceutico: 'Pharmacist',
    Recepcao: 'Reception',
    Coordenacao: 'Coordination',
    Outro: 'Other',
  },
};

/**
 * Faixa de IMC. Só aparece para adulto — em criança o IMC se lê em curva por
 * idade, e o corte da OMS diria "baixo peso" para uma criança saudável.
 */
export const faixasImc: Traducao<FaixaImc> = {
  Pt: {
    Baixo: 'Abaixo do peso',
    Adequado: 'Peso adequado',
    Sobrepeso: 'Sobrepeso',
    Obesidade: 'Obesidade',
  },
  Es: {
    Baixo: 'Bajo peso',
    Adequado: 'Peso adecuado',
    Sobrepeso: 'Sobrepeso',
    Obesidade: 'Obesidad',
  },
  En: {
    Baixo: 'Underweight',
    Adequado: 'Healthy weight',
    Sobrepeso: 'Overweight',
    Obesidade: 'Obesity',
  },
};

export const conselhos: Traducao<ConselhoTipo> = {
  Pt: { Nenhum: '—', Crm: 'CRM', Coren: 'COREN', Cro: 'CRO', Crp: 'CRP', Crefito: 'CREFITO', Crf: 'CRF' },
  Es: { Nenhum: '—', Crm: 'CRM', Coren: 'COREN', Cro: 'CRO', Crp: 'CRP', Crefito: 'CREFITO', Crf: 'CRF' },
  En: { Nenhum: '—', Crm: 'CRM', Coren: 'COREN', Cro: 'CRO', Crp: 'CRP', Crefito: 'CREFITO', Crf: 'CRF' },
};

export const classificacoes: Traducao<ClassificacaoRisco> = {
  Pt: {
    Vermelho: 'Vermelho — emergência (imediato)',
    Amarelo: 'Amarelo — urgente',
    Verde: 'Verde — não urgente',
    Preto: 'Preto — expectante',
  },
  Es: {
    Vermelho: 'Rojo — emergencia (inmediato)',
    Amarelo: 'Amarillo — urgente',
    Verde: 'Verde — no urgente',
    Preto: 'Negro — expectante',
  },
  En: {
    Vermelho: 'Red — immediate',
    Amarelo: 'Yellow — delayed',
    Verde: 'Green — minor',
    Preto: 'Black — expectant',
  },
};

/** Versão curta, para os cartões do painel. */
export const classificacoesCurtas: Traducao<ClassificacaoRisco> = {
  Pt: { Vermelho: 'Vermelho', Amarelo: 'Amarelo', Verde: 'Verde', Preto: 'Preto' },
  Es: { Vermelho: 'Rojo', Amarelo: 'Amarillo', Verde: 'Verde', Preto: 'Negro' },
  En: { Vermelho: 'Red', Amarelo: 'Yellow', Verde: 'Green', Preto: 'Black' },
};

export const statusAtendimento: Traducao<StatusAtendimento> = {
  Pt: {
    Aberto: 'Aberto',
    EmAndamento: 'Em andamento',
    Finalizado: 'Finalizado',
    Evadido: 'Evadido',
    Cancelado: 'Cancelado',
  },
  Es: {
    Aberto: 'Abierto',
    EmAndamento: 'En curso',
    Finalizado: 'Finalizado',
    Evadido: 'Abandonó',
    Cancelado: 'Cancelado',
  },
  En: {
    Aberto: 'Open',
    EmAndamento: 'In progress',
    Finalizado: 'Finished',
    Evadido: 'Left',
    Cancelado: 'Cancelled',
  },
};

/**
 * Situação de uma conta, no singular. Os filtros da tela de gestão usam o
 * plural ("Pendentes"), que não serve para rotular um registro só.
 */
export const statusConta: Traducao<StatusConta> = {
  Pt: {
    Pendente: 'Pendente',
    Ativa: 'Ativa',
    Recusada: 'Recusada',
    Desativada: 'Desativada',
  },
  Es: {
    Pendente: 'Pendiente',
    Ativa: 'Activa',
    Recusada: 'Rechazada',
    Desativada: 'Desactivada',
  },
  En: {
    Pendente: 'Pending',
    Ativa: 'Active',
    Recusada: 'Declined',
    Desativada: 'Deactivated',
  },
};

export const statusEtapa: Traducao<StatusEtapa> = {
  Pt: { Aguardando: 'Aguardando', EmAndamento: 'Em andamento', Concluida: 'Concluída', Cancelada: 'Cancelada' },
  Es: { Aguardando: 'Esperando', EmAndamento: 'En curso', Concluida: 'Concluida', Cancelada: 'Cancelada' },
  En: { Aguardando: 'Waiting', EmAndamento: 'In progress', Concluida: 'Completed', Cancelada: 'Cancelled' },
};

export const desfechos: Traducao<DesfechoConsulta> = {
  Pt: { Alta: 'Alta', Encaminhado: 'Encaminhado', Retorno: 'Retorno', Evasao: 'Evasão' },
  Es: { Alta: 'Alta', Encaminhado: 'Derivado', Retorno: 'Control', Evasao: 'Abandono' },
  En: { Alta: 'Discharged', Encaminhado: 'Referred', Retorno: 'Follow-up', Evasao: 'Left' },
};

/**
 * Como o atendimento inteiro terminou — o bloco "Desfecho" do formulário de
 * papel. Distinto de `desfechos`, que é o desfecho de uma consulta.
 */
export const desfechosAtendimento: Traducao<DesfechoAtendimento> = {
  Pt: {
    Alta: 'Alta',
    TransferenciaHospitalar: 'Transferência hospitalar',
    Obito: 'Óbito',
    Outro: 'Outro',
  },
  Es: {
    Alta: 'Alta',
    TransferenciaHospitalar: 'Traslado hospitalario',
    Obito: 'Fallecimiento',
    Outro: 'Otro',
  },
  En: {
    Alta: 'Discharged',
    TransferenciaHospitalar: 'Hospital transfer',
    Obito: 'Death',
    Outro: 'Other',
  },
};

export const sexos: Traducao<Sexo> = {
  Pt: { NaoInformado: 'Não informado', Feminino: 'Feminino', Masculino: 'Masculino', Outro: 'Outro' },
  Es: { NaoInformado: 'No informado', Feminino: 'Femenino', Masculino: 'Masculino', Outro: 'Otro' },
  En: { NaoInformado: 'Not stated', Feminino: 'Female', Masculino: 'Male', Outro: 'Other' },
};

export const tiposDocumento: Traducao<TipoDocumento> = {
  Pt: {
    SemDocumento: 'Sem documento',
    CedulaIdentidade: 'Cédula de identidade',
    Passaporte: 'Passaporte',
    Cpf: 'CPF',
    Rg: 'RG',
    CarteiraEstrangeiro: 'Carteira de estrangeiro',
    CertidaoNascimento: 'Certidão de nascimento',
    Outro: 'Outro',
  },
  Es: {
    SemDocumento: 'Sin documento',
    CedulaIdentidade: 'Cédula de identidad',
    Passaporte: 'Pasaporte',
    Cpf: 'CPF',
    Rg: 'RG',
    CarteiraEstrangeiro: 'Carné de extranjería',
    CertidaoNascimento: 'Partida de nacimiento',
    Outro: 'Otro',
  },
  En: {
    SemDocumento: 'No document',
    CedulaIdentidade: 'National ID',
    Passaporte: 'Passport',
    Cpf: 'CPF',
    Rg: 'RG',
    CarteiraEstrangeiro: 'Foreigner ID',
    CertidaoNascimento: 'Birth certificate',
    Outro: 'Other',
  },
};

export const statusAlergia: Traducao<StatusAlergia> = {
  Pt: {
    NaoPerguntado: 'Não perguntado',
    SemAlergiaConhecida: 'Sem alergia conhecida',
    PossuiAlergia: 'Possui alergia',
  },
  Es: {
    NaoPerguntado: 'No preguntado',
    SemAlergiaConhecida: 'Sin alergia conocida',
    PossuiAlergia: 'Tiene alergia',
  },
  En: {
    NaoPerguntado: 'Not asked',
    SemAlergiaConhecida: 'No known allergy',
    PossuiAlergia: 'Has allergy',
  },
};

export const sintomas: Traducao<Sintoma> = {
  Pt: {
    Dor: 'Dor',
    Tosse: 'Tosse',
    Febre: 'Febre',
    Diarreia: 'Diarreia',
    Vomito: 'Vômito',
    ErupcaoCutanea: 'Erupção cutânea',
    FaltaDeAr: 'Falta de ar',
    Cefaleia: 'Cefaleia',
    Outro: 'Outro',
  },
  Es: {
    Dor: 'Dolor',
    Tosse: 'Tos',
    Febre: 'Fiebre',
    Diarreia: 'Diarrea',
    Vomito: 'Vómito',
    ErupcaoCutanea: 'Erupción cutánea',
    FaltaDeAr: 'Falta de aire',
    Cefaleia: 'Cefalea',
    Outro: 'Otro',
  },
  En: {
    Dor: 'Pain',
    Tosse: 'Cough',
    Febre: 'Fever',
    Diarreia: 'Diarrhoea',
    Vomito: 'Vomiting',
    ErupcaoCutanea: 'Rash',
    FaltaDeAr: 'Shortness of breath',
    Cefaleia: 'Headache',
    Outro: 'Other',
  },
};

export const condicoesCronicas: Traducao<CondicaoCronica> = {
  Pt: {
    Hipertensao: 'Hipertensão',
    Diabetes: 'Diabetes',
    Asma: 'Asma',
    Obesidade: 'Obesidade',
    Cardiopatia: 'Cardiopatia',
    Epilepsia: 'Epilepsia',
    Outro: 'Outro',
  },
  Es: {
    Hipertensao: 'Hipertensión',
    Diabetes: 'Diabetes',
    Asma: 'Asma',
    Obesidade: 'Obesidad',
    Cardiopatia: 'Cardiopatía',
    Epilepsia: 'Epilepsia',
    Outro: 'Otro',
  },
  En: {
    Hipertensao: 'Hypertension',
    Diabetes: 'Diabetes',
    Asma: 'Asthma',
    Obesidade: 'Obesity',
    Cardiopatia: 'Heart disease',
    Epilepsia: 'Epilepsy',
    Outro: 'Other',
  },
};

export const vulnerabilidades: Traducao<Vulnerabilidade> = {
  Pt: {
    Idoso65Mais: 'Maior de 65 anos',
    Gestante: 'Gestante',
    Lactante: 'Lactante',
    CriancaMenor5: 'Criança menor de 5 anos',
    AuxilioMobilidade: 'Necessita auxílio de mobilidade',
    Deficiencia: 'Pessoa com deficiência',
    Desacompanhado: 'Desacompanhado',
    Outro: 'Outro',
  },
  Es: {
    Idoso65Mais: 'Mayor de 65 años',
    Gestante: 'Gestante',
    Lactante: 'Lactante',
    CriancaMenor5: 'Niño menor de 5 años',
    AuxilioMobilidade: 'Necesita apoyo de movilidad',
    Deficiencia: 'Persona con discapacidad',
    Desacompanhado: 'No acompañado',
    Outro: 'Otro',
  },
  En: {
    Idoso65Mais: 'Over 65',
    Gestante: 'Pregnant',
    Lactante: 'Breastfeeding',
    CriancaMenor5: 'Child under 5',
    AuxilioMobilidade: 'Needs mobility support',
    Deficiencia: 'Person with disability',
    Desacompanhado: 'Unaccompanied',
    Outro: 'Other',
  },
};

export const vias: Traducao<ViaAdministracao> = {
  Pt: {
    Oral: 'Oral',
    Intramuscular: 'Intramuscular',
    Intravenosa: 'Intravenosa',
    Subcutanea: 'Subcutânea',
    Topica: 'Tópica',
    Inalatoria: 'Inalatória',
    Oftalmica: 'Oftálmica',
    Otologica: 'Otológica',
    Retal: 'Retal',
    Nasal: 'Nasal',
  },
  Es: {
    Oral: 'Oral',
    Intramuscular: 'Intramuscular',
    Intravenosa: 'Intravenosa',
    Subcutanea: 'Subcutánea',
    Topica: 'Tópica',
    Inalatoria: 'Inhalatoria',
    Oftalmica: 'Oftálmica',
    Otologica: 'Ótica',
    Retal: 'Rectal',
    Nasal: 'Nasal',
  },
  En: {
    Oral: 'Oral',
    Intramuscular: 'Intramuscular',
    Intravenosa: 'Intravenous',
    Subcutanea: 'Subcutaneous',
    Topica: 'Topical',
    Inalatoria: 'Inhaled',
    Oftalmica: 'Ophthalmic',
    Otologica: 'Otic',
    Retal: 'Rectal',
    Nasal: 'Nasal',
  },
};

export const formas: Traducao<FormaFarmaceutica> = {
  Pt: {
    Comprimido: 'Comprimido',
    Capsula: 'Cápsula',
    Xarope: 'Xarope',
    Suspensao: 'Suspensão',
    SolucaoOral: 'Solução oral',
    Ampola: 'Ampola',
    Frasco: 'Frasco',
    Sache: 'Sachê',
    Creme: 'Creme',
    Pomada: 'Pomada',
    Colirio: 'Colírio',
    Inalador: 'Inalador',
    Supositorio: 'Supositório',
    Insumo: 'Insumo',
  },
  Es: {
    Comprimido: 'Comprimido',
    Capsula: 'Cápsula',
    Xarope: 'Jarabe',
    Suspensao: 'Suspensión',
    SolucaoOral: 'Solución oral',
    Ampola: 'Ampolla',
    Frasco: 'Frasco',
    Sache: 'Sobre',
    Creme: 'Crema',
    Pomada: 'Pomada',
    Colirio: 'Colirio',
    Inalador: 'Inhalador',
    Supositorio: 'Supositorio',
    Insumo: 'Insumo',
  },
  En: {
    Comprimido: 'Tablet',
    Capsula: 'Capsule',
    Xarope: 'Syrup',
    Suspensao: 'Suspension',
    SolucaoOral: 'Oral solution',
    Ampola: 'Ampoule',
    Frasco: 'Bottle',
    Sache: 'Sachet',
    Creme: 'Cream',
    Pomada: 'Ointment',
    Colirio: 'Eye drops',
    Inalador: 'Inhaler',
    Supositorio: 'Suppository',
    Insumo: 'Supply',
  },
};

export const unidades: Traducao<UnidadeDispensacao> = {
  Pt: {
    Comprimido: 'comprimido(s)',
    Capsula: 'cápsula(s)',
    Frasco: 'frasco(s)',
    Ampola: 'ampola(s)',
    Sache: 'sachê(s)',
    Tubo: 'tubo(s)',
    Dose: 'dose(s)',
    Unidade: 'unidade(s)',
    Ml: 'mL',
  },
  Es: {
    Comprimido: 'comprimido(s)',
    Capsula: 'cápsula(s)',
    Frasco: 'frasco(s)',
    Ampola: 'ampolla(s)',
    Sache: 'sobre(s)',
    Tubo: 'tubo(s)',
    Dose: 'dosis',
    Unidade: 'unidad(es)',
    Ml: 'mL',
  },
  En: {
    Comprimido: 'tablet(s)',
    Capsula: 'capsule(s)',
    Frasco: 'bottle(s)',
    Ampola: 'ampoule(s)',
    Sache: 'sachet(s)',
    Tubo: 'tube(s)',
    Dose: 'dose(s)',
    Unidade: 'unit(s)',
    Ml: 'mL',
  },
};

export const estadosDente: Traducao<EstadoDente> = {
  Pt: {
    Higido: 'Hígido',
    Carie: 'Cárie',
    Restaurado: 'Restaurado',
    Ausente: 'Ausente',
    ExtracaoIndicada: 'Extração indicada',
    Fratura: 'Fratura',
    Selante: 'Selante',
    Protese: 'Prótese',
    Implante: 'Implante',
    RestoRadicular: 'Resto radicular',
  },
  Es: {
    Higido: 'Sano',
    Carie: 'Caries',
    Restaurado: 'Restaurado',
    Ausente: 'Ausente',
    ExtracaoIndicada: 'Extracción indicada',
    Fratura: 'Fractura',
    Selante: 'Sellante',
    Protese: 'Prótesis',
    Implante: 'Implante',
    RestoRadicular: 'Resto radicular',
  },
  En: {
    Higido: 'Healthy',
    Carie: 'Caries',
    Restaurado: 'Restored',
    Ausente: 'Missing',
    ExtracaoIndicada: 'Extraction indicated',
    Fratura: 'Fracture',
    Selante: 'Sealant',
    Protese: 'Prosthesis',
    Implante: 'Implant',
    RestoRadicular: 'Root remnant',
  },
};

export const faces: Traducao<FaceDentaria> = {
  Pt: {
    Mesial: 'Mesial',
    Distal: 'Distal',
    Oclusal: 'Oclusal',
    Vestibular: 'Vestibular',
    Lingual: 'Lingual',
    Incisal: 'Incisal',
    Cervical: 'Cervical',
  },
  Es: {
    Mesial: 'Mesial',
    Distal: 'Distal',
    Oclusal: 'Oclusal',
    Vestibular: 'Vestibular',
    Lingual: 'Lingual',
    Incisal: 'Incisal',
    Cervical: 'Cervical',
  },
  En: {
    Mesial: 'Mesial',
    Distal: 'Distal',
    Oclusal: 'Occlusal',
    Vestibular: 'Buccal',
    Lingual: 'Lingual',
    Incisal: 'Incisal',
    Cervical: 'Cervical',
  },
};

export const procedimentosOdontologicos: Traducao<ProcedimentoOdontologico> = {
  Pt: {
    ProfilaxiaLimpeza: 'Profilaxia / limpeza',
    OrientacaoHigieneBucal: 'Orientação de higiene bucal',
    Restauracao: 'Restauração',
    Exodontia: 'Exodontia',
    DrenagemAbscesso: 'Drenagem de abscesso',
    AplicacaoFluor: 'Aplicação de flúor',
    Raspagem: 'Raspagem',
    Outro: 'Outro',
  },
  Es: {
    ProfilaxiaLimpeza: 'Profilaxis / limpieza',
    OrientacaoHigieneBucal: 'Orientación de higiene bucal',
    Restauracao: 'Restauración',
    Exodontia: 'Exodoncia',
    DrenagemAbscesso: 'Drenaje de absceso',
    AplicacaoFluor: 'Aplicación de flúor',
    Raspagem: 'Raspado',
    Outro: 'Otro',
  },
  En: {
    ProfilaxiaLimpeza: 'Prophylaxis / cleaning',
    OrientacaoHigieneBucal: 'Oral hygiene instruction',
    Restauracao: 'Restoration',
    Exodontia: 'Extraction',
    DrenagemAbscesso: 'Abscess drainage',
    AplicacaoFluor: 'Fluoride application',
    Raspagem: 'Scaling',
    Outro: 'Other',
  },
};

export const procedimentosEnfermagem: Traducao<ProcedimentoEnfermagem> = {
  Pt: {
    Curativo: 'Curativo',
    AdministracaoMedicamento: 'Administração de medicamento',
    AfericaoSinaisVitais: 'Aferição de sinais vitais',
    GlicemiaCapilar: 'Glicemia capilar',
    Nebulizacao: 'Nebulização',
    RetiradaPontos: 'Retirada de pontos',
    Imobilizacao: 'Imobilização',
    Orientacao: 'Orientação',
    Outro: 'Outro',
  },
  Es: {
    Curativo: 'Curación',
    AdministracaoMedicamento: 'Administración de medicamento',
    AfericaoSinaisVitais: 'Toma de signos vitales',
    GlicemiaCapilar: 'Glucemia capilar',
    Nebulizacao: 'Nebulización',
    RetiradaPontos: 'Retiro de puntos',
    Imobilizacao: 'Inmovilización',
    Orientacao: 'Orientación',
    Outro: 'Otro',
  },
  En: {
    Curativo: 'Wound dressing',
    AdministracaoMedicamento: 'Medication administration',
    AfericaoSinaisVitais: 'Vital signs check',
    GlicemiaCapilar: 'Capillary glucose',
    Nebulizacao: 'Nebulisation',
    RetiradaPontos: 'Suture removal',
    Imobilizacao: 'Immobilisation',
    Orientacao: 'Guidance',
    Outro: 'Other',
  },
};

export const acoesAuditoria: Traducao<AcaoAuditoria> = {
  Pt: {
    CriouAtendimento: 'criou o atendimento',
    IniciouEtapa: 'iniciou a etapa',
    Editou: 'editou',
    ConcluiuEtapa: 'concluiu a etapa',
    FinalizouAtendimento: 'finalizou o atendimento',
    ReabriuAtendimento: 'reabriu o atendimento',
    EditouAposFinalizacao: 'editou após a finalização',
    Cancelou: 'cancelou',
    AssumiuEtapa: 'assumiu o atendimento',
    LiberouEtapa: 'devolveu à fila',
    EncaminhouParaOutraFila: 'encaminhou para outra fila',
    AssumiuForaDaSuaFila: 'assumiu fora da própria fila',
    DeuAlta: 'deu alta',
    DevolveuParaOrigem: 'devolveu a quem encaminhou',
    CancelouFilaPendente: 'cancelou a fila pendente',
    RegistrouObito: 'registrou o óbito',
    TransferiuParaHospital: 'transferiu para hospital',
    EncerrouPorOutroMotivo: 'encerrou por outro motivo',
  },
  Es: {
    CriouAtendimento: 'creó la atención',
    IniciouEtapa: 'inició la etapa',
    Editou: 'editó',
    ConcluiuEtapa: 'concluyó la etapa',
    FinalizouAtendimento: 'finalizó la atención',
    ReabriuAtendimento: 'reabrió la atención',
    EditouAposFinalizacao: 'editó después de finalizar',
    Cancelou: 'canceló',
    AssumiuEtapa: 'asumió la atención',
    LiberouEtapa: 'devolvió a la fila',
    EncaminhouParaOutraFila: 'derivó a otra fila',
    AssumiuForaDaSuaFila: 'asumió fuera de su propia fila',
    DeuAlta: 'dio el alta',
    DevolveuParaOrigem: 'devolvió a quien derivó',
    CancelouFilaPendente: 'canceló la fila pendiente',
    RegistrouObito: 'registró el fallecimiento',
    TransferiuParaHospital: 'transfirió a hospital',
    EncerrouPorOutroMotivo: 'cerró por otro motivo',
  },
  En: {
    CriouAtendimento: 'created the encounter',
    IniciouEtapa: 'started the step',
    Editou: 'edited',
    ConcluiuEtapa: 'completed the step',
    FinalizouAtendimento: 'finished the encounter',
    ReabriuAtendimento: 'reopened the encounter',
    EditouAposFinalizacao: 'edited after finishing',
    Cancelou: 'cancelled',
    AssumiuEtapa: 'took the encounter',
    LiberouEtapa: 'returned it to the queue',
    EncaminhouParaOutraFila: 'referred to another queue',
    AssumiuForaDaSuaFila: 'took it outside their own queue',
    DeuAlta: 'discharged the patient',
    DevolveuParaOrigem: 'sent it back to the referrer',
    CancelouFilaPendente: 'cancelled the pending queue',
    RegistrouObito: 'recorded the death',
    TransferiuParaHospital: 'transferred to hospital',
    EncerrouPorOutroMotivo: 'closed for another reason',
  },
};


export const sintomasSaudeMental: Traducao<SintomaSaudeMental> = {
  Pt: {
    Tristeza: 'Tristeza',
    Ansiedade: 'Ansiedade',
    Insonia: 'Insônia',
    Luto: 'Luto',
    IdeacaoSuicida: 'Ideação suicida',
    Agitacao: 'Agitação',
    Outro: 'Outro',
  },
  Es: {
    Tristeza: 'Tristeza',
    Ansiedade: 'Ansiedad',
    Insonia: 'Insomnio',
    Luto: 'Duelo',
    IdeacaoSuicida: 'Ideación suicida',
    Agitacao: 'Agitación',
    Outro: 'Otro',
  },
  En: {
    Tristeza: 'Sadness',
    Ansiedade: 'Anxiety',
    Insonia: 'Insomnia',
    Luto: 'Grief',
    IdeacaoSuicida: 'Suicidal ideation',
    Agitacao: 'Agitation',
    Outro: 'Other',
  },
};

export const perdasVivenciadas: Traducao<PerdaVivenciada> = {
  Pt: {
    Casa: 'Casa',
    Familiar: 'Familiar',
    AnimalEstimacao: 'Animal de estimação',
    Trabalho: 'Trabalho',
    Documentos: 'Documentos',
    Outro: 'Outro',
  },
  Es: {
    Casa: 'Casa',
    Familiar: 'Familiar',
    AnimalEstimacao: 'Mascota',
    Trabalho: 'Trabajo',
    Documentos: 'Documentos',
    Outro: 'Otro',
  },
  En: {
    Casa: 'Home',
    Familiar: 'Family member',
    AnimalEstimacao: 'Pet',
    Trabalho: 'Job',
    Documentos: 'Documents',
    Outro: 'Other',
  },
};

/** Todas as tabelas, para o teste que garante cobertura nos três idiomas. */
export const tabelasDeEnum = {
  especialidades,
  funcoes,
  faixasImc,
  conselhos,
  classificacoes,
  classificacoesCurtas,
  statusAtendimento,
  statusConta,
  statusEtapa,
  desfechos,
  desfechosAtendimento,
  sexos,
  tiposDocumento,
  statusAlergia,
  sintomas,
  condicoesCronicas,
  vulnerabilidades,
  vias,
  formas,
  unidades,
  estadosDente,
  faces,
  procedimentosOdontologicos,
  procedimentosEnfermagem,
  sintomasSaudeMental,
  perdasVivenciadas,
  acoesAuditoria,
};
