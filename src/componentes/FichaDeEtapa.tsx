import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import { FILAS } from '../api/tipos';
import type { DesfechoConsulta, Especialidade, Prontuario } from '../api/tipos';
import { AlertaAlergia, Carregando, Erros, Opcoes, Secao } from './Basicos';
import { Cronometro } from './Cronometro';
import { useRascunho } from '../hooks/useRascunho';
import { useI18n, traduzir } from '../i18n';
import { desfechos, especialidades } from '../i18n/enums';

export const DESFECHOS_DA_FICHA: DesfechoConsulta[] = ['Alta', 'Encaminhado', 'Retorno', 'Evasao'];

/**
 * Destinos do encaminhamento feito ao fechar a ficha.
 *
 * A triagem fica de fora: dela não se volta.
 */
export const DESTINOS: Especialidade[] = FILAS.filter((f) => f !== 'Triagem');

/**
 * Onde fica a ficha de cada fila.
 *
 * Existe para que a tela não precise decidir isso caso a caso: antes o
 * prontuário oferecia três botões fixos — triagem, consulta e odontologia — e
 * o da consulta apontava sempre para a clínica geral. Quem era da pediatria, da
 * ginecologia ou do ultrassom não tinha como chegar na própria ficha.
 */
export function rotaDaFicha(id: string, especialidade: Especialidade): string {
  const base = `/atendimentos/${id}`;

  switch (especialidade) {
    case 'Triagem':
      return `${base}/triagem`;
    case 'Odontologia':
      return `${base}/odontologia`;
    case 'Enfermagem':
      return `${base}/enfermagem`;
    case 'Ultrassom':
      return `${base}/ultrassom`;
    case 'Farmacia':
      return `${base}/farmacia`;
    case 'Cirurgia':
      return `${base}/cirurgia`;
    default:
      return `${base}/consulta/${especialidade}`;
  }
}

/**
 * O desfecho da ficha, com o destino quando a ficha encaminha.
 *
 * O destino é opcional porque nem toda ficha abre a fila seguinte: a da
 * enfermagem, como a da odontologia, encaminha pelo cartão do prontuário. Um
 * seletor de destino que a API ignora seria pior do que não ter nenhum — a
 * pessoa escolheria a fila e o paciente não chegaria lá.
 */
export function SecaoDesfecho({
  valor,
  destino,
  aoEscolher,
  aoEscolherDestino,
}: {
  valor: DesfechoConsulta | null;
  destino?: Especialidade | null;
  aoEscolher: (desfecho: DesfechoConsulta) => void;
  aoEscolherDestino?: (destino: Especialidade) => void;
}) {
  const { t, idioma } = useI18n();

  return (
    <Secao titulo={t('desfecho')}>
      <Opcoes
        valor={valor}
        opcoes={DESFECHOS_DA_FICHA}
        aoEscolher={aoEscolher}
        tabela={desfechos}
        idioma={idioma}
      />

      {valor === 'Encaminhado' && aoEscolherDestino ? (
        <div>
          <span className="rotulo">{t('encaminhadoPara')}</span>
          <Opcoes
            valor={destino ?? null}
            opcoes={DESTINOS}
            aoEscolher={aoEscolherDestino}
            tabela={especialidades}
            idioma={idioma}
          />
        </div>
      ) : null}
    </Secao>
  );
}

/**
 * O andaime comum das fichas de etapa: carrega o prontuário, mostra o cabeçalho
 * do paciente com o cronômetro, guarda o rascunho e envia.
 *
 * Existe porque o cabeçalho não é enfeite: é ali que fica o alerta de alergia,
 * que precisa estar visível enquanto se prescreve. Repetido ficha a ficha, seria
 * questão de tempo até uma delas ficar sem ele.
 */
export function FichaDeEtapa<T extends object>({
  chave,
  inicial,
  titulo,
  especialidade,
  enviar,
  children,
}: {
  /** Prefixo do rascunho guardado no aparelho. */
  chave: string;
  inicial: T;
  titulo: string;
  /** A fila desta ficha, para achar o cronômetro da etapa certa. */
  especialidade: Especialidade;
  enviar: (id: string, valor: T) => Promise<void>;
  children: (
    valor: T,
    alterar: (mudanca: Partial<T>) => void,
    prontuario: Prontuario,
  ) => ReactNode;
}) {
  const { t } = useI18n();
  const { id = '' } = useParams();
  const navegar = useNavigate();

  const [prontuario, setProntuario] = useState<Prontuario | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  const rascunho = useRascunho<T>(`${chave}-${id}`, inicial);

  useEffect(() => {
    api
      .prontuario(id)
      .then(setProntuario)
      .catch((erro) => {
        setErros([erro instanceof ErroDeRede ? t('semConexao') : t('erroInesperado')]);
      });
  }, [id, t]);

  async function aoSubmeter(evento: FormEvent) {
    evento.preventDefault();
    setErros([]);
    setEnviando(true);

    try {
      await enviar(id, rascunho.valor);
      rascunho.limpar();
      navegar(`/atendimentos/${id}`, { replace: true });
    } catch (erro) {
      if (erro instanceof ErroDeRede) setErros([t('semConexao')]);
      else if (erro instanceof ErroApi) setErros(erro.erros);
      else setErros([t('erroInesperado')]);
    } finally {
      setEnviando(false);
    }
  }

  if (!prontuario) {
    return <Carregando texto={t('carregando')} />;
  }

  /*
    O cronômetro é da etapa desta ficha, e não do atendimento inteiro — que
    incluiria o tempo que as outras filas levaram.
  */
  const etapa = prontuario.etapas.find(
    (e) => e.especialidade === especialidade && e.status !== 'Concluida' && e.status !== 'Cancelada',
  );

  const alterar = (mudanca: Partial<T>) =>
    rascunho.setValor({ ...rascunho.valor, ...mudanca });

  return (
    <form onSubmit={aoSubmeter} className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <h1 className="titulo">{titulo}</h1>

      <div className="cartao space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-bold">{prontuario.paciente.nome}</span>
            <span className="text-sm text-texto-suave">
              {prontuario.paciente.idade !== null ? `${prontuario.paciente.idade} ${t('anos')}` : ''}
            </span>
          </div>

          <Cronometro assumidaEm={etapa?.assumidaEm ?? null} />
        </div>

        <AlertaAlergia
          exibir={prontuario.paciente.alerta.exibir}
          texto={prontuario.paciente.alerta.texto}
        />
      </div>

      {children(rascunho.valor, alterar, prontuario)}

      <Erros erros={erros} />

      <button type="submit" className="botao" disabled={enviando}>
        {enviando ? t('carregando') : t('salvar')}
      </button>
    </form>
  );
}

/** O nome da fila no idioma de quem está olhando. Usado como título da ficha. */
export function useTituloDaFila(especialidade: Especialidade): string {
  const { idioma } = useI18n();
  return traduzir(especialidades, idioma, especialidade);
}
