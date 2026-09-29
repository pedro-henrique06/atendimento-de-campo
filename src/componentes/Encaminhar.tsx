import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import { FILAS } from '../api/tipos';
import type { DesfechoAtendimento, Especialidade, Prontuario } from '../api/tipos';
import { Erros } from './Basicos';
import { Cronometro } from './Cronometro';
import { filasPendentes, FormularioDeEncerramento } from './Encerramento';
import { useI18n, traduzir } from '../i18n';
import { especialidades } from '../i18n/enums';

/** Qual formulário está aberto. Fechado, o cartão mostra só os botões. */
type Acao = 'nenhuma' | 'encaminhar' | 'devolver' | 'encerrar';

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
 * Sem fila aberta ainda há alta a dar, e por isso o cartão continua aparecendo:
 * a triagem que não encaminhou ninguém, ou a ficha fechada com "alta" no
 * desfecho da etapa, deixavam o atendimento sem nenhuma fila — e o único botão
 * que sobrava era um "finalizar" que não gravava desfecho nenhum. O paciente
 * mandado para casa não constava como alta em lugar algum. Nesse estado o cartão
 * oferece só o encerramento: encaminhar e devolver dependem de uma etapa aberta,
 * e a API recusa as duas com a etapa concluída.
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

  /*
    Sem fila aberta, o encerramento é registrado pela última etapa concluída: é
    dela que o paciente está saindo, e é a especialidade que a API exige para
    gravar o desfecho. Ordenada pela conclusão, e não pela ordem da lista, que
    é a de criação das etapas.
  */
  const ultimaConcluida = prontuario.etapas
    .filter((e) => e.status === 'Concluida')
    .sort((a, b) => (a.concluidaEm ?? '').localeCompare(b.concluidaEm ?? ''))
    .at(-1);

  const especialidadeDoDesfecho = aberta?.especialidade ?? ultimaConcluida?.especialidade;

  const [acao, setAcao] = useState<Acao>('nenhuma');
  const [destino, setDestino] = useState<Especialidade | ''>('');
  const [motivo, setMotivo] = useState('');
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  // Sem nenhuma etapa não há fila pela qual encerrar, e a API recusaria com
  // "este atendimento nao passou por esta fila".
  if (prontuario.finalizadoEm || !especialidadeDoDesfecho) return null;

  /*
    Da triagem não se volta.

    Quem já passou por ela tem risco classificado e lugar na fila; reabri-la joga
    o paciente para o começo da linha e faz o risco ser classificado de novo,
    possivelmente para outra cor. A API recusa, e a tela não oferece — botão que
    só serve para receber erro é pior que botão nenhum.

    Quem nunca foi triado é outro caso: mandar para lá não é voltar, é ir pela
    primeira vez, e continua permitido.
  */
  /** As outras filas em que o paciente ainda está, e que o encerramento cancela. */
  const pendentes = filasPendentes(prontuario, especialidadeDoDesfecho);

  const jaFoiTriado =
    prontuario.etapas.find((e) => e.especialidade === 'Triagem')?.status === 'Concluida';

  const podeDevolver =
    aberta !== undefined && aberta.encaminhadaDe !== null && aberta.encaminhadaDe !== 'Triagem';

  const destinosPossiveis = FILAS.filter(
    (f) => f !== aberta?.especialidade && !(f === 'Triagem' && jaFoiTriado),
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
        {aberta ? (
          <>
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
              Quem encaminhou, quando veio de outra fila. Sem isto, devolver
              seria um botão sem contexto — e a pessoa não teria como saber para
              onde o paciente voltaria.
            */}
            {aberta.encaminhadaPor && aberta.encaminhadaDe ? (
              <p className="text-sm text-texto-suave">
                {t('encaminhadoPor')}{' '}
                <span className="font-medium text-texto">{aberta.encaminhadaPor}</span> ·{' '}
                {traduzir(especialidades, idioma, aberta.encaminhadaDe)}
              </p>
            ) : null}
          </>
        ) : (
          /*
            Nenhuma fila aberta e o atendimento continua em aberto: é o estado
            de quem saiu da última etapa sem ser encaminhado para outra. O
            paciente já está indo, e o que falta é registrar como terminou.
          */
          <p className="text-sm text-texto-suave">{t('semFilaAbertaEncerre')}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" className="botao w-auto px-5" onClick={() => setAcao('encerrar')}>
            {t('encerrarAtendimento')}
          </button>

          {podeDevolver ? (
            <button
              type="button"
              className="botao-secundario"
              onClick={() => setAcao('devolver')}
            >
              {t('devolver')}
            </button>
          ) : null}

          {/*
            Encaminhar precisa de uma etapa aberta como origem: a API recusa a
            etapa já concluída, e botão que só serve para receber erro é pior
            que botão nenhum.
          */}
          {aberta ? (
            <button
              type="button"
              className="botao-secundario"
              onClick={() => setAcao('encaminhar')}
            >
              {t('encaminhar')}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (acao === 'encerrar') {
    return (
      <div className="cartao">
        <FormularioDeEncerramento
          prontuario={prontuario}
          especialidade={especialidadeDoDesfecho}
          enviando={enviando}
          erros={erros}
          aoConfirmar={(desfecho, detalhe) =>
            executar(() =>
              api.encerrar(prontuario.id, especialidadeDoDesfecho, {
                desfecho,
                detalhe: detalhe.trim() || undefined,
                // A confirmação já foi dada: a lista das filas pendentes é
                // justamente o aviso que a API exige antes de cancelá-las.
                cancelarPendentes: pendentes.length > 0,
              }),
            )
          }
          aoCancelar={fechar}
        />
      </div>
    );
  }

  // Devolver e encaminhar dependem da etapa aberta como origem. Os dois botões
  // só aparecem com ela, e este retorno é o que diz isso ao compilador.
  if (!aberta) return null;

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
          {/*
            Fora da lista: a própria fila, porque encaminhar para ela mesma não é
            encaminhar; e a triagem, para quem já foi triado.
          */}
          {destinosPossiveis.map((f) => (
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
