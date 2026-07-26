import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type { ConselhoTipo, FuncaoProfissional } from '../api/tipos';
import { Campo, Erros } from '../componentes/Basicos';
import { IconeOlho, IconeOlhoFechado } from '../componentes/Icones';
import { CabecalhoPublico, CartaoPublico } from '../componentes/LayoutPublico';
import { useI18n, traduzir } from '../i18n';
import { conselhos, funcoes } from '../i18n/enums';
import type { Tema } from '../hooks/useTema';

const FUNCOES: FuncaoProfissional[] = [
  'Medico',
  'Enfermeiro',
  'TecnicoEnfermagem',
  'Dentista',
  'Psicologo',
  'Fisioterapeuta',
  'Farmaceutico',
  'Recepcao',
  'Coordenacao',
  'Outro',
];

/** Conselho exigido por função. Espelha a regra do backend. */
const CONSELHO_POR_FUNCAO: Record<FuncaoProfissional, ConselhoTipo> = {
  Medico: 'Crm',
  Enfermeiro: 'Coren',
  TecnicoEnfermagem: 'Coren',
  Dentista: 'Cro',
  Psicologo: 'Crp',
  Fisioterapeuta: 'Crefito',
  Farmaceutico: 'Crf',
  Recepcao: 'Nenhum',
  Coordenacao: 'Nenhum',
  Outro: 'Nenhum',
};

const TAMANHO_MINIMO_SENHA = 8;

/** Mesma normalização do backend, para o campo não aceitar o que a API recusa. */
function normalizarUsuario(valor: string): string {
  return valor
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Sugere `claudia.luz` a partir de "Cláudia Cândido da Luz". */
function sugerirUsuario(nome: string): string {
  const partes = normalizarUsuario(nome)
    .split(/\s+/)
    .filter((p) => p && !['de', 'da', 'do', 'das', 'dos', 'e'].includes(p));

  if (partes.length === 0) return '';

  const bruto = partes.length === 1 ? partes[0] : `${partes[0]}.${partes[partes.length - 1]}`;

  return bruto.replace(/[^a-z0-9.]/g, '').slice(0, 40);
}

export function CriarConta({ tema, alternarTema }: { tema: Tema; alternarTema: () => void }) {
  const { t, idioma } = useI18n();
  const navegar = useNavigate();

  const [nome, setNome] = useState('');
  const [usuario, setUsuario] = useState('');
  const [usuarioEditado, setUsuarioEditado] = useState(false);
  const [email, setEmail] = useState('');
  const [funcao, setFuncao] = useState<FuncaoProfissional>('Enfermeiro');
  const [registro, setRegistro] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [criada, setCriada] = useState(false);

  const conselho = CONSELHO_POR_FUNCAO[funcao];
  const exigeRegistro = conselho !== 'Nenhum';

  // Enquanto a pessoa não mexer no campo, o usuário acompanha o nome digitado.
  useEffect(() => {
    if (!usuarioEditado) {
      setUsuario(sugerirUsuario(nome));
    }
  }, [nome, usuarioEditado]);

  // Consulta a disponibilidade depois que a digitação para, para não bater na
  // rede a cada tecla num 3G de campo.
  useEffect(() => {
    const valor = normalizarUsuario(usuario);

    if (valor.length < 3) {
      setDisponivel(null);
      return;
    }

    let cancelado = false;

    const timer = setTimeout(() => {
      api
        .usuarioDisponivel(valor)
        .then((r) => {
          if (!cancelado) setDisponivel(r.disponivel);
        })
        .catch(() => {
          // Sem conexão não é o momento de acusar nada: o envio valida de novo.
          if (!cancelado) setDisponivel(null);
        });
    }, 400);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [usuario]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErros([]);
    setEnviando(true);

    try {
      await api.registrar({
        usuario: normalizarUsuario(usuario),
        nome: nome.trim(),
        email: email.trim() || null,
        funcao,
        registro: registro.trim() || null,
        senha,
        confirmacaoSenha: confirmacao,
        idioma,
      });

      setCriada(true);
    } catch (e) {
      if (e instanceof ErroDeRede) {
        setErros([t('semConexao')]);
      } else if (e instanceof ErroApi) {
        setErros(e.erros);
      } else {
        setErros([t('erroInesperado')]);
      }
    } finally {
      setEnviando(false);
    }
  }

  if (criada) {
    return (
      <div className="min-h-full px-4 py-6">
        <CabecalhoPublico tema={tema} alternarTema={alternarTema} />

        <main className="mx-auto max-w-md">
          <CartaoPublico titulo={t('contaCriada')} subtitulo={t('contaCriadaDetalhe')}>
            <button
              type="button"
              className="botao"
              onClick={() => navegar('/entrar', { replace: true })}
            >
              {t('voltarAoLogin')}
            </button>
          </CartaoPublico>
        </main>
      </div>
    );
  }

  const senhaCurta = senha.length > 0 && senha.length < TAMANHO_MINIMO_SENHA;
  const senhasDiferentes = confirmacao.length > 0 && senha !== confirmacao;

  return (
    <div className="min-h-full px-4 py-6">
      <CabecalhoPublico tema={tema} alternarTema={alternarTema} />

      <main className="mx-auto max-w-md">
        <CartaoPublico titulo={t('criarConta')} subtitulo={t('registroSubtitulo')}>
          <form onSubmit={aoEnviar} className="space-y-5">
            <Campo rotulo={t('nomeCompleto')} obrigatorio>
              <input
                className="campo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
                required
              />
            </Campo>

            <Campo rotulo={t('usuario')} obrigatorio dica={t('dicaUsuario')}>
              <input
                className="campo"
                value={usuario}
                onChange={(e) => {
                  setUsuarioEditado(true);
                  setUsuario(e.target.value);
                }}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                minLength={3}
                required
              />
              {disponivel === true ? (
                <span className="mt-1 block text-sm text-verde">{t('usuarioLivre')}</span>
              ) : null}
              {disponivel === false ? (
                <span className="mt-1 block text-sm text-vermelho">{t('usuarioEmUso')}</span>
              ) : null}
            </Campo>

            <Campo rotulo={t('suaFuncao')} obrigatorio>
              <select
                className="campo"
                value={funcao}
                onChange={(e) => setFuncao(e.target.value as FuncaoProfissional)}
              >
                {FUNCOES.map((f) => (
                  <option key={f} value={f}>
                    {traduzir(funcoes, idioma, f)}
                  </option>
                ))}
              </select>
            </Campo>

            {exigeRegistro ? (
              <Campo rotulo={`${t('registro')} (${traduzir(conselhos, idioma, conselho)})`} obrigatorio>
                <input
                  className="campo"
                  value={registro}
                  onChange={(e) => setRegistro(e.target.value)}
                  inputMode="numeric"
                  required
                />
              </Campo>
            ) : null}

            <Campo rotulo={t('emailOpcional')}>
              <input
                className="campo"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="none"
              />
            </Campo>

            <Campo rotulo={t('senha')} obrigatorio dica={t('dicaSenha')}>
              <div className="relative">
                <input
                  className="campo pr-14"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="new-password"
                  minLength={TAMANHO_MINIMO_SENHA}
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
              {senhaCurta ? (
                <span className="mt-1 block text-sm text-vermelho">{t('dicaSenha')}</span>
              ) : null}
            </Campo>

            <Campo rotulo={t('confirmarSenha')} obrigatorio>
              <input
                className="campo"
                type={mostrarSenha ? 'text' : 'password'}
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                autoComplete="new-password"
                required
              />
              {senhasDiferentes ? (
                <span className="mt-1 block text-sm text-vermelho">
                  {t('confirmarSenha')} ≠ {t('senha')}
                </span>
              ) : null}
            </Campo>

            <Erros erros={erros} />

            <button
              type="submit"
              className="botao"
              disabled={enviando || disponivel === false || senhasDiferentes || senhaCurta}
            >
              {enviando ? t('carregando') : t('criarConta')}
            </button>
          </form>

          <div className="border-t border-borda pt-4 text-center text-sm">
            <Link to="/entrar" className="font-semibold text-marca-clara underline">
              {t('jaTenhoConta')}
            </Link>
          </div>
        </CartaoPublico>
      </main>
    </div>
  );
}
