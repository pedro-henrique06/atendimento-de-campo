import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { AtendimentoDetalhe } from '../types';

export function NovoAtendimento() {
  const navigate = useNavigate();
  const [consentimento, setConsentimento] = useState(false);
  const [nome, setNome] = useState('');
  const [documentoTipo, setDocumentoTipo] = useState('Cédula de identidade');
  const [documentoNumero, setDocumentoNumero] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [alergias, setAlergias] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!consentimento) {
      setErro('É necessário o consentimento do paciente (ou responsável) para registrar as informações.');
      return;
    }

    setEnviando(true);
    try {
      let coords: { latitude?: number; longitude?: number; precisaoMetros?: number } = {};
      try {
        const posicao = await obterPosicao();
        coords = {
          latitude: posicao.coords.latitude,
          longitude: posicao.coords.longitude,
          precisaoMetros: posicao.coords.accuracy,
        };
      } catch {
        // geolocalização é opcional — segue sem ela se o usuário negar/indisponível
      }

      const criado = await api.post<AtendimentoDetalhe>('/api/atendimentos', {
        consentimentoRegistro: consentimento,
        pacienteNome: nome,
        pacienteDocumentoTipo: documentoTipo || null,
        pacienteDocumentoNumero: documentoNumero || null,
        pacienteDataNascimento: nascimento || null,
        pacienteSexo: sexo || null,
        pacienteAlergias: alergias || null,
        ...coords,
      });
      navigate(`/atendimentos/${criado.id}`);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível criar o atendimento.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="card max-w-lg mx-auto space-y-4">
      <h2 className="text-xl font-bold">Novo atendimento — Dados pessoais</h2>

      <div>
        <label className="label">Nome do paciente *</label>
        <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Tipo de documento</label>
          <input className="input" value={documentoTipo} onChange={(e) => setDocumentoTipo(e.target.value)} />
        </div>
        <div>
          <label className="label">Número do documento</label>
          <input className="input" value={documentoNumero} onChange={(e) => setDocumentoNumero(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Data de nascimento</label>
          <input
            type="date"
            className="input"
            value={nascimento}
            onChange={(e) => setNascimento(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Sexo</label>
          <select className="input" value={sexo} onChange={(e) => setSexo(e.target.value)}>
            <option value="">Selecione…</option>
            <option value="Feminino">Feminino</option>
            <option value="Masculino">Masculino</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Alergias conhecidas</label>
        <input className="input" value={alergias} onChange={(e) => setAlergias(e.target.value)} />
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          className="mt-1"
          checked={consentimento}
          onChange={(e) => setConsentimento(e.target.checked)}
        />
        O paciente (ou responsável) consente com o registro destas informações.
      </label>

      {erro && (
        <div className="bg-risco-vermelho/10 border border-risco-vermelho/40 text-risco-vermelho text-sm rounded-lg px-3 py-2">
          {erro}
        </div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={enviando}>
        {enviando ? 'Criando…' : 'Iniciar atendimento (Triagem)'}
      </button>
    </form>
  );
}

function obterPosicao(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não disponível'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
  });
}
