/**
 * Bloco 2 — as treze filas com gente dentro.
 *
 * Existe para os prints: uma fila vazia tem print, mas o print não mostra nada.
 * Cada fila recebe três pacientes — dois esperando, com riscos diferentes, e um
 * assumido por quem é daquela fila. Os três juntos é que fazem a tela mostrar o
 * que ela tem para mostrar: o agrupamento entre "atendendo agora" e quem espera,
 * o ponto de risco e o cronômetro.
 *
 * O paciente assumido é assumido pela conta certa de propósito. Assumir tudo
 * como coordenação encheria as filas e deixaria sem cobertura justamente o
 * caminho que cada profissional faz.
 */

import { FILAS, QUEM_PRINTA } from '../elenco.mjs';
import { conferir, conferirIgual } from '../motor.mjs';
import { etapaDe, pacienteNaFila, temHistorico } from '../comum.mjs';

/** Nomes de fachada, para a lista não parecer uma planilha. */
const NOMES = [
  'Ana Lucero', 'Beto Quispe', 'Carmen Ilha', 'Dario Nieto', 'Elsa Varjão',
  'Fredy Mamani', 'Gloria Paz', 'Hector Luna', 'Ivone Caldas', 'Jorge Abreu',
  'Katia Rosales', 'Lauro Vidal', 'Mirna Salas', 'Noel Aguiar', 'Olivia Cruz',
  'Pedro Rian', 'Queila Sousa', 'Ramiro Pinto', 'Sonia Vargas', 'Tulio Neves',
  'Ubirajara Melo', 'Vera Antunes', 'Wilson Ferraz', 'Ximena Rojo', 'Yuri Pilar',
  'Zulma Ocampo', 'Abel Teixeira', 'Bianca Nolasco', 'Caio Peralta', 'Dalva Ruiz',
  'Enzo Falcão', 'Flavia Borda', 'Gael Monte', 'Helena Tapia', 'Igor Bastos',
  'Julia Reyes', 'Kauan Sierra', 'Livia Ocaña', 'Marco Ferrer',
];

let proximoNome = 0;

function nome() {
  const escolhido = NOMES[proximoNome % NOMES.length];
  proximoNome += 1;

  return escolhido;
}

/**
 * A queixa de quem está esperando em cada fila.
 *
 * Não é enfeite: uma lista em que todo cartão diz a mesma coisa não mostra o
 * que a lista faz, que é deixar quem chega escolher quem atender primeiro.
 */
const QUEIXAS = {
  Triagem: ['Febre há dois dias.', 'Corte no pé, ontem.', 'Dor no peito agora.'],
  ClinicaGeral: ['Tosse com catarro há uma semana.', 'Pressão alta sem remédio há um mês.', 'Dor de cabeça diária.'],
  Pediatria: ['Criança com diarreia há três dias.', 'Febre e manchas no corpo.', 'Tosse que piora à noite.'],
  Ortopedia: ['Torceu o tornozelo ontem.', 'Dor no ombro após queda.', 'Dor lombar ao carregar peso.'],
  Odontologia: ['Dor de dente há quatro dias.', 'Gengiva inchada e sangrando.', 'Dente quebrado na queda.'],
  Enfermagem: ['Troca de curativo em perna.', 'Aplicação de medicação prescrita.', 'Retirada de pontos.'],
  SaudeMental: ['Não dorme desde a enchente.', 'Crises de choro e angústia.', 'Perdeu a casa e a mãe.'],
  Ginecologia: ['Pré-natal, primeira consulta.', 'Corrimento com ardência.', 'Atraso menstrual de dois meses.'],
  Cirurgia: ['Hérnia inguinal que aumentou.', 'Nódulo em mama, a investigar.', 'Lipoma dolorido no dorso.'],
  Anestesia: ['Avaliação pré-anestésica.', 'Avaliação pré-anestésica, hipertensa.', 'Avaliação pré-anestésica, asmático.'],
  Cardiologia: ['Palpitações ao esforço.', 'Pressão descontrolada há semanas.', 'Revisão de insuficiência cardíaca.'],
  Ultrassom: ['Ultrassom abdominal solicitado.', 'Ultrassom obstétrico solicitado.', 'Ultrassom de partes moles.'],
  Farmacia: ['Retirar antibiótico prescrito.', 'Retirar anti-hipertensivo do mês.', 'Retirar analgésico e orientação.'],
};

export function blocoFilas() {
  const passos = FILAS.map((fila) => ({
    nome: `${fila}: dois esperando e um sendo atendido`,
    async executar(ctx) {
      const dono = ctx.contas[QUEM_PRINTA[fila]];

      conferir(dono, `Não há conta no elenco para printar a fila ${fila}.`);

      // Quem cadastra é a recepção, como em campo. Quem tria é a enfermagem.
      const recepcao = ctx.contas.recepcao.cliente;
      const triagem = ctx.contas.enfermeiro.cliente;

      const queixas = QUEIXAS[fila];
      const esperando = [];

      for (const risco of ['Verde', 'Amarelo']) {
        const id = await pacienteNaFila(
          fila === 'Triagem' ? recepcao : triagem,
          ctx.base.id,
          fila,
          {
            nome: nome(),
            risco,
            idade: 20 + esperando.length * 7,
            queixaPrincipal: queixas[esperando.length],
          },
        );

        esperando.push(id);
      }

      const atendido = await pacienteNaFila(
        fila === 'Triagem' ? recepcao : triagem,
        ctx.base.id,
        fila,
        { nome: nome(), risco: 'Vermelho', idade: 52, queixaPrincipal: queixas[2] },
      );

      await dono.cliente.post(`/atendimentos/${atendido}/etapas/${fila}/assumir`);

      const prontuario = await dono.cliente.get(`/atendimentos/${atendido}`);
      const etapa = etapaDe(prontuario, fila);

      conferirIgual(etapa?.status, 'EmAndamento', `etapa de ${fila} depois de assumir`);
      conferirIgual(etapa?.profissional, dono.nome, `quem está com o paciente em ${fila}`);
      conferir(etapa?.assumidaEm, 'Assumir tinha que marcar a hora: é de onde o cronômetro conta.');
      conferir(
        etapa?.entrouNaFilaEm,
        'Sem a hora de entrada na fila não há como saber quanto o paciente esperou.',
      );

      // Rastro: assumir na própria fila não é exceção, e não pode virar uma.
      conferir(
        !temHistorico(prontuario, 'AssumiuForaDaSuaFila'),
        `${dono.usuario} assumiu a própria fila e ficou registrado como fora dela.`,
      );

      ctx.filas[fila] = { esperando, atendido };
    },
  }));

  passos.push({
    nome: 'a fila de uma especialidade esconde quem já está com outra pessoa',
    async executar(ctx) {
      // É o que faz a lista ser utilizável quando a equipe é grande: o que está
      // na mão de alguém não ocupa a fila de quem está livre.
      const { atendido } = ctx.filas.ClinicaGeral;
      const outro = ctx.contas.pediatra.cliente;

      const comOcultar = await outro.get(
        `/atendimentos?baseId=${ctx.base.id}&fila=ClinicaGeral&ocultarAssumidos=true`,
      );

      conferir(
        !comOcultar.some((a) => a.id === atendido),
        'O paciente que já está com o clínico apareceu na fila de quem está livre.',
      );

      const semOcultar = await outro.get(
        `/atendimentos?baseId=${ctx.base.id}&fila=ClinicaGeral`,
      );

      conferir(
        semOcultar.some((a) => a.id === atendido),
        'Sem o filtro, o paciente assumido tinha que continuar visível.',
      );
    },
  });

  passos.push({
    nome: '"meus" lista por quem assumiu, e não por especialidade',
    async executar(ctx) {
      const dono = ctx.contas.dentista;
      const meus = await dono.cliente.get(`/atendimentos?baseId=${ctx.base.id}&meus=true`);

      conferir(
        meus.some((a) => a.id === ctx.filas.Odontologia.atendido),
        'O paciente que o dentista assumiu não apareceu em "meus".',
      );

      conferir(
        !meus.some((a) => a.id === ctx.filas.Pediatria.atendido),
        'Apareceu em "meus" do dentista um paciente que é de outra pessoa.',
      );
    },
  });

  passos.push({
    nome: 'o filtro de risco separa o vermelho do verde',
    async executar(ctx) {
      const cli = ctx.contas.coordenacao.cliente;
      const vermelhos = await cli.get(
        `/atendimentos?baseId=${ctx.base.id}&fila=ClinicaGeral&risco=Vermelho`,
      );

      conferir(vermelhos.length > 0, 'O filtro de risco vermelho não trouxe ninguém.');
      conferir(
        vermelhos.every((a) => a.classificacaoRisco === 'Vermelho'),
        'O filtro de vermelho trouxe paciente de outro risco.',
      );
    },
  });

  passos.push({
    nome: 'a busca acha pelo código e pelo nome',
    async executar(ctx) {
      const cli = ctx.contas.coordenacao.cliente;
      const alvo = await cli.get(`/atendimentos/${ctx.filas.Cirurgia.atendido}`);

      const porCodigo = await cli.get(
        `/atendimentos?baseId=${ctx.base.id}&busca=${encodeURIComponent(alvo.codigo)}`,
      );

      conferir(
        porCodigo.some((a) => a.id === alvo.id),
        `Buscar pelo código ${alvo.codigo} não achou o atendimento.`,
      );

      const primeiroNome = alvo.paciente.nome.split(' ')[0];
      const porNome = await cli.get(
        `/atendimentos?baseId=${ctx.base.id}&busca=${encodeURIComponent(primeiroNome)}`,
      );

      conferir(
        porNome.some((a) => a.id === alvo.id),
        `Buscar por "${primeiroNome}" não achou o atendimento.`,
      );
    },
  });

  return { nome: 'Filas — as treze com gente dentro', passos };
}
