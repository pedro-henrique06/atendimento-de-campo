import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type { Especialidade, Prontuario } from '../api/tipos';
import { Erros } from './Basicos';
import { useI18n, traduzir } from '../i18n';
import { especialidades } from '../i18n/enums';

const FILAS: Especialidade[] = [
  'Triagem',
  'ClinicaGeral',
  'Pediatria',
  'Ortopedia',
  'Odontologia',
  'Enfermagem',
  'SaudeMental',
];

/**
 * Manda o paciente da fila atual para outra.
 *
 * Existe separado do desfecho da consulta porque redirecionar não é concluir um
 * atendimento. Fechando a consulta, o CID-10 vira obrigatório — e quando a
 * triagem simplesmente errou a fila, isso obrigaria o profissional a inventar um
 * diagnóstico para uma consulta que não aconteceu. Também é o único caminho para
 * a odontologia e a enfermagem, cujas fichas não têm campo de encaminhamento.
 *
 * Só aparece quando há uma fila aberta: atendimento finalizado ou sem etapa
 * pendente não tem de onde encaminhar.
 */
export function Encaminhar({
  prontuario,
  aoEncaminhar,
}: {
  prontuario: Prontuario;
  aoEncaminhar: (atualizado: Prontuario) => void;
}) {
  const { t, idioma } = useI18n();

  const aberta = prontuario.etapas.find(
    (e) => e.status !== 'Concluida' && e.status !== 'Cancelada',
  );

  const [aberto, setAberto] = useState(false);
  const [destino, setDestino] = useState<Especialidade | ''>('');
  const [motivo, setMotivo] = useState('');
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  if (!aberta || prontuario.finalizadoEm) return null;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!aberta || !destino) return;

    setErros([]);
    setEnviando(true);

    try {
      const atualizado = await api.encaminhar(prontuario.id, aberta.especialidade, {
        destino,
        motivo: motivo.trim(),
      });

      setAberto(false);
      setDestino('');
      setMotivo('');
      aoEncaminhar(atualizado);
    } catch (erro) {
      if (erro instanceof ErroApi) setErros(erro.erros);
      else if (erro instanceof ErroDeRede) setErros([t('semConexao')]);
      else setErros([t('erroInesperado')]);
    } finally {
      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <div className="cartao flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-texto-suave">
          {t('filaAberta')}:{' '}
          <span className="font-medium text-texto">
            {traduzir(especialidades, idioma, aberta.especialidade)}
          </span>
        </span>

        <button type="button" className="botao-secundario" onClick={() => setAberto(true)}>
          {t('encaminhar')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="cartao space-y-4">
      <label className="block">
        <span className="rotulo">{t('encaminharPara')}</span>
        <select
          className="campo"
          value={destino}
          onChange={(e) => setDestino(e.target.value as Especialidade)}
          required
        >
          <option value="">—</option>
          {/* A fila de origem fica fora: encaminhar para ela mesma não é encaminhar. */}
          {FILAS.filter((f) => f !== aberta!.especialidade).map((f) => (
            <option key={f} value={f}>
              {traduzir(especialidades, idioma, f)}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="rotulo">{t('motivoEncaminhamento')}</span>
        <textarea
          className="campo min-h-20"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          required
        />
        <span className="mt-1 block text-sm text-texto-suave">
          {t('dicaMotivoEncaminhamento')}
        </span>
      </label>

      <Erros erros={erros} />

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="botao w-auto px-5"
          disabled={enviando || !destino || motivo.trim().length === 0}
        >
          {enviando ? t('carregando') : t('encaminhar')}
        </button>
        <button
          type="button"
          className="botao-secundario"
          onClick={() => {
            setAberto(false);
            setErros([]);
          }}
        >
          {t('cancelar')}
        </button>
      </div>
    </form>
  );
}
