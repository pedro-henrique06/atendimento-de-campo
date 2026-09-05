import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import { Campo, Erros } from '../componentes/Basicos';
import { IconeOlho, IconeOlhoFechado } from '../componentes/Icones';
import { CabecalhoPublico, CartaoPublico } from '../componentes/LayoutPublico';
import { useSessao } from '../hooks/useSessao';
import { useI18n } from '../i18n';
import type { Tema } from '../hooks/useTema';

const TAMANHO_MINIMO_SENHA = 8;

/**
 * Troca obrigatória no primeiro acesso.
 *
 * A senha atual foi sorteada pelo sistema e entregue pela coordenação, então
 * mais de uma pessoa a conhece. Num prontuário isso não é detalhe: cada ato
 * clínico fica atribuído a um nome, e a atribuição só vale enquanto ninguém
 * mais consegue entrar como aquela pessoa. Até a troca, a API recusa todo o
 * resto — esta tela é a única saída.
 */
export function TrocarSenha({ tema, alternarTema }: { tema: Tema; alternarTema: () => void }) {
  const { t } = useI18n();
  const { entrar, sair } = useSessao();

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  const senhaCurta = novaSenha.length > 0 && novaSenha.length < TAMANHO_MINIMO_SENHA;
  const senhasDiferentes = confirmacao.length > 0 && novaSenha !== confirmacao;

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErros([]);
    setEnviando(true);

    try {
      const sessao = await api.trocarSenha({
        senhaAtual,
        novaSenha,
        confirmacaoSenha: confirmacao,
      });

      /*
        O token novo precisa entrar no lugar do antigo. O antigo diz "precisa
        trocar" e continuaria barrado pela API — a pessoa trocaria a senha e
        ficaria presa nesta mesma tela.
      */
      entrar({ token: sessao.token, profissional: sessao.profissional });
    } catch (e) {
      if (e instanceof ErroDeRede) setErros([t('semConexao')]);
      else if (e instanceof ErroApi) setErros(e.erros);
      else setErros([t('erroInesperado')]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-full px-4 py-6">
      <CabecalhoPublico tema={tema} alternarTema={alternarTema} />

      <main className="mx-auto max-w-md">
        <CartaoPublico titulo={t('trocarSenha')} subtitulo={t('trocarSenhaSubtitulo')}>
          <form onSubmit={aoEnviar} className="space-y-5">
            <Campo rotulo={t('senhaAtual')} obrigatorio>
              <input
                className="campo"
                type={mostrar ? 'text' : 'password'}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </Campo>

            <Campo rotulo={t('novaSenha')} obrigatorio dica={t('dicaSenha')}>
              <div className="relative">
                <input
                  className="campo pr-14"
                  type={mostrar ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  autoComplete="new-password"
                  minLength={TAMANHO_MINIMO_SENHA}
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrar((v) => !v)}
                  aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center px-3 text-texto-suave"
                >
                  {mostrar ? <IconeOlhoFechado /> : <IconeOlho />}
                </button>
              </div>
              {senhaCurta ? (
                <span className="mt-1 block text-sm text-vermelho">{t('dicaSenha')}</span>
              ) : null}
            </Campo>

            <Campo rotulo={t('confirmarSenha')} obrigatorio>
              <input
                className="campo"
                type={mostrar ? 'text' : 'password'}
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                autoComplete="new-password"
                required
              />
              {senhasDiferentes ? (
                <span className="mt-1 block text-sm text-vermelho">
                  {t('confirmarSenha')} ≠ {t('novaSenha')}
                </span>
              ) : null}
            </Campo>

            <Erros erros={erros} />

            <button
              type="submit"
              className="botao"
              disabled={enviando || senhaCurta || senhasDiferentes}
            >
              {enviando ? t('carregando') : t('trocarSenha')}
            </button>
          </form>

          {/*
            Saída para quem abriu a tela por engano no aparelho de outra pessoa.
            Sem isto, a sessão presa aqui só sairia limpando o navegador.
          */}
          <div className="border-t border-borda pt-4 text-center text-sm">
            <button
              type="button"
              onClick={sair}
              className="font-semibold text-marca-clara underline"
            >
              {t('sair')}
            </button>
          </div>
        </CartaoPublico>
      </main>
    </div>
  );
}
