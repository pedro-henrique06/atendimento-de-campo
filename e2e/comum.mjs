/**
 * O que todos os blocos precisam: abrir um paciente, triá-lo, ler o prontuário.
 *
 * Nada aqui esconde regra de negócio — cada função é um pedido à API com os
 * campos preenchidos. O que elas poupam é a repetição de sortear código,
 * montar o paciente e conferir o 200, que apareceria em quarenta passos.
 */

import { conferir } from './motor.mjs';

/** Abre um atendimento novo, já com paciente, e devolve o prontuário. */
export async function abrirAtendimento(cli, baseId, paciente = {}) {
  const { codigo } = await cli.get('/pacientes/codigo-novo');

  const prontuario = await cli.post('/atendimentos', {
    baseId,
    queixaPrincipal: paciente.queixaPrincipal ?? 'Dor abdominal há dois dias.',
    paciente: {
      codigo,
      nome: paciente.nome ?? 'Paciente Sem Nome',
      tipoDocumento: paciente.tipoDocumento ?? 'SemDocumento',
      numeroDocumento: paciente.numeroDocumento ?? null,
      idadeAproximada: paciente.idade ?? 34,
      dataNascimento: paciente.dataNascimento ?? null,
      sexo: paciente.sexo ?? 'NaoInformado',
      racaCor: paciente.racaCor ?? 'NaoInformado',
      etnia: paciente.etnia ?? null,
      nomeDaMae: paciente.nomeDaMae ?? null,
      endereco: paciente.endereco ?? null,
      statusAlergia: paciente.statusAlergia ?? 'SemAlergiaConhecida',
      alergias: paciente.alergias ?? null,
      condicoesCronicas: paciente.condicoesCronicas ?? [],
      vulnerabilidades: paciente.vulnerabilidades ?? [],
      consentimentoRegistro: paciente.consentimentoRegistro ?? true,
    },
  });

  conferir(
    prontuario.etapas.some((e) => e.especialidade === 'Triagem'),
    'Atendimento novo tinha que nascer na fila da triagem.',
  );

  return prontuario;
}

/** Tria e, quando `encaminhamento` vem, abre a fila seguinte. */
export async function triar(cli, id, dados = {}) {
  return cli.put(`/atendimentos/${id}/triagem`, {
    pressaoSistolica: dados.pressaoSistolica ?? 120,
    pressaoDiastolica: dados.pressaoDiastolica ?? 80,
    frequenciaCardiaca: dados.frequenciaCardiaca ?? 88,
    frequenciaRespiratoria: dados.frequenciaRespiratoria ?? 18,
    saturacaoO2: dados.saturacaoO2 ?? 97,
    temperaturaCelsius: dados.temperaturaCelsius ?? 36.8,
    escalaDor: dados.escalaDor ?? 4,
    sintomas: dados.sintomas ?? ['Dor'],
    statusAlergia: dados.statusAlergia ?? 'SemAlergiaConhecida',
    alergias: dados.alergias ?? null,
    classificacaoRisco: dados.classificacaoRisco ?? 'Verde',
    achadosStart: dados.achadosStart ?? null,
    encaminhamento: dados.encaminhamento ?? null,
    observacoes: dados.observacoes ?? null,
    ...dados.extra,
  });
}

/**
 * Atalho do mais comum: paciente aberto, triado e esperando na fila pedida.
 *
 * O caminho é o mesmo da tela de triagem: salvar já fecha a etapa e o destino
 * vai dentro do próprio registro. Não há `encaminhar` aqui — a triagem é a
 * única fila que fecha assim, porque o encaminhamento é a resposta da triagem,
 * e não um segundo ato depois dela. (É por isso que `Triagem.tsx` não chama
 * `encaminhar` em lugar nenhum.)
 *
 * Para a própria triagem não tria nada: quem está na fila da triagem é quem
 * ainda não foi triado, e é por isso que ali o risco aparece em branco.
 */
export async function pacienteNaFila(cli, baseId, fila, paciente = {}) {
  const prontuario = await abrirAtendimento(cli, baseId, paciente);

  if (fila === 'Triagem') return prontuario.id;

  await triar(cli, prontuario.id, {
    classificacaoRisco: paciente.risco ?? 'Verde',
    encaminhamento: fila,
  });

  return prontuario.id;
}

export function etapaDe(prontuario, fila) {
  return prontuario.etapas.find((e) => e.especialidade === fila) ?? null;
}

export function temHistorico(prontuario, acao, fila = undefined) {
  return prontuario.historico.some(
    (h) => h.acao === acao && (fila === undefined || h.especialidade === fila),
  );
}

/** Um item do catálogo, para as prescrições. */
export async function itemDoCatalogo(cli, nome) {
  const itens = await cli.get('/catalogo/itens');
  const achado = itens.find((i) => i.nome.toLowerCase().includes(nome.toLowerCase()));

  conferir(achado, `O catálogo não tem "${nome}" — a semente do banco mudou?`);

  return achado;
}
