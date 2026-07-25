import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { RISCO_COR, SETORES_LABEL } from '../config/setores';
import type { AtendimentoResumo, TipoEtapa } from '../types';

export function Fila() {
  const [atendimentos, setAtendimentos] = useState<AtendimentoResumo[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  function carregar(termo?: string) {
    setCarregando(true);
    const query = termo ? `?busca=${encodeURIComponent(termo)}&status=EmAndamento` : '?status=EmAndamento';
    api
      .get<AtendimentoResumo[]>(`/api/atendimentos${query}`)
      .then(setAtendimentos)
      .finally(() => setCarregando(false));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-xl font-bold">Atendimentos</h2>
        <Link to="/atendimentos/novo" className="btn-primary">
          + Novo
        </Link>
      </div>

      <input
        className="input mb-4"
        placeholder="Buscar por código, nome ou queixa…"
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value);
          carregar(e.target.value);
        }}
      />

      {carregando && <p className="text-slate-400">Carregando…</p>}

      <div className="space-y-3">
        {atendimentos.map((a) => (
          <Link to={`/atendimentos/${a.id}`} key={a.id} className="card block hover:border-base-teal">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${RISCO_COR[a.risco]}`} />
                <span className="font-mono text-sm text-slate-400">{a.codigo}</span>
                <span className="font-semibold">{a.pacienteNome}</span>
              </div>
              <span className="text-xs text-slate-400">
                {a.setorAtual ? SETORES_LABEL[a.setorAtual as TipoEtapa] ?? a.setorAtual : '—'}
              </span>
            </div>
            {a.queixaPrincipal && <p className="text-sm text-slate-400 mt-1 truncate">{a.queixaPrincipal}</p>}
          </Link>
        ))}
        {!carregando && atendimentos.length === 0 && (
          <p className="text-slate-400 text-sm">Ninguém aguardando nesta fila.</p>
        )}
      </div>
    </div>
  );
}
