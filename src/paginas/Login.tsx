import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ErroDeRede, ErroLogin } from '../api/cliente';
import { Campo } from '../componentes/Basicos';
import { IconeOlho, IconeOlhoFechado } from '../componentes/Icones';
import { CabecalhoPublico, CartaoPublico } from '../componentes/LayoutPublico';
import { useSessao } from '../hooks/useSessao';
import { useI18n } from '../i18n';
import type { Tema } from '../hooks/useTema';
import type { ChaveTexto } from '../i18n/textos';

/** Mensagem para cada motivo de recusa devolvido pela API. */
const MENSAGEM_POR_MOTIVO: Record<string, ChaveTexto> = {
  CredenciaisInvalidas: 'credenciaisInvalidas',
  ContaPendente: 'contaPendente',
  ContaRecusada: 'contaRecusada',
  ContaDesativada: 'contaDesativada',
};

export function Login({ tema, alternarTema }: { tema: Tema; alternarTema: () => void }) {
  const { t, idioma } = useI18n();
  const { entrar } = useSessao();
  const navegar = useNavigate();

  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setDetalhe(null);
    setEnviando(true);

    try {
      const resposta = await api.login({ usuario: usuario.trim(), senha, idioma });

      entrar({ token: resposta.token, profissional: resposta.profissional });
      navegar('/bases', { replace: true });
    } catch (e) {
      if (e instanceof ErroDeRede) {
        setErro(t('semConexao'));
      } else if (e instanceof ErroLogin) {
        setErro(t(MENSAGEM_POR_MOTIVO[e.motivo] ?? 'credenciaisInvalidas'));
        // A recusa vem acompanhada do motivo escrito pela coordenação.
        setDetalhe(e.detalhe || null);
      } else {
        setErro(t('erroInesperado'));
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-full px-4 py-6">
      <CabecalhoPublico tema={tema} alternarTema={alternarTema} />

      <main className="mx-auto max-w-md">
        <CartaoPublico titulo={t('app')} subtitulo={t('loginSubtitulo')}>
          <form onSubmit={aoEnviar} className="space-y-5">
            <Campo rotulo={t('usuario')} obrigatorio>
              <input
                className="campo"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </Campo>

            <Campo rotulo={t('senha')} obrigatorio>
              <div className="relative">
                <input
                  className="campo pr-14"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center px-3 text-texto-suave"
                >
                  {mostrarSenha ? <IconeOlhoFechado /> : <IconeOlho />}
                </button>
              </div>
            </Campo>

            {erro ? (
              <div
                role="alert"
                className="space-y-1 rounded-xl border border-vermelho/40 bg-vermelho/10 px-4 py-3 text-sm text-vermelho"
              >
                <p>{erro}</p>
                {detalhe ? (
                  <p className="text-texto-suave">
                    {t('motivo')}: {detalhe}
                  </p>
                ) : null}
              </div>
            ) : null}

            <button type="submit" className="botao" disabled={enviando}>
              {enviando ? t('carregando') : t('entrar')}
            </button>
          </form>

          <div className="border-t border-borda pt-4 text-center text-sm">
            <span className="text-texto-suave">{t('naoTenhoConta')}</span>{' '}
            <Link to="/criar-conta" className="font-semibold text-marca-clara underline">
              {t('criarConta')}
            </Link>
          </div>
        </CartaoPublico>
      </main>
    </div>
  );
}
