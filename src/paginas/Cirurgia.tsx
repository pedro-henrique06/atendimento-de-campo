import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type {
  Cirurgia as FichaCirurgica,
  DesfechoConsulta,
  DestinoPosOperatorio,
  Especialidade,
  Lateralidade,
  NivelConsciencia,
  PosicionamentoCirurgico,
  Prontuario,
  SuporteOxigenio,
  TipoAnestesia,
} from '../api/tipos';
import {
  DESTINOS_POS_OPERATORIO,
  NIVEIS_CONSCIENCIA,
  POSICIONAMENTOS,
  SUPORTES_OXIGENIO,
  TIPOS_ANESTESIA,
} from '../api/tipos';
import {
  AlertaAlergia,
  Campo,
  Carregando,
  Erros,
  Etiqueta,
  Grupo,
  Interruptor,
  Multiplas,
  Opcoes,
  RodapeDeSalvar,
  Secao,
} from '../componentes/Basicos';
import { BarraDaPagina } from '../componentes/BarraDaPagina';
import { Cronometro } from '../componentes/Cronometro';
import { Encerramento } from '../componentes/Encerramento';
import { SecaoDesfecho, useTituloDaFila } from '../componentes/FichaDeEtapa';
import { useRascunho } from '../hooks/useRascunho';
import { useI18n } from '../i18n';
import {
  destinosPosOperatorio,
  lateralidades,
  niveisConsciencia,
  posicionamentos,
  suportesOxigenio,
  tiposAnestesia,
} from '../i18n/enums';

const LATERALIDADES: Lateralidade[] = ['NaoSeAplica', 'Direito', 'Esquerdo', 'Bilateral'];

interface FormCirurgia {
  indicacao: string;
  procedimentoProposto: string;
  lateralidade: Lateralidade;
  jejumHoras: string;
  consentimentoAssinado: boolean;
  observacoesPreOperatorio: string;

  preparoCuidadosEnfermagem: string;
  preparoTricotomia: boolean;
  preparoTricotomiaLocal: string;
  preparoBanhoClorexidine: boolean;
  preparoPulseiraIdentificacao: boolean;
  preOpEcg: boolean;
  preOpLaboratorial: boolean;
  preOpUltrassom: boolean;
  preOpExamesObservacao: string;
  preOpAvaliacaoAnestesica: boolean;
  pertencesProteseDentaria: boolean;
  pertencesRoupasAcessorios: boolean;
  pertencesDestino: string;
  encaminhadoAoCentro: string;
  chegadaAoCentro: string;

  checkInIdentidadeConfirmada: boolean;
  checkInSitioMarcado: boolean;
  checkInConsentimentoConferido: boolean;
  checkInAlergiaConferida: boolean;
  checkInJejumConferido: boolean;

  timeOutUmEquipeApresentada: boolean;
  timeOutUmMonitorizacaoOk: boolean;
  timeOutUmViaAereaAvaliada: boolean;
  timeOutUmRiscoSangramentoAvaliado: boolean;
  timeOutUmExamesEmSala: boolean;
  timeOutUmVerificacaoAnestesica: boolean;
  timeOutUmViaAereaDificil: boolean;

  timeOutDoisPacienteSitioProcedimentoConfirmados: boolean;
  timeOutDoisAntibioticoProfilatico: boolean;
  timeOutDoisAntibioticoQual: string;
  timeOutDoisImagensDisponiveis: boolean;
  timeOutDoisEventosCriticosRevistos: boolean;
  timeOutDoisMaterialEsterilizado: boolean;
  timeOutDoisPrevisaoBiopsia: boolean;
  timeOutDoisTempoPrevisto: string;
  timeOutDoisInstrumentalIntegrador: boolean;

  anestesia: TipoAnestesia[];
  anestesiaLocal: string;
  posicionamento: PosicionamentoCirurgico | null;
  placaBisturi: boolean;
  placaBisturiLocal: string;
  preparoDaPele: string;
  antissepsia: string;
  incisaoCirurgica: string;
  curativo: string;
  medicacoesRealizadas: string;
  gazesUtilizadas: string;
  compressasUtilizadas: string;
  evolucaoMedica: string;
  evolucaoEnfermagem: string;

  checkOutProcedimentoRegistrado: boolean;
  checkOutContagemConfere: boolean;
  checkOutAmostrasIdentificadas: boolean;
  checkOutBiopsiaQuantidade: string;
  checkOutProblemasComEquipamento: boolean;
  checkOutCuidadosRecuperacao: string;

  destinoPosOperatorio: DestinoPosOperatorio | null;
  recuperacaoEntrada: string;
  recuperacaoSaida: string;
  intercorrencias: string;
  observacoesRecuperacao: string;
  recuperacaoNivelConsciencia: NivelConsciencia | null;
  recuperacaoSuporteOxigenio: SuporteOxigenio | null;
  recuperacaoOxigenioDetalhe: string;
  recuperacaoAcessoVenosoPeriferico: boolean;
  recuperacaoAcessoVenosoDescricao: string;
  recuperacaoIntervencaoIntensiva: boolean;
  recuperacaoCateterVenosoCentral: boolean;
  recuperacaoCateterVenosoCentralLocal: string;
  recuperacaoDrogasVasoativas: string;
  recuperacaoInfusoes: string;
  recuperacaoDreno: boolean;
  recuperacaoDrenoDescricao: string;
  recuperacaoSondaVesical: boolean;
  recuperacaoSondaNasogastrica: boolean;
  recuperacaoOutroDispositivo: string;
  recuperacaoEvolucaoMedica: string;
  recuperacaoEvolucaoEnfermagem: string;
  pertencesDevolvidos: boolean;
  recuperacaoDieta: string;

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

  preparoCuidadosEnfermagem: '',
  preparoTricotomia: false,
  preparoTricotomiaLocal: '',
  preparoBanhoClorexidine: false,
  preparoPulseiraIdentificacao: false,
  preOpEcg: false,
  preOpLaboratorial: false,
  preOpUltrassom: false,
  preOpExamesObservacao: '',
  preOpAvaliacaoAnestesica: false,
  pertencesProteseDentaria: false,
  pertencesRoupasAcessorios: false,
  pertencesDestino: '',
  encaminhadoAoCentro: '',
  chegadaAoCentro: '',

  checkInIdentidadeConfirmada: false,
  checkInSitioMarcado: false,
  checkInConsentimentoConferido: false,
  checkInAlergiaConferida: false,
  checkInJejumConferido: false,

  timeOutUmEquipeApresentada: false,
  timeOutUmMonitorizacaoOk: false,
  timeOutUmViaAereaAvaliada: false,
  timeOutUmRiscoSangramentoAvaliado: false,
  timeOutUmExamesEmSala: false,
  timeOutUmVerificacaoAnestesica: false,
  timeOutUmViaAereaDificil: false,

  timeOutDoisPacienteSitioProcedimentoConfirmados: false,
  timeOutDoisAntibioticoProfilatico: false,
  timeOutDoisAntibioticoQual: '',
  timeOutDoisImagensDisponiveis: false,
  timeOutDoisEventosCriticosRevistos: false,
  timeOutDoisMaterialEsterilizado: false,
  timeOutDoisPrevisaoBiopsia: false,
  timeOutDoisTempoPrevisto: '',
  timeOutDoisInstrumentalIntegrador: false,

  anestesia: [],
  anestesiaLocal: '',
  posicionamento: null,
  placaBisturi: false,
  placaBisturiLocal: '',
  preparoDaPele: '',
  antissepsia: '',
  incisaoCirurgica: '',
  curativo: '',
  medicacoesRealizadas: '',
  gazesUtilizadas: '',
  compressasUtilizadas: '',
  evolucaoMedica: '',
  evolucaoEnfermagem: '',

  checkOutProcedimentoRegistrado: false,
  checkOutContagemConfere: false,
  checkOutAmostrasIdentificadas: false,
  checkOutBiopsiaQuantidade: '',
  checkOutProblemasComEquipamento: false,
  checkOutCuidadosRecuperacao: '',

  destinoPosOperatorio: null,
  recuperacaoEntrada: '',
  recuperacaoSaida: '',
  intercorrencias: '',
  observacoesRecuperacao: '',
  recuperacaoNivelConsciencia: null,
  recuperacaoSuporteOxigenio: null,
  recuperacaoOxigenioDetalhe: '',
  recuperacaoAcessoVenosoPeriferico: false,
  recuperacaoAcessoVenosoDescricao: '',
  recuperacaoIntervencaoIntensiva: false,
  recuperacaoCateterVenosoCentral: false,
  recuperacaoCateterVenosoCentralLocal: '',
  recuperacaoDrogasVasoativas: '',
  recuperacaoInfusoes: '',
  recuperacaoDreno: false,
  recuperacaoDrenoDescricao: '',
  recuperacaoSondaVesical: false,
  recuperacaoSondaNasogastrica: false,
  recuperacaoOutroDispositivo: '',
  recuperacaoEvolucaoMedica: '',
  recuperacaoEvolucaoEnfermagem: '',
  pertencesDevolvidos: false,
  recuperacaoDieta: '',

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

    preparoCuidadosEnfermagem: c.preparoCuidadosEnfermagem ?? '',
    preparoTricotomia: c.preparoTricotomia,
    preparoTricotomiaLocal: c.preparoTricotomiaLocal ?? '',
    preparoBanhoClorexidine: c.preparoBanhoClorexidine,
    preparoPulseiraIdentificacao: c.preparoPulseiraIdentificacao,
    preOpEcg: c.preOpEcg,
    preOpLaboratorial: c.preOpLaboratorial,
    preOpUltrassom: c.preOpUltrassom,
    preOpExamesObservacao: c.preOpExamesObservacao ?? '',
    preOpAvaliacaoAnestesica: c.preOpAvaliacaoAnestesica,
    pertencesProteseDentaria: c.pertencesProteseDentaria,
    pertencesRoupasAcessorios: c.pertencesRoupasAcessorios,
    pertencesDestino: c.pertencesDestino ?? '',
    encaminhadoAoCentro: paraHoraLocal(c.encaminhadoAoCentroEm),
    chegadaAoCentro: paraHoraLocal(c.chegadaAoCentroEm),

    checkInIdentidadeConfirmada: c.checkInIdentidadeConfirmada,
    checkInSitioMarcado: c.checkInSitioMarcado,
    checkInConsentimentoConferido: c.checkInConsentimentoConferido,
    checkInAlergiaConferida: c.checkInAlergiaConferida,
    checkInJejumConferido: c.checkInJejumConferido,

    timeOutUmEquipeApresentada: c.timeOutUmEquipeApresentada,
    timeOutUmMonitorizacaoOk: c.timeOutUmMonitorizacaoOk,
    timeOutUmViaAereaAvaliada: c.timeOutUmViaAereaAvaliada,
    timeOutUmRiscoSangramentoAvaliado: c.timeOutUmRiscoSangramentoAvaliado,
    timeOutUmExamesEmSala: c.timeOutUmExamesEmSala,
    timeOutUmVerificacaoAnestesica: c.timeOutUmVerificacaoAnestesica,
    timeOutUmViaAereaDificil: c.timeOutUmViaAereaDificil,

    timeOutDoisPacienteSitioProcedimentoConfirmados: c.timeOutDoisPacienteSitioProcedimentoConfirmados,
    timeOutDoisAntibioticoProfilatico: c.timeOutDoisAntibioticoProfilatico,
    timeOutDoisAntibioticoQual: c.timeOutDoisAntibioticoQual ?? '',
    timeOutDoisImagensDisponiveis: c.timeOutDoisImagensDisponiveis,
    timeOutDoisEventosCriticosRevistos: c.timeOutDoisEventosCriticosRevistos,
    timeOutDoisMaterialEsterilizado: c.timeOutDoisMaterialEsterilizado,
    timeOutDoisPrevisaoBiopsia: c.timeOutDoisPrevisaoBiopsia,
    timeOutDoisTempoPrevisto:
      c.timeOutDoisTempoPrevistoMinutos === null ? '' : String(c.timeOutDoisTempoPrevistoMinutos),
    timeOutDoisInstrumentalIntegrador: c.timeOutDoisInstrumentalIntegrador,

    anestesia: c.anestesia,
    anestesiaLocal: c.anestesiaLocal ?? '',
    posicionamento: c.posicionamento,
    placaBisturi: c.placaBisturi,
    placaBisturiLocal: c.placaBisturiLocal ?? '',
    preparoDaPele: c.preparoDaPele ?? '',
    antissepsia: c.antissepsia ?? '',
    incisaoCirurgica: c.incisaoCirurgica ?? '',
    curativo: c.curativo ?? '',
    medicacoesRealizadas: c.medicacoesRealizadas ?? '',
    gazesUtilizadas: c.gazesUtilizadas === null ? '' : String(c.gazesUtilizadas),
    compressasUtilizadas: c.compressasUtilizadas === null ? '' : String(c.compressasUtilizadas),
    evolucaoMedica: c.evolucaoMedica ?? '',
    evolucaoEnfermagem: c.evolucaoEnfermagem ?? '',

    checkOutProcedimentoRegistrado: c.checkOutProcedimentoRegistrado,
    checkOutContagemConfere: c.checkOutContagemConfere,
    checkOutAmostrasIdentificadas: c.checkOutAmostrasIdentificadas,
    checkOutBiopsiaQuantidade:
      c.checkOutBiopsiaQuantidade === null ? '' : String(c.checkOutBiopsiaQuantidade),
    checkOutProblemasComEquipamento: c.checkOutProblemasComEquipamento,
    checkOutCuidadosRecuperacao: c.checkOutCuidadosRecuperacao ?? '',

    destinoPosOperatorio: c.destinoPosOperatorio,
    recuperacaoEntrada: paraHoraLocal(c.recuperacaoEntradaEm),
    recuperacaoSaida: paraHoraLocal(c.recuperacaoSaidaEm),
    intercorrencias: c.intercorrencias ?? '',
    observacoesRecuperacao: c.observacoesRecuperacao ?? '',
    recuperacaoNivelConsciencia: c.recuperacaoNivelConsciencia,
    recuperacaoSuporteOxigenio: c.recuperacaoSuporteOxigenio,
    recuperacaoOxigenioDetalhe: c.recuperacaoOxigenioDetalhe ?? '',
    recuperacaoAcessoVenosoPeriferico: c.recuperacaoAcessoVenosoPeriferico,
    recuperacaoAcessoVenosoDescricao: c.recuperacaoAcessoVenosoDescricao ?? '',
    recuperacaoIntervencaoIntensiva: c.recuperacaoIntervencaoIntensiva,
    recuperacaoCateterVenosoCentral: c.recuperacaoCateterVenosoCentral,
    recuperacaoCateterVenosoCentralLocal: c.recuperacaoCateterVenosoCentralLocal ?? '',
    recuperacaoDrogasVasoativas: c.recuperacaoDrogasVasoativas ?? '',
    recuperacaoInfusoes: c.recuperacaoInfusoes ?? '',
    recuperacaoDreno: c.recuperacaoDreno,
    recuperacaoDrenoDescricao: c.recuperacaoDrenoDescricao ?? '',
    recuperacaoSondaVesical: c.recuperacaoSondaVesical,
    recuperacaoSondaNasogastrica: c.recuperacaoSondaNasogastrica,
    recuperacaoOutroDispositivo: c.recuperacaoOutroDispositivo ?? '',
    recuperacaoEvolucaoMedica: c.recuperacaoEvolucaoMedica ?? '',
    recuperacaoEvolucaoEnfermagem: c.recuperacaoEvolucaoEnfermagem ?? '',
    pertencesDevolvidos: c.pertencesDevolvidos,
    recuperacaoDieta: c.recuperacaoDieta ?? '',

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

  /**
   * Grava a ficha cirúrgica, sem sair da tela.
   *
   * Separado do submit porque a alta também grava: ela encerra o atendimento
   * inteiro, e a lista de verificação é o registro do que a justificou.
   */
  async function salvar() {
    const form = rascunho.valor;

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
      timeOutUmExamesEmSala: form.timeOutUmExamesEmSala,
      timeOutUmVerificacaoAnestesica: form.timeOutUmVerificacaoAnestesica,
      timeOutUmViaAereaDificil: form.timeOutUmViaAereaDificil,

      timeOutDoisPacienteSitioProcedimentoConfirmados:
        form.timeOutDoisPacienteSitioProcedimentoConfirmados,
      timeOutDoisAntibioticoProfilatico: form.timeOutDoisAntibioticoProfilatico,
      timeOutDoisAntibioticoQual: form.timeOutDoisAntibioticoQual.trim() || null,
      timeOutDoisImagensDisponiveis: form.timeOutDoisImagensDisponiveis,
      timeOutDoisEventosCriticosRevistos: form.timeOutDoisEventosCriticosRevistos,
      timeOutDoisMaterialEsterilizado: form.timeOutDoisMaterialEsterilizado,
      timeOutDoisPrevisaoBiopsia: form.timeOutDoisPrevisaoBiopsia,
      timeOutDoisTempoPrevistoMinutos: numeroOuNulo(form.timeOutDoisTempoPrevisto),
      timeOutDoisInstrumentalIntegrador: form.timeOutDoisInstrumentalIntegrador,

      anestesia: form.anestesia,
      anestesiaLocal: form.anestesiaLocal.trim() || null,
      posicionamento: form.posicionamento,
      placaBisturi: form.placaBisturi,
      placaBisturiLocal: form.placaBisturiLocal.trim() || null,
      preparoDaPele: form.preparoDaPele.trim() || null,
      antissepsia: form.antissepsia.trim() || null,
      incisaoCirurgica: form.incisaoCirurgica.trim() || null,
      curativo: form.curativo.trim() || null,
      medicacoesRealizadas: form.medicacoesRealizadas.trim() || null,
      gazesUtilizadas: numeroOuNulo(form.gazesUtilizadas),
      compressasUtilizadas: numeroOuNulo(form.compressasUtilizadas),
      evolucaoMedica: form.evolucaoMedica.trim() || null,
      evolucaoEnfermagem: form.evolucaoEnfermagem.trim() || null,

      checkOutProcedimentoRegistrado: form.checkOutProcedimentoRegistrado,
      checkOutContagemConfere: form.checkOutContagemConfere,
      checkOutAmostrasIdentificadas: form.checkOutAmostrasIdentificadas,
      checkOutBiopsiaQuantidade: numeroOuNulo(form.checkOutBiopsiaQuantidade),
      checkOutProblemasComEquipamento: form.checkOutProblemasComEquipamento,
      checkOutCuidadosRecuperacao: form.checkOutCuidadosRecuperacao.trim() || null,

      preparoCuidadosEnfermagem: form.preparoCuidadosEnfermagem.trim() || null,
      preparoTricotomia: form.preparoTricotomia,
      preparoTricotomiaLocal: form.preparoTricotomiaLocal.trim() || null,
      preparoBanhoClorexidine: form.preparoBanhoClorexidine,
      preparoPulseiraIdentificacao: form.preparoPulseiraIdentificacao,
      preOpEcg: form.preOpEcg,
      preOpLaboratorial: form.preOpLaboratorial,
      preOpUltrassom: form.preOpUltrassom,
      preOpExamesObservacao: form.preOpExamesObservacao.trim() || null,
      preOpAvaliacaoAnestesica: form.preOpAvaliacaoAnestesica,
      pertencesProteseDentaria: form.pertencesProteseDentaria,
      pertencesRoupasAcessorios: form.pertencesRoupasAcessorios,
      pertencesDestino: form.pertencesDestino.trim() || null,
      encaminhadoAoCentroEm: horaParaIso(form.encaminhadoAoCentro),
      chegadaAoCentroEm: horaParaIso(form.chegadaAoCentro),

      destinoPosOperatorio: form.destinoPosOperatorio,
      recuperacaoEntradaEm: horaParaIso(form.recuperacaoEntrada),
      recuperacaoSaidaEm: horaParaIso(form.recuperacaoSaida),
      intercorrencias: form.intercorrencias.trim() || null,
      observacoesRecuperacao: form.observacoesRecuperacao.trim() || null,
      recuperacaoNivelConsciencia: form.recuperacaoNivelConsciencia,
      recuperacaoSuporteOxigenio: form.recuperacaoSuporteOxigenio,
      recuperacaoOxigenioDetalhe: form.recuperacaoOxigenioDetalhe.trim() || null,
      recuperacaoAcessoVenosoPeriferico: form.recuperacaoAcessoVenosoPeriferico,
      recuperacaoAcessoVenosoDescricao: form.recuperacaoAcessoVenosoDescricao.trim() || null,
      recuperacaoIntervencaoIntensiva: form.recuperacaoIntervencaoIntensiva,
      recuperacaoCateterVenosoCentral: form.recuperacaoCateterVenosoCentral,
      recuperacaoCateterVenosoCentralLocal:
        form.recuperacaoCateterVenosoCentralLocal.trim() || null,
      recuperacaoDrogasVasoativas: form.recuperacaoDrogasVasoativas.trim() || null,
      recuperacaoInfusoes: form.recuperacaoInfusoes.trim() || null,
      recuperacaoDreno: form.recuperacaoDreno,
      recuperacaoDrenoDescricao: form.recuperacaoDrenoDescricao.trim() || null,
      recuperacaoSondaVesical: form.recuperacaoSondaVesical,
      recuperacaoSondaNasogastrica: form.recuperacaoSondaNasogastrica,
      recuperacaoOutroDispositivo: form.recuperacaoOutroDispositivo.trim() || null,
      recuperacaoEvolucaoMedica: form.recuperacaoEvolucaoMedica.trim() || null,
      recuperacaoEvolucaoEnfermagem: form.recuperacaoEvolucaoEnfermagem.trim() || null,
      pertencesDevolvidos: form.pertencesDevolvidos,
      recuperacaoDieta: form.recuperacaoDieta.trim() || null,

      desfecho: form.desfecho,
      encaminhadoPara: form.encaminhadoPara,
    });

    // Com desfecho a fila fecha e a ficha está pronta; sem ele, a pessoa
    // continua aqui para a próxima parada.
    if (form.desfecho) {
      rascunho.limpar();
      return true;
    }

    const atualizado = await api.prontuario(id);
    setProntuario(atualizado);
    if (atualizado.cirurgia) rascunho.setValor(doServidor(atualizado.cirurgia));
    setSalvo(true);
    return false;
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErros([]);
    setSalvo(false);
    setEnviando(true);

    try {
      if (await salvar()) navegar(`/atendimentos/${id}`, { replace: true });
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
      <BarraDaPagina titulo={titulo} voltarPara={`/atendimentos/${id}`} />

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
        <Grupo rotulo={t('lateralidade')}>
          <Opcoes
            valor={form.lateralidade}
            opcoes={LATERALIDADES}
            aoEscolher={(lateralidade) => alterar({ lateralidade })}
            tabela={lateralidades}
            idioma={idioma}
          />
        </Grupo>

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

      {/*
        O preparo da enfermagem é seção própria, antes do check-in.

        Não é a mesma coisa que a primeira parada da lista: o check-in acontece
        na porta da sala e é conferência da equipe cirúrgica. Aqui é o que se
        faz com o paciente ainda na enfermaria — tricotomia, banho, pulseira —
        e o que se tira dele. Misturados, o preparo entraria no carimbo da
        parada e a lista passaria a marcar uma hora que não é a dela.
      */}
      <Secao titulo={t('preparoEnfermagem')}>
        <Interruptor
          rotulo={t('preparoTricotomia')}
          valor={form.preparoTricotomia}
          aoMudar={(preparoTricotomia) => alterar({ preparoTricotomia })}
        />

        {/* Só depois do sim: perguntar onde foi feito o que não foi feito é
            linha vazia em toda ficha. */}
        {form.preparoTricotomia ? (
          <Campo rotulo={t('preparoTricotomiaLocal')}>
            <input
              className="campo"
              value={form.preparoTricotomiaLocal}
              onChange={(e) => alterar({ preparoTricotomiaLocal: e.target.value })}
            />
          </Campo>
        ) : null}

        <Interruptor
          rotulo={t('preparoBanhoClorexidine')}
          valor={form.preparoBanhoClorexidine}
          aoMudar={(preparoBanhoClorexidine) => alterar({ preparoBanhoClorexidine })}
        />
        <Interruptor
          rotulo={t('preparoPulseira')}
          valor={form.preparoPulseiraIdentificacao}
          aoMudar={(preparoPulseiraIdentificacao) => alterar({ preparoPulseiraIdentificacao })}
        />

        <Campo rotulo={t('preparoCuidados')}>
          <textarea
            className="campo min-h-20"
            value={form.preparoCuidadosEnfermagem}
            onChange={(e) => alterar({ preparoCuidadosEnfermagem: e.target.value })}
          />
        </Campo>
      </Secao>

      <Secao titulo={t('conferenciasPreOperatorias')}>
        <Interruptor
          rotulo={t('preOpEcg')}
          valor={form.preOpEcg}
          aoMudar={(preOpEcg) => alterar({ preOpEcg })}
        />
        <Interruptor
          rotulo={t('preOpLaboratorial')}
          valor={form.preOpLaboratorial}
          aoMudar={(preOpLaboratorial) => alterar({ preOpLaboratorial })}
        />
        <Interruptor
          rotulo={t('preOpUltrassom')}
          valor={form.preOpUltrassom}
          aoMudar={(preOpUltrassom) => alterar({ preOpUltrassom })}
        />
        <Interruptor
          rotulo={t('preOpAvaliacaoAnestesica')}
          valor={form.preOpAvaliacaoAnestesica}
          aoMudar={(preOpAvaliacaoAnestesica) => alterar({ preOpAvaliacaoAnestesica })}
        />

        <Campo rotulo={t('preOpExamesObservacao')}>
          <input
            className="campo"
            value={form.preOpExamesObservacao}
            onChange={(e) => alterar({ preOpExamesObservacao: e.target.value })}
          />
        </Campo>
      </Secao>

      <Secao titulo={t('pertencesDoPaciente')}>
        <Interruptor
          rotulo={t('pertencesProtese')}
          valor={form.pertencesProteseDentaria}
          aoMudar={(pertencesProteseDentaria) => alterar({ pertencesProteseDentaria })}
        />
        <Interruptor
          rotulo={t('pertencesRoupas')}
          valor={form.pertencesRoupasAcessorios}
          aoMudar={(pertencesRoupasAcessorios) => alterar({ pertencesRoupasAcessorios })}
        />

        <Campo rotulo={t('pertencesDestino')} dica={t('dicaPertencesDestino')}>
          <input
            className="campo"
            value={form.pertencesDestino}
            onChange={(e) => alterar({ pertencesDestino: e.target.value })}
          />
        </Campo>

        <Campo rotulo={t('encaminhadoAoCentro')}>
          <input
            type="time"
            className="campo"
            value={form.encaminhadoAoCentro}
            onChange={(e) => alterar({ encaminhadoAoCentro: e.target.value })}
          />
        </Campo>
      </Secao>

      <Parada titulo={t('checkIn')} concluidaEm={ficha?.checkInEm ?? null}>
        {/*
          A chegada abre a parada, como no papel. É o par da hora em que a maca
          saiu: a distância entre as duas é paciente em jejum num corredor, e é
          a única forma de ver que houve espera.
        */}
        <Campo rotulo={t('chegadaAoCentro')}>
          <input
            type="time"
            className="campo"
            value={form.chegadaAoCentro}
            onChange={(e) => alterar({ chegadaAoCentro: e.target.value })}
          />
        </Campo>

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
        <Interruptor
          rotulo={t('timeOutUmExamesEmSala')}
          valor={form.timeOutUmExamesEmSala}
          aoMudar={(timeOutUmExamesEmSala) => alterar({ timeOutUmExamesEmSala })}
        />

        {/*
          A conferência do carrinho, separada da avaliação do paciente: uma é
          sobre a via aérea dele, a outra sobre o material. Numa caixa só, a
          equipe confere uma e assina as duas.
        */}
        <Interruptor
          rotulo={t('timeOutUmVerificacaoAnestesica')}
          dica={t('dicaVerificacaoAnestesica')}
          valor={form.timeOutUmVerificacaoAnestesica}
          aoMudar={(timeOutUmVerificacaoAnestesica) => alterar({ timeOutUmVerificacaoAnestesica })}
        />

        {/*
          Achado, e não conferência — por isso fica separado, abaixo da linha.
          Dentro da lista, "via aérea difícil" leria como mais uma caixa a
          marcar, e exigi-la para carimbar a parada obrigaria a equipe a
          declarar uma via aérea difícil que o paciente não tem.
        */}
        <div className="border-t border-borda pt-2">
          <Interruptor
            rotulo={t('timeOutUmViaAereaDificil')}
            valor={form.timeOutUmViaAereaDificil}
            aoMudar={(timeOutUmViaAereaDificil) => alterar({ timeOutUmViaAereaDificil })}
          />
        </div>
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

        {/*
          Qual, só depois do sim. A caixa sozinha não responde o que o
          pós-operatório pergunta, e "qual" ao lado de "não foi feito" é
          contradição gravada.
        */}
        {form.timeOutDoisAntibioticoProfilatico ? (
          <Campo rotulo={t('antibioticoQual')} dica={t('dicaAntibioticoQual')}>
            <input
              className="campo"
              value={form.timeOutDoisAntibioticoQual}
              onChange={(e) => alterar({ timeOutDoisAntibioticoQual: e.target.value })}
            />
          </Campo>
        ) : null}
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
        <Interruptor
          rotulo={t('timeOutDoisIntegrador')}
          dica={t('dicaIntegrador')}
          valor={form.timeOutDoisInstrumentalIntegrador}
          aoMudar={(timeOutDoisInstrumentalIntegrador) =>
            alterar({ timeOutDoisInstrumentalIntegrador })
          }
        />

        {/*
          Previsão de biópsia e tempo previsto são respostas, e não itens
          conferidos: a maioria das cirurgias não tem biópsia prevista, e exigir
          a marca para carimbar a parada inverteria o sentido da lista.
        */}
        <div className="space-y-2 border-t border-borda pt-2">
          <Interruptor
            rotulo={t('previsaoBiopsia')}
            valor={form.timeOutDoisPrevisaoBiopsia}
            aoMudar={(timeOutDoisPrevisaoBiopsia) => alterar({ timeOutDoisPrevisaoBiopsia })}
          />

          <Campo rotulo={t('tempoPrevisto')} dica={t('dicaTempoPrevisto')}>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              className="campo"
              value={form.timeOutDoisTempoPrevisto}
              onChange={(e) => alterar({ timeOutDoisTempoPrevisto: e.target.value })}
            />
          </Campo>
        </div>
      </Parada>

      {/*
        O transoperatório: o que aconteceu entre a indução e o fecho.

        Fica entre o time out e o check out porque é essa a ordem da sala. Até
        aqui a ficha pulava daquele para este: a lista de verificação era
        registrada inteira e o procedimento em si não tinha onde ser descrito.
      */}
      <Secao titulo={t('transoperatorio')}>
        <Grupo rotulo={t('anestesia')} dica={t('dicaAnestesia')}>
          <Multiplas
            valores={form.anestesia}
            opcoes={TIPOS_ANESTESIA}
            aoAlternar={(tipo) =>
              alterar({
                anestesia: form.anestesia.includes(tipo)
                  ? form.anestesia.filter((a) => a !== tipo)
                  : [...form.anestesia, tipo],
              })
            }
            tabela={tiposAnestesia}
            idioma={idioma}
          />
        </Grupo>

        <Campo rotulo={t('anestesiaLocal')}>
          <input
            className="campo"
            value={form.anestesiaLocal}
            onChange={(e) => alterar({ anestesiaLocal: e.target.value })}
          />
        </Campo>

        <Grupo rotulo={t('posicionamento')} dica={t('dicaPosicionamento')}>
          <Opcoes
            valor={form.posicionamento}
            opcoes={POSICIONAMENTOS}
            aoEscolher={(posicionamento) => alterar({ posicionamento })}
            tabela={posicionamentos}
            idioma={idioma}
          />
        </Grupo>

        <Interruptor
          rotulo={t('placaBisturi')}
          valor={form.placaBisturi}
          aoMudar={(placaBisturi) => alterar({ placaBisturi })}
        />

        {/*
          Onde, depois do sim: queimadura por placa é evento adverso conhecido,
          e a investigação começa por onde ela estava.
        */}
        {form.placaBisturi ? (
          <Campo rotulo={t('placaBisturiLocal')}>
            <input
              className="campo"
              value={form.placaBisturiLocal}
              onChange={(e) => alterar({ placaBisturiLocal: e.target.value })}
            />
          </Campo>
        ) : null}

        <Campo rotulo={t('preparoDaPele')}>
          <input
            className="campo"
            value={form.preparoDaPele}
            onChange={(e) => alterar({ preparoDaPele: e.target.value })}
          />
        </Campo>

        <Campo rotulo={t('antissepsia')}>
          <input
            className="campo"
            value={form.antissepsia}
            onChange={(e) => alterar({ antissepsia: e.target.value })}
          />
        </Campo>

        <Campo rotulo={t('incisaoCirurgica')}>
          <input
            className="campo"
            value={form.incisaoCirurgica}
            onChange={(e) => alterar({ incisaoCirurgica: e.target.value })}
          />
        </Campo>

        <Campo rotulo={t('curativo')}>
          <input
            className="campo"
            value={form.curativo}
            onChange={(e) => alterar({ curativo: e.target.value })}
          />
        </Campo>

        <Campo rotulo={t('medicacoesRealizadas')}>
          <textarea
            className="campo min-h-20"
            aria-label={t('medicacoesRealizadas')}
            value={form.medicacoesRealizadas}
            onChange={(e) => alterar({ medicacoesRealizadas: e.target.value })}
          />
        </Campo>

        {/*
          Os dois números são o lado esquerdo da contagem do check out. Uma
          conferência em que os dois lados são frase não é conferência.
        */}
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo={t('gazesUtilizadas')}>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={999}
              className="campo"
              value={form.gazesUtilizadas}
              onChange={(e) => alterar({ gazesUtilizadas: e.target.value })}
            />
          </Campo>
          <Campo rotulo={t('compressasUtilizadas')}>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={999}
              className="campo"
              value={form.compressasUtilizadas}
              onChange={(e) => alterar({ compressasUtilizadas: e.target.value })}
            />
          </Campo>
        </div>

        <Campo rotulo={t('evolucaoMedica')}>
          <textarea
            className="campo min-h-24"
            aria-label={t('evolucaoMedica')}
            value={form.evolucaoMedica}
            onChange={(e) => alterar({ evolucaoMedica: e.target.value })}
          />
        </Campo>

        <Campo rotulo={t('evolucaoEnfermagem')}>
          <textarea
            className="campo min-h-24"
            aria-label={t('evolucaoEnfermagem')}
            value={form.evolucaoEnfermagem}
            onChange={(e) => alterar({ evolucaoEnfermagem: e.target.value })}
          />
        </Campo>
      </Secao>

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
          Quantas, depois do sim: a caixa diz que foram identificadas, e o
          número é o que o laboratório confere contra o que recebeu. Peça
          perdida entre a sala e o laboratório só aparece com os dois.
        */}
        {form.checkOutAmostrasIdentificadas ? (
          <Campo rotulo={t('biopsiaQuantidade')}>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              className="campo"
              value={form.checkOutBiopsiaQuantidade}
              onChange={(e) => alterar({ checkOutBiopsiaQuantidade: e.target.value })}
            />
          </Campo>
        ) : null}

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
        {/*
          Para onde o paciente foi ao sair da sala. Decide quem recebe: a
          recuperação anestésica tem vigilância contínua, o pós-operatório não.
        */}
        <Grupo rotulo={t('destinoPosOperatorio')}>
          <Opcoes
            valor={form.destinoPosOperatorio}
            opcoes={DESTINOS_POS_OPERATORIO}
            aoEscolher={(destinoPosOperatorio) => alterar({ destinoPosOperatorio })}
            tabela={destinosPosOperatorio}
            idioma={idioma}
          />
        </Grupo>

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

        {/*
          Como o paciente chegou. É o primeiro dado que alguém olha ao chegar
          perto do leito, e até aqui a recuperação tinha entrada, saída e dois
          campos de texto — o estado em que ele chegou, nenhum.
        */}
        <Grupo rotulo={t('nivelConsciencia')}>
          <Opcoes
            valor={form.recuperacaoNivelConsciencia}
            opcoes={NIVEIS_CONSCIENCIA}
            aoEscolher={(recuperacaoNivelConsciencia) => alterar({ recuperacaoNivelConsciencia })}
            tabela={niveisConsciencia}
            idioma={idioma}
          />
        </Grupo>

        <Grupo rotulo={t('suporteOxigenio')}>
          <Opcoes
            valor={form.recuperacaoSuporteOxigenio}
            opcoes={SUPORTES_OXIGENIO}
            aoEscolher={(recuperacaoSuporteOxigenio) => alterar({ recuperacaoSuporteOxigenio })}
            tabela={suportesOxigenio}
            idioma={idioma}
          />
        </Grupo>

        {/*
          O número só existe quando há o que medir: litros por minuto no
          cateter, por cento na Venturi. Ar ambiente não tem número, e guardar
          "3 l/min" ao lado dele seria guardar a resposta de uma pergunta que
          não foi feita.
        */}
        {form.recuperacaoSuporteOxigenio === 'CateterNasal' ||
        form.recuperacaoSuporteOxigenio === 'MascaraVenturi' ? (
          <Campo
            rotulo={
              form.recuperacaoSuporteOxigenio === 'CateterNasal'
                ? t('oxigenioLitros')
                : t('oxigenioPorcento')
            }
          >
            <input
              className="campo"
              value={form.recuperacaoOxigenioDetalhe}
              onChange={(e) => alterar({ recuperacaoOxigenioDetalhe: e.target.value })}
            />
          </Campo>
        ) : null}

        <Interruptor
          rotulo={t('acessoVenosoPeriferico')}
          valor={form.recuperacaoAcessoVenosoPeriferico}
          aoMudar={(recuperacaoAcessoVenosoPeriferico) =>
            alterar({ recuperacaoAcessoVenosoPeriferico })
          }
        />

        {form.recuperacaoAcessoVenosoPeriferico ? (
          <Campo rotulo={t('acessoVenosoDescricao')} dica={t('dicaAcessoVenoso')}>
            <input
              className="campo"
              value={form.recuperacaoAcessoVenosoDescricao}
              onChange={(e) => alterar({ recuperacaoAcessoVenosoDescricao: e.target.value })}
            />
          </Campo>
        ) : null}

        <Campo rotulo={t('infusoes')}>
          <textarea
            className="campo min-h-20"
            aria-label={t('infusoes')}
            value={form.recuperacaoInfusoes}
            onChange={(e) => alterar({ recuperacaoInfusoes: e.target.value })}
          />
        </Campo>

        {/*
          A intervenção intensiva abre o que vem com ela. É o desenho do próprio
          formulário, e tem razão: cateter central e droga vasoativa num
          pós-operatório de rotina são linhas vazias em toda ficha.
        */}
        <Interruptor
          rotulo={t('intervencaoIntensiva')}
          valor={form.recuperacaoIntervencaoIntensiva}
          aoMudar={(recuperacaoIntervencaoIntensiva) =>
            alterar({ recuperacaoIntervencaoIntensiva })
          }
        />

        {form.recuperacaoIntervencaoIntensiva ? (
          <div className="space-y-2 border-l-2 border-borda pl-3">
            <Interruptor
              rotulo={t('cateterVenosoCentral')}
              valor={form.recuperacaoCateterVenosoCentral}
              aoMudar={(recuperacaoCateterVenosoCentral) =>
                alterar({ recuperacaoCateterVenosoCentral })
              }
            />

            {form.recuperacaoCateterVenosoCentral ? (
              <Campo rotulo={t('cateterCentralLocal')}>
                <input
                  className="campo"
                  value={form.recuperacaoCateterVenosoCentralLocal}
                  onChange={(e) =>
                    alterar({ recuperacaoCateterVenosoCentralLocal: e.target.value })
                  }
                />
              </Campo>
            ) : null}

            <Campo rotulo={t('drogasVasoativas')} dica={t('dicaDrogasVasoativas')}>
              <textarea
                className="campo min-h-20"
                aria-label={t('drogasVasoativas')}
                value={form.recuperacaoDrogasVasoativas}
                onChange={(e) => alterar({ recuperacaoDrogasVasoativas: e.target.value })}
              />
            </Campo>
          </div>
        ) : null}

        {/* O que saiu da sala com o paciente. */}
        <Interruptor
          rotulo={t('dreno')}
          valor={form.recuperacaoDreno}
          aoMudar={(recuperacaoDreno) => alterar({ recuperacaoDreno })}
        />

        {form.recuperacaoDreno ? (
          <Campo rotulo={t('drenoDescricao')}>
            <input
              className="campo"
              value={form.recuperacaoDrenoDescricao}
              onChange={(e) => alterar({ recuperacaoDrenoDescricao: e.target.value })}
            />
          </Campo>
        ) : null}

        <Interruptor
          rotulo={t('sondaVesical')}
          valor={form.recuperacaoSondaVesical}
          aoMudar={(recuperacaoSondaVesical) => alterar({ recuperacaoSondaVesical })}
        />
        <Interruptor
          rotulo={t('sondaNasogastrica')}
          valor={form.recuperacaoSondaNasogastrica}
          aoMudar={(recuperacaoSondaNasogastrica) => alterar({ recuperacaoSondaNasogastrica })}
        />

        <Campo rotulo={t('outroDispositivo')}>
          <input
            className="campo"
            value={form.recuperacaoOutroDispositivo}
            onChange={(e) => alterar({ recuperacaoOutroDispositivo: e.target.value })}
          />
        </Campo>

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

        <Campo rotulo={t('evolucaoMedicaRecuperacao')}>
          <textarea
            className="campo min-h-24"
            aria-label={t('evolucaoMedicaRecuperacao')}
            value={form.recuperacaoEvolucaoMedica}
            onChange={(e) => alterar({ recuperacaoEvolucaoMedica: e.target.value })}
          />
        </Campo>

        <Campo rotulo={t('evolucaoEnfermagemRecuperacao')}>
          <textarea
            className="campo min-h-24"
            aria-label={t('evolucaoEnfermagemRecuperacao')}
            value={form.recuperacaoEvolucaoEnfermagem}
            onChange={(e) => alterar({ recuperacaoEvolucaoEnfermagem: e.target.value })}
          />
        </Campo>

        <Campo rotulo={t('dietaAposJejum')}>
          <input
            className="campo"
            value={form.recuperacaoDieta}
            onChange={(e) => alterar({ recuperacaoDieta: e.target.value })}
          />
        </Campo>

        {/*
          Fecha o laço aberto lá em cima. Só aparece quando houve o que
          guardar: sem retirada, devolver não quer dizer nada — e a prótese
          esquecida numa gaveta vai embora com a equipe no fim da missão.
        */}
        {form.pertencesProteseDentaria || form.pertencesRoupasAcessorios ? (
          <Interruptor
            rotulo={t('pertencesDevolvidos')}
            valor={form.pertencesDevolvidos}
            aoMudar={(pertencesDevolvidos) => alterar({ pertencesDevolvidos })}
          />
        ) : null}
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

      {/*
        A alta sai da própria ficha cirúrgica. O desfecho ali em cima fecha a
        fila da cirurgia; este cartão fecha o atendimento, que é outra coisa —
        quem sai da recuperação e vai para casa passava pelo prontuário para
        isso.
      */}
      <Encerramento prontuario={prontuario} especialidade="Cirurgia" salvar={salvar} />

      <RodapeDeSalvar>
        <button type="submit" className="botao" disabled={enviando}>
          {enviando ? t('carregando') : form.desfecho ? t('salvarEEncerrar') : t('salvarParada')}
        </button>
      </RodapeDeSalvar>
    </form>
  );
}
