/**
 * O elenco: uma conta por profissão que o sistema cadastra.
 *
 * Uma por profissão, e não uma genérica, porque a profissão é o que decide em
 * que fila a pessoa cai (`FilasDaFuncao`, no back). Um único usuário de teste
 * com perfil de coordenação veria as treze filas e o roteiro passaria mesmo se
 * a tabela estivesse errada — é exatamente o erro que isto existe para pegar.
 *
 * `Medico` fica de fora: existe só para as contas anteriores às especialidades,
 * e o cadastro recusa. A recusa é um passo do roteiro, não uma ausência.
 */

/** A mesma para todo o elenco: não guarda nada e aparece no relatório. */
export const SENHA = 'Campo#E2E2026';

/**
 * Cada conta diz também as filas que a API deve devolver para ela, na ordem.
 *
 * É a asserção que dá sentido a ter uma conta por profissão — e é uma das duas
 * guardas contra a tabela de filas divergir entre as pontas. Esta prende a API
 * contra o que está escrito aqui; a outra, em `src/api/filas.spec.ts`, prende a
 * cópia que o app usa para falar de uma profissão que não é a de quem olha.
 * Uma fila nova que entre só de um lado derruba uma das duas.
 */
/** As treze filas, na ordem do enum. */
export const FILAS = [
  'Triagem',
  'ClinicaGeral',
  'Pediatria',
  'Ortopedia',
  'Odontologia',
  'Enfermagem',
  'SaudeMental',
  'Ginecologia',
  'Cirurgia',
  'Anestesia',
  'Cardiologia',
  'Ultrassom',
  'Farmacia',
];

/*
  O registro é só o número: o conselho vem da profissão, e a tela monta
  "CRM 10001" juntando os dois. Gravar "CRM 10001" aqui faria a tela escrever
  "CRM CRM 10001".
*/
export const ELENCO = [
  {
    chave: 'clinico',
    usuario: 'clinico.e2e',
    nome: 'Alda Vieira',
    funcao: 'ClinicoGeral',
    registro: '10001',
    filaPadrao: 'ClinicaGeral',
    filas: ['ClinicaGeral'],
  },
  {
    chave: 'pediatra',
    usuario: 'pediatra.e2e',
    nome: 'Bruno Sato',
    funcao: 'Pediatra',
    registro: '10002',
    filaPadrao: 'Pediatria',
    filas: ['Pediatria'],
  },
  {
    chave: 'ortopedista',
    usuario: 'ortopedista.e2e',
    nome: 'Clara Mendes',
    funcao: 'Ortopedista',
    registro: '10003',
    filaPadrao: 'Ortopedia',
    filas: ['Ortopedia'],
  },
  {
    chave: 'ginecologista',
    usuario: 'gineco.e2e',
    nome: 'Dora Alencar',
    funcao: 'Ginecologista',
    registro: '10004',
    filaPadrao: 'Ginecologia',
    filas: ['Ginecologia'],
  },
  {
    chave: 'cirurgiao',
    usuario: 'cirurgiao.e2e',
    nome: 'Elias Prado',
    funcao: 'Cirurgiao',
    registro: '10005',
    filaPadrao: 'Cirurgia',
    filas: ['Cirurgia'],
  },
  {
    chave: 'anestesista',
    usuario: 'anestesista.e2e',
    nome: 'Fabio Rocha',
    funcao: 'Anestesista',
    registro: '10006',
    filaPadrao: 'Anestesia',
    filas: ['Anestesia', 'Cirurgia'],
  },
  {
    chave: 'cardiologista',
    usuario: 'cardio.e2e',
    nome: 'Gilda Nunes',
    funcao: 'Cardiologista',
    registro: '10007',
    filaPadrao: 'Cardiologia',
    filas: ['Cardiologia'],
  },
  {
    chave: 'ultrassonografista',
    usuario: 'usg.e2e',
    nome: 'Hugo Barreto',
    funcao: 'Ultrassonografista',
    registro: '10008',
    filaPadrao: 'Ultrassom',
    filas: ['Ultrassom'],
  },
  {
    chave: 'dentista',
    usuario: 'dentista.e2e',
    nome: 'Iara Lopes',
    funcao: 'Dentista',
    registro: '20001',
    filaPadrao: 'Odontologia',
    filas: ['Odontologia'],
  },
  {
    chave: 'enfermeiro',
    usuario: 'enfermeiro.e2e',
    nome: 'Joel Tavares',
    funcao: 'Enfermeiro',
    registro: '30001',
    filaPadrao: 'Triagem',
    filas: ['Triagem', 'Enfermagem'],
  },
  {
    chave: 'tecnico',
    usuario: 'tecnico.e2e',
    nome: 'Kelly Dias',
    funcao: 'TecnicoEnfermagem',
    registro: '30002',
    filaPadrao: 'Triagem',
    filas: ['Triagem', 'Enfermagem'],
  },
  {
    chave: 'psicologo',
    usuario: 'psicologo.e2e',
    nome: 'Lucio Amaral',
    funcao: 'Psicologo',
    registro: '40001',
    filaPadrao: 'SaudeMental',
    filas: ['SaudeMental'],
  },
  {
    chave: 'fisioterapeuta',
    usuario: 'fisio.e2e',
    nome: 'Marta Belo',
    funcao: 'Fisioterapeuta',
    registro: '50001',
    filaPadrao: 'Ortopedia',
    filas: ['Ortopedia'],
  },
  {
    chave: 'farmaceutico',
    usuario: 'farmaceutico.e2e',
    nome: 'Nilo Craveiro',
    funcao: 'Farmaceutico',
    registro: '60001',
    filaPadrao: 'Farmacia',
    filas: ['Farmacia'],
  },
  {
    chave: 'recepcao',
    usuario: 'recepcao.e2e',
    nome: 'Olga Pimenta',
    funcao: 'Recepcao',
    registro: null,
    filaPadrao: 'Triagem',
    filas: ['Triagem'],
  },
  {
    chave: 'coordenacao',
    usuario: 'coordenacao.e2e',
    nome: 'Paulo Serra',
    funcao: 'Coordenacao',
    registro: null,
    filaPadrao: 'Triagem',
    filas: FILAS,
  },
  {
    chave: 'outro',
    usuario: 'outro.e2e',
    nome: 'Rita Queiroz',
    funcao: 'Outro',
    registro: null,
    filaPadrao: 'Triagem',
    filas: FILAS,
  },
];


/**
 * Quem tira o print de cada fila.
 *
 * Nem toda fila é a padrão de alguém: `Enfermagem` é a segunda aba do
 * enfermeiro — a primeira é a triagem, porque a enfermagem começa o plantão
 * triando. Sem esta tabela, a fila da enfermagem seria a única sem print, e a
 * falta passaria por acidente.
 */
export const QUEM_PRINTA = {
  Triagem: 'recepcao',
  ClinicaGeral: 'clinico',
  Pediatria: 'pediatra',
  Ortopedia: 'ortopedista',
  Odontologia: 'dentista',
  Enfermagem: 'enfermeiro',
  SaudeMental: 'psicologo',
  Ginecologia: 'ginecologista',
  Cirurgia: 'cirurgiao',
  Anestesia: 'anestesista',
  Cardiologia: 'cardiologista',
  Ultrassom: 'ultrassonografista',
  Farmacia: 'farmaceutico',
};

/** Rótulos em português, como a aba aparece na tela. */
export const ROTULO_DA_FILA = {
  Triagem: 'Triagem',
  ClinicaGeral: 'Clínica Geral',
  Pediatria: 'Pediatria',
  Ortopedia: 'Ortopedia',
  Odontologia: 'Odontologia',
  Enfermagem: 'Enfermagem',
  SaudeMental: 'Saúde Mental',
  Ginecologia: 'Ginecologia',
  Cirurgia: 'Cirurgia',
  Anestesia: 'Anestesia',
  Cardiologia: 'Cardiologia',
  Ultrassom: 'Ultrassom',
  Farmacia: 'Farmácia',
};
