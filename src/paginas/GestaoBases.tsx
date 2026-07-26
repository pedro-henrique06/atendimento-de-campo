import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type { BaseAdmin } from '../api/tipos';
import { Campo, Carregando, Erros, Etiqueta, Vazio } from '../componentes/Basicos';
import { useSessao } from '../hooks/useSessao';
import { useI18n } from '../i18n';

/**
 * Formulário aberto: uma base existente sendo editada, ou uma nova.
 *
 * `prefixoTocado` existe porque a sugestão automática só pode sobrescrever um
 * campo que ninguém mexeu. Sem isso, cada letra digitada no nome apagaria o
 * prefixo que a coordenação acabou de escolher à mão.
 */
type Edicao = {
  base: BaseAdmin | null;
  nome: string;
  prefixo: string;
  prefixoTocado: boolean;
};

export function GestaoBases() {
  const { t } = useI18n();
  const { base: baseAtual, definirBase } = useSessao();

  const [bases, setBases] = useState<BaseAdmin[] | null>(null);
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    api
      .todasAsBases()
      .then(setBases)
      .catch((e) => {
        setBases([]);
        setErros([e instanceof ErroDeRede ? t('semConexao') : t('erroInesperado')]);
      });
  }, [t]);

  useEffect(carregar, [carregar]);

  function tratar(erro: unknown) {
    if (erro instanceof ErroApi) setErros(erro.erros);
    else if (erro instanceof ErroDeRede) setErros([t('semConexao')]);
    else setErros([t('erroInesperado')]);
  }

  function abrirNova() {
    setErros([]);
    setEdicao({ base: null, nome: '', prefixo: '', prefixoTocado: false });
  }

  /*
    O prefixo é sugerido a partir do nome, mas só em base nova e só enquanto
    ninguém o editou à mão. Em base já criada ele pode estar travado, e
    sobrescrever o que está lá seria pior que não sugerir nada.
  */
  async function aoDigitarNome(nome: string) {
    if (!edicao) return;

    const atualizado = { ...edicao, nome };
    setEdicao(atualizado);

    if (atualizado.base !== null || atualizado.prefixoTocado || nome.trim().length < 2) return;

    try {
      const { prefixo } = await api.prefixoSugerido(nome);

      // A resposta pode chegar depois de mais teclas: só aplica se a tela ainda
      // estiver no mesmo nome e o campo continuar intocado.
      setEdicao((atual) =>
        atual && atual.base === null && !atual.prefixoTocado && atual.nome === nome
          ? { ...atual, prefixo }
          : atual,
      );
    } catch {
      // Sugestão é conveniência: se falhar, o campo continua editável.
    }
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (!edicao) return;

    setErros([]);
    setSalvando(true);

    const dados = { nome: edicao.nome.trim(), prefixoCodigo: edicao.prefixo.trim().toUpperCase() };

    try {
      if (edicao.base) {
        const atualizada = await api.atualizarBase(edicao.base.id, dados);

        // A base escolhida na sessão guarda o nome antigo; sem isto o cabeçalho
        // continuaria mostrando o nome de antes até alguém trocar de base.
        if (baseAtual?.id === atualizada.id) {
          definirBase({
            id: atualizada.id,
            nome: atualizada.nome,
            prefixoCodigo: atualizada.prefixoCodigo,
            ativa: atualizada.ativa,
          });
        }
      } else {
        await api.criarBase(dados);
      }

      setEdicao(null);
      carregar();
    } catch (erro) {
      tratar(erro);
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtiva(alvo: BaseAdmin) {
    setErros([]);

    try {
      await api.definirBaseAtiva(alvo.id, !alvo.ativa);
      carregar();
    } catch (erro) {
      tratar(erro);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="titulo">{t('gestaoBases')}</h1>

        {edicao === null ? (
          <button type="button" className="botao w-auto px-5" onClick={abrirNova}>
            {t('novaBase')}
          </button>
        ) : null}
      </div>

      <Erros erros={erros} />

      {edicao ? (
        <form onSubmit={salvar} className="cartao space-y-4">
          <Campo rotulo={t('nomeDaBase')} obrigatorio>
            <input
              className="campo"
              value={edicao.nome}
              onChange={(e) => aoDigitarNome(e.target.value)}
              required
              autoFocus
            />
          </Campo>

          <Campo rotulo={t('prefixoCodigo')} obrigatorio>
            <input
              className="campo font-mono uppercase tracking-widest"
              value={edicao.prefixo}
              onChange={(e) =>
                setEdicao({ ...edicao, prefixo: e.target.value, prefixoTocado: true })
              }
              maxLength={3}
              disabled={edicao.base !== null && !edicao.base.prefixoEditavel}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              required
            />
            <span className="mt-1 block text-sm text-texto-suave">
              {edicao.base !== null && !edicao.base.prefixoEditavel
                ? t('prefixoTravado')
                : t('dicaPrefixo')}
            </span>
          </Campo>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="botao w-auto px-5" disabled={salvando}>
              {salvando ? t('carregando') : t('salvar')}
            </button>
            <button
              type="button"
              className="botao-secundario"
              onClick={() => {
                setEdicao(null);
                setErros([]);
              }}
            >
              {t('cancelar')}
            </button>
          </div>
        </form>
      ) : null}

      {bases === null ? (
        <Carregando texto={t('carregando')} />
      ) : bases.length === 0 ? (
        <Vazio texto={t('semBases')} />
      ) : (
        <ul className="space-y-3">
          {bases.map((b) => (
            <li key={b.id} className="cartao space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">{b.nome}</p>
                  <p className="text-sm text-texto-suave">
                    <span className="font-mono tracking-widest">{b.prefixoCodigo}</span>
                    {' · '}
                    {b.totalAtendimentos === 0
                      ? t('nenhumAtendimento')
                      : b.totalAtendimentos === 1
                        ? t('umAtendimentoNaBase')
                        : `${b.totalAtendimentos} ${t('atendimentosNaBase')}`}
                    {b.atendimentosAbertos > 0
                      ? ` · ${b.atendimentosAbertos} ${t('emAberto')}`
                      : ''}
                  </p>
                </div>

                <Etiqueta tom={b.ativa ? 'sucesso' : 'neutro'}>
                  {b.ativa ? t('ativa') : t('inativa')}
                </Etiqueta>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="botao-secundario"
                  onClick={() => {
                    setErros([]);
                    setEdicao({
                      base: b,
                      nome: b.nome,
                      prefixo: b.prefixoCodigo,
                      prefixoTocado: true,
                    });
                  }}
                >
                  {t('editar')}
                </button>

                {/*
                  Base não se apaga: o histórico dos atendimentos aponta para
                  ela. Desativar tira da seleção e preserva o registro.
                */}
                <button
                  type="button"
                  className="botao-secundario"
                  onClick={() => alternarAtiva(b)}
                >
                  {b.ativa ? t('desativar') : t('ativar')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
