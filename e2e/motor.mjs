/**
 * O motor da sequência.
 *
 * Os passos são encadeados de propósito: o clínico só atende quem a triagem
 * encaminhou, e a farmácia só confere o que alguém prescreveu. Testar isso em
 * casos isolados exigiria montar o estado anterior à mão em cada um, e aí o
 * que se confere passa a ser o estado montado, não o caminho que o paciente
 * faz.
 *
 * O preço é que uma falha invalida o que vem depois. Então a execução para no
 * primeiro erro de cada bloco e marca o resto do bloco como não executado — em
 * vez de seguir produzindo falhas em cascata que escondem a primeira, que é a
 * única real.
 */

export class FalhaDeConferencia extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'FalhaDeConferencia';
  }
}

export function conferir(condicao, mensagem) {
  if (!condicao) throw new FalhaDeConferencia(mensagem);
}

export function conferirIgual(obtido, esperado, oQue) {
  if (obtido !== esperado) {
    throw new FalhaDeConferencia(`${oQue}: esperava ${mostrar(esperado)}, veio ${mostrar(obtido)}`);
  }
}

function mostrar(valor) {
  if (typeof valor === 'string') return `"${valor}"`;
  return JSON.stringify(valor) ?? String(valor);
}

const VERDE = '\x1b[32m';
const VERMELHO = '\x1b[31m';
const CINZA = '\x1b[90m';
const NEGRITO = '\x1b[1m';
const FIM = '\x1b[0m';

/**
 * Roda os blocos em ordem e devolve o que aconteceu.
 *
 * `ctx` é o mesmo objeto do começo ao fim: é por ele que um passo entrega ao
 * seguinte o id do atendimento que acabou de abrir.
 */
export async function rodar(blocos, ctx) {
  const resultado = { total: 0, ok: 0, falhas: 0, pulados: 0, blocos: [] };

  for (const bloco of blocos) {
    console.log(`\n${NEGRITO}${bloco.nome}${FIM}`);

    const linhas = [];
    let abortado = null;

    for (const passo of bloco.passos) {
      resultado.total += 1;

      if (abortado) {
        resultado.pulados += 1;
        linhas.push({ nome: passo.nome, estado: 'pulado' });
        console.log(`  ${CINZA}· ${passo.nome} (não executado)${FIM}`);
        continue;
      }

      const comecou = Date.now();

      try {
        await passo.executar(ctx);
        const ms = Date.now() - comecou;
        resultado.ok += 1;
        linhas.push({ nome: passo.nome, estado: 'ok', ms });
        console.log(`  ${VERDE}✓${FIM} ${passo.nome} ${CINZA}${ms}ms${FIM}`);
      } catch (erro) {
        resultado.falhas += 1;
        abortado = passo.nome;
        linhas.push({ nome: passo.nome, estado: 'falhou', erro: erro.message });
        console.log(`  ${VERMELHO}✗ ${passo.nome}${FIM}`);
        console.log(`    ${VERMELHO}${erro.message}${FIM}`);

        // A pilha só interessa quando o erro não foi uma conferência: aí o
        // problema está na suíte ou na rede, e a linha importa.
        if (!(erro instanceof FalhaDeConferencia) && erro.name !== 'ErroDaApi') {
          console.log(`${CINZA}${erro.stack}${FIM}`);
        }
      }
    }

    resultado.blocos.push({ nome: bloco.nome, passos: linhas });
  }

  return resultado;
}

export function imprimirResumo(resultado) {
  const { total, ok, falhas, pulados } = resultado;

  console.log(`\n${NEGRITO}Resumo${FIM}`);
  console.log(`  ${ok}/${total} passos`);

  if (falhas > 0) console.log(`  ${VERMELHO}${falhas} falharam${FIM}`);
  if (pulados > 0) console.log(`  ${CINZA}${pulados} não executados${FIM}`);

  if (falhas === 0 && pulados === 0) {
    console.log(`  ${VERDE}tudo verde${FIM}`);
  }
}
