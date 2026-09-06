import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type { ComunidadeAdmin } from '../api/tipos';
import { Campo, Carregando, Erros, Etiqueta, Vazio } from '../componentes/Basicos';
import { useI18n } from '../i18n';

/**
 * Lista de comunidades, mantida pela coordenação.
 *
 * A lista é fechada de propósito. Digitada à mão no cadastro do paciente, a
 * mesma vila viraria "Vila União", "vila uniao" e "V. União" na mesma
 * estatística — e é essa contagem que orienta onde montar a próxima base.
 */
export function GestaoComunidades() {
  const { t } = useI18n();

  const [comunidades, setComunidades] = useState<ComunidadeAdmin[] | null>(null);
  const [nova, setNova] = useState('');
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(() => {
    setErros([]);

    api
      .comunidadesAdmin()
      .then(setComunidades)
      .catch((e) => {
        setComunidades([]);
        setErros([e instanceof ErroDeRede ? t('semConexao') : t('erroInesperado')]);
      });
  }, [t]);

  useEffect(carregar, [carregar]);

  async function executar(acao: () => Promise<unknown>) {
    setErros([]);
    setEnviando(true);

    try {
      await acao();
      carregar();
    } catch (e) {
      if (e instanceof ErroApi) setErros(e.erros);
      else if (e instanceof ErroDeRede) setErros([t('semConexao')]);
      else setErros([t('erroInesperado')]);
    } finally {
      setEnviando(false);
    }
  }

  function criar(evento: FormEvent) {
    evento.preventDefault();

    executar(async () => {
      await api.criarComunidade(nova.trim());
      setNova('');
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <div>
        <h1 className="titulo">{t('gestaoComunidades')}</h1>
        <p className="mt-1 text-sm text-texto-suave">{t('comunidadesSubtitulo')}</p>
      </div>

      <form onSubmit={criar} className="cartao space-y-4">
        <Campo rotulo={t('novaComunidade')} obrigatorio>
          <input
            className="campo"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            minLength={2}
            required
          />
        </Campo>

        <button type="submit" className="botao" disabled={enviando || nova.trim().length < 2}>
          {enviando ? t('carregando') : t('salvar')}
        </button>
      </form>

      <Erros erros={erros} />

      {comunidades === null ? (
        <Carregando texto={t('carregando')} />
      ) : comunidades.length === 0 ? (
        <Vazio texto={t('semComunidades')} />
      ) : (
        <ul className="space-y-3">
          {comunidades.map((comunidade) => (
            <li key={comunidade.id} className="cartao space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">{comunidade.nome}</p>
                  <p className="text-sm text-texto-suave">
                    {comunidade.totalPacientes} {t('pacientesNaComunidade')}
                  </p>
                </div>

                <Etiqueta tom={comunidade.ativa ? 'sucesso' : 'neutro'}>
                  {comunidade.ativa ? t('ativas') : t('desativadas')}
                </Etiqueta>
              </div>

              {renomeando === comunidade.id ? (
                <div className="space-y-2">
                  <input
                    className="campo"
                    value={nomeEditado}
                    onChange={(e) => setNomeEditado(e.target.value)}
                    minLength={2}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="botao w-auto px-5"
                      disabled={nomeEditado.trim().length < 2}
                      onClick={() =>
                        executar(async () => {
                          await api.renomearComunidade(comunidade.id, nomeEditado.trim());
                          setRenomeando(null);
                        })
                      }
                    >
                      {t('salvar')}
                    </button>
                    <button
                      type="button"
                      className="botao-secundario"
                      onClick={() => setRenomeando(null)}
                    >
                      {t('cancelar')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {/*
                    Renomear é sempre permitido: corrigir a grafia de um lugar
                    não muda de que lugar os pacientes já cadastrados são.
                  */}
                  <button
                    type="button"
                    className="botao-secundario"
                    onClick={() => {
                      setNomeEditado(comunidade.nome);
                      setRenomeando(comunidade.id);
                    }}
                  >
                    {t('renomear')}
                  </button>

                  {/*
                    Desativar tira do cadastro novo sem apagar histórico. Não há
                    exclusão de verdade: apagar a comunidade apagaria de onde
                    vieram os pacientes já atendidos.
                  */}
                  <button
                    type="button"
                    className="botao-secundario"
                    onClick={() =>
                      executar(() => api.definirComunidadeAtiva(comunidade.id, !comunidade.ativa))
                    }
                  >
                    {comunidade.ativa ? t('desativar') : t('reativar')}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
