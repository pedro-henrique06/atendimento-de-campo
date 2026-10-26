/**
 * Um print de cada fila, pela conta de quem atende nela.
 *
 * Os prints saem do navegador de verdade, com login de verdade: a tela é
 * aberta, a senha é digitada e a aba da fila é clicada. Montar o estado no
 * `localStorage` e ir direto para a URL seria mais rápido e tiraria do caminho
 * justamente o que o print deveria provar — que a pessoa entra, cai na fila
 * dela e vê os pacientes.
 *
 * Playwright não é dependência do projeto: o navegador é o que estiver
 * instalado na máquina, e `E2E_PLAYWRIGHT` diz onde. Fixar uma versão aqui
 * daria conflito com o Chromium já baixado.
 */

import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { FILAS, QUEM_PRINTA, ROTULO_DA_FILA, SENHA } from './elenco.mjs';

const require = createRequire(import.meta.url);

export const PASTA = process.env.E2E_PRINTS ?? 'e2e/prints';
const APP = (process.env.E2E_APP ?? 'http://localhost:5173').replace(/\/$/, '');
const CAMINHO_PLAYWRIGHT = process.env.E2E_PLAYWRIGHT ?? 'playwright';

/** Tela de celular: é nela que o app é usado em campo. */
const CELULAR = { width: 414, height: 1000 };

function carregarPlaywright() {
  try {
    return require(CAMINHO_PLAYWRIGHT);
  } catch (erro) {
    throw new Error(
      `Não achei o Playwright em "${CAMINHO_PLAYWRIGHT}". ` +
        'Aponte E2E_PLAYWRIGHT para a instalação da máquina ' +
        '(ex.: /opt/node22/lib/node_modules/playwright).\n' +
        erro.message,
    );
  }
}

async function entrarNoApp(navegador, usuario) {
  const contexto = await navegador.newContext({ viewport: CELULAR, locale: 'pt-BR' });
  const pagina = await contexto.newPage();

  await pagina.goto(`${APP}/entrar`, { waitUntil: 'domcontentloaded' });

  await pagina.getByLabel(/^Usuário/).fill(usuario);
  await pagina.getByLabel(/^Senha/).fill(SENHA);
  await pagina.getByRole('button', { name: 'Entrar' }).click();

  // A fila é o destino do login: esperar por ela é esperar o caminho inteiro —
  // token guardado, base resolvida, lista carregada.
  await pagina.getByRole('button', { name: 'Todas as filas' }).waitFor({ timeout: 15000 });

  return { contexto, pagina };
}

/**
 * Tira os prints e devolve o que foi gravado.
 *
 * Não lança quando uma fila falha: um print que não saiu não invalida os
 * outros doze, e o relatório fica mais útil dizendo qual faltou.
 */
export async function tirarPrints(contas) {
  const { chromium } = carregarPlaywright();

  await mkdir(PASTA, { recursive: true });

  const navegador = await chromium.launch();
  const feitos = [];
  const falhas = [];

  try {
    for (const [ordem, fila] of FILAS.entries()) {
      const conta = contas[QUEM_PRINTA[fila]];
      const numero = String(ordem + 1).padStart(2, '0');
      const arquivo = join(PASTA, `fila-${numero}-${fila.toLowerCase()}.png`);

      let sessao = null;

      try {
        sessao = await entrarNoApp(navegador, conta.usuario);

        // A aba da fila, e não a que abriu: a da enfermagem é a segunda do
        // enfermeiro, e sem o clique ela seria a única sem print.
        await sessao.pagina
          .getByRole('button', { name: ROTULO_DA_FILA[fila], exact: true })
          .click();

        // Os cartões carregam por fetch; esperar o primeiro evita print de
        // lista vazia num plantão que tem gente.
        await sessao.pagina
          .locator('a[href^="/atendimentos/"]')
          .first()
          .waitFor({ timeout: 15000 });

        await sessao.pagina.screenshot({ path: arquivo, fullPage: true });

        feitos.push({ fila, usuario: conta.usuario, funcao: conta.funcao, arquivo });
        console.log(`  ✓ ${fila} — ${conta.usuario} → ${arquivo}`);
      } catch (erro) {
        falhas.push({ fila, usuario: conta.usuario, erro: erro.message.split('\n')[0] });
        console.log(`  ✗ ${fila} — ${conta.usuario}: ${erro.message.split('\n')[0]}`);
      } finally {
        await sessao?.contexto.close();
      }
    }

    // A coordenação vê as treze de uma vez: é o print que mostra a barra
    // inteira, e o que prova que a tabela de filas por profissão não inventou
    // uma fila nem perdeu outra.
    const visaoGeral = join(PASTA, 'fila-00-coordenacao-todas.png');

    try {
      const sessao = await entrarNoApp(navegador, contas.coordenacao.usuario);

      await sessao.pagina.getByRole('button', { name: 'Todas as filas' }).click();
      await sessao.pagina
        .locator('a[href^="/atendimentos/"]')
        .first()
        .waitFor({ timeout: 15000 });
      await sessao.pagina.screenshot({ path: visaoGeral, fullPage: true });
      await sessao.contexto.close();

      feitos.push({
        fila: 'Todas',
        usuario: contas.coordenacao.usuario,
        funcao: 'Coordenacao',
        arquivo: visaoGeral,
      });
      console.log(`  ✓ Todas as filas — ${contas.coordenacao.usuario} → ${visaoGeral}`);
    } catch (erro) {
      falhas.push({
        fila: 'Todas',
        usuario: contas.coordenacao.usuario,
        erro: erro.message.split('\n')[0],
      });
    }

    // E a lista de contas, que é onde se vê o elenco inteiro de uma vez.
    const contasPrint = join(PASTA, 'contas.png');

    try {
      const sessao = await entrarNoApp(navegador, contas.coordenacao.usuario);

      await sessao.pagina.goto(`${APP}/contas`, { waitUntil: 'domcontentloaded' });
      await sessao.pagina.getByText('clinico.e2e').first().waitFor({ timeout: 15000 });
      await sessao.pagina.screenshot({ path: contasPrint, fullPage: true });
      await sessao.contexto.close();

      feitos.push({
        fila: 'Contas',
        usuario: contas.coordenacao.usuario,
        funcao: 'Coordenacao',
        arquivo: contasPrint,
      });
      console.log(`  ✓ Gestão de contas → ${contasPrint}`);
    } catch (erro) {
      falhas.push({ fila: 'Contas', usuario: contas.coordenacao.usuario, erro: erro.message.split('\n')[0] });
    }
  } finally {
    await navegador.close();
  }

  return { feitos, falhas };
}
