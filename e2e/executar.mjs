/**
 * O roteiro inteiro, em ordem.
 *
 *   node e2e/executar.mjs            roteiro + prints
 *   node e2e/executar.mjs --sem-prints   só o roteiro (sem navegador)
 *   node e2e/executar.mjs --so-prints    só os prints (o banco já tem o elenco)
 *
 * Variáveis: E2E_API, E2E_APP, E2E_PRINTS, E2E_PLAYWRIGHT, E2E_ADMIN_USUARIO,
 * E2E_ADMIN_SENHA. Ver e2e/README.md.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { BASE_API, conferirAlvo, entrar } from './api.mjs';
import { ELENCO, SENHA } from './elenco.mjs';
import { imprimirResumo, rodar } from './motor.mjs';
import { PASTA, tirarPrints } from './prints.mjs';
import { blocoContas } from './blocos/contas.mjs';
import { blocoFilas } from './blocos/filas.mjs';
import { blocoFichas } from './blocos/fichas.mjs';
import { blocoJornada } from './blocos/jornada.mjs';
import { blocoDesfechos } from './blocos/desfechos.mjs';
import { blocoExcecoes } from './blocos/excecoes.mjs';

const argumentos = new Set(process.argv.slice(2));
const semPrints = argumentos.has('--sem-prints');
const soPrints = argumentos.has('--so-prints');

/**
 * A conta semente, que cria todas as outras.
 *
 * Não tem padrão para a senha de propósito: ela é de quem roda, e um padrão
 * aqui seria uma senha de administrador escrita no repositório.
 */
const admin = {
  usuario: process.env.E2E_ADMIN_USUARIO ?? 'coordenacao',
  senha: process.env.E2E_ADMIN_SENHA,
};

const ctx = { admin, contas: {}, filas: {}, fichas: {} };

async function recuperarElenco() {
  const bases = await (await entrar(admin.usuario, admin.senha)).cliente.get('/bases');

  ctx.base = bases[0];

  for (const papel of ELENCO) {
    const sessao = await entrar(papel.usuario, SENHA);

    ctx.contas[papel.chave] = {
      ...papel,
      id: sessao.profissional.id,
      cliente: sessao.cliente,
      filas: sessao.profissional.filas,
    };
  }
}

async function principal() {
  conferirAlvo();

  if (!admin.senha) {
    console.error(
      'Falta a senha da conta de coordenação. Rode com:\n' +
        '  E2E_ADMIN_SENHA=... node e2e/executar.mjs',
    );
    process.exitCode = 2;

    return;
  }

  console.log(`API: ${BASE_API}`);

  let resultado = { total: 0, ok: 0, falhas: 0, pulados: 0, blocos: [] };

  if (soPrints) {
    await recuperarElenco();
  } else {
    resultado = await rodar(
      [
        blocoContas(),
        blocoFilas(),
        blocoFichas(),
        blocoJornada(),
        blocoDesfechos(),
        blocoExcecoes(),
      ],
      ctx,
    );

    imprimirResumo(resultado);
  }

  let prints = { feitos: [], falhas: [] };

  if (!semPrints && Object.keys(ctx.contas).length === ELENCO.length) {
    console.log('\nPrints das filas');
    prints = await tirarPrints(ctx.contas);
  } else if (!semPrints) {
    console.log('\nPrints não foram tirados: o elenco não ficou completo.');
  }

  await escreverRelatorio(resultado, prints);

  // Código de saída é o que faz isto valer em automação: falha de conferência
  // e print que não saiu são as duas formas de a rodada não ter provado nada.
  if (resultado.falhas > 0 || resultado.pulados > 0 || prints.falhas.length > 0) {
    process.exitCode = 1;
  }
}

async function escreverRelatorio(resultado, prints) {
  const linhas = [
    '# Rodada do roteiro de ponta a ponta',
    '',
    `- API: ${BASE_API}`,
    `- Quando: ${new Date().toISOString()}`,
    `- Passos: ${resultado.ok}/${resultado.total}` +
      (resultado.falhas ? ` · ${resultado.falhas} falharam` : '') +
      (resultado.pulados ? ` · ${resultado.pulados} não executados` : ''),
    `- Prints: ${prints.feitos.length}` +
      (prints.falhas.length ? ` · ${prints.falhas.length} não saíram` : ''),
    '',
  ];

  for (const bloco of resultado.blocos) {
    linhas.push(`## ${bloco.nome}`, '');

    for (const passo of bloco.passos) {
      const marca = { ok: '✓', falhou: '✗', pulado: '·' }[passo.estado];

      linhas.push(`- ${marca} ${passo.nome}${passo.erro ? ` — ${passo.erro}` : ''}`);
    }

    linhas.push('');
  }

  if (prints.feitos.length > 0) {
    linhas.push('## Prints', '', '| Fila | Conta | Profissão | Arquivo |', '| --- | --- | --- | --- |');

    for (const p of prints.feitos) {
      linhas.push(`| ${p.fila} | \`${p.usuario}\` | ${p.funcao} | \`${p.arquivo}\` |`);
    }

    linhas.push('');
  }

  if (prints.falhas.length > 0) {
    linhas.push('## Prints que não saíram', '');

    for (const p of prints.falhas) {
      linhas.push(`- ${p.fila} (\`${p.usuario}\`): ${p.erro}`);
    }

    linhas.push('');
  }

  const caminho = `${PASTA}/relatorio.md`;

  await mkdir(PASTA, { recursive: true });
  await writeFile(caminho, linhas.join('\n'), 'utf8');
  console.log(`\nRelatório: ${caminho}`);
}

principal().catch((erro) => {
  console.error(`\n${erro.message}`);
  process.exitCode = 1;
});
