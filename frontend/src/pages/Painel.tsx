import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { RISCO_COR, SETORES_LABEL } from '../config/setores';
import type { AtendimentoResumo, PainelResumo, RiscoClassificacao, TipoEtapa } from '../types';

const CONTADORES: { chave: keyof PainelResumo; rotulo: string; risco?: RiscoClassificacao; cor: string }[] = [
  { chave: 'total', rotulo: 'Total', cor: 'text-sky-400' },
  { chave: 'vermelho', rotulo: 'Vermelho', risco: 'Vermelho', cor: 'text-risco-vermelho' },
  { chave: 'amarelo', rotulo: 'Amarelo', risco: 'Amarelo', cor: 'text-risco-amarelo' },
  { chave: 'verde', rotulo: 'Verde', risco: 'Verde', cor: 'text-risco-verde' },
  { chave: 'preto', rotulo: 'Preto', risco: 'Preto', cor: 'text-slate-300' },
];

export function Painel() {
  const [resumo, setResumo] = useState<PainelResumo | null>(null);
  const [risco, setRisco] = useState<RiscoClassificacao | null>(null);
  const [busca, setBusca] = useState('');
  const [atendimentos, setAtendimentos] = useState<AtendimentoResumo[]>([]);

  useEffect(() => {
    api.get<PainelResumo>('/api/painel/resumo').then(setResumo);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (risco) params.set('risco', risco);
    if (busca) params.set('busca', busca);
    api.get<AtendimentoResumo[]>(`/api/atendimentos?${params.toString()}`).then(setAtendimentos);
  }, [risco, busca]);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Painel</h2>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        {CONTADORES.map((c) => (
          <button
            key={c.chave}
            onClick={() => setRisco((atual) => (atual === c.risco ? null : c.risco ?? null))}
            className={`card text-center transition-colors ${
              risco === c.risco && c.risco ? 'border-base-teal' : ''
            }`}
          >
            <div className={`text-3xl font-bold ${c.cor}`}>{resumo ? resumo[c.chave] : '—'}</div>
            <div className="text-sm text-slate-400">{c.rotulo}</div>
          </button>
        ))}
      </div>

      <input
        className="input mb-4"
        placeholder="Buscar por código, nome ou queixa…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <p className="text-sm text-slate-400 mb-2">{atendimentos.length} atendimento(s)</p>

      <div className="space-y-3">
        {atendimentos.map((a) => (
          <Link to={`/atendimentos/${a.id}`} key={a.id} className="card block hover:border-base-teal">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${RISCO_COR[a.risco]}`} />
                <span className="font-mono text-sm text-slate-400">{a.codigo}</span>
                <span className="font-semibold">{a.pacienteNome}</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-base-border">
                {a.status === 'Finalizado' ? '✓ Finalizado' : a.setorAtual ? SETORES_LABEL[a.setorAtual as TipoEtapa] : '—'}
              </span>
            </div>
            {a.queixaPrincipal && <p className="text-sm text-slate-400 mt-1 truncate">{a.queixaPrincipal}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
