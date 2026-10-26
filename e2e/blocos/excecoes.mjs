/**
 * Bloco 6 — as exceções que o sistema permite e registra.
 *
 * Em campo a equipe é curta e as funções se cobrem: o médico tria quando a fila
 * estoura. Nada disso é trancado, de propósito — trancar pararia o plantão sem
 * proteger nada, já que quem entrou no sistema foi cadastrado pela coordenação.
 * O que existe é rastro, e é o rastro que estes passos conferem: a exceção
 * precisa deixar marca para valer como exceção.
 */

import { conferir, conferirIgual } from '../motor.mjs';
import { abrirAtendimento, etapaDe, pacienteNaFila } from '../comum.mjs';

export function blocoExcecoes() {
  return {
    nome: 'Exceções — o que é permitido, e fica registrado',
    passos: [
      {
        nome: 'assumir fora da própria fila é permitido, e fica marcado como tal',
        async executar(ctx) {
          const id = await pacienteNaFila(
            ctx.contas.enfermeiro.cliente,
            ctx.base.id,
            'Odontologia',
            { nome: 'Nestor Quintana', idade: 36 },
          );

          // O clínico assumindo na odontologia: a fila estourou, e alguém
          // precisa atender.
          const cli = ctx.contas.clinico.cliente;

          await cli.post(`/atendimentos/${id}/etapas/Odontologia/assumir`);

          const prontuario = await cli.get(`/atendimentos/${id}`);

          conferirIgual(
            etapaDe(prontuario, 'Odontologia').profissional,
            ctx.contas.clinico.nome,
            'quem assumiu a odontologia',
          );

          conferir(
            prontuario.historico.some(
              (h) => h.acao === 'AssumiuForaDaSuaFila' && h.especialidade === 'Odontologia',
            ),
            'Assumir fora da própria fila não deixou rastro no histórico.',
          );

          ctx.excecoes = { foraDaFila: id };
        },
      },

      {
        nome: 'liberar devolve o paciente para a fila, e quem pegou sai da ficha',
        async executar(ctx) {
          const id = ctx.excecoes.foraDaFila;
          const cli = ctx.contas.clinico.cliente;

          await cli.post(`/atendimentos/${id}/etapas/Odontologia/liberar`);

          const prontuario = await cli.get(`/atendimentos/${id}`);
          const etapa = etapaDe(prontuario, 'Odontologia');

          conferirIgual(etapa.status, 'Aguardando', 'etapa depois de liberada');
          conferirIgual(etapa.profissional, null, 'quem está com o paciente depois de liberar');
          conferirIgual(etapa.assumidaEm, null, 'hora de assumir depois de liberar');

          // Liberar sem ter registrado nada é diferente de concluir: a
          // produção da especialidade não pode contar um atendimento que não
          // aconteceu.
          conferir(
            prontuario.historico.some((h) => h.acao === 'LiberouEtapa'),
            'Liberar a etapa não ficou no histórico.',
          );

          // E o paciente volta a aparecer para quem está livre.
          const naFila = await ctx.contas.dentista.cliente.get(
            `/atendimentos?baseId=${ctx.base.id}&fila=Odontologia&ocultarAssumidos=true`,
          );

          conferir(
            naFila.some((a) => a.id === id),
            'O paciente liberado não voltou para a fila da odontologia.',
          );
        },
      },

      {
        nome: 'encaminhar sem ter atendido cancela a etapa, e não a conclui',
        async executar(ctx) {
          const id = await pacienteNaFila(
            ctx.contas.enfermeiro.cliente,
            ctx.base.id,
            'Pediatria',
            { nome: 'Otavio Salgado', idade: 8, nomeDaMae: 'Rosa Salgado', endereco: 'Setor 1.' },
          );

          const cli = ctx.contas.pediatra.cliente;

          await cli.post(`/atendimentos/${id}/etapas/Pediatria/assumir`);

          const prontuario = await cli.post(`/atendimentos/${id}/etapas/Pediatria/encaminhar`, {
            destino: 'Odontologia',
            motivo: 'Caso é odontológico; não avaliei clinicamente.',
          });

          /*
            Cancelada, não concluída.

            Nada clínico registrado significa que o paciente nunca foi atendido
            ali. Marcar como concluída inflaria a produção da pediatria com
            atendimentos que não existiram — e produção por área é justamente o
            número que este sistema precisa manter confiável.
          */
          conferirIgual(
            etapaDe(prontuario, 'Pediatria').status,
            'Cancelada',
            'etapa sem registro clínico depois de encaminhar',
          );

          // E o motivo fica no histórico: quem recebe o paciente na fila
          // seguinte precisa saber por que ele chegou ali.
          conferir(
            prontuario.historico.some(
              (h) =>
                h.campo === 'atendimento.motivoEncaminhamento' &&
                h.valorNovo?.includes('odontológico'),
            ),
            'O motivo do encaminhamento não entrou no histórico.',
          );
          conferir(
            prontuario.historico.some((h) => h.acao === 'EncaminhouParaOutraFila'),
            'O encaminhamento não ficou registrado como ação própria.',
          );
        },
      },

      {
        nome: 'devolver manda o paciente de volta para quem o encaminhou',
        async executar(ctx) {
          const id = await pacienteNaFila(
            ctx.contas.enfermeiro.cliente,
            ctx.base.id,
            'ClinicaGeral',
            { nome: 'Teresa Villalba', idade: 33 },
          );

          const clinico = ctx.contas.clinico.cliente;

          await clinico.post(`/atendimentos/${id}/etapas/ClinicaGeral/assumir`);
          await clinico.put(`/atendimentos/${id}/consulta`, {
            especialidade: 'ClinicaGeral',
            sintomasDescricao: 'Dor pélvica há uma semana.',
            cid10Codigo: 'N39.0',
            conduta: 'Avaliação ginecológica.',
            desfecho: 'Encaminhado',
            encaminhadoPara: 'Ginecologia',
          });

          /*
            A ginecologia vê que não é caso dela e devolve, sem escolher a fila
            na mão.

            É o caminho de volta do encaminhamento: quem recebeu devolve para
            quem mandou. Escolhendo na mão, quem recebe teria que lembrar de
            onde o paciente veio — e erraria nas vezes em que ele já passou por
            três filas.
          */
          const gineco = ctx.contas.ginecologista.cliente;

          await gineco.post(`/atendimentos/${id}/etapas/Ginecologia/assumir`);

          const prontuario = await gineco.post(
            `/atendimentos/${id}/etapas/Ginecologia/devolver`,
            { motivo: 'Quadro é urinário, não ginecológico.' },
          );

          conferirIgual(
            etapaDe(prontuario, 'Ginecologia').status,
            'Cancelada',
            'a fila que devolveu sem atender',
          );
          conferir(
            ['Aguardando', 'EmAndamento'].includes(etapaDe(prontuario, 'ClinicaGeral').status),
            'A devolução tinha que reabrir a fila da clínica geral.',
          );
          conferir(
            prontuario.historico.some((h) => h.acao === 'DevolveuParaOrigem'),
            'A devolução não ficou registrada como tal no histórico.',
          );

          // A fila reabre com a ficha que já tinha, e não como consulta nova.
          conferirIgual(
            prontuario.consultas.find((c) => c.especialidade === 'ClinicaGeral')?.cid10Codigo,
            'N39.0',
            'a consulta anterior depois da devolução',
          );
        },
      },

      {
        nome: 'encaminhar para a mesma fila, ou sem motivo, é recusado',
        async executar(ctx) {
          const id = await pacienteNaFila(
            ctx.contas.enfermeiro.cliente,
            ctx.base.id,
            'Enfermagem',
            { nome: 'Pilar Aguirre', idade: 42 },
          );

          const cli = ctx.contas.enfermeiro.cliente;

          const mesma = await cli.recusa(
            'POST',
            `/atendimentos/${id}/etapas/Enfermagem/encaminhar`,
            { destino: 'Enfermagem', motivo: 'Para mim mesmo.' },
          );

          conferir(
            /mesma|origem/i.test(JSON.stringify(mesma.corpo)),
            `A recusa tinha que dizer que o destino é a origem. Veio: ${mesma.message}`,
          );

          const semMotivo = await cli.recusa(
            'POST',
            `/atendimentos/${id}/etapas/Enfermagem/encaminhar`,
            { destino: 'ClinicaGeral', motivo: '   ' },
          );

          conferir(
            /motivo/i.test(JSON.stringify(semMotivo.corpo)),
            `A recusa tinha que pedir o motivo. Veio: ${semMotivo.message}`,
          );
        },
      },

      {
        nome: 'cadastro de menor sem nome da mãe e endereço é recusado',
        async executar(ctx) {
          const cli = ctx.contas.recepcao.cliente;
          const { codigo } = await cli.get('/pacientes/codigo-novo');

          const erro = await cli.recusa('POST', '/atendimentos', {
            baseId: ctx.base.id,
            paciente: {
              codigo,
              nome: 'Criança Sem Responsável',
              idadeAproximada: 6,
              sexo: 'NaoInformado',
              statusAlergia: 'NaoPerguntado',
              consentimentoRegistro: true,
            },
          });

          const texto = JSON.stringify(erro.corpo);

          // Os dois campos, e não um: em campo a criança chega acompanhada de
          // quem não é o responsável legal, e são eles que permitem reencontrar
          // a família depois.
          conferir(/mãe|mae/i.test(texto), `A recusa tinha que pedir o nome da mãe. Veio: ${texto}`);
          conferir(/endere/i.test(texto), `A recusa tinha que pedir o endereço. Veio: ${texto}`);
        },
      },

      {
        nome: 'cadastro sem consentimento e sem idade é recusado',
        async executar(ctx) {
          const cli = ctx.contas.recepcao.cliente;
          const { codigo } = await cli.get('/pacientes/codigo-novo');

          const erro = await cli.recusa('POST', '/atendimentos', {
            baseId: ctx.base.id,
            paciente: {
              codigo,
              nome: 'Sem Consentimento',
              sexo: 'NaoInformado',
              statusAlergia: 'NaoPerguntado',
              consentimentoRegistro: false,
            },
          });

          const texto = JSON.stringify(erro.corpo);

          conferir(/consentimento/i.test(texto), `Faltou falar do consentimento. Veio: ${texto}`);
          conferir(
            /idade|nascimento/i.test(texto),
            `Faltou falar da idade ou da data de nascimento. Veio: ${texto}`,
          );
        },
      },

      {
        nome: '"possui alergia" sem dizer qual é recusado; "nega" não acende alerta',
        async executar(ctx) {
          const cli = ctx.contas.recepcao.cliente;
          const { codigo } = await cli.get('/pacientes/codigo-novo');

          /*
            O alerta vermelho só dispara em "possui alergia".

            No sistema de referência a alergia era texto livre e a interface
            acendia o alerta para qualquer valor preenchido, inclusive "nega
            alergia medicamentosa" — dessensibilizando a equipe justamente para
            o caso real.
          */
          const erro = await cli.recusa('POST', '/atendimentos', {
            baseId: ctx.base.id,
            paciente: {
              codigo,
              nome: 'Alergia Sem Qual',
              idadeAproximada: 30,
              statusAlergia: 'PossuiAlergia',
              consentimentoRegistro: true,
            },
          });

          conferir(
            /alergia/i.test(JSON.stringify(erro.corpo)),
            `A recusa tinha que pedir quais são as alergias. Veio: ${erro.message}`,
          );

          const semAlergia = await abrirAtendimento(cli, ctx.base.id, {
            nome: 'Quirino Maldonado',
            idade: 30,
            statusAlergia: 'SemAlergiaConhecida',
          });

          conferirIgual(
            semAlergia.paciente.alerta.exibir,
            false,
            'alerta em quem declarou não ter alergia',
          );

          const naoPerguntado = await abrirAtendimento(cli, ctx.base.id, {
            nome: 'Rosalia Cifuentes',
            idade: 44,
            statusAlergia: 'NaoPerguntado',
          });

          conferirIgual(
            naoPerguntado.paciente.alerta.exibir,
            false,
            'alerta em quem não foi perguntado',
          );
        },
      },

      {
        nome: 'o mesmo código reencontra o cadastro, e o documento também',
        async executar(ctx) {
          const cli = ctx.contas.recepcao.cliente;
          const documento = `E2E-VOLTA-${Date.now()}`;

          const primeira = await abrirAtendimento(cli, ctx.base.id, {
            nome: 'Saul Berrocal',
            idade: 52,
            tipoDocumento: 'CedulaIdentidade',
            numeroDocumento: documento,
          });

          const conhecido = await cli.get(`/pacientes/codigo/${primeira.paciente.codigo}`);

          conferirIgual(conhecido?.paciente?.nome, 'Saul Berrocal', 'paciente encontrado pelo código');
          conferir(
            conhecido.totalAtendimentos >= 1,
            'Quem já passou pela base tinha que vir com a contagem de atendimentos.',
          );

          // Quem perdeu o papel com o código e voltou com a cédula na mão não
          // pode virar um cadastro novo.
          const { codigo: outroCodigo } = await cli.get('/pacientes/codigo-novo');

          const segunda = await cli.post('/atendimentos', {
            baseId: ctx.base.id,
            paciente: {
              codigo: outroCodigo,
              nome: 'Saul Berrocal',
              idadeAproximada: 52,
              tipoDocumento: 'CedulaIdentidade',
              numeroDocumento: documento,
              statusAlergia: 'SemAlergiaConhecida',
              consentimentoRegistro: true,
            },
          });

          conferirIgual(
            segunda.paciente.codigo,
            primeira.paciente.codigo,
            'o código do paciente que voltou com o documento',
          );
          conferirIgual(segunda.paciente.id, primeira.paciente.id, 'o cadastro reencontrado');
        },
      },

      {
        nome: 'a produção soma por fila, e quem não é coordenação só vê a própria',
        async executar(ctx) {
          const daCoordenacao = await ctx.contas.coordenacao.cliente.get(
            `/relatorios/producao?baseId=${ctx.base.id}`,
          );

          conferir(
            daCoordenacao.length > 1,
            `A coordenação viu ${daCoordenacao.length} profissional(is), e o plantão teve vários.`,
          );
          conferir(
            daCoordenacao.some((p) => p.porFila.length > 0),
            'A produção voltou sem a quebra por fila.',
          );

          // Conta etapas concluídas, e não pacientes: quem viu a mesma pessoa
          // na triagem e depois na enfermagem fez dois atendimentos.
          const clinico = daCoordenacao.find((p) => p.nome === ctx.contas.clinico.nome);

          conferir(clinico, 'O clínico não apareceu na produção, e atendeu nesta rodada.');
          conferir(clinico.atendimentos > 0, 'O clínico apareceu com zero atendimentos.');

          /*
            Produção alheia é avaliação de desempenho, e quem responde por isso
            é a coordenação. Não é escondida na tela: é recusada no servidor.
          */
          const doClinico = await ctx.contas.clinico.cliente.get(
            `/relatorios/producao?baseId=${ctx.base.id}`,
          );

          conferir(
            doClinico.every((p) => p.nome === ctx.contas.clinico.nome),
            `O clínico viu a produção de ${doClinico.map((p) => p.nome).join(', ')}.`,
          );
        },
      },
    ],
  };
}
