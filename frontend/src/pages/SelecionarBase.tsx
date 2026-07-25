import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { BaseDto } from '../types';

export function SelecionarBase() {
  const [bases, setBases] = useState<BaseDto[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const { selecionarBase } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get<BaseDto[]>('/api/bases')
      .then(setBases)
      .catch(() => setErro('Não foi possível carregar as bases. Verifique a conexão com o servidor.'))
      .finally(() => setCarregando(false));
  }, []);

  function escolher(base: BaseDto) {
    selecionarBase(base);
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-base-teal flex items-center justify-center mx-auto mb-4 text-3xl">
          +
        </div>
        <h1 className="text-xl font-bold mb-1">Atendimento de Campo</h1>
        <p className="text-slate-400 mb-6">Escolha a base onde você vai atender.</p>

        {carregando && <p className="text-slate-400">Carregando bases…</p>}
        {erro && <p className="text-risco-vermelho text-sm mb-4">{erro}</p>}

        <div className="space-y-2 text-left">
          {bases.map((base) => (
            <button key={base.id} onClick={() => escolher(base)} className="btn-secondary w-full text-left">
              📍 {base.nome}
            </button>
          ))}
          {!carregando && bases.length === 0 && !erro && (
            <p className="text-slate-400 text-sm">Nenhuma base cadastrada ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
