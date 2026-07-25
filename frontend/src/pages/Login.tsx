import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';

const FUNCOES = [
  'Triagem',
  'Enfermeiro(a)',
  'Médico(a) — Clínica Geral',
  'Médico(a) — Pediatria',
  'Recepção / Cadastro',
  'Coordenação',
];

export function Login() {
  const { baseSelecionada, login } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [funcao, setFuncao] = useState(FUNCOES[0]);
  const [registro, setRegistro] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!baseSelecionada) return <Navigate to="/selecionar-base" replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(baseSelecionada!.id, nome, funcao, registro, senha);
      navigate('/atendimentos');
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível entrar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={enviar} className="card w-full max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-base-teal flex items-center justify-center mx-auto mb-4 text-3xl">
          +
        </div>
        <h1 className="text-xl font-bold text-center mb-1">Atendimento de Campo</h1>
        <p className="text-slate-400 text-center mb-6">Primeiro acesso? Use a senha da equipe.</p>

        <div className="space-y-4">
          <div>
            <label className="label">Seu nome *</label>
            <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div>
            <label className="label">Sua função *</label>
            <select className="input" value={funcao} onChange={(e) => setFuncao(e.target.value)} required>
              {FUNCOES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Registro (opcional)</label>
            <input className="input" value={registro} onChange={(e) => setRegistro(e.target.value)} />
          </div>
          <div>
            <label className="label">Senha</label>
            <input
              type="password"
              className="input"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Primeiro acesso: use a senha da equipe. Se já tem conta, use a mesma senha.
            </p>
          </div>

          {erro && (
            <div className="bg-risco-vermelho/10 border border-risco-vermelho/40 text-risco-vermelho text-sm rounded-lg px-3 py-2">
              {erro}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
}
