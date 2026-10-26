import { FILAS } from './tipos';
import type { Especialidade, FuncaoProfissional } from './tipos';

/**
 * Em que fila cada profissão atende. Espelha `FilasDaFuncao` no backend.
 *
 * Quem manda continua sendo o servidor: as filas de verdade chegam no login, em
 * `profissional.filas`, e é delas que a barra da fila abre. Esta cópia existe
 * para as duas telas que precisam falar de uma profissão que não é a de quem
 * está olhando — o cadastro, onde a coordenação escolhe a profissão e vê onde
 * aquela pessoa vai atender, e a lente de "ver como", onde ela escolhe a
 * profissão pela qual quer olhar a operação.
 *
 * A cópia não pode divergir em silêncio, e o que impede isso não é este
 * comentário: o roteiro de ponta a ponta entra com as dezessete contas e
 * confere, uma a uma, que as filas que a API devolve são exatamente as daqui.
 * Uma fila nova que entre só de um lado derruba a rodada.
 *
 * A ordem importa: a primeira é a que abre por padrão.
 */
export const FILAS_POR_FUNCAO: Record<FuncaoProfissional, Especialidade[]> = {
  // Existe só para as contas anteriores às especialidades, e o cadastro recusa:
  // um "médico" genérico cairia em três filas.
  Medico: ['ClinicaGeral', 'Pediatria', 'Ortopedia'],

  ClinicoGeral: ['ClinicaGeral'],
  Pediatra: ['Pediatria'],
  Ortopedista: ['Ortopedia'],
  Ginecologista: ['Ginecologia'],
  Cirurgiao: ['Cirurgia'],
  Cardiologista: ['Cardiologia'],

  // Avaliar antes e acompanhar durante são o trabalho do anestesista, não uma
  // exceção à regra de uma fila por profissão.
  Anestesista: ['Anestesia', 'Cirurgia'],

  Ultrassonografista: ['Ultrassom'],

  // A enfermagem começa o plantão triando e depois atende na própria fila.
  Enfermeiro: ['Triagem', 'Enfermagem'],
  TecnicoEnfermagem: ['Triagem', 'Enfermagem'],

  Dentista: ['Odontologia'],
  Psicologo: ['SaudeMental'],
  Fisioterapeuta: ['Ortopedia'],

  // Fila própria. Antes caía na enfermagem por não existir a da farmácia, o que
  // misturava a produção das duas.
  Farmaceutico: ['Farmacia'],

  Recepcao: ['Triagem'],

  // Quem enxerga a operação inteira precisa enxergar inteira mesmo: derivar de
  // FILAS evita que uma fila nova suma daqui por esquecimento.
  Coordenacao: FILAS,
  Outro: FILAS,
};

/**
 * As profissões que a lente oferece, na ordem em que a tela deve listá-las.
 *
 * `Medico` fica de fora pelo mesmo motivo do cadastro: existe só para as contas
 * anteriores às especialidades, e oferecê-lo recriaria a confusão de uma
 * "profissão" que cai em três filas.
 */
export const FUNCOES_PARA_LENTE: FuncaoProfissional[] = [
  'ClinicoGeral',
  'Pediatra',
  'Ortopedista',
  'Ginecologista',
  'Cirurgiao',
  'Anestesista',
  'Cardiologista',
  'Ultrassonografista',
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
