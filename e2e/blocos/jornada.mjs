/**
 * Bloco 4 — um paciente do login à alta, pelas mãos de seis profissionais.
 *
 * Este é o bloco que só faz sentido em sequência. Cada passo recebe o
 * atendimento no estado em que o anterior deixou, e o que se confere é o
 * caminho: a fila que abre, de onde o paciente veio, o relógio que começa a
 * contar quando alguém assume, a devolução que volta para quem pediu.
 *
 * Montar esse estado à mão em cada passo testaria o estado montado, e não o
 * caminho — que é justamente onde um paciente se perde entre duas filas.
 */

import { conferir, conferirIgual } from '../motor.mjs';
import { abrirAtendimento, etapaDe, itemDoCatalogo, triar } from '../comum.mjs';

export function blocoJornada() {
  return {
    nome: 'Jornada — da recepção à alta',
    passos: [
      {
        nome: 'a recepção cadastra o paciente, com documento e consentimento',
        async executar(ctx) {
          const cli = ctx.contas.recepcao.cliente;

          const prontuario = await abrirAtendimento(cli, ctx.base.id, {
            nome: 'Graciela Montenegro',
            idade: 58,
            sexo: 'Feminino',
            tipoDocumento: 'CedulaIdentidade',
            numeroDocumento: `E2E-${Date.now()}`,
            racaCor: 'Parda',
            statusAlergia: 'PossuiAlergia',
            alergias: 'Penicilina — exantema.',
            condicoesCronicas: ['Hipertensao', 'Diabetes'],
            vulnerabilidades: ['AuxilioMobilidade'],
            queixaPrincipal: 'Dor lombar há uma semana, piora ao caminhar.',
          });

          conferirIgual(prontuario.status, 'Aberto', 'status do atendimento recém-aberto');
          conferirIgual(prontuario.criadoPor, ctx.contas.recepcao.nome, 'quem cadastrou');
          conferirIgual(prontuario.paciente.alerta.exibir, true, 'alerta de alergia na abertura');
          conferir(
            prontuario.codigo.startsWith(ctx.base.prefixoCodigo),
            `O código ${prontuario.codigo} tinha que começar com o prefixo da base.`,
          );

          ctx.jornada = { id: prontuario.id, codigo: prontuario.codigo };
        },
      },

      {
        nome: 'a enfermagem assume a triagem e o cronômetro começa a contar',
        async executar(ctx) {
          const cli = ctx.contas.enfermeiro.cliente;

          const antes = await cli.get(`/atendimentos/${ctx.jornada.id}`);
          const naFila = etapaDe(antes, 'Triagem');

          conferirIgual(naFila.status, 'Aguardando', 'etapa de triagem antes de alguém assumir');
          conferirIgual(naFila.assumidaEm, null, 'hora de assumir antes de assumir');
          conferir(naFila.entrouNaFilaEm, 'A entrada na fila tinha que estar marcada na abertura.');

          await cli.post(`/atendimentos/${ctx.jornada.id}/etapas/Triagem/assumir`);

          const depois = await cli.get(`/atendimentos/${ctx.jornada.id}`);
          const minha = etapaDe(depois, 'Triagem');

          conferirIgual(minha.status, 'EmAndamento', 'etapa de triagem depois de assumir');
          conferir(minha.assumidaEm, 'Assumir não marcou a hora: é de onde o cronômetro conta.');

          // O atendimento continua "Aberto": assumir é pegar a ficha, e o
          // status do atendimento muda quando alguém registra algo nela.
          conferirIgual(depois.status, 'Aberto', 'status do atendimento depois de assumido');
        },
      },

      {
        nome: 'triada: a etapa fecha e a clínica geral abre no mesmo ato',
        async executar(ctx) {
          const cli = ctx.contas.enfermeiro.cliente;

          /*
            Salvar a triagem fecha a etapa e abre o destino de uma vez.

            O encaminhamento vai dentro do registro porque é a resposta da
            triagem: classificar o risco e dizer para onde o paciente vai são o
            mesmo ato, e não dois.
          */
          await triar(cli, ctx.jornada.id, {
            classificacaoRisco: 'Amarelo',
            pressaoSistolica: 162,
            pressaoDiastolica: 98,
            escalaDor: 7,
            sintomas: ['Dor'],
            statusAlergia: 'PossuiAlergia',
            alergias: 'Penicilina — exantema.',
            encaminhamento: 'ClinicaGeral',
            observacoes: 'Dor lombar com PA elevada; avaliar antes de medicar.',
            extra: { medicamentosEmUso: 'Losartana, metformina.', pesoKg: 74, alturaCm: 158 },
          });

          const prontuario = await cli.get(`/atendimentos/${ctx.jornada.id}`);

          conferirIgual(etapaDe(prontuario, 'Triagem').status, 'Concluida', 'triagem depois de salva');
          conferirIgual(prontuario.status, 'EmAndamento', 'status do atendimento depois da triagem');
          conferirIgual(prontuario.classificacaoRisco, 'Amarelo', 'risco do atendimento');
          conferirIgual(
            etapaDe(prontuario, 'ClinicaGeral')?.encaminhadaDe,
            'Triagem',
            'de onde o paciente chegou na clínica geral',
          );
          conferirIgual(
            etapaDe(prontuario, 'ClinicaGeral')?.encaminhadaPor,
            ctx.contas.enfermeiro.nome,
            'quem encaminhou para a clínica geral',
          );
          conferirIgual(
            etapaDe(prontuario, 'ClinicaGeral')?.status,
            'Aguardando',
            'a fila seguinte depois da triagem',
          );
        },
      },

      {
        nome: 'a triagem não aceita voltar: dela não se volta',
        async executar(ctx) {
          const cli = ctx.contas.clinico.cliente;

          await cli.post(`/atendimentos/${ctx.jornada.id}/etapas/ClinicaGeral/assumir`);

          const erro = await cli.recusa(
            'POST',
            `/atendimentos/${ctx.jornada.id}/etapas/ClinicaGeral/encaminhar`,
            { destino: 'Triagem', motivo: 'Quero remedir a pressão.' },
          );

          conferir(
            /triagem/i.test(JSON.stringify(erro.corpo)),
            `A recusa tinha que explicar que da triagem não se volta. Veio: ${erro.message}`,
          );
        },
      },

      {
        nome: 'o clínico atende e pede um ultrassom',
        async executar(ctx) {
          const cli = ctx.contas.clinico.cliente;

          await cli.put(`/atendimentos/${ctx.jornada.id}/consulta`, {
            especialidade: 'ClinicaGeral',
            sintomasDescricao: 'Dor lombar baixa há sete dias, sem irradiação.',
            historiaClinica: 'Hipertensa e diabética, em uso regular das medicações.',
            exameFisico: 'Dor à palpação lombar. Lasègue negativo. Giordano duvidoso à direita.',
            cid10Codigo: 'M54.5',
            diagnosticoObservacao: 'Dor lombar; afastar causa urinária.',
            conduta: 'Ultrassom de vias urinárias antes de fechar o diagnóstico.',
            desfecho: 'Encaminhado',
            encaminhadoPara: 'Ultrassom',
          });

          const prontuario = await cli.get(`/atendimentos/${ctx.jornada.id}`);

          conferir(etapaDe(prontuario, 'Ultrassom'), 'O pedido de ultrassom não abriu a fila.');
          conferirIgual(
            etapaDe(prontuario, 'Ultrassom').encaminhadaDe,
            'ClinicaGeral',
            'de onde o paciente chegou no ultrassom',
          );
        },
      },

      {
        nome: 'o ultrassom lauda e o paciente volta para quem pediu',
        async executar(ctx) {
          const cli = ctx.contas.ultrassonografista.cliente;
          const { id } = ctx.jornada;

          await cli.post(`/atendimentos/${id}/etapas/Ultrassom/assumir`);

          /*
            O laudo fecha a etapa do ultrassom e abre a fila de quem pediu.

            Salvar a ficha já conclui a etapa — então o caminho de volta é o
            desfecho "encaminhado" com o destino, e não o botão de devolver, que
            serve para a fila que recebeu o paciente e não atendeu. (O que
            devolver faz está no bloco das exceções.)
          */
          await cli.put(`/atendimentos/${id}/ultrassom`, {
            exameSolicitado: 'Ultrassom de vias urinárias.',
            indicacao: 'Dor lombar com Giordano duvidoso à direita.',
            analise: 'Rins de dimensões normais. Cálculo de 4 mm em pelve renal direita.',
            conclusao: 'Nefrolitíase direita, sem dilatação.',
            desfecho: 'Encaminhado',
            encaminhadoPara: 'ClinicaGeral',
          });

          const prontuario = await cli.get(`/atendimentos/${id}`);

          conferirIgual(etapaDe(prontuario, 'Ultrassom').status, 'Concluida', 'ultrassom concluído');
          conferir(
            ['Aguardando', 'EmAndamento'].includes(etapaDe(prontuario, 'ClinicaGeral').status),
            'O laudo tinha que reabrir a fila da clínica geral.',
          );
          conferirIgual(
            prontuario.ultrassom?.profissional?.conselho,
            'Crm',
            'conselho de quem assinou o laudo',
          );

          // A consulta que estava lá continua lá: a fila reabre com a ficha que
          // já tinha, e não como consulta nova.
          const consulta = prontuario.consultas.find((c) => c.especialidade === 'ClinicaGeral');

          conferirIgual(consulta?.cid10Codigo, 'M54.5', 'a consulta anterior depois da devolução');
        },
      },

      {
        nome: 'o clínico fecha o diagnóstico e manda para a farmácia',
        async executar(ctx) {
          const cli = ctx.contas.clinico.cliente;
          const dipirona = await itemDoCatalogo(cli, 'Dipirona');

          await cli.put(`/atendimentos/${ctx.jornada.id}/consulta`, {
            especialidade: 'ClinicaGeral',
            sintomasDescricao: 'Dor lombar baixa há sete dias, sem irradiação.',
            historiaClinica: 'Hipertensa e diabética, em uso regular das medicações.',
            exameFisico: 'Dor à palpação lombar. Lasègue negativo.',
            cid10Codigo: 'M54.5',
            diagnosticoObservacao: 'Dor lombar; cálculo de 4 mm sem obstrução ao ultrassom.',
            conduta: 'Analgesia, hidratação e orientação de retorno se febre ou piora.',
            orientacoesGerais: 'Beber 2 L de água por dia. Voltar se tiver febre.',
            desfecho: 'Encaminhado',
            encaminhadoPara: 'Farmacia',
            dispensacoes: [
              {
                itemId: dipirona.id,
                quantidade: 20,
                via: 'Oral',
                posologia: '1 comprimido de 6/6 h se dor.',
              },
            ],
          });

          const prontuario = await cli.get(`/atendimentos/${ctx.jornada.id}`);

          conferir(etapaDe(prontuario, 'Farmacia'), 'A prescrição não abriu a fila da farmácia.');
        },
      },

      {
        nome: 'a farmácia confere o que foi prescrito e dispensa',
        async executar(ctx) {
          const cli = ctx.contas.farmaceutico.cliente;
          const { id } = ctx.jornada;

          await cli.post(`/atendimentos/${id}/etapas/Farmacia/assumir`);

          const prontuario = await cli.get(`/atendimentos/${id}`);
          const prescrito = prontuario.consultas
            .find((c) => c.especialidade === 'ClinicaGeral')
            .dispensacoes;

          conferirIgual(prescrito.length, 1, 'o que a farmácia encontra prescrito');

          const dipirona = await itemDoCatalogo(cli, 'Dipirona');

          // O que saiu pode diferir do prescrito — é por isso que é conferido.
          // Aqui saiu menos, e a observação é o que explica a diferença.
          await cli.put(`/atendimentos/${id}/farmacia`, {
            orientacoes: 'Dipirona de 6/6 h apenas se dor. Não tomar com álcool.',
            observacoes: 'Prescritos 20 comprimidos; o estoque tinha 12. Orientada a voltar.',
            desfecho: 'Alta',
            dispensacoes: [
              {
                itemId: dipirona.id,
                quantidade: 12,
                via: 'Oral',
                posologia: '1 comprimido de 6/6 h se dor.',
              },
            ],
          });

          const farmacia = (await cli.get(`/atendimentos/${id}`)).farmacia;

          conferirIgual(farmacia.dispensacoes[0].quantidade, 12, 'o que a farmácia dispensou');
          conferir(
            farmacia.observacoes.includes('12'),
            'A diferença entre o prescrito e o dispensado tinha que estar explicada.',
          );

          /*
            E a entrega é assinada: quem checou, e quando.

            É a coluna "Profissional | Hora" do formulário de papel. Quem
            prescreve é uma pessoa, quem entrega é outra, e essa assinatura é o
            que liga as duas.
          */
          const linha = farmacia.dispensacoes[0];
          const assinada = await cli.post(
            `/atendimentos/${id}/prescricao/${linha.id}/checagem`,
            { checada: true },
          );

          conferir(assinada.checadaEm, 'Checar não carimbou a hora.');
          conferirIgual(
            assinada.checadaPor?.nome,
            ctx.contas.farmaceutico.nome,
            'quem assinou a linha da prescrição',
          );

          // E a hora não é reescrita quando se checa de novo.
          const denovo = await cli.post(
            `/atendimentos/${id}/prescricao/${linha.id}/checagem`,
            { checada: true },
          );

          conferirIgual(denovo.checadaEm, assinada.checadaEm, 'a hora da checagem depois de rechecar');
        },
      },

      {
        nome: 'o que já foi entregue não some quando a ficha é salva de novo',
        async executar(ctx) {
          const cli = ctx.contas.farmaceutico.cliente;
          const { id } = ctx.jornada;
          const dipirona = await itemDoCatalogo(cli, 'Dipirona');

          // A farmácia corrige a observação — e, como qualquer edição, reenvia
          // a lista inteira de itens.
          await cli.put(`/atendimentos/${id}/farmacia`, {
            orientacoes: 'Dipirona de 6/6 h apenas se dor. Não tomar com álcool.',
            observacoes: 'Prescritos 20 comprimidos; o estoque tinha 12. Orientada a voltar amanhã.',
            dispensacoes: [
              {
                itemId: dipirona.id,
                quantidade: 12,
                via: 'Oral',
                posologia: '1 comprimido de 6/6 h se dor.',
              },
            ],
          });

          const farmacia = (await cli.get(`/atendimentos/${id}`)).farmacia;

          /*
            Salvar a ficha apaga e recria a lista. Sem a regra que preserva o
            que já foi checado, a assinatura de quem entregou sumiria junto, e
            o prontuário passaria a dizer que ninguém entregou nada.

            E a linha continua sendo uma só: dois registros do mesmo remédio,
            um assinado e outro não, seriam lidos como duas doses.
          */
          conferirIgual(farmacia.dispensacoes.length, 1, 'linhas da prescrição depois de salvar');
          conferir(
            farmacia.dispensacoes[0].checadaEm,
            'A assinatura de quem entregou sumiu quando a ficha foi salva de novo.',
          );
        },
      },

      {
        nome: 'alta pela farmácia, e o atendimento fecha com desfecho',
        async executar(ctx) {
          const cli = ctx.contas.farmaceutico.cliente;
          const { id } = ctx.jornada;

          const prontuario = await cli.post(`/atendimentos/${id}/etapas/Farmacia/alta`, {
            cancelarPendentes: false,
          });

          conferirIgual(prontuario.status, 'Finalizado', 'status depois da alta');
          conferirIgual(prontuario.desfecho, 'Alta', 'desfecho do atendimento');
          conferirIgual(prontuario.finalizadoPor, ctx.contas.farmaceutico.nome, 'quem deu alta');
          conferir(
            prontuario.historico.some((h) => h.acao === 'DeuAlta'),
            'A alta não ficou registrada no histórico.',
          );

          // Nenhuma fila ficou aberta: todas as passagens foram fechadas.
          conferir(
            prontuario.etapas.every((e) => ['Concluida', 'Cancelada'].includes(e.status)),
            'Sobrou etapa aberta depois da alta.',
          );
          conferir(
            prontuario.tempoNasFilas.every((p) => p.saiuEm !== null),
            'Sobrou passagem de fila sem hora de saída depois da alta.',
          );
        },
      },

      {
        nome: 'o tempo de vida do atendimento fecha, fila por fila',
        async executar(ctx) {
          const cli = ctx.contas.coordenacao.cliente;
          const prontuario = await cli.get(`/atendimentos/${ctx.jornada.id}`);

          const filas = prontuario.tempoNasFilas.map((p) => p.especialidade);

          // As quatro por onde o paciente passou, e a clínica geral uma vez só:
          // a passagem é reaberta pela devolução, e não duplicada.
          for (const esperada of ['Triagem', 'ClinicaGeral', 'Ultrassom', 'Farmacia']) {
            conferir(
              filas.includes(esperada),
              `A fila ${esperada} não aparece no tempo de vida do atendimento.`,
            );
          }

          conferir(
            prontuario.tempoNasFilas.every((p) => p.esperaMinutos !== null),
            'Passagem fechada sem o tempo de espera calculado.',
          );

          conferir(
            prontuario.historico.length >= 8,
            `O histórico tem ${prontuario.historico.length} linhas para um caminho de quatro filas.`,
          );
        },
      },

      {
        nome: 'finalizado não encaminha; reabrir exige justificativa; a correção fica marcada',
        async executar(ctx) {
          const cli = ctx.contas.clinico.cliente;
          const { id } = ctx.jornada;

          // Mover o paciente depois de fechado é recusado: para encaminhar,
          // devolver ou encerrar de novo é preciso reabrir primeiro.
          const erro = await cli.recusa(
            'POST',
            `/atendimentos/${id}/etapas/ClinicaGeral/encaminhar`,
            { destino: 'Enfermagem', motivo: 'Trocar o curativo depois de fechado.' },
          );

          conferir(
            /finaliz/i.test(JSON.stringify(erro.corpo)),
            `A recusa tinha que dizer que o atendimento está finalizado. Veio: ${erro.message}`,
          );

          const semJustificativa = await cli.recusa('POST', `/atendimentos/${id}/reabrir`, {});

          conferir(
            /justificativa/i.test(JSON.stringify(semJustificativa.corpo)),
            `Reabrir sem justificativa tinha que ser recusado. Veio: ${semJustificativa.message}`,
          );

          await cli.post(`/atendimentos/${id}/reabrir`, {
            justificativa: 'Faltou registrar a orientação de retorno no prontuário.',
          });

          const reaberto = await cli.get(`/atendimentos/${id}`);

          conferirIgual(reaberto.status, 'EmAndamento', 'status depois de reabrir');
          conferir(
            reaberto.historico.some((h) => h.acao === 'ReabriuAtendimento'),
            'A reabertura não ficou no histórico.',
          );

          await cli.put(`/atendimentos/${id}/consulta`, {
            especialidade: 'ClinicaGeral',
            cid10Codigo: 'M54.5',
            conduta: 'Analgesia, hidratação e orientação de retorno se febre ou piora.',
            orientacoesGerais: 'Beber 2 L de água por dia. Voltar se tiver febre ou sangue na urina.',
            desfecho: 'Alta',
          });

          const corrigido = await cli.get(`/atendimentos/${id}`);

          // Editar depois de fechado é permitido e fica marcado como tal: é o
          // que separa a correção honesta da alteração silenciosa.
          conferir(
            corrigido.historico.some((h) => h.acao === 'EditouAposFinalizacao'),
            'A edição depois da finalização não ficou marcada no histórico.',
          );

          await cli.post(`/atendimentos/${id}/etapas/ClinicaGeral/alta`, { cancelarPendentes: true });

          conferirIgual(
            (await cli.get(`/atendimentos/${id}`)).status,
            'Finalizado',
            'status depois de fechar de novo',
          );
        },
      },
    ],
  };
}
