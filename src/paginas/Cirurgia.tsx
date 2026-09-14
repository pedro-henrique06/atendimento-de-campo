import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type { Cirurgia as FichaCirurgica, DesfechoConsulta, Especialidade, Lateralidade, Prontuario } from '../api/tipos';
import {
  AlertaAlergia,
  Campo,
  Carregando,
  Erros,
  Etiqueta,
  Interruptor,
  Opcoes,
  Secao,
} from '../componentes/Basicos';
import { Cronometro } from '../componentes/Cronometro';
import { SecaoDesfecho, useTituloDaFila } from '../componentes/FichaDeEtapa';
import { useRascunho } from '../hooks/useRascunho';
import { useI18n } from '../i18n';
import { lateralidades } from '../i18n/enums';

const LATERALIDADES: Lateralidade[] = ['NaoSeAplica', 'Direito', 'Esquerdo', 'Bilateral'];

interface FormCirurgia {
  indicacao: string;
  procedimentoProposto: string;
  lateralidade: Lateralidade;
  jejumHoras: string;
  consentimentoAssinado: boolean;
  observacoesPreOperatorio: string;

  checkInIdentidadeConfirmada: boolean;
  checkInSitioMarcado: boolean;
  checkInConsentimentoConferido: boolean;
  checkInAlergiaConferida: boolean;
  checkInJejumConferido: boolean;

  timeOutUmEquipeApresentada: boolean;
  timeOutUmMonitorizacaoOk: boolean;
  timeOutUmViaAereaAvaliada: boolean;
  timeOutUmRiscoSangramentoAvaliado: boolean;

  timeOutDoisPacienteSitioProcedimentoConfirmados: boolean;
  timeOutDoisAntibioticoProfilatico: boolean;
  timeOutDoisImagensDisponiveis: boolean;
  timeOutDoisEventosCriticosRevistos: boolean;
  timeOutDoisMaterialEsterilizado: boolean;

  checkOutProcedimentoRegistrado: boolean;
  checkOutContagemConfere: boolean;
  checkOutAmostrasIdentificadas: boolean;
  checkOutProblemasComEquipamento: boolean;
  checkOutCuidadosRecuperacao: string;

  recuperacaoEntrada: string;
  recuperacaoSaida: string;
  intercorrencias: string;
  observacoesRecuperacao: string;

  desfecho: DesfechoConsulta | null;
  encaminhadoPara: Especialidade | null;
}

const INICIAL: FormCirurgia = {
  indicacao: '',
  procedimentoProposto: '',
  lateralidade: 'NaoSeAplica',
  jejumHoras: '',
  consentimentoAssinado: false,
  observacoesPreOperatorio: '',

  checkInIdentidadeConfirmada: false,
  checkInSitioMarcado: false,
  checkInConsentimentoConferido: false,
  checkInAlergiaConferida: false,
  checkInJejumConferido: false,

  timeOutUmEquipeApresentada: false,
  timeOutUmMonitorizacaoOk: false,
  timeOutUmViaAereaAvaliada: false,
  timeOutUmRiscoSangramentoAvaliado: false,

  timeOutDoisPacienteSitioProcedimentoConfirmados: false,
  timeOutDoisAntibioticoProfilatico: false,
  timeOutDoisImagensDisponiveis: false,
  timeOutDoisEventosCriticosRevistos: false,
  timeOutDoisMaterialEsterilizado: false,

  checkOutProcedimentoRegistrado: false,
  checkOutContagemConfere: false,
  checkOutAmostrasIdentificadas: false,
  checkOutProblemasComEquipamento: false,
  checkOutCuidadosRecuperacao: '',

  recuperacaoEntrada: '',
  recuperacaoSaida: '',
  intercorrencias: '',
  observacoesRecuperacao: '',

  desfecho: null,
  encaminhadoPara: null,
};

/** O que a API gravou, trazido de volta para o formulário. */
function doServidor(c: FichaCirurgica): FormCirurgia {
  return {
    ...INICIAL,
    indicacao: c.indicacao ?? '',
    procedimentoProposto: c.procedimentoProposto ?? '',
    lateralidade: c.lateralidade,
    jejumHoras: c.jejumHoras === null ? '' : String(c.jejumHoras),
    consentimentoAssinado: c.consentimentoAssinado,
    observacoesPreOperatorio: c.observacoesPreOperatorio ?? '',

    checkInIdentidadeConfirmada: c.checkInIdentidadeConfirmada,
    checkInSitioMarcado: c.checkInSitioMarcado,
    checkInConsentimentoConferido: c.checkInConsentimentoConferido,
    checkInAlergiaConferida: c.checkInAlergiaConferida,
    checkInJejumConferido: c.checkInJejumConferido,

    timeOutUmEquipeApresentada: c.timeOutUmEquipeApresentada,
    timeOutUmMonitorizacaoOk: c.timeOutUmMonitorizacaoOk,
    timeOutUmViaAereaAvaliada: c.timeOutUmViaAereaAvaliada,
    timeOutUmRiscoSangramentoAvaliado: c.timeOutUmRiscoSangramentoAvaliado,

    timeOutDoisPacienteSitioProcedimentoConfirmados: c.timeOutDoisPacienteSitioProcedimentoConfirmados,
    timeOutDoisAntibioticoProfilatico: c.timeOutDoisAntibioticoProfilatico,
    timeOutDoisImagensDisponiveis: c.timeOutDoisImagensDisponiveis,
    timeOutDoisEventosCriticosRevistos: c.timeOutDoisEventosCriticosRevistos,
    timeOutDoisMaterialEsterilizado: c.timeOutDoisMaterialEsterilizado,

    checkOutProcedimentoRegistrado: c.checkOutProcedimentoRegistrado,
    checkOutContagemConfere: c.checkOutContagemConfere,
    checkOutAmostrasIdentificadas: c.checkOutAmostrasIdentificadas,
    checkOutProblemasComEquipamento: c.checkOutProblemasComEquipamento,
    checkOutCuidadosRecuperacao: c.checkOutCuidadosRecuperacao ?? '',

    recuperacaoEntrada: paraHoraLocal(c.recuperacaoEntradaEm),
    recuperacaoSaida: paraHoraLocal(c.recuperacaoSaidaEm),
    intercorrencias: c.intercorrencias ?? '',
    observacoesRecuperacao: c.observacoesRecuperacao ?? '',

    desfecho: null,
    encaminhadoPara: null,
  };
}

function paraHoraLocal(iso: string | null): string {
  if (!iso) return '';

  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** `HH:MM` de hoje em ISO; se a hora ainda não chegou, é de ontem. */
function horaParaIso(hora: string): string | null {
  if (!hora.trim()) return null;

  const [h, m] = hora.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;

  const quando = new Date();
  quando.setHours(h, m, 0, 0);

  if (quando.getTime() > Date.now()) {
    quando.setDate(quando.getDate() - 1);
  }

  return quando.toISOString();
}

function numeroOuNulo(texto: string): number | null {
  const limpo = texto.trim();
  if (limpo === '') return null;

  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Uma parada da lista de verificação, com a hora em que foi concluída.
 *
 * A hora é o ponto: a lista só vale se as paradas tiverem acontecido de fato e
 * em momentos distintos. Quatro carimbos no mesmo minuto contam a história de
 * uma lista preenchida de uma vez no fim.
 */
function Parada({
  titulo,
  concluidaEm,
  children,
}: {
  titulo: string;
  concluidaEm: string | null;
  children: React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <Secao titulo={titulo}>
      {concluidaEm ? (
        <Etiqueta tom="sucesso">
          {t('paradaConcluidaAs')}{' '}
          {new Date(concluidaEm).toLocaleTimeString(undefined, { timeStyle: 'short' })}
        </Etiqueta>
      ) : (
        <Etiqueta tom="neutro">{t('paradaPendente')}</Etiqueta>
      )}

      <div className="space-y-2">{children}</div>
    </Secao>
  );
}

/**
 * A ficha cirúrgica.
 *
 * Diferente das outras fichas em um ponto: é preenchida em quatro momentos —
 * antes de entrar na sala, antes da anestesia, antes da incisão e antes de sair
 * —, então salvar não fecha a fila nem tira a pessoa da tela. Quem fecha é o
 * desfecho, no fim.
 */
export function Cirurgia() {
  const { t, idioma } = useI18n();
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const titulo = useTituloDaFila('Cirurgia');

  const [prontuario, setProntuario] = useState<Prontuario | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const rascunho = useRascunho<FormCirurgia>(`cirurgia-${id}`, INICIAL);

  useEffect(() => {
    api
      .prontuario(id)
      .then((p) => {
        setProntuario(p);

        // O que a API já gravou tem precedência sobre o rascunho local: a ficha
        // passa por várias mãos, e o rascunho de quem fez o check-in não pode
        // sobrescrever o time out que outra pessoa registrou.
        if (p.cirurgia) rascunho.setValor(doServidor(p.cirurgia));
      })
      .catch((erro) => {
        setErros([erro instanceof ErroDeRede ? t('semConexao') : t('erroInesperado')]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, t]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErros([]);
    setSalvo(false);
    setEnviando(true);

    const form = rascunho.valor;

    try {
      await api.registrarCirurgia(id, {
        indicacao: form.indicacao.trim() || null,
        procedimentoProposto: form.procedimentoProposto.trim() || null,
        lateralidade: form.lateralidade,
        jejumHoras: numeroOuNulo(form.jejumHoras),
        consentimentoAssinado: form.consentimentoAssinado,
        observacoesPreOperatorio: form.observacoesPreOperatorio.trim() || null,

        checkInIdentidadeConfirmada: form.checkInIdentidadeConfirmada,
        checkInSitioMarcado: form.checkInSitioMarcado,
        checkInConsentimentoConferido: form.checkInConsentimentoConferido,
        checkInAlergiaConferida: form.checkInAlergiaConferida,
        checkInJejumConferido: form.checkInJejumConferido,

        timeOutUmEquipeApresentada: form.timeOutUmEquipeApresentada,
        timeOutUmMonitorizacaoOk: form.timeOutUmMonitorizacaoOk,
        timeOutUmViaAereaAvaliada: form.timeOutUmViaAereaAvaliada,
        timeOutUmRiscoSangramentoAvaliado: form.timeOutUmRiscoSangramentoAvaliado,

        timeOutDoisPacienteSitioProcedimentoConfirmados:
          form.timeOutDoisPacienteSitioProcedimentoConfirmados,
        timeOutDoisAntibioticoProfilatico: form.timeOutDoisAntibioticoProfilatico,
        timeOutDoisImagensDisponiveis: form.timeOutDoisImagensDisponiveis,
        timeOutDoisEventosCriticosRevistos: form.timeOutDoisEventosCriticosRevistos,
        timeOutDoisMaterialEsterilizado: form.timeOutDoisMaterialEsterilizado,

        checkOutProcedimentoRegistrado: form.checkOutProcedimentoRegistrado,
        checkOutContagemConfere: form.checkOutContagemConfere,
        checkOutAmostrasIdentificadas: form.checkOutAmostrasIdentificadas,
        checkOutProblemasComEquipamento: form.checkOutProblemasComEquipamento,
        checkOutCuidadosRecuperacao: form.checkOutCuidadosRecuperacao.trim() || null,

        recuperacaoEntradaEm: horaParaIso(form.recuperacaoEntrada),
        recuperacaoSaidaEm: horaParaIso(form.recuperacaoSaida),
        intercorrencias: form.intercorrencias.trim() || null,
        observacoesRecuperacao: form.observacoesRecuperacao.trim() || null,

        desfecho: form.desfecho,
        encaminhadoPara: form.encaminhadoPara,
      });

      // Com desfecho a fila fecha e a ficha está pronta; sem ele, a pessoa
      // continua aqui para a próxima parada.
      if (form.desfecho) {
        rascunho.limpar();
        navegar(`/atendimentos/${id}`, { replace: true });
        return;
      }

      const atualizado = await api.prontuario(id);
      setProntuario(atualizado);
      if (atualizado.cirurgia) rascunho.setValor(doServidor(atualizado.cirurgia));
      setSalvo(true);
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

  const form = rascunho.valor;
  const alterar = (mudanca: Partial<FormCirurgia>) => {
    setSalvo(false);
    rascunho.setValor({ ...form, ...mudanca });
  };

  const ficha = prontuario.cirurgia;
  const etapa = prontuario.etapas.find(
    (e) => e.especialidade === 'Cirurgia' && e.status !== 'Concluida' && e.status !== 'Cancelada',
  );

  return (
    <form onSubmit={enviar} className="mx-auto max-w-3xl space-y-4 px-4 py-5">
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

      <Secao titulo={t('preOperatorio')}>
        <Campo rotulo={t('indicacaoCirurgica')}>
          <textarea
            className="campo min-h-20"
            aria-label={t('indicacaoCirurgica')}
            value={form.indicacao}
            onChange={(e) => alterar({ indicacao: e.target.value })}
          />
        </Campo>

        <Campo rotulo={t('procedimentoProposto')}>
          <input
            className="campo"
            value={form.procedimentoProposto}
            onChange={(e) => alterar({ procedimentoProposto: e.target.value })}
          />
        </Campo>

        {/*
          Lado em campo próprio, e não dentro do texto do procedimento: cirurgia
          no lado errado é um dos erros que a lista existe para impedir, e
          "joelho D", "joelho dto" e "joelho direito" não conferem contra nada.
        */}
        <div>
          <span className="rotulo">{t('lateralidade')}</span>
          <Opcoes
            valor={form.lateralidade}
            opcoes={LATERALIDADES}
            aoEscolher={(lateralidade) => alterar({ lateralidade })}
            tabela={lateralidades}
            idioma={idioma}
          />
        </div>

        <Campo rotulo={t('jejumHoras')}>
          <input
            type="number"
            min={0}
            max={72}
            className="campo"
            value={form.jejumHoras}
            onChange={(e) => alterar({ jejumHoras: e.target.value })}
          />
        </Campo>

        <Interruptor
          rotulo={t('consentimentoAssinado')}
          valor={form.consentimentoAssinado}
          aoMudar={(consentimentoAssinado) => alterar({ consentimentoAssinado })}
        />

        <Campo rotulo={t('observacoes')}>
          <textarea
            className="campo min-h-20"
            value={form.observacoesPreOperatorio}
            onChange={(e) => alterar({ observacoesPreOperatorio: e.target.value })}
          />
        </Campo>
      </Secao>

      <Parada titulo={t('checkIn')} concluidaEm={ficha?.checkInEm ?? null}>
        <Interruptor
          rotulo={t('checkInIdentidade')}
          valor={form.checkInIdentidadeConfirmada}
          aoMudar={(checkInIdentidadeConfirmada) => alterar({ checkInIdentidadeConfirmada })}
        />
        <Interruptor
          rotulo={t('checkInSitio')}
          valor={form.checkInSitioMarcado}
          aoMudar={(checkInSitioMarcado) => alterar({ checkInSitioMarcado })}
        />
        <Interruptor
          rotulo={t('checkInConsentimento')}
          valor={form.checkInConsentimentoConferido}
          aoMudar={(checkInConsentimentoConferido) => alterar({ checkInConsentimentoConferido })}
        />
        <Interruptor
          rotulo={t('checkInAlergia')}
          valor={form.checkInAlergiaConferida}
          aoMudar={(checkInAlergiaConferida) => alterar({ checkInAlergiaConferida })}
        />
        <Interruptor
          rotulo={t('checkInJejum')}
          valor={form.checkInJejumConferido}
          aoMudar={(checkInJejumConferido) => alterar({ checkInJejumConferido })}
        />
      </Parada>

      <Parada titulo={t('timeOutUm')} concluidaEm={ficha?.timeOutUmEm ?? null}>
        <Interruptor
          rotulo={t('timeOutUmEquipe')}
          valor={form.timeOutUmEquipeApresentada}
          aoMudar={(timeOutUmEquipeApresentada) => alterar({ timeOutUmEquipeApresentada })}
        />
        <Interruptor
          rotulo={t('timeOutUmMonitorizacao')}
          valor={form.timeOutUmMonitorizacaoOk}
          aoMudar={(timeOutUmMonitorizacaoOk) => alterar({ timeOutUmMonitorizacaoOk })}
        />
        <Interruptor
          rotulo={t('timeOutUmViaAerea')}
          valor={form.timeOutUmViaAereaAvaliada}
          aoMudar={(timeOutUmViaAereaAvaliada) => alterar({ timeOutUmViaAereaAvaliada })}
        />
        <Interruptor
          rotulo={t('timeOutUmSangramento')}
          valor={form.timeOutUmRiscoSangramentoAvaliado}
          aoMudar={(timeOutUmRiscoSangramentoAvaliado) =>
            alterar({ timeOutUmRiscoSangramentoAvaliado })
          }
        />
      </Parada>

      <Parada titulo={t('timeOutDois')} concluidaEm={ficha?.timeOutDoisEm ?? null}>
        <Interruptor
          rotulo={t('timeOutDoisConfirmacao')}
          valor={form.timeOutDoisPacienteSitioProcedimentoConfirmados}
          aoMudar={(timeOutDoisPacienteSitioProcedimentoConfirmados) =>
            alterar({ timeOutDoisPacienteSitioProcedimentoConfirmados })
          }
        />
        <Interruptor
          rotulo={t('timeOutDoisAntibiotico')}
          valor={form.timeOutDoisAntibioticoProfilatico}
          aoMudar={(timeOutDoisAntibioticoProfilatico) =>
            alterar({ timeOutDoisAntibioticoProfilatico })
          }
        />
        <Interruptor
          rotulo={t('timeOutDoisImagens')}
          valor={form.timeOutDoisImagensDisponiveis}
          aoMudar={(timeOutDoisImagensDisponiveis) => alterar({ timeOutDoisImagensDisponiveis })}
        />
        <Interruptor
          rotulo={t('timeOutDoisEventosCriticos')}
          valor={form.timeOutDoisEventosCriticosRevistos}
          aoMudar={(timeOutDoisEventosCriticosRevistos) =>
            alterar({ timeOutDoisEventosCriticosRevistos })
          }
        />
        <Interruptor
          rotulo={t('timeOutDoisEsterilizacao')}
          valor={form.timeOutDoisMaterialEsterilizado}
          aoMudar={(timeOutDoisMaterialEsterilizado) => alterar({ timeOutDoisMaterialEsterilizado })}
        />
      </Parada>

      <Parada titulo={t('checkOut')} concluidaEm={ficha?.checkOutEm ?? null}>
        <Interruptor
          rotulo={t('checkOutProcedimento')}
          valor={form.checkOutProcedimentoRegistrado}
          aoMudar={(checkOutProcedimentoRegistrado) => alterar({ checkOutProcedimentoRegistrado })}
        />
        <Interruptor
          rotulo={t('checkOutContagem')}
          valor={form.checkOutContagemConfere}
          aoMudar={(checkOutContagemConfere) => alterar({ checkOutContagemConfere })}
        />
        <Interruptor
          rotulo={t('checkOutAmostras')}
          valor={form.checkOutAmostrasIdentificadas}
          aoMudar={(checkOutAmostrasIdentificadas) => alterar({ checkOutAmostrasIdentificadas })}
        />

        {/*
          Marcado significa que houve problema — é o único item da lista cuja
          marca é má notícia, e por isso ele não entra na conta da parada
          concluída.
        */}
        <Interruptor
          rotulo={t('checkOutProblemaEquipamento')}
          valor={form.checkOutProblemasComEquipamento}
          aoMudar={(checkOutProblemasComEquipamento) => alterar({ checkOutProblemasComEquipamento })}
        />

        <Campo rotulo={t('cuidadosRecuperacao')}>
          <textarea
            className="campo min-h-20"
            value={form.checkOutCuidadosRecuperacao}
            onChange={(e) => alterar({ checkOutCuidadosRecuperacao: e.target.value })}
          />
        </Campo>
      </Parada>

      <Secao titulo={t('recuperacao')}>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo={t('entradaRecuperacao')}>
            <input
              type="time"
              className="campo"
              value={form.recuperacaoEntrada}
              onChange={(e) => alterar({ recuperacaoEntrada: e.target.value })}
            />
          </Campo>
          <Campo rotulo={t('saidaRecuperacao')}>
            <input
              type="time"
              className="campo"
              value={form.recuperacaoSaida}
              onChange={(e) => alterar({ recuperacaoSaida: e.target.value })}
            />
          </Campo>
        </div>

        <Campo rotulo={t('intercorrencias')}>
          <textarea
            className="campo min-h-20"
            aria-label={t('intercorrencias')}
            value={form.intercorrencias}
            onChange={(e) => alterar({ intercorrencias: e.target.value })}
          />
        </Campo>

        <Campo rotulo={t('observacoes')}>
          <textarea
            className="campo min-h-20"
            value={form.observacoesRecuperacao}
            onChange={(e) => alterar({ observacoesRecuperacao: e.target.value })}
          />
        </Campo>
      </Secao>

      {/*
        O desfecho é o que fecha a fila. Sem ele, salvar só guarda a parada e
        deixa a pessoa aqui para a próxima.
      */}
      <SecaoDesfecho
        valor={form.desfecho}
        destino={form.encaminhadoPara}
        aoEscolher={(desfecho) => alterar({ desfecho })}
        aoEscolherDestino={(encaminhadoPara) => alterar({ encaminhadoPara })}
      />

      <Erros erros={erros} />

      {salvo ? <Etiqueta tom="sucesso">{t('paradaSalva')}</Etiqueta> : null}

      <button type="submit" className="botao" disabled={enviando}>
        {enviando ? t('carregando') : form.desfecho ? t('salvarEEncerrar') : t('salvarParada')}
      </button>
    </form>
  );
}
