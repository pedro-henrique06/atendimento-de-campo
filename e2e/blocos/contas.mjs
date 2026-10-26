/**
 * Bloco 1 — uma conta para cada profissional.
 *
 * Cada conta nasce aqui e passa pelo caminho inteiro do primeiro acesso: a
 * coordenação cadastra, a senha provisória sai uma única vez na resposta, o
 * primeiro login só permite trocá-la, e é com a senha nova que a pessoa entra.
 * Pular a troca e gravar o hash direto no banco seria mais rápido e deixaria
 * justamente esse caminho sem cobertura — é onde mora o `precisaTrocarSenha`,
 * que é o que impede uma conta de rodar o plantão com a senha que a
 * coordenação sabe.
 */

import { entrar } from '../api.mjs';
import { ELENCO, SENHA } from '../elenco.mjs';
import { conferir, conferirIgual } from '../motor.mjs';

export function blocoContas() {
  const passos = [
    {
      nome: 'a coordenação entra e encontra uma base ativa',
      async executar(ctx) {
        const { cliente: cli, profissional } = await entrar(ctx.admin.usuario, ctx.admin.senha);

        conferir(profissional.ehAdministrador, 'A conta semente tinha que ser administradora.');

        ctx.coordenacao = cli;

        const bases = await cli.get('/bases');

        conferir(bases.length > 0, 'Nenhuma base ativa: o roteiro não tem onde atender.');

        // A mesma que o app abre: `ComBase` pega a primeira da lista. Semear
        // noutra base deixaria as filas cheias no banco e vazias na tela.
        ctx.base = bases[0];
      },
    },

    {
      nome: 'cadastro sem registro no conselho é recusado',
      async executar(ctx) {
        const erro = await ctx.coordenacao.recusa('POST', '/profissionais', {
          usuario: 'sem.registro.e2e',
          nome: 'Sem Registro',
          funcao: 'ClinicoGeral',
        });

        conferir(
          /registro/i.test(JSON.stringify(erro.corpo)),
          `A recusa tinha que falar do registro. Veio: ${erro.message}`,
        );
      },
    },

    {
      nome: '"Médico" sem especialidade é recusado no cadastro novo',
      async executar(ctx) {
        // A profissão existe só para as contas anteriores às especialidades.
        // Aceitar aqui recriaria o problema: alguém que cai em três filas.
        const erro = await ctx.coordenacao.recusa('POST', '/profissionais', {
          usuario: 'medico.generico.e2e',
          nome: 'Medico Generico',
          funcao: 'Medico',
          registro: 'CRM 99999',
        });

        conferir(
          /especialidade/i.test(JSON.stringify(erro.corpo)),
          `A recusa tinha que mandar escolher a especialidade. Veio: ${erro.message}`,
        );
      },
    },
  ];

  for (const papel of ELENCO) {
    passos.push({
      nome: `${papel.funcao}: cadastra, troca a senha provisória e entra`,
      async executar(ctx) {
        let conta = await existente(ctx.coordenacao, papel.usuario);

        if (!conta) {
          const criada = await ctx.coordenacao.post('/profissionais', {
            usuario: papel.usuario,
            nome: papel.nome,
            funcao: papel.funcao,
            registro: papel.registro,
          });

          conferir(
            criada.senhaProvisoria?.length >= 8,
            'A resposta do cadastro tinha que trazer a senha provisória.',
          );

          const primeiro = await entrar(papel.usuario, criada.senhaProvisoria);

          conferirIgual(
            primeiro.profissional.precisaTrocarSenha,
            true,
            `${papel.usuario} entrou com a provisória sem ser obrigado a trocar`,
          );

          // Enquanto a senha é a provisória, a única coisa que a conta pode
          // fazer é trocá-la. Conferido aqui porque é o que dá sentido à
          // obrigação: sem isso ela seria só um aviso na tela.
          const barrada = await primeiro.cliente.recusa(
            'GET',
            `/atendimentos?baseId=${ctx.base.id}`,
          );

          conferirIgual(
            barrada.status,
            403,
            `${papel.usuario} com senha provisória conseguiu ler a fila`,
          );

          await primeiro.cliente.post('/auth/trocar-senha', {
            senhaAtual: criada.senhaProvisoria,
            novaSenha: SENHA,
            confirmacaoSenha: SENHA,
          });

          conta = criada.profissional;
        }

        const sessao = await entrar(papel.usuario, SENHA);

        conferirIgual(
          sessao.profissional.precisaTrocarSenha,
          false,
          `${papel.usuario} continua obrigado a trocar a senha depois de trocar`,
        );

        conferirIgual(
          sessao.profissional.funcao,
          papel.funcao,
          `profissão de ${papel.usuario}`,
        );

        // O ponto de ter uma conta por profissão: a fila que abre é a dela.
        conferirIgual(
          sessao.profissional.filas[0],
          papel.filaPadrao,
          `fila padrão de ${papel.usuario}`,
        );

        /*
          E as filas inteiras, na ordem, contra o que o elenco declara.

          O app tem uma cópia de `FilasDaFuncao` — é dela que saem o cadastro
          ("onde essa pessoa vai atender") e a lente de "ver como". Cópia que
          diverge em silêncio é o pior dos dois mundos: a tela promete uma fila
          e o servidor abre outra. Esta conferência prende o servidor; o teste
          de `src/api/filas.spec.ts` prende a cópia. Uma fila nova que entre só
          de um lado derruba uma das duas.
        */
        conferirIgual(
          sessao.profissional.filas.join(','),
          papel.filas.join(','),
          `as filas de ${papel.funcao}`,
        );

        ctx.contas[papel.chave] = {
          ...papel,
          id: conta?.id ?? sessao.profissional.id,
          cliente: sessao.cliente,
          filas: sessao.profissional.filas,
        };
      },
    });
  }

  passos.push({
    nome: 'a enfermagem vê triagem e enfermagem; o anestesista, anestesia e cirurgia',
    async executar(ctx) {
      // Duas filas não são exceção à regra: a enfermagem começa o plantão
      // triando, e o anestesista avalia antes e acompanha durante.
      conferir(
        ctx.contas.enfermeiro.filas.join() === 'Triagem,Enfermagem',
        `enfermeiro vê ${ctx.contas.enfermeiro.filas.join(', ')}`,
      );

      conferir(
        ctx.contas.anestesista.filas.join() === 'Anestesia,Cirurgia',
        `anestesista vê ${ctx.contas.anestesista.filas.join(', ')}`,
      );

      conferir(
        ctx.contas.coordenacao.filas.length === 13,
        `coordenação vê ${ctx.contas.coordenacao.filas.length} filas, e devia ver as 13`,
      );
    },
  });

  passos.push({
    nome: 'quem não é administrador não gerencia contas',
    async executar(ctx) {
      // A tela esconde o botão; quem garante é o servidor.
      const erro = await ctx.contas.clinico.cliente.recusa('GET', '/profissionais');

      conferirIgual(erro.status, 403, 'o clínico conseguiu listar contas');

      /*
        E nem a conta de função "Coordenação", enquanto não recebe a permissão.

        São dois eixos: a função decide em que fila a pessoa cai, e a permissão
        de administrador decide quem gerencia contas, bases e comunidades.
        Confundir os dois daria a quem coordena a escala o poder de redefinir a
        senha de todo mundo só por causa do cargo escrito no cadastro.

        Numa segunda rodada no mesmo banco a conta já é administradora — a
        permissão foi dada no passo seguinte e não se desfaz —, e aí não há o
        que conferir aqui.
      */
      const coordenacao = await entrar(ctx.contas.coordenacao.usuario, SENHA);

      if (!coordenacao.profissional.ehAdministrador) {
        const antes = await coordenacao.cliente.recusa('GET', '/profissionais');

        conferirIgual(antes.status, 403, 'a coordenação gerenciou contas sem a permissão');
      }
    },
  });

  passos.push({
    nome: 'a coordenação recebe a permissão de administrador e passa a gerenciar contas',
    async executar(ctx) {
      const alvo = ctx.contas.coordenacao;

      await ctx.coordenacao.post(`/profissionais/${alvo.id}/administrador`, {
        ehAdministrador: true,
      });

      // O token antigo não carrega o papel novo: a permissão entra na sessão
      // seguinte, como qualquer mudança de perfil.
      const sessao = await entrar(alvo.usuario, SENHA);

      conferirIgual(sessao.profissional.ehAdministrador, true, 'permissão de administrador');

      alvo.cliente = sessao.cliente;

      const lista = await alvo.cliente.get('/profissionais');

      conferir(
        lista.length >= ELENCO.length,
        `A lista de contas veio com ${lista.length}, e o elenco tem ${ELENCO.length}.`,
      );

      // Todo o elenco está lá, e é isso que a tela de contas mostra.
      for (const papel of ELENCO) {
        conferir(
          lista.some((p) => p.usuario === papel.usuario),
          `A conta ${papel.usuario} não aparece na gestão de contas.`,
        );
      }
    },
  });

  passos.push({
    nome: 'senha nova não pode conter o próprio usuário',
    async executar(ctx) {
      const alvo = ctx.contas.outro;
      const erro = await alvo.cliente.recusa('POST', '/auth/trocar-senha', {
        senhaAtual: SENHA,
        novaSenha: `${alvo.usuario}123`,
        confirmacaoSenha: `${alvo.usuario}123`,
      });

      conferir(
        /usuario|usuário/i.test(JSON.stringify(erro.corpo)),
        `A recusa tinha que falar do nome de usuário. Veio: ${erro.message}`,
      );
    },
  });

  return { nome: 'Contas — uma por profissão', passos };
}

/**
 * Reaproveita a conta quando o roteiro roda de novo no mesmo banco.
 *
 * Sem isto, a segunda execução pararia no primeiro cadastro, porque o usuário
 * já está em uso — e o erro apontaria para o cadastro, que está certo. A senha
 * provisória, porém, só existe na resposta da criação: a conta reaproveitada é
 * a que já trocou a senha na primeira rodada.
 */
async function existente(coordenacao, usuario) {
  const { disponivel } = await coordenacao.get(
    `/profissionais/usuario-disponivel?usuario=${encodeURIComponent(usuario)}`,
  );

  if (disponivel) return null;

  const lista = await coordenacao.get(`/profissionais?busca=${encodeURIComponent(usuario)}`);

  return lista.find((p) => p.usuario === usuario) ?? null;
}
