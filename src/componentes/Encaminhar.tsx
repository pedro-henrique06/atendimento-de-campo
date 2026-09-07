import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type { DesfechoAtendimento, Especialidade, Prontuario } from '../api/tipos';
import { Erros } from './Basicos';
import { Cronometro } from './Cronometro';
import { useI18n, traduzir } from '../i18n';
import { desfechosAtendimento, especialidades } from '../i18n/enums';

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
type Acao = 'nenhuma' | 'encaminhar' | 'devolver' | 'encerrar';

/**
 * Os desfechos, na ordem em que a equipe usa.
 *
 * Alta primeiro porque é o caso comum; óbito por último porque é o mais raro e
 * o mais grave — não é botão para ficar ao lado do polegar.
 */
const DESFECHOS: DesfechoAtendimento[] = [
  'Alta',
  'TransferenciaHospitalar',
  'Outro',
  'Obito',
];

/** Estes dois não fazem sentido sem uma linha dizendo o quê. */
function exigeDetalhe(desfecho: DesfechoAtendimento): boolean {
  return desfecho === 'TransferenciaHospitalar' || desfecho === 'Outro';
}

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
  const [desfecho, setDesfecho] = useState<DesfechoAtendimento>('Alta');
  const [detalhe, setDetalhe] = useState('');
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

  /*
    Da triagem não se volta.

    Quem já passou por ela tem risco classificado e lugar na fila; reabri-la joga
    o paciente para o começo da linha e faz o risco ser classificado de novo,
    possivelmente para outra cor. A API recusa, e a tela não oferece — botão que
    só serve para receber erro é pior que botão nenhum.

    Quem nunca foi triado é outro caso: mandar para lá não é voltar, é ir pela
    primeira vez, e continua permitido.
  */
  const jaFoiTriado =
    prontuario.etapas.find((e) => e.especialidade === 'Triagem')?.status === 'Concluida';

  const podeDevolver = aberta.encaminhadaDe !== null && aberta.encaminhadaDe !== 'Triagem';

  const destinosPossiveis = FILAS.filter(
    (f) => f !== aberta.especialidade && !(f === 'Triagem' && jaFoiTriado),
  );

  function fechar() {
    setAcao('nenhuma');
    setDestino('');
    setDesfecho('Alta');
    setDetalhe('');
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

  if (acao === 'encerrar') {
    const faltaDetalhe = exigeDetalhe(desfecho) && detalhe.trim().length === 0;

    return (
      <div className="cartao space-y-4">
        <div>
          <h2 className="font-bold">{t('encerrarAtendimento')}</h2>
          <p className="mt-1 text-sm text-texto-suave">{t('altaEncerra')}</p>
        </div>

        <div>
          <span className="rotulo">{t('comoTerminou')}</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {DESFECHOS.map((opcao) => (
              <button
                key={opcao}
                type="button"
                aria-pressed={desfecho === opcao}
                onClick={() => {
                  setDesfecho(opcao);
                  setErros([]);
                }}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  desfecho === opcao
                    ? 'border-marca bg-marca text-white'
                    : 'border-borda bg-superficie text-texto'
                }`}
              >
                {traduzir(desfechosAtendimento, idioma, opcao)}
              </button>
            ))}
          </div>
        </div>

        {/*
          Transferência sem destino não permite ninguém ir atrás do paciente
          depois, que é a única razão de registrar a transferência. A API recusa
          de qualquer forma; pedir aqui evita a viagem.
        */}
        {exigeDetalhe(desfecho) ? (
          <label className="block">
            <span className="rotulo">
              {desfecho === 'TransferenciaHospitalar'
                ? t('paraOndeTransferido')
                : t('motivoEncerramento')}
            </span>
            <input
              className="campo"
              value={detalhe}
              onChange={(e) => setDetalhe(e.target.value)}
              maxLength={300}
              required
            />
            {desfecho === 'TransferenciaHospitalar' ? (
              <span className="mt-1 block text-sm text-texto-suave">{t('dicaTransferencia')}</span>
            ) : null}
          </label>
        ) : null}

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
            disabled={enviando || faltaDetalhe}
            onClick={() =>
              executar(() =>
                api.encerrar(prontuario.id, aberta!.especialidade, {
                  desfecho,
                  detalhe: detalhe.trim() || undefined,
                  // A confirmação já foi dada aqui: a lista acima é justamente
                  // o aviso que a API exige antes de cancelar as filas.
                  cancelarPendentes: pendentes.length > 0,
                }),
              )
            }
          >
            {enviando
              ? t('carregando')
              : desfecho === 'Alta'
                ? t('altaConfirmar')
                : t('confirmarEncerramento')}
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
