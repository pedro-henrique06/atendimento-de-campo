import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type { Especialidade, Prontuario } from '../api/tipos';
import { Erros } from './Basicos';
import { Cronometro } from './Cronometro';
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

/** Qual formulário está aberto. Fechado, o cartão mostra só os botões. */
type Acao = 'nenhuma' | 'encaminhar' | 'devolver' | 'alta';

/**
 * O que o profissional faz ao terminar com o paciente: encaminhar para outra
 * fila, devolver para quem o encaminhou, ou dar alta e encerrar.
 *
 * Existe separado do desfecho da consulta porque redirecionar não é concluir um
 * atendimento. Fechando a consulta, o CID-10 vira obrigatório — e quando a
 * triagem simplesmente errou a fila, isso obrigaria o profissional a inventar um
 * diagnóstico para uma consulta que não aconteceu. Também é o único caminho para
 * a odontologia e a enfermagem, cujas fichas não têm campo de encaminhamento.
 *
 * Só aparece quando há uma fila aberta: atendimento finalizado ou sem etapa
 * pendente não tem desfecho a dar.
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

  const [acao, setAcao] = useState<Acao>('nenhuma');
  const [destino, setDestino] = useState<Especialidade | ''>('');
  const [motivo, setMotivo] = useState('');
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  if (!aberta || prontuario.finalizadoEm) return null;

  /*
    As outras filas em que o paciente ainda está. A alta cancela todas, então a
    tela precisa dizer quais são antes de perguntar — some sem aviso é como o
    paciente descobre no dia seguinte que perdeu a vez na odontologia.
  */
  const pendentes = prontuario.etapas.filter(
    (e) => e.id !== aberta.id && e.status !== 'Concluida' && e.status !== 'Cancelada',
  );

  function fechar() {
    setAcao('nenhuma');
    setDestino('');
    setMotivo('');
    setErros([]);
  }

  async function executar(acaoDaApi: () => Promise<Prontuario>) {
    setErros([]);
    setEnviando(true);

    try {
      const atualizado = await acaoDaApi();
      fechar();
      aoEncaminhar(atualizado);
    } catch (erro) {
      if (erro instanceof ErroApi) setErros(erro.erros);
      else if (erro instanceof ErroDeRede) setErros([t('semConexao')]);
      else setErros([t('erroInesperado')]);
    } finally {
      setEnviando(false);
    }
  }

  function enviarEncaminhamento(evento: FormEvent) {
    evento.preventDefault();
    if (!aberta || !destino) return;

    executar(() =>
      api.encaminhar(prontuario.id, aberta.especialidade, {
        destino,
        motivo: motivo.trim(),
      }),
    );
  }

  function enviarDevolucao(evento: FormEvent) {
    evento.preventDefault();
    if (!aberta) return;

    executar(() => api.devolver(prontuario.id, aberta.especialidade, motivo.trim()));
  }

  if (acao === 'nenhuma') {
    return (
      <div className="cartao space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-texto-suave">
            {t('filaAberta')}:{' '}
            <span className="font-medium text-texto">
              {traduzir(especialidades, idioma, aberta.especialidade)}
            </span>
          </span>

          <Cronometro assumidaEm={aberta.assumidaEm} />
        </div>

        {/*
          Quem encaminhou, quando veio de outra fila. Sem isto, devolver seria
          um botão sem contexto — e a pessoa não teria como saber para onde o
          paciente voltaria.
        */}
        {aberta.encaminhadaPor && aberta.encaminhadaDe ? (
          <p className="text-sm text-texto-suave">
            {t('encaminhadoPor')}{' '}
            <span className="font-medium text-texto">{aberta.encaminhadaPor}</span> ·{' '}
            {traduzir(especialidades, idioma, aberta.encaminhadaDe)}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button type="button" className="botao w-auto px-5" onClick={() => setAcao('alta')}>
            {t('darAlta')}
          </button>

          {aberta.encaminhadaDe ? (
            <button
              type="button"
              className="botao-secundario"
              onClick={() => setAcao('devolver')}
            >
              {t('devolver')}
            </button>
          ) : null}

          <button
            type="button"
            className="botao-secundario"
            onClick={() => setAcao('encaminhar')}
          >
            {t('encaminhar')}
          </button>
        </div>
      </div>
    );
  }

  if (acao === 'alta') {
    return (
      <div className="cartao space-y-4">
        <div>
          <h2 className="font-bold">{t('darAlta')}</h2>
          <p className="mt-1 text-sm text-texto-suave">{t('altaEncerra')}</p>
        </div>

        {pendentes.length > 0 ? (
          <div className="rounded-xl border border-borda bg-superficie-2 p-3">
            <p className="text-sm font-medium">{t('altaFilasPendentes')}</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-texto-suave">
              {pendentes.map((e) => (
                <li key={e.id}>{traduzir(especialidades, idioma, e.especialidade)}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-texto-suave">{t('altaCancelaFilas')}</p>
          </div>
        ) : null}

        <Erros erros={erros} />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="botao w-auto px-5"
            disabled={enviando}
            onClick={() =>
              executar(() =>
                // A confirmação já foi dada aqui: a lista acima é justamente o
                // aviso que a API exige antes de cancelar as filas.
                api.darAlta(prontuario.id, aberta!.especialidade, pendentes.length > 0),
              )
            }
          >
            {enviando ? t('carregando') : t('altaConfirmar')}
          </button>

          <button type="button" className="botao-secundario" onClick={fechar}>
            {t('cancelar')}
          </button>
        </div>
      </div>
    );
  }

  if (acao === 'devolver') {
    return (
      <form onSubmit={enviarDevolucao} className="cartao space-y-4">
        <p className="text-sm text-texto-suave">
          {t('devolverPara')}:{' '}
          <span className="font-medium text-texto">
            {traduzir(especialidades, idioma, aberta.encaminhadaDe!)}
            {aberta.encaminhadaPor ? ` · ${aberta.encaminhadaPor}` : ''}
          </span>
        </p>

        <label className="block">
          <span className="rotulo">{t('motivoDevolucao')}</span>
          <textarea
            className="campo min-h-20"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            required
          />
          <span className="mt-1 block text-sm text-texto-suave">{t('dicaMotivoDevolucao')}</span>
        </label>

        <Erros erros={erros} />

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="botao w-auto px-5"
            disabled={enviando || motivo.trim().length === 0}
          >
            {enviando ? t('carregando') : t('devolver')}
          </button>

          <button type="button" className="botao-secundario" onClick={fechar}>
            {t('cancelar')}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={enviarEncaminhamento} className="cartao space-y-4">
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

        <button type="button" className="botao-secundario" onClick={fechar}>
          {t('cancelar')}
        </button>
      </div>
    </form>
  );
}
