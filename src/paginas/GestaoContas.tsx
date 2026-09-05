import { useCallback, useEffect, useState } from 'react';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import { FUNCOES_PARA_CADASTRO } from '../api/tipos';
import type { ContaCriada, FuncaoProfissional, Profissional, StatusConta } from '../api/tipos';
import { Carregando, Erros, Etiqueta, Vazio } from '../componentes/Basicos';
import { CredencialProvisoria } from '../componentes/CredencialProvisoria';
import { NovaConta } from '../componentes/NovaConta';
import { useSessao } from '../hooks/useSessao';
import { useI18n, traduzir } from '../i18n';
import { conselhos, especialidades, funcoes, statusConta } from '../i18n/enums';
import type { ChaveTexto } from '../i18n/textos';

const FILTROS: { status: StatusConta | null; rotulo: ChaveTexto }[] = [
  { status: 'Pendente', rotulo: 'pendentes' },
  { status: 'Ativa', rotulo: 'ativas' },
  { status: 'Recusada', rotulo: 'recusadas' },
  { status: 'Desativada', rotulo: 'desativadas' },
  { status: null, rotulo: 'todas' },
];

export function GestaoContas() {
  const { t, idioma } = useI18n();
  const { profissional } = useSessao();

  const [status, setStatus] = useState<StatusConta | null>('Pendente');
  const [busca, setBusca] = useState('');
  const [contas, setContas] = useState<Profissional[] | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [recusando, setRecusando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [reclassificando, setReclassificando] = useState<string | null>(null);
  const [novaFuncao, setNovaFuncao] = useState<FuncaoProfissional>('ClinicoGeral');
  const [novoRegistro, setNovoRegistro] = useState('');

  /** Senha recém-sorteada numa redefinição. Some assim que a coordenação fecha. */
  const [credencial, setCredencial] = useState<ContaCriada | null>(null);

  const carregar = useCallback(() => {
    setErros([]);

    api
      .profissionais({ status, busca: busca.trim() || undefined })
      .then(setContas)
      .catch((e) => {
        setContas([]);
        setErros([e instanceof ErroDeRede ? t('semConexao') : t('erroInesperado')]);
      });
  }, [status, busca, t]);

  useEffect(() => {
    const timer = setTimeout(carregar, busca ? 300 : 0);
    return () => clearTimeout(timer);
  }, [carregar, busca]);

  async function executar(acao: () => Promise<unknown>) {
    setErros([]);

    try {
      await acao();
      carregar();
    } catch (e) {
      if (e instanceof ErroApi) setErros(e.erros);
      else if (e instanceof ErroDeRede) setErros([t('semConexao')]);
      else setErros([t('erroInesperado')]);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <h1 className="titulo">{t('gestaoContas')}</h1>

      {/*
        O cadastro fica aqui, no topo, porque é a única porta de entrada do
        sistema: não existe auto-registro, e quem não for cadastrado aqui não
        entra.
      */}
      <NovaConta aoCriar={carregar} />

      {credencial ? (
        <CredencialProvisoria
          titulo={t('senhaProvisoria')}
          nome={credencial.profissional.nome}
          usuario={credencial.profissional.usuario}
          senha={credencial.senhaProvisoria}
          aoFechar={() => setCredencial(null)}
        />
      ) : null}

      <input
        className="campo"
        placeholder={t('buscarPessoa')}
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1">
          {FILTROS.map((filtro) => (
            <button
              key={filtro.rotulo}
              type="button"
              onClick={() => setStatus(filtro.status)}
              aria-pressed={status === filtro.status}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                status === filtro.status
                  ? 'border-marca bg-marca text-white'
                  : 'border-borda bg-superficie text-texto'
              }`}
            >
              {t(filtro.rotulo)}
            </button>
          ))}
        </div>
      </div>

      <Erros erros={erros} />

      {contas === null ? (
        <Carregando texto={t('carregando')} />
      ) : contas.length === 0 ? (
        <Vazio texto={t('semContas')} />
      ) : (
        <ul className="space-y-3">
          {contas.map((conta) => {
            const souEu = conta.id === profissional?.id;

            return (
              <li key={conta.id} className="cartao space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold">{conta.nome}</p>
                    <p className="text-sm text-texto-suave">
                      {conta.usuario} · {traduzir(funcoes, idioma, conta.funcao)}
                      {conta.registro
                        ? ` · ${traduzir(conselhos, idioma, conta.conselhoTipo)} ${conta.registro}`
                        : ''}
                    </p>
                    {/*
                      A fila é a consequência prática da profissão: sem mostrar
                      aqui, a coordenação não tem como conferir se a pessoa está
                      caindo onde deveria.
                    */}
                    <p className="text-sm text-texto-suave">
                      {t('filaDaProfissao')}:{' '}
                      {conta.filas.map((f) => traduzir(especialidades, idioma, f)).join(' · ')}
                    </p>
                    {conta.email ? (
                      <p className="text-sm text-texto-suave">{conta.email}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-texto-suave">
                      {t('cadastradoEm')} {new Date(conta.criadoEm).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Etiqueta tom={conta.status === 'Ativa' ? 'sucesso' : 'neutro'}>
                      {traduzir(statusConta, idioma, conta.status)}
                    </Etiqueta>
                    {conta.ehAdministrador ? (
                      <Etiqueta>{t('administrador')}</Etiqueta>
                    ) : null}
                  </div>
                </div>

                {conta.motivoRecusa ? (
                  <p className="text-sm text-texto-suave">
                    {t('motivo')}: {conta.motivoRecusa}
                  </p>
                ) : null}

                {recusando === conta.id ? (
                  <div className="space-y-2">
                    <label className="block">
                      <span className="rotulo">{t('motivoRecusa')}</span>
                      <textarea
                        className="campo min-h-20"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="botao w-auto px-5"
                        disabled={motivo.trim().length === 0}
                        onClick={() =>
                          executar(async () => {
                            await api.recusarConta(conta.id, motivo.trim());
                            setRecusando(null);
                            setMotivo('');
                          })
                        }
                      >
                        {t('confirmar')}
                      </button>
                      <button
                        type="button"
                        className="botao-secundario"
                        onClick={() => {
                          setRecusando(null);
                          setMotivo('');
                        }}
                      >
                        {t('cancelar')}
                      </button>
                    </div>
                  </div>
                ) : reclassificando === conta.id ? (
                  <div className="space-y-2">
                    <label className="block">
                      <span className="rotulo">{t('profissao')}</span>
                      <select
                        className="campo"
                        value={novaFuncao}
                        onChange={(e) => setNovaFuncao(e.target.value as FuncaoProfissional)}
                      >
                        {FUNCOES_PARA_CADASTRO.map((f) => (
                          <option key={f} value={f}>
                            {traduzir(funcoes, idioma, f)}
                          </option>
                        ))}
                      </select>
                    </label>

                    {/*
                      Opcional: mudar de clínico geral para pediatra mantém o
                      mesmo CRM. Só é exigido quando o conselho muda, e aí a API
                      recusa sem ele.
                    */}
                    <label className="block">
                      <span className="rotulo">{t('registro')}</span>
                      <input
                        className="campo"
                        value={novoRegistro}
                        onChange={(e) => setNovoRegistro(e.target.value)}
                        inputMode="numeric"
                      />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="botao w-auto px-5"
                        onClick={() =>
                          executar(async () => {
                            await api.alterarProfissao(
                              conta.id,
                              novaFuncao,
                              novoRegistro.trim() || null,
                            );
                            setReclassificando(null);
                            setNovoRegistro('');
                          })
                        }
                      >
                        {t('salvar')}
                      </button>
                      <button
                        type="button"
                        className="botao-secundario"
                        onClick={() => {
                          setReclassificando(null);
                          setNovoRegistro('');
                        }}
                      >
                        {t('cancelar')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {conta.status !== 'Ativa' ? (
                      <button
                        type="button"
                        className="botao w-auto px-5"
                        onClick={() => executar(() => api.aprovarConta(conta.id))}
                      >
                        {t('aprovar')}
                      </button>
                    ) : null}

                    {conta.status === 'Pendente' ? (
                      <button
                        type="button"
                        className="botao-secundario"
                        onClick={() => setRecusando(conta.id)}
                      >
                        {t('recusar')}
                      </button>
                    ) : null}

                    {/*
                      Sem ações sobre a própria conta: o servidor recusa, e
                      oferecer o botão só produziria erro na cara de quem clicou.
                    */}
                    <button
                      type="button"
                      className="botao-secundario"
                      onClick={() => {
                        setNovaFuncao(
                          FUNCOES_PARA_CADASTRO.includes(conta.funcao)
                            ? conta.funcao
                            : // "Médico" sem especialidade não está na lista de
                              // cadastro: é justamente a conta que precisa ser
                              // reclassificada, e o clínico geral é o palpite
                              // menos arriscado para a coordenação corrigir.
                              'ClinicoGeral',
                        );
                        setNovoRegistro(conta.registro ?? '');
                        setReclassificando(conta.id);
                      }}
                    >
                      {t('alterarProfissao')}
                    </button>

                    {/*
                      Em campo não há e-mail de recuperação. Sem esta saída, uma
                      senha esquecida deixaria a conta inútil para sempre.
                    */}
                    <button
                      type="button"
                      className="botao-secundario"
                      onClick={() => {
                        if (!window.confirm(t('redefinirSenhaConfirmar'))) return;

                        executar(async () => {
                          setCredencial(await api.redefinirSenha(conta.id));
                        });
                      }}
                    >
                      {t('redefinirSenha')}
                    </button>

                    {conta.status === 'Ativa' && !souEu ? (
                      <>
                        <button
                          type="button"
                          className="botao-secundario"
                          onClick={() => executar(() => api.desativarConta(conta.id))}
                        >
                          {t('desativar')}
                        </button>
                        <button
                          type="button"
                          className="botao-secundario"
                          onClick={() =>
                            executar(() =>
                              api.definirAdministrador(conta.id, !conta.ehAdministrador),
                            )
                          }
                        >
                          {conta.ehAdministrador
                            ? t('removerAdministrador')
                            : t('tornarAdministrador')}
                        </button>
                      </>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
