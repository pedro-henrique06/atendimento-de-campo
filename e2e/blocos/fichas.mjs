/**
 * Bloco 3 — a ficha de cada uma das treze filas, preenchida e lida de volta.
 *
 * Preencher não basta: cada passo grava e depois lê o prontuário. Metade dos
 * erros de contrato não aparecem na gravação — o POST responde 200 e o campo
 * some no caminho de volta, porque o DTO de leitura é posicional e um campo
 * entrou fora de ordem. Gravar e conferir na mesma volta é o que pega isso.
 *
 * Quem preenche é sempre a conta da fila. É de lá que sai o autor de cada
 * registro, e o autor é metade do que um prontuário serve para responder.
 */

import { conferir, conferirIgual } from '../motor.mjs';
import { itemDoCatalogo, pacienteNaFila, triar } from '../comum.mjs';

/** Prepara um paciente na fila e já com a etapa assumida por quem atende. */
async function emAtendimento(ctx, fila, chaveDaConta, paciente = {}) {
  const conta = ctx.contas[chaveDaConta];
  const id = await pacienteNaFila(ctx.contas.enfermeiro.cliente, ctx.base.id, fila, paciente);

  await conta.cliente.post(`/atendimentos/${id}/etapas/${fila}/assumir`);

  return { id, cli: conta.cliente, conta };
}

function consultaDe(prontuario, fila) {
  return prontuario.consultas.find((c) => c.especialidade === fila) ?? null;
}

export function blocoFichas() {
  return {
    nome: 'Fichas — uma preenchida em cada fila',
    passos: [
      {
        nome: 'Triagem: sinais vitais, sintomas e a sugestão do START',
        async executar(ctx) {
          const id = await pacienteNaFila(
            ctx.contas.recepcao.cliente,
            ctx.base.id,
            'Triagem',
            { nome: 'Teodora Viana', idade: 61 },
          );

          const cli = ctx.contas.enfermeiro.cliente;

          await cli.post(`/atendimentos/${id}/etapas/Triagem/assumir`);

          /*
            Achados que o START classifica como vermelho, contra uma
            classificação verde escolhida à mão. A divergência não bloqueia —
            quem está com o paciente decide — mas tem que voltar na resposta e
            ficar no histórico, porque é o que a coordenação lê depois.
          */
          const sugestao = await triar(cli, id, {
            classificacaoRisco: 'Verde',
            frequenciaRespiratoria: 36,
            saturacaoO2: 89,
            escalaDor: 8,
            sintomas: ['FaltaDeAr', 'Dor'],
            statusAlergia: 'PossuiAlergia',
            alergias: 'Dipirona',
            extra: {
              pesoKg: 58.5,
              alturaCm: 162,
              glicemiaCapilar: 180,
              testeRapidoMalaria: 'Negativo',
              teveCirurgiaPrevia: true,
              cirurgiasPrevias: 'Cesárea em 2019.',
              medicamentosEmUso: 'Losartana 50 mg.',
              observacoes: 'Chegou andando, com dispneia.',
            },
            achadosStart: {
              deambula: false,
              respiraEspontaneamente: true,
              frequenciaRespiratoria: 36,
              pulsoRadialPresente: true,
              obedeceComandos: true,
            },
          });

          conferirIgual(sugestao?.divergente, true, 'o START tinha que divergir do verde');
          conferirIgual(sugestao?.sugerida, 'Vermelho', 'classificação sugerida pelo START');

          const prontuario = await cli.get(`/atendimentos/${id}`);

          conferirIgual(prontuario.triagem?.saturacaoO2, 89, 'saturação gravada');
          conferirIgual(prontuario.triagem?.pesoKg, 58.5, 'peso gravado');
          // Calculado de peso e altura, e não gravado: 58,5 kg em 1,62 m.
          conferir(
            Math.abs((prontuario.triagem?.imc ?? 0) - 22.3) < 0.2,
            `IMC veio ${prontuario.triagem?.imc}, e de 58,5 kg com 1,62 m sai ~22,3.`,
          );
          conferirIgual(prontuario.triagem?.faixaImc, 'Adequado', 'faixa do IMC');
          conferirIgual(prontuario.classificacaoRisco, 'Verde', 'a classificação de quem triou prevalece');
          conferirIgual(prontuario.paciente.alerta.exibir, true, 'alerta de alergia');
          conferir(
            prontuario.historico.some((h) => h.campo === 'triagem.divergenciaStart'),
            'A divergência do START não entrou no histórico.',
          );

          ctx.fichas.Triagem = id;
        },
      },

      {
        nome: 'Clínica Geral: consulta com CID, conduta e prescrição',
        async executar(ctx) {
          const { id, cli } = await emAtendimento(ctx, 'ClinicaGeral', 'clinico', {
            nome: 'Ubaldo Siqueira',
            idade: 47,
          });

          const amoxicilina = await itemDoCatalogo(cli, 'Amoxicilina');

          await cli.put(`/atendimentos/${id}/consulta`, {
            especialidade: 'ClinicaGeral',
            sintomasDescricao: 'Tosse produtiva há cinco dias, com febre.',
            historiaClinica: 'Tabagista, 20 anos-maço. Sem internação prévia.',
            exameFisico: 'Estertores em base direita. Sem sinais de esforço.',
            cid10Codigo: 'J18.9',
            diagnosticoObservacao: 'Pneumonia de comunidade, quadro leve.',
            conduta: 'Antibiótico por sete dias e retorno se piorar.',
            orientacoesGerais: 'Hidratação e repouso. Voltar se faltar ar.',
            exameLaboratorialSolicitado: true,
            exameLaboratorialDescricao: 'Hemograma e proteína C reativa.',
            procedimentos: ['Curativo'],
            procedimentosObservacao: 'Curativo em lesão de perna direita.',
            desfecho: 'Alta',
            dispensacoes: [
              {
                itemId: amoxicilina.id,
                quantidade: 21,
                via: 'Oral',
                posologia: '1 cápsula de 8/8 h por 7 dias.',
              },
            ],
          });

          const prontuario = await cli.get(`/atendimentos/${id}`);
          const consulta = consultaDe(prontuario, 'ClinicaGeral');

          conferir(consulta, 'A consulta de clínica geral não voltou no prontuário.');
          conferirIgual(consulta.cid10Codigo, 'J18.9', 'CID gravado');
          conferir(consulta.cid10Descricao, 'O CID tinha que voltar com a descrição do catálogo.');
          conferirIgual(consulta.dispensacoes.length, 1, 'prescrições na consulta');
          conferirIgual(consulta.dispensacoes[0].quantidade, 21, 'quantidade prescrita');
          conferir(consulta.profissional?.registro, 'A ficha tinha que estar assinada com o registro.');
          conferirIgual(consulta.exameLaboratorialSolicitado, true, 'exame laboratorial pedido');
          conferir(
            consulta.exameLaboratorialDescricao?.includes('Hemograma'),
            'A descrição do exame laboratorial não voltou.',
          );
          conferirIgual(consulta.procedimentos.join(), 'Curativo', 'procedimentos na consulta');

          /*
            A linha nasce sem assinatura.

            Prescrever e administrar são atos de pessoas diferentes, e a ficha
            que prescreve não marca a checagem — se marcasse, assinaria que foi
            dado antes de alguém dar.
          */
          conferirIgual(consulta.dispensacoes[0].checadaEm, null, 'checagem ao prescrever');

          ctx.fichas.ClinicaGeral = id;
        },
      },

      {
        nome: 'Pediatria: criança, com nome da mãe e endereço',
        async executar(ctx) {
          // Menor de idade exige os dois: em campo a criança chega acompanhada
          // de quem não é o responsável legal, e é por eles que se reencontra
          // a família depois.
          const { id, cli } = await emAtendimento(ctx, 'Pediatria', 'pediatra', {
            nome: 'Valentina Rocha',
            idade: 4,
            nomeDaMae: 'Marcia Rocha',
            endereco: 'Setor 3, barraca 42.',
            vulnerabilidades: ['CriancaMenor5'],
          });

          await cli.put(`/atendimentos/${id}/consulta`, {
            especialidade: 'Pediatria',
            sintomasDescricao: 'Diarreia há três dias, sem sangue.',
            exameFisico: 'Mucosas úmidas, turgor preservado. Hidratada.',
            cid10Codigo: 'A09',
            conduta: 'Sais de reidratação oral e orientação à mãe.',
            desfecho: 'Alta',
          });

          const prontuario = await cli.get(`/atendimentos/${id}`);

          conferirIgual(prontuario.paciente.nomeDaMae, 'Marcia Rocha', 'nome da mãe');
          conferirIgual(prontuario.paciente.idade, 4, 'idade da criança');
          conferir(
            consultaDe(prontuario, 'Pediatria'),
            'A consulta de pediatria não voltou no prontuário.',
          );

          ctx.fichas.Pediatria = id;
        },
      },

      {
        nome: 'Ortopedia: o bloco de trauma, com imobilização e raio-X',
        async executar(ctx) {
          const { id, cli } = await emAtendimento(ctx, 'Ortopedia', 'ortopedista', {
            nome: 'Waldemar Pontes',
            idade: 38,
          });

          await cli.put(`/atendimentos/${id}/consulta`, {
            especialidade: 'Ortopedia',
            sintomasDescricao: 'Dor e bloqueio em joelho esquerdo após torção.',
            exameFisico: 'Derrame articular, McMurray positivo. Sem instabilidade.',
            cid10Codigo: 'S83.2',
            conduta: 'Imobilização, analgesia e reavaliação em 48 h.',
            desfecho: 'Retorno',
            ortopedia: {
              localizacao: 'Joelho esquerdo, interlinha medial.',
              mecanismoTrauma: 'Torção com pé fixo ao carregar peso em terreno irregular.',
              imobilizacao: true,
              necessitaRaioX: true,
            },
          });

          const consulta = consultaDe(await cli.get(`/atendimentos/${id}`), 'Ortopedia');

          conferir(consulta?.ortopedia, 'O bloco de ortopedia não voltou na consulta.');
          conferirIgual(consulta.ortopedia.imobilizacao, true, 'imobilização');
          conferirIgual(consulta.ortopedia.necessitaRaioX, true, 'necessita raio-X');

          ctx.fichas.Ortopedia = id;
        },
      },

      {
        nome: 'Odontologia: odontograma com dois estados no mesmo dente',
        async executar(ctx) {
          const { id, cli } = await emAtendimento(ctx, 'Odontologia', 'dentista', {
            nome: 'Xavier Bonilla',
            idade: 29,
          });

          /*
            Cárie *e* extração indicada no 36.

            É o caso que o odontograma de referência não representava: um dente
            carregava um estado só, era pintado de uma cor e a cárie sumia do
            desenho. Aqui cada marcação é uma linha, então os dois coexistem — e
            é isso que este passo confere.
          */
          await cli.put(`/atendimentos/${id}/odontologia`, {
            queixa: 'Dor no molar inferior esquerdo ao mastigar.',
            cid10Codigo: 'K02.9',
            procedimentos: ['ProfilaxiaLimpeza', 'OrientacaoHigieneBucal'],
            desfecho: 'Alta',
            odontograma: [
              { dente: 36, estado: 'Carie', faces: ['Oclusal', 'Mesial'] },
              { dente: 36, estado: 'ExtracaoIndicada', faces: [] },
              { dente: 11, estado: 'Restaurado', faces: ['Vestibular'] },
              { dente: 48, estado: 'Ausente', faces: [] },
            ],
          });

          const prontuario = await cli.get(`/atendimentos/${id}`);
          const odonto = prontuario.odontologia;

          conferir(odonto, 'A ficha de odontologia não voltou no prontuário.');
          conferirIgual(odonto.odontograma.length, 4, 'marcações no odontograma');

          const no36 = odonto.odontograma.filter((m) => m.dente === 36);

          conferirIgual(no36.length, 2, 'estados no dente 36');
          conferir(
            no36.some((m) => m.estado === 'Carie') &&
              no36.some((m) => m.estado === 'ExtracaoIndicada'),
            'O dente 36 tinha que carregar cárie e extração indicada ao mesmo tempo.',
          );
          conferir(odonto.resumoOdontograma, 'O resumo em texto do odontograma veio vazio.');

          ctx.fichas.Odontologia = id;
        },
      },

      {
        nome: 'Enfermagem: procedimentos e o que saiu do estoque',
        async executar(ctx) {
          const { id, cli } = await emAtendimento(ctx, 'Enfermagem', 'enfermeiro', {
            nome: 'Yolanda Prates',
            idade: 55,
          });

          const gaze = await itemDoCatalogo(cli, 'Gaze');

          await cli.put(`/atendimentos/${id}/enfermagem`, {
            procedimentos: ['Curativo', 'AfericaoSinaisVitais', 'GlicemiaCapilar'],
            observacoes: 'Ferida em perna direita, sem secreção. Curativo trocado.',
            desfecho: 'Alta',
            // Sem via: gaze não tem via de administração, e o catálogo é
            // quem diz isso — foi "Diclofenaco - Oral - 1 ampola" que motivou a
            // checagem.
            dispensacoes: [{ itemId: gaze.id, quantidade: 4, posologia: 'Cobertura da ferida.' }],
          });

          const enfermagem = (await cli.get(`/atendimentos/${id}`)).enfermagem;

          conferir(enfermagem, 'A ficha de enfermagem não voltou no prontuário.');
          conferirIgual(enfermagem.procedimentos.length, 3, 'procedimentos de enfermagem');
          conferirIgual(enfermagem.dispensacoes.length, 1, 'itens dispensados na enfermagem');

          ctx.fichas.Enfermagem = id;
        },
      },

      {
        nome: 'Saúde Mental: sintomas e perdas vivenciadas',
        async executar(ctx) {
          const { id, cli } = await emAtendimento(ctx, 'SaudeMental', 'psicologo', {
            nome: 'Zacarias Coelho',
            idade: 44,
          });

          await cli.put(`/atendimentos/${id}/consulta`, {
            especialidade: 'SaudeMental',
            sintomasDescricao: 'Insônia e choro fácil desde a enchente.',
            historiaClinica: 'Sem acompanhamento prévio em saúde mental.',
            cid10Codigo: 'F43.2',
            conduta: 'Acolhimento, psicoeducação e retorno em uma semana.',
            desfecho: 'Retorno',
            sintomasSaudeMental: ['Tristeza', 'Insonia', 'Luto'],
            perdasVivenciadas: ['Casa', 'Familiar', 'Documentos'],
          });

          const consulta = consultaDe(await cli.get(`/atendimentos/${id}`), 'SaudeMental');

          conferirIgual(consulta?.sintomasSaudeMental.length, 3, 'sintomas de saúde mental');
          conferirIgual(consulta?.perdasVivenciadas.length, 3, 'perdas vivenciadas');

          ctx.fichas.SaudeMental = id;
        },
      },

      {
        nome: 'Ginecologia: gestante, com DUM e história obstétrica',
        async executar(ctx) {
          const { id, cli } = await emAtendimento(ctx, 'Ginecologia', 'ginecologista', {
            nome: 'Adriana Montes',
            idade: 27,
            sexo: 'Feminino',
            vulnerabilidades: ['Gestante'],
          });

          await cli.put(`/atendimentos/${id}/consulta`, {
            especialidade: 'Ginecologia',
            sintomasDescricao: 'Pré-natal de rotina; disúria há dois dias.',
            exameFisico: 'Altura uterina compatível, BCF presente. Giordano negativo.',
            cid10Codigo: 'N39.0',
            conduta: 'Cefalexina por sete dias, sulfato ferroso, retorno em 30 dias.',
            desfecho: 'Retorno',
            ginecologia: {
              dataUltimaMenstruacao: '2026-04-02',
              gestacoes: 3,
              partos: 2,
              abortos: 0,
              gestante: true,
              semanasGestacao: 29,
              metodoContraceptivo: 'Nenhum.',
              ultimoPreventivo: '2024, sem alterações.',
            },
          });

          const consulta = consultaDe(await cli.get(`/atendimentos/${id}`), 'Ginecologia');

          conferir(consulta?.ginecologia, 'O bloco de ginecologia não voltou na consulta.');
          conferirIgual(consulta.ginecologia.semanasGestacao, 29, 'semanas de gestação');
          conferirIgual(consulta.ginecologia.gestacoes, 3, 'gestações');

          ctx.fichas.Ginecologia = id;
        },
      },

      {
        nome: 'Cirurgia: a ficha inteira, das quatro paradas à recuperação',
        async executar(ctx) {
          const { id, cli } = await emAtendimento(ctx, 'Cirurgia', 'cirurgiao', {
            nome: 'Benicio Alvarez',
            idade: 51,
          });

          // Relativas, pela mesma razão da folha de observação: data cravada no
          // roteiro vira data errada em toda rodada que não seja hoje.
          const horas = (atras) => new Date(Date.now() - atras * 60 * 60 * 1000).toISOString();

          // Primeiro o pré-operatório e o preparo da enfermaria. O preparo é
          // salvo junto, mas fora das paradas: ele acontece na enfermaria, e o
          // check-in na porta da sala.
          await cli.put(`/atendimentos/${id}/cirurgia`, {
            indicacao: 'Hérnia inguinal direita, redutível, sintomática.',
            procedimentoProposto: 'Herniorrafia inguinal com tela.',
            lateralidade: 'Direito',
            jejumHoras: 10,
            consentimentoAssinado: true,
            observacoesPreOperatorio: 'Hipertenso controlado; manteve losartana.',
            preparoCuidadosEnfermagem: 'Acesso venoso em MSE, calibre 20.',
            preparoTricotomia: true,
            preparoTricotomiaLocal: 'Inguinal direita.',
            preparoBanhoClorexidine: true,
            preparoPulseiraIdentificacao: true,
            preOpEcg: true,
            preOpLaboratorial: true,
            preOpUltrassom: true,
            preOpExamesObservacao: 'Hemograma e coagulograma de ontem, normais.',
            preOpAvaliacaoAnestesica: true,
            pertencesProteseDentaria: true,
            pertencesRoupasAcessorios: true,
            pertencesDestino: 'Armário 3, chave com a irmã.',
            encaminhadoAoCentroEm: horas(5),
            chegadaAoCentroEm: horas(4),
          });

          const comPreparo = (await cli.get(`/atendimentos/${id}`)).cirurgia;

          conferirIgual(comPreparo.preparoTricotomiaLocal, 'Inguinal direita.', 'local da tricotomia');
          conferirIgual(comPreparo.preOpAvaliacaoAnestesica, true, 'avaliação anestésica conferida');

          // A distância entre a saída da enfermaria e a chegada na sala é
          // paciente em jejum num corredor — e é a única forma de ver a espera.
          conferir(
            comPreparo.chegadaAoCentroEm > comPreparo.encaminhadoAoCentroEm,
            'A chegada ao centro tinha que ser depois da saída da enfermaria.',
          );

          /*
            E a hora da primeira parada continua em branco.

            É o ponto do desenho: o preparo é da enfermaria, o check-in é da
            porta da sala. Se o preparo carimbasse `checkInEm`, a lista de
            verificação passaria a marcar uma hora que não é a dela — e a hora é
            o que faz a lista valer alguma coisa.
          */
          conferirIgual(comPreparo.checkInEm, null, 'hora do check-in antes do check-in');

          const paradas = [
            {
              nome: 'check-in',
              campos: {
                checkInIdentidadeConfirmada: true,
                checkInSitioMarcado: true,
                checkInConsentimentoConferido: true,
                checkInAlergiaConferida: true,
                checkInJejumConferido: true,
              },
              carimbo: 'checkInEm',
            },
            {
              nome: 'time out 1',
              campos: {
                timeOutUmEquipeApresentada: true,
                timeOutUmMonitorizacaoOk: true,
                timeOutUmViaAereaAvaliada: true,
                timeOutUmRiscoSangramentoAvaliado: true,
                timeOutUmExamesEmSala: true,
                timeOutUmVerificacaoAnestesica: true,
              },
              carimbo: 'timeOutUmEm',
            },
            {
              nome: 'time out 2',
              campos: {
                timeOutDoisPacienteSitioProcedimentoConfirmados: true,
                timeOutDoisAntibioticoProfilatico: true,
                timeOutDoisAntibioticoQual: 'Cefazolina 2 g, 30 min antes.',
                timeOutDoisImagensDisponiveis: true,
                timeOutDoisEventosCriticosRevistos: true,
                timeOutDoisMaterialEsterilizado: true,
                timeOutDoisInstrumentalIntegrador: true,
                timeOutDoisTempoPrevistoMinutos: 90,
              },
              carimbo: 'timeOutDoisEm',
            },
            {
              nome: 'check-out',
              campos: {
                checkOutProcedimentoRegistrado: true,
                checkOutContagemConfere: true,
                checkOutAmostrasIdentificadas: true,
                checkOutProblemasComEquipamento: false,
                checkOutCuidadosRecuperacao: 'Analgesia fixa e observação por 4 h.',
              },
              carimbo: 'checkOutEm',
            },
          ];

          let acumulado = {
            indicacao: comPreparo.indicacao,
            procedimentoProposto: comPreparo.procedimentoProposto,
            lateralidade: 'Direito',
            jejumHoras: 10,
            consentimentoAssinado: true,
            preparoTricotomia: true,
            preparoTricotomiaLocal: 'Inguinal direita.',
          };

          for (const parada of paradas) {
            acumulado = { ...acumulado, ...parada.campos };

            await cli.put(`/atendimentos/${id}/cirurgia`, acumulado);

            const ficha = (await cli.get(`/atendimentos/${id}`)).cirurgia;

            conferir(ficha[parada.carimbo], `A parada "${parada.nome}" não foi carimbada.`);
          }

          /*
            O transoperatório: o que aconteceu entre a indução e o fecho.

            Salvo junto com as paradas, mas sem carimbar nenhuma — descrever a
            incisão não é concluir uma parada da lista de verificação, e se
            carimbasse, a hora da parada passaria a ser a hora em que alguém
            teve a mão livre para escrever.
          */
          acumulado = {
            ...acumulado,
            anestesia: ['BloqueioRaqui', 'Sedacao'],
            anestesiaLocal: 'L3-L4.',
            posicionamento: 'DecubitoDorsal',
            placaBisturi: true,
            placaBisturiLocal: 'Coxa direita, face lateral.',
            preparoDaPele: 'Tricotomia inguinal, pele íntegra.',
            antissepsia: 'Clorexidina alcoólica 0,5%, dois tempos.',
            incisaoCirurgica: 'Inguinotomia direita de 6 cm.',
            curativo: 'Curativo oclusivo seco.',
            medicacoesRealizadas: 'Cefazolina 2 g IV. Dipirona 2 g IV.',
            gazesUtilizadas: 20,
            compressasUtilizadas: 4,
            evolucaoMedica: 'Procedimento sem intercorrências, sangramento mínimo.',
            evolucaoEnfermagem: 'Paciente estável durante todo o ato.',
          };

          await cli.put(`/atendimentos/${id}/cirurgia`, acumulado);

          const transoperatorio = (await cli.get(`/atendimentos/${id}`)).cirurgia;

          conferir(
            transoperatorio.anestesia.join() === 'BloqueioRaqui,Sedacao',
            `anestesia voltou como ${transoperatorio.anestesia.join(', ')}`,
          );
          conferirIgual(transoperatorio.gazesUtilizadas, 20, 'gazes usadas');
          conferirIgual(
            transoperatorio.incisaoCirurgica,
            'Inguinotomia direita de 6 cm.',
            'incisão',
          );

          // Recuperação pós-anestésica: o estado em que o paciente chegou.
          await cli.put(`/atendimentos/${id}/cirurgia`, {
            ...acumulado,
            destinoPosOperatorio: 'RecuperacaoAnestesica',
            recuperacaoEntradaEm: horas(3),
            recuperacaoSaidaEm: horas(1),
            recuperacaoNivelConsciencia: 'Sonolento',
            recuperacaoSuporteOxigenio: 'CateterNasal',
            recuperacaoOxigenioDetalhe: '3 l/min',
            recuperacaoAcessoVenosoPeriferico: true,
            recuperacaoAcessoVenosoDescricao: 'Jelco 20, antebraço esquerdo.',
            recuperacaoInfusoes: 'Ringer lactato 500 mL em 4 h.',
            recuperacaoSondaVesical: true,
            recuperacaoEvolucaoMedica: 'Estável, dor controlada.',
            recuperacaoEvolucaoEnfermagem: 'SSVV de 2/2 h conforme prescrição.',
            intercorrencias: 'Sem intercorrências.',
            observacoesRecuperacao: 'Acordado, orientado, dor 2/10.',
            pertencesDevolvidos: true,
            recuperacaoDieta: 'Líquida leve, liberada duas horas após o despertar.',
            desfecho: 'Alta',
          });

          const ficha = (await cli.get(`/atendimentos/${id}`)).cirurgia;

          conferirIgual(ficha.pertencesDevolvidos, true, 'pertences devolvidos');
          conferirIgual(ficha.recuperacaoNivelConsciencia, 'Sonolento', 'nível de consciência');
          conferirIgual(ficha.recuperacaoOxigenioDetalhe, '3 l/min', 'fluxo de oxigênio');
          conferirIgual(ficha.recuperacaoSondaVesical, true, 'sonda vesical');
          conferirIgual(
            ficha.recuperacaoDieta,
            'Líquida leve, liberada duas horas após o despertar.',
            'dieta liberada',
          );
          conferir(ficha.checkInEm && ficha.timeOutUmEm, 'As paradas anteriores perderam o carimbo.');
          conferir(ficha.concluidaEm, 'A ficha fechada em alta tinha que ter hora de conclusão.');

          ctx.fichas.Cirurgia = id;
        },
      },

      {
        nome: 'Anestesia: avaliação pré-anestésica',
        async executar(ctx) {
          const { id, cli } = await emAtendimento(ctx, 'Anestesia', 'anestesista', {
            nome: 'Celina Ibarra',
            idade: 66,
          });

          await cli.put(`/atendimentos/${id}/consulta`, {
            especialidade: 'Anestesia',
            historiaClinica: 'Hipertensa, diabética. Mallampati II. ASA II.',
            exameFisico: 'Via aérea sem previsão de dificuldade. Ausculta limpa.',
            cid10Codigo: 'Z00.0',
            conduta: 'Liberada para raquianestesia. Jejum de 8 h.',
            desfecho: 'Encaminhado',
            encaminhadoPara: 'Cirurgia',
          });

          const prontuario = await cli.get(`/atendimentos/${id}`);

          conferir(
            prontuario.etapas.some((e) => e.especialidade === 'Cirurgia'),
            'Encaminhar da anestesia para a cirurgia não abriu a fila da cirurgia.',
          );
          conferirIgual(
            prontuario.etapas.find((e) => e.especialidade === 'Cirurgia')?.encaminhadaDe,
            'Anestesia',
            'de onde o paciente chegou na cirurgia',
          );

          ctx.fichas.Anestesia = id;
        },
      },

      {
        nome: 'Cardiologia: teleconsulta',
        async executar(ctx) {
          const { id, cli } = await emAtendimento(ctx, 'Cardiologia', 'cardiologista', {
            nome: 'Dalmo Guerrero',
            idade: 72,
            condicoesCronicas: ['Hipertensao', 'Cardiopatia'],
          });

          await cli.put(`/atendimentos/${id}/consulta`, {
            especialidade: 'Cardiologia',
            sintomasDescricao: 'Sem queixas; vem para revisão da pressão.',
            historiaClinica: 'Hipertenso de longa data, em uso de losartana 50 mg.',
            exameFisico: 'PA 158/96 em dois momentos. Ausculta sem sopros.',
            cid10Codigo: 'I10',
            diagnosticoObservacao: 'Hipertensão em controle insuficiente.',
            conduta: 'Dobrar a losartana e reavaliar em duas semanas.',
            desfecho: 'Alta',
          });

          const consulta = consultaDe(await cli.get(`/atendimentos/${id}`), 'Cardiologia');

          conferirIgual(consulta?.cid10Codigo, 'I10', 'CID da teleconsulta de cardiologia');

          ctx.fichas.Cardiologia = id;
        },
      },

      {
        nome: 'Ultrassom: laudo assinado com conselho e registro',
        async executar(ctx) {
          const { id, cli, conta } = await emAtendimento(ctx, 'Ultrassom', 'ultrassonografista', {
            nome: 'Eliane Zamora',
            idade: 33,
          });

          await cli.put(`/atendimentos/${id}/ultrassom`, {
            exameSolicitado: 'Ultrassom abdominal total.',
            indicacao: 'Dor em hipocôndrio direito, suspeita de colelitíase.',
            analise:
              'Vesícula de paredes finas, com imagem hiperecogênica móvel de 12 mm. ' +
              'Vias biliares sem dilatação. Fígado de dimensões normais.',
            conclusao: 'Colelitíase, sem sinais de colecistite.',
            desfecho: 'Alta',
          });

          const ultrassom = (await cli.get(`/atendimentos/${id}`)).ultrassom;

          conferir(ultrassom, 'O laudo de ultrassom não voltou no prontuário.');
          conferirIgual(ultrassom.conclusao, 'Colelitíase, sem sinais de colecistite.', 'conclusão');

          // No papel a linha final é "Médico ___ CRM ___". Um laudo sem ela não
          // vale fora do sistema.
          conferirIgual(ultrassom.profissional?.nome, conta.nome, 'quem assinou o laudo');
          conferirIgual(ultrassom.profissional?.conselho, 'Crm', 'conselho de quem assinou');
          conferir(ultrassom.profissional?.registro, 'O laudo saiu sem o número do registro.');

          ctx.fichas.Ultrassom = id;
        },
      },

      {
        nome: 'Farmácia: dispensa, confere e registra o que faltou',
        async executar(ctx) {
          const { id, cli } = await emAtendimento(ctx, 'Farmacia', 'farmaceutico', {
            nome: 'Fausto Delgado',
            idade: 40,
          });

          const dipirona = await itemDoCatalogo(cli, 'Dipirona');

          await cli.put(`/atendimentos/${id}/farmacia`, {
            orientacoes: 'Tomar após as refeições. Não exceder 4 g por dia.',
            observacoes: 'Paciente orientado sobre o uso; entendeu a posologia.',
            desfecho: 'Alta',
            dispensacoes: [
              {
                itemId: dipirona.id,
                quantidade: 10,
                via: 'Oral',
                posologia: '1 comprimido de 6/6 h se dor.',
              },
              {
                // Item fora do catálogo: existe para o que a missão recebeu de
                // doação e não está cadastrado. A justificativa é o que permite
                // a coordenação revisar depois.
                descricaoLivre: 'Pomada de calêndula (doação)',
                justificativaItemLivre: 'Doação recebida na base, sem cadastro no catálogo.',
                quantidade: 1,
                via: 'Topica',
                posologia: 'Aplicar 2x ao dia na área.',
              },
            ],
          });

          const farmacia = (await cli.get(`/atendimentos/${id}`)).farmacia;

          conferir(farmacia, 'A ficha da farmácia não voltou no prontuário.');
          conferirIgual(farmacia.dispensacoes.length, 2, 'itens dispensados');

          const livre = farmacia.dispensacoes.find((d) => d.foraDoCatalogo);

          conferir(livre, 'O item fora do catálogo não voltou marcado como tal.');
          conferir(
            livre.item.includes('calêndula'),
            `O item livre voltou como "${livre.item}", e devia voltar com a descrição digitada.`,
          );

          ctx.fichas.Farmacia = id;
        },
      },

      {
        nome: 'a folha de observação aceita medidas em série, e aceita apagar uma',
        async executar(ctx) {
          const id = ctx.fichas.Triagem;
          const cli = ctx.contas.enfermeiro.cliente;

          /*
            Horas relativas, e não fixas.

            A folha aceita hora passada porque em campo se mede e se anota
            depois, e recusa hora futura, que só pode ser engano de digitação.
            Uma data cravada no roteiro passa a ser futuro na primeira vez que
            alguém rodar isto antes do dia escrito.
          */
          const duasHorasAtras = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
          const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();

          const primeira = await cli.post(`/atendimentos/${id}/sinais-vitais`, {
            medidaEm: duasHorasAtras,
            pressaoSistolica: 150,
            pressaoDiastolica: 95,
            frequenciaCardiaca: 102,
            saturacaoO2: 90,
            observacao: 'Em oxigênio por cateter nasal, 2 L/min.',
          });

          await cli.post(`/atendimentos/${id}/sinais-vitais`, {
            medidaEm: umaHoraAtras,
            pressaoSistolica: 138,
            pressaoDiastolica: 88,
            frequenciaCardiaca: 94,
            saturacaoO2: 94,
          });

          let prontuario = await cli.get(`/atendimentos/${id}`);

          conferirIgual(prontuario.sinaisVitais.length, 2, 'medidas na folha de observação');
          conferir(
            prontuario.sinaisVitais[0].medidaEm < prontuario.sinaisVitais[1].medidaEm,
            'A folha de observação tinha que vir em ordem de hora.',
          );

          await cli.del(`/atendimentos/${id}/sinais-vitais/${primeira.id}`);

          prontuario = await cli.get(`/atendimentos/${id}`);

          conferirIgual(prontuario.sinaisVitais.length, 1, 'medidas depois de apagar uma');

          // No papel a linha errada é riscada e continua lá. Aqui ela sai da
          // folha, e o que fica no lugar é quem a tirou.
          conferir(
            prontuario.historico.some((h) => h.acao === 'RemoveuSinaisVitais'),
            'Apagar uma medida não deixou rastro no histórico.',
          );
        },
      },
    ],
  };
}
