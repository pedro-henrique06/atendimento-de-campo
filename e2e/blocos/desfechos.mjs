/**
 * Bloco 5 — os quatro desfechos, e o que cada um exige.
 *
 * Um atendimento termina uma vez, então cada desfecho precisa do seu paciente.
 * O que se confere aqui é o que o desfecho obriga: transferência sem destino e
 * "outro" sem descrição não podem ser aceitos, porque daqui a um mês a pergunta
 * vai ser para onde o paciente foi — e a resposta não pode ser um campo vazio.
 */

import { conferir, conferirIgual } from '../motor.mjs';
import { pacienteNaFila } from '../comum.mjs';

async function naClinica(ctx, nome, idade = 45) {
  const id = await pacienteNaFila(ctx.contas.enfermeiro.cliente, ctx.base.id, 'ClinicaGeral', {
    nome,
    idade,
  });

  const cli = ctx.contas.clinico.cliente;

  await cli.post(`/atendimentos/${id}/etapas/ClinicaGeral/assumir`);

  return { id, cli };
}

export function blocoDesfechos() {
  return {
    nome: 'Desfechos — alta, transferência, óbito e outro',
    passos: [
      {
        nome: 'alta com fila pendente é recusada antes de ser confirmada',
        async executar(ctx) {
          const { id, cli } = await naClinica(ctx, 'Heriberto Salas');

          await cli.put(`/atendimentos/${id}/consulta`, {
            especialidade: 'ClinicaGeral',
            sintomasDescricao: 'Dor de dente e febre baixa.',
            cid10Codigo: 'K04.7',
            conduta: 'Analgesia e avaliação odontológica.',
            desfecho: 'Encaminhado',
            encaminhadoPara: 'Odontologia',
          });

          /*
            A recusa não é burocracia: é a tela podendo perguntar antes.

            Tirar o paciente da fila da odontologia em silêncio é o tipo de
            coisa que só se descobre quando ele volta no dia seguinte
            perguntando pelo dentista.
          */
          const erro = await cli.recusa(
            'POST',
            `/atendimentos/${id}/etapas/ClinicaGeral/alta`,
            { cancelarPendentes: false },
          );

          conferir(
            /Odontologia/.test(JSON.stringify(erro.corpo)),
            `A recusa tinha que listar a fila pendente. Veio: ${erro.message}`,
          );

          const prontuario = await cli.post(
            `/atendimentos/${id}/etapas/ClinicaGeral/alta`,
            { cancelarPendentes: true },
          );

          conferirIgual(prontuario.status, 'Finalizado', 'status depois da alta confirmada');
          conferirIgual(
            prontuario.etapas.find((e) => e.especialidade === 'Odontologia')?.status,
            'Cancelada',
            'a fila pendente depois da alta',
          );

          // Cancelar a fila de alguém é decisão clínica de uma pessoa, e daqui
          // a um mês a pergunta vai ser quem cancelou.
          conferir(
            prontuario.historico.some(
              (h) => h.acao === 'CancelouFilaPendente' && h.especialidade === 'Odontologia',
            ),
            'O cancelamento da fila pendente não ficou no histórico.',
          );
        },
      },

      {
        nome: 'transferência hospitalar exige dizer para onde',
        async executar(ctx) {
          const { id, cli } = await naClinica(ctx, 'Isaura Benitez', 68);

          await cli.put(`/atendimentos/${id}/consulta`, {
            especialidade: 'ClinicaGeral',
            sintomasDescricao: 'Dor torácica em aperto, irradiando para o braço esquerdo.',
            exameFisico: 'Sudoréica, PA 90/60, FC 112.',
            cid10Codigo: 'I10',
            conduta: 'Estabilização e transferência imediata.',
          });

          const erro = await cli.recusa(
            'POST',
            `/atendimentos/${id}/etapas/ClinicaGeral/encerrar`,
            { desfecho: 'TransferenciaHospitalar', cancelarPendentes: true },
          );

          conferir(
            /transferid|onde/i.test(JSON.stringify(erro.corpo)),
            `A recusa tinha que pedir o destino. Veio: ${erro.message}`,
          );

          const prontuario = await cli.post(
            `/atendimentos/${id}/etapas/ClinicaGeral/encerrar`,
            {
              desfecho: 'TransferenciaHospitalar',
              detalhe: 'Hospital Regional de Puerto Obaldía, via ambulância da base.',
              cancelarPendentes: true,
            },
          );

          conferirIgual(prontuario.desfecho, 'TransferenciaHospitalar', 'desfecho registrado');
          conferir(
            prontuario.desfechoDetalhe?.includes('Puerto Obaldía'),
            'O destino da transferência não voltou no prontuário.',
          );

          // O destino entra no histórico, e não só na coluna: é a informação
          // que alguém vai procurar depois, e o histórico é onde se procura.
          conferir(
            prontuario.historico.some(
              (h) => h.campo === 'atendimento.desfechoDetalhe' && h.valorNovo?.includes('Regional'),
            ),
            'O destino da transferência não entrou no histórico.',
          );
          conferir(
            prontuario.historico.some((h) => h.acao === 'TransferiuParaHospital'),
            'A transferência não ficou registrada como ação própria.',
          );
        },
      },

      {
        nome: 'óbito é ação própria no histórico, e trava o atendimento',
        async executar(ctx) {
          const { id, cli } = await naClinica(ctx, 'Jacinto Olmedo', 79);

          await cli.put(`/atendimentos/${id}/consulta`, {
            especialidade: 'ClinicaGeral',
            sintomasDescricao: 'Trazido em parada cardiorrespiratória.',
            exameFisico: 'Sem pulso, sem resposta. Manobras por 30 minutos, sem retorno.',
          });

          const prontuario = await cli.post(
            `/atendimentos/${id}/etapas/ClinicaGeral/encerrar`,
            { desfecho: 'Obito', cancelarPendentes: true },
          );

          conferirIgual(prontuario.desfecho, 'Obito', 'desfecho registrado');

          /*
            Ação própria, e não um detalhe do encerramento: daqui a um ano a
            pergunta vai ser quem registrou e quando, e a resposta não pode
            depender de ler o diff de um campo.
          */
          conferir(
            prontuario.historico.some((h) => h.acao === 'RegistrouObito'),
            'O óbito não ficou registrado como ação própria no histórico.',
          );

          // E o atendimento de um paciente morto não volta a aceitar movimento.
          const erro = await cli.recusa(
            'POST',
            `/atendimentos/${id}/etapas/ClinicaGeral/encaminhar`,
            { destino: 'Enfermagem', motivo: 'Preparo do corpo.' },
          );

          conferirIgual(erro.status, 400, 'tentativa de encaminhar depois do óbito');
        },
      },

      {
        nome: '"outro" exige descrever o motivo',
        async executar(ctx) {
          const { id, cli } = await naClinica(ctx, 'Karina Ovalle', 31);

          const erro = await cli.recusa(
            'POST',
            `/atendimentos/${id}/etapas/ClinicaGeral/encerrar`,
            { desfecho: 'Outro', cancelarPendentes: true },
          );

          conferir(
            /motivo|descrev/i.test(JSON.stringify(erro.corpo)),
            `A recusa tinha que pedir a descrição. Veio: ${erro.message}`,
          );

          const prontuario = await cli.post(
            `/atendimentos/${id}/etapas/ClinicaGeral/encerrar`,
            {
              desfecho: 'Outro',
              detalhe: 'Paciente desistiu e saiu da base antes de ser avaliada.',
              cancelarPendentes: true,
            },
          );

          conferirIgual(prontuario.desfecho, 'Outro', 'desfecho registrado');
          conferir(
            prontuario.historico.some((h) => h.acao === 'EncerrouPorOutroMotivo'),
            'O encerramento por outro motivo não ficou no histórico.',
          );
        },
      },

      {
        nome: 'evasão é desfecho da ficha, e não do atendimento',
        async executar(ctx) {
          const { id, cli } = await naClinica(ctx, 'Lisandro Peña', 24);

          // Quem sumiu da fila não tem diagnóstico fechado: a evasão é
          // justamente o caso em que o CID não é exigido.
          await cli.put(`/atendimentos/${id}/consulta`, {
            especialidade: 'ClinicaGeral',
            sintomasDescricao: 'Chamado três vezes, não atendeu.',
            desfecho: 'Evasao',
          });

          const consulta = (await cli.get(`/atendimentos/${id}`)).consultas.find(
            (c) => c.especialidade === 'ClinicaGeral',
          );

          conferirIgual(consulta?.desfecho, 'Evasao', 'desfecho da ficha');
          conferirIgual(consulta?.cid10Codigo, null, 'CID numa ficha encerrada por evasão');
        },
      },

      {
        nome: 'alta ou encaminhamento sem CID é recusado',
        async executar(ctx) {
          const { id, cli } = await naClinica(ctx, 'Mauricio Zelaya', 50);

          const erro = await cli.recusa('PUT', `/atendimentos/${id}/consulta`, {
            especialidade: 'ClinicaGeral',
            sintomasDescricao: 'Cefaleia há dois dias.',
            desfecho: 'Alta',
          });

          conferir(
            /CID/i.test(JSON.stringify(erro.corpo)),
            `A recusa tinha que pedir o CID. Veio: ${erro.message}`,
          );

          // E um CID que não existe no catálogo também é recusado: foi texto
          // livre no sistema de referência que inutilizou a contagem por causa.
          const inventado = await cli.recusa('PUT', `/atendimentos/${id}/consulta`, {
            especialidade: 'ClinicaGeral',
            cid10Codigo: 'X99.9',
            desfecho: 'Alta',
          });

          conferir(
            /catalogo|catálogo|existe/i.test(JSON.stringify(inventado.corpo)),
            `A recusa tinha que dizer que o CID não existe. Veio: ${inventado.message}`,
          );
        },
      },
    ],
  };
}
