import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { SetorForm } from '../components/SetorForm';
import { FORMULARIOS_POR_SETOR, RISCO_COR, RISCO_LABEL, SETORES_LABEL } from '../config/setores';
import type { AtendimentoDetalhe as AtendimentoDetalheType, Etapa, TipoEtapa } from '../types';

export function AtendimentoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [atendimento, setAtendimento] = useState<AtendimentoDetalheType | null>(null);
  const [dadosEmEdicao, setDadosEmEdicao] = useState<Record<string, unknown>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function carregar() {
    if (!id) return;
    api.get<AtendimentoDetalheType>(`/api/atendimentos/${id}`).then((dados) => {
      setAtendimento(dados);
      const etapaAtiva = dados.etapas.find((e) => e.status !== 'Concluida');
      setDadosEmEdicao(etapaAtiva?.dados ?? {});
    });
  }

  if (!atendimento) return <p className="text-slate-400">Carregando…</p>;

  const etapaAtiva = atendimento.etapas.find((e) => e.status !== 'Concluida');

  async function iniciarEtapa(etapa: Etapa) {
    if (!id) return;
    setProcessando(true);
    setErro(null);
    try {
      await api.post(`/api/atendimentos/${id}/etapas/${etapa.id}/iniciar`);
      carregar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível iniciar a etapa.');
    } finally {
      setProcessando(false);
    }
  }

  async function salvarEtapa(etapa: Etapa) {
    if (!id) return;
    setProcessando(true);
    setErro(null);
    try {
      await api.put(`/api/atendimentos/${id}/etapas/${etapa.id}`, { campos: dadosEmEdicao });
      carregar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível salvar.');
    } finally {
      setProcessando(false);
    }
  }

  async function concluirEtapa(etapa: Etapa) {
    if (!id) return;
    setProcessando(true);
    setErro(null);
    try {
      await api.put(`/api/atendimentos/${id}/etapas/${etapa.id}`, { campos: dadosEmEdicao });

      let proximaEtapa: TipoEtapa | null = null;
      if (etapa.tipo === 'Triagem') {
        proximaEtapa = (dadosEmEdicao.encaminhamento as TipoEtapa) ?? null;
        if (!proximaEtapa) {
          setErro('Selecione o encaminhamento antes de concluir a triagem.');
          setProcessando(false);
          return;
        }
      } else if (dadosEmEdicao.desfechoConsulta === 'Encaminhado') {
        proximaEtapa = (dadosEmEdicao.encaminhamento as TipoEtapa) ?? null;
        if (!proximaEtapa) {
          setErro('Selecione para qual setor encaminhar.');
          setProcessando(false);
          return;
        }
      }

      await api.post(`/api/atendimentos/${id}/etapas/${etapa.id}/concluir`, { proximaEtapa });
      carregar();
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível concluir a etapa.');
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-mono font-bold">{atendimento.codigo}</h2>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            atendimento.status === 'Finalizado' ? 'bg-slate-600' : 'bg-base-teal'
          }`}
        >
          {atendimento.status === 'Finalizado' ? '✓ Finalizado' : 'Em andamento'}
        </span>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`w-3 h-3 rounded-full ${RISCO_COR[atendimento.risco]}`} />
          <span className="font-semibold text-lg">{atendimento.pacienteNome}</span>
          <span className="text-slate-400 text-sm">{RISCO_LABEL[atendimento.risco]}</span>
        </div>
        {atendimento.pacienteAlergias && (
          <p className="text-sm text-risco-amarelo mt-2">⚠ Alergia: {atendimento.pacienteAlergias}</p>
        )}
        {atendimento.queixaPrincipal && (
          <p className="text-sm text-slate-300 mt-2">{atendimento.queixaPrincipal}</p>
        )}
      </div>

      {erro && (
        <div className="bg-risco-vermelho/10 border border-risco-vermelho/40 text-risco-vermelho text-sm rounded-lg px-3 py-2">
          {erro}
        </div>
      )}

      {atendimento.etapas.map((etapa) => (
        <div key={etapa.id} className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-base-tealLight">{SETORES_LABEL[etapa.tipo]}</h3>
            <span className="text-xs text-slate-400">{etapa.usuarioResponsavelNome ?? '—'}</span>
          </div>

          {etapa.status === 'Concluida' && (
            <dl className="space-y-1 text-sm">
              {Object.entries(etapa.dados).map(([chave, valor]) => (
                <div key={chave} className="flex gap-2">
                  <dt className="text-slate-400 shrink-0">{chave}:</dt>
                  <dd className="text-slate-200">{Array.isArray(valor) ? valor.join(', ') : String(valor)}</dd>
                </div>
              ))}
            </dl>
          )}

          {etapa.status === 'Aguardando' && etapa.id === etapaAtiva?.id && (
            <button onClick={() => iniciarEtapa(etapa)} disabled={processando} className="btn-primary">
              Iniciar {SETORES_LABEL[etapa.tipo]}
            </button>
          )}

          {etapa.status === 'EmAndamento' && (
            <div className="space-y-4">
              <SetorForm
                campos={FORMULARIOS_POR_SETOR[etapa.tipo]}
                valores={dadosEmEdicao}
                onChange={(chave, valor) => setDadosEmEdicao((prev) => ({ ...prev, [chave]: valor }))}
                desabilitado={processando}
              />
              <div className="flex gap-2">
                <button onClick={() => salvarEtapa(etapa)} disabled={processando} className="btn-secondary">
                  Salvar
                </button>
                <button onClick={() => concluirEtapa(etapa)} disabled={processando} className="btn-primary">
                  Concluir {SETORES_LABEL[etapa.tipo]}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="card">
        <button
          onClick={() => setMostrarHistorico((v) => !v)}
          className="text-base-tealLight font-semibold text-sm"
        >
          {mostrarHistorico ? '▼' : '▶'} Histórico de alterações ({atendimento.historico.length})
        </button>
        {mostrarHistorico && (
          <ul className="mt-3 space-y-2 text-sm">
            {atendimento.historico.map((h, i) => (
              <li key={i} className="border-l-2 border-base-border pl-3">
                <span className="font-semibold">{h.usuarioNome}</span>{' '}
                <span className="text-slate-400">
                  {h.acao.replaceAll('_', ' ')}
                  {h.campo ? ` — ${h.campo}` : ''}
                </span>
                {h.valorNovo && (
                  <div className="text-xs text-slate-500">
                    {h.valorAnterior ?? '—'} → {h.valorNovo}
                  </div>
                )}
                <div className="text-xs text-slate-600">{new Date(h.criadoEm).toLocaleString('pt-BR')}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
