import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type { DesfechoAtendimento, Especialidade, Prontuario } from '../api/tipos';
import { Erros, Opcoes } from './Basicos';
import { useI18n, traduzir } from '../i18n';
import { desfechosAtendimento, especialidades } from '../i18n/enums';

/**
 * Os desfechos, na ordem em que a equipe usa.
 *
 * Alta primeiro porque é o caso comum; óbito por último porque é o mais raro e
 * o mais grave — não é botão para ficar ao lado do polegar.
 */
export const DESFECHOS: DesfechoAtendimento[] = [
  'Alta',
  'TransferenciaHospitalar',
  'Outro',
  'Obito',
];

/** Estes dois não fazem sentido sem uma linha dizendo o quê. */
export function exigeDetalhe(desfecho: DesfechoAtendimento): boolean {
  return desfecho === 'TransferenciaHospitalar' || desfecho === 'Outro';
}

/**
 * As outras filas em que o paciente ainda está.
 *
 * O encerramento cancela todas, então a tela precisa dizer quais são antes de
 * perguntar — sumir sem aviso é como o paciente descobre no dia seguinte que
 * perdeu a vez na odontologia.
 */
export function filasPendentes(
  prontuario: Prontuario,
  especialidade: Especialidade,
): Especialidade[] {
  return prontuario.etapas
    .filter(
      (e) =>
        e.especialidade !== especialidade &&
        e.status !== 'Concluida' &&
        e.status !== 'Cancelada',
    )
    .map((e) => e.especialidade);
}

/**
 * O formulário do encerramento: como o atendimento terminou.
 *
 * Mora aqui, e não na tela que o usa, porque a alta tem de poder ser dada de
 * qualquer etapa — do prontuário e de dentro de cada ficha. Copiado tela a
 * tela, seria questão de tempo até uma das cópias esquecer o aviso das filas
 * pendentes ou o detalhe obrigatório da transferência.
 *
 * Não é um `form`: ele aparece dentro do formulário da ficha, e formulário
 * dentro de formulário é HTML inválido. Por isso também o detalhe não usa
 * `required` — quem guarda essa regra é o botão de confirmar, que fica
 * desabilitado enquanto a linha está vazia.
 */
export function FormularioDeEncerramento({
  prontuario,
  especialidade,
  enviando,
  erros,
  aviso,
  aoConfirmar,
  aoCancelar,
}: {
  prontuario: Prontuario;
  /** A fila pela qual o atendimento está sendo encerrado. */
  especialidade: Especialidade;
  enviando: boolean;
  erros: string[];
  /** Linha extra de contexto, quando quem chama tem algo a avisar. */
  aviso?: ReactNode;
  aoConfirmar: (desfecho: DesfechoAtendimento, detalhe: string) => void;
  aoCancelar: () => void;
}) {
  const { t, idioma } = useI18n();

  const [desfecho, setDesfecho] = useState<DesfechoAtendimento>('Alta');
  const [detalhe, setDetalhe] = useState('');

  const pendentes = filasPendentes(prontuario, especialidade);
  const faltaDetalhe = exigeDetalhe(desfecho) && detalhe.trim().length === 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold">{t('encerrarAtendimento')}</h2>
        <p className="mt-1 text-sm text-texto-suave">{t('altaEncerra')}</p>
        {aviso ? <p className="mt-1 text-sm text-texto-suave">{aviso}</p> : null}
      </div>

      <div>
        <span className="rotulo">{t('comoTerminou')}</span>
        <div className="mt-1">
          <Opcoes
            valor={desfecho}
            opcoes={DESFECHOS}
            aoEscolher={setDesfecho}
            tabela={desfechosAtendimento}
            idioma={idioma}
          />
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
            {pendentes.map((fila) => (
              <li key={fila}>{traduzir(especialidades, idioma, fila)}</li>
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
          onClick={() => aoConfirmar(desfecho, detalhe)}
        >
          {enviando
            ? t('carregando')
            : desfecho === 'Alta'
              ? t('altaConfirmar')
              : t('confirmarEncerramento')}
        </button>

        <button type="button" className="botao-secundario" onClick={aoCancelar}>
          {t('cancelar')}
        </button>
      </div>
    </div>
  );
}

/**
 * A alta dada de dentro de uma ficha de etapa.
 *
 * Existe para que dar alta não dependa de voltar ao prontuário. O paciente que
 * pode ir para casa pode ir de qualquer fila — da triagem que só mediu a
 * pressão, da farmácia que entregou o remédio, do consultório —, e obrigar quem
 * está com ele a gravar, voltar uma tela e procurar outro botão é exatamente
 * como o atendimento ficava aberto até o dia seguinte.
 *
 * Grava a ficha antes de encerrar: a alta fecha o atendimento inteiro, e sem
 * gravar o registro do que justificou a alta ficaria só no rascunho do
 * aparelho.
 */
export function Encerramento({
  prontuario,
  especialidade,
  salvar,
  impedimento,
}: {
  prontuario: Prontuario;
  /** A fila desta ficha. É por ela que o atendimento é encerrado. */
  especialidade: Especialidade;
  /** A gravação da própria ficha, sem navegar. Roda antes do encerramento. */
  salvar: () => Promise<void>;
  /**
   * O que falta na ficha para ela poder ser gravada, quando falta algo.
   *
   * Com isto preenchido o botão não é oferecido, e a frase aparece no lugar
   * dele: a alta grava a ficha, e uma ficha que a API vai recusar não pode ser
   * o caminho de mandar o paciente para casa.
   */
  impedimento?: string | null;
}) {
  const { t } = useI18n();
  const { id = '' } = useParams();
  const navegar = useNavigate();

  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erros, setErros] = useState<string[]>([]);

  if (prontuario.finalizadoEm) return null;

  async function confirmar(desfecho: DesfechoAtendimento, detalhe: string) {
    setErros([]);
    setEnviando(true);

    try {
      // A ficha primeiro. Se ela for recusada — consulta sem CID-10, por
      // exemplo —, o atendimento continua aberto e o erro aparece aqui, em vez
      // de o paciente receber alta sem registro do que aconteceu.
      await salvar();

      await api.encerrar(id, especialidade, {
        desfecho,
        detalhe: detalhe.trim() || undefined,
        // O aviso do formulário já foi dado: as outras filas são canceladas.
        cancelarPendentes: true,
      });

      navegar(`/atendimentos/${id}`, { replace: true });
    } catch (erro) {
      if (erro instanceof ErroApi) setErros(erro.erros);
      else if (erro instanceof ErroDeRede) setErros([t('semConexao')]);
      else setErros([t('erroInesperado')]);

      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <div className="cartao space-y-2">
        {impedimento ? (
          <p className="text-sm text-texto-suave">{impedimento}</p>
        ) : (
          <>
            <button
              type="button"
              className="botao-secundario"
              onClick={() => setAberto(true)}
            >
              {t('encerrarAtendimento')}
            </button>
            <p className="text-sm text-texto-suave">{t('encerrarGravaAFicha')}</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="cartao">
      <FormularioDeEncerramento
        prontuario={prontuario}
        especialidade={especialidade}
        enviando={enviando}
        erros={erros}
        aviso={t('encerrarGravaAFicha')}
        aoConfirmar={confirmar}
        aoCancelar={() => {
          setAberto(false);
          setErros([]);
        }}
      />
    </div>
  );
}
