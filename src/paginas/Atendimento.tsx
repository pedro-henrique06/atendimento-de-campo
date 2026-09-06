import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type {
  Cid10,
  DesfechoConsulta,
  Especialidade,
  MarcacaoDente,
  ProcedimentoOdontologico,
  Prontuario,
} from '../api/tipos';
import { AlertaAlergia, Campo, Carregando, Erros, Interruptor, Multiplas, Opcoes, Secao } from '../componentes/Basicos';
import { Cronometro } from '../componentes/Cronometro';
import { ListaDispensacao, novaLinha, paraEnvio } from '../componentes/Dispensacao';
import type { LinhaDispensacao } from '../componentes/Dispensacao';
import { Odontograma } from '../componentes/Odontograma';
import { useRascunho } from '../hooks/useRascunho';
import { useI18n, traduzir } from '../i18n';
import { desfechos, especialidades, procedimentosOdontologicos } from '../i18n/enums';

const DESFECHOS: DesfechoConsulta[] = ['Alta', 'Encaminhado', 'Retorno', 'Evasao'];

const DESTINOS: Especialidade[] = [
  'ClinicaGeral',
  'Pediatria',
  'Ortopedia',
  'Odontologia',
  'Enfermagem',
  'SaudeMental',
];

const PROCEDIMENTOS: ProcedimentoOdontologico[] = [
  'ProfilaxiaLimpeza',
  'OrientacaoHigieneBucal',
  'Restauracao',
  'Exodontia',
  'DrenagemAbscesso',
  'AplicacaoFluor',
  'Raspagem',
  'Outro',
];

/** Busca de CID-10 com autocomplete; substitui o diagnóstico em texto livre. */
function BuscaCid({
  codigo,
  descricao,
  aoEscolher,
}: {
  codigo: string | null;
  descricao: string | null;
  aoEscolher: (cid: Cid10 | null) => void;
}) {
  const { t } = useI18n();
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<Cid10[]>([]);

  useEffect(() => {
    if (termo.trim().length < 2) {
      setResultados([]);
      return;
    }

    let cancelado = false;

    const timer = setTimeout(() => {
      api
        .cid10(termo.trim())
        .then((lista) => {
          if (!cancelado) setResultados(lista);
        })
        .catch(() => {
          if (!cancelado) setResultados([]);
        });
    }, 300);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [termo]);

  if (codigo) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-borda bg-superficie-2 px-4 py-3">
        <span className="min-w-0">
          <span className="font-semibold">{codigo}</span>
          {descricao ? <span className="ml-2 text-texto-suave">{descricao}</span> : null}
        </span>
        <button type="button" onClick={() => aoEscolher(null)} className="shrink-0 text-sm underline">
          {t('remover')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        className="campo"
        placeholder={t('buscarCid')}
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
      />

      {resultados.length > 0 ? (
        <ul className="max-h-60 overflow-y-auto rounded-xl border border-borda">
          {resultados.map((cid) => (
            <li key={cid.codigo}>
              <button
                type="button"
                onClick={() => {
                  aoEscolher(cid);
                  setTermo('');
                  setResultados([]);
                }}
                className="w-full border-b border-borda px-3 py-2 text-left last:border-0 hover:bg-superficie-2"
              >
                <span className="font-semibold">{cid.codigo}</span>
                <span className="ml-2 text-sm text-texto-suave">{cid.descricao}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

interface FormConsulta {
  sintomas: string;
  cid10Codigo: string | null;
  cid10Descricao: string | null;
  diagnosticoObservacao: string;
  conduta: string;
  desfecho: DesfechoConsulta | null;
  encaminhadoPara: Especialidade | null;
  localizacao: string;
  mecanismoTrauma: string;
  imobilizacao: boolean;
  necessitaRaioX: boolean;
  dispensacoes: LinhaDispensacao[];
}

const CONSULTA_INICIAL: FormConsulta = {
  sintomas: '',
  cid10Codigo: null,
  cid10Descricao: null,
  diagnosticoObservacao: '',
  conduta: '',
  desfecho: null,
  encaminhadoPara: null,
  localizacao: '',
  mecanismoTrauma: '',
  imobilizacao: false,
  necessitaRaioX: false,
  dispensacoes: [],
};

interface FormOdonto {
  queixa: string;
  cid10Codigo: string | null;
  cid10Descricao: string | null;
  procedimentos: ProcedimentoOdontologico[];
  outroProcedimento: string;
  desfecho: DesfechoConsulta | null;
  odontograma: MarcacaoDente[];
  dispensacoes: LinhaDispensacao[];
}

const ODONTO_INICIAL: FormOdonto = {
  queixa: '',
  cid10Codigo: null,
  cid10Descricao: null,
  procedimentos: [],
  outroProcedimento: '',
  desfecho: null,
  odontograma: [],
  dispensacoes: [],
};

/**
 * Tela de atendimento por especialidade. A rota carrega o prontuário para
 * mostrar o cabeçalho do paciente — em especial o alerta de alergia, que
 * precisa estar visível enquanto se prescreve.
 */
export function Atendimento({ modo }: { modo: 'consulta' | 'odontologia' }) {
  const { t, idioma } = useI18n();
  const { id = '', especialidade } = useParams();
  const navegar = useNavigate();

  const [prontuario, setProntuario] = useState<Prontuario | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  const especialidadeAtual = (especialidade ?? 'ClinicaGeral') as Especialidade;

  const consulta = useRascunho<FormConsulta>(`consulta-${id}-${especialidadeAtual}`, CONSULTA_INICIAL);
  const odonto = useRascunho<FormOdonto>(`odonto-${id}`, ODONTO_INICIAL);

  useEffect(() => {
    api
      .prontuario(id)
      .then(setProntuario)
      .catch((erro) => {
        setErros([erro instanceof ErroDeRede ? t('semConexao') : t('erroInesperado')]);
      });
  }, [id, t]);

  async function enviarConsulta(evento: FormEvent) {
    evento.preventDefault();
    setErros([]);
    setEnviando(true);

    const form = consulta.valor;

    try {
      await api.registrarConsulta(id, {
        especialidade: especialidadeAtual,
        sintomasDescricao: form.sintomas.trim() || null,
        cid10Codigo: form.cid10Codigo,
        diagnosticoObservacao: form.diagnosticoObservacao.trim() || null,
        conduta: form.conduta.trim() || null,
        desfecho: form.desfecho,
        encaminhadoPara: form.encaminhadoPara,
        ortopedia:
          especialidadeAtual === 'Ortopedia'
            ? {
                localizacao: form.localizacao.trim() || null,
                mecanismoTrauma: form.mecanismoTrauma.trim() || null,
                imobilizacao: form.imobilizacao,
                necessitaRaioX: form.necessitaRaioX,
              }
            : null,
        dispensacoes: paraEnvio(form.dispensacoes),
      });

      consulta.limpar();
      navegar(`/atendimentos/${id}`, { replace: true });
    } catch (erro) {
      tratarErro(erro);
    } finally {
      setEnviando(false);
    }
  }

  async function enviarOdontologia(evento: FormEvent) {
    evento.preventDefault();
    setErros([]);
    setEnviando(true);

    const form = odonto.valor;

    try {
      await api.registrarOdontologia(id, {
        queixa: form.queixa.trim() || null,
        cid10Codigo: form.cid10Codigo,
        procedimentos: form.procedimentos,
        outroProcedimento: form.outroProcedimento.trim() || null,
        desfecho: form.desfecho,
        odontograma: form.odontograma,
        dispensacoes: paraEnvio(form.dispensacoes),
      });

      odonto.limpar();
      navegar(`/atendimentos/${id}`, { replace: true });
    } catch (erro) {
      tratarErro(erro);
    } finally {
      setEnviando(false);
    }
  }

  function tratarErro(erro: unknown) {
    if (erro instanceof ErroDeRede) {
      setErros([t('semConexao')]);
    } else if (erro instanceof ErroApi) {
      setErros(erro.erros);
    } else {
      setErros([t('erroInesperado')]);
    }
  }

  if (!prontuario) {
    return <Carregando texto={t('carregando')} />;
  }

  /*
    A etapa em que este profissional está trabalhando. É dela que sai o
    cronômetro: o tempo é do atendimento em curso, não do atendimento inteiro,
    que incluiria o que as outras filas levaram.
  */
  const etapaEmCurso = prontuario.etapas.find(
    (e) => e.status !== 'Concluida' && e.status !== 'Cancelada',
  );

  const cabecalhoPaciente = (
    <div className="cartao space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-bold">{prontuario.paciente.nome}</span>
          <span className="text-sm text-texto-suave">
            {prontuario.paciente.idade !== null ? `${prontuario.paciente.idade} ${t('anos')}` : ''}
          </span>
        </div>

        <Cronometro assumidaEm={etapaEmCurso?.assumidaEm ?? null} />
      </div>
      <AlertaAlergia
        exibir={prontuario.paciente.alerta.exibir}
        texto={prontuario.paciente.alerta.texto}
      />
    </div>
  );

  if (modo === 'odontologia') {
    const form = odonto.valor;
    const alterar = (mudanca: Partial<FormOdonto>) => odonto.setValor({ ...form, ...mudanca });

    return (
      <form onSubmit={enviarOdontologia} className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <h1 className="titulo">{t('odontologia')}</h1>
        {cabecalhoPaciente}

        <Secao titulo={t('sintomas')}>
          <textarea
            className="campo min-h-24"
            value={form.queixa}
            onChange={(e) => alterar({ queixa: e.target.value })}
          />
        </Secao>

        <Secao titulo={t('diagnostico')}>
          <BuscaCid
            codigo={form.cid10Codigo}
            descricao={form.cid10Descricao}
            aoEscolher={(cid) =>
              alterar({ cid10Codigo: cid?.codigo ?? null, cid10Descricao: cid?.descricao ?? null })
            }
          />
        </Secao>

        <Secao titulo={t('odontograma')}>
          <Odontograma
            marcacoes={form.odontograma}
            aoMudar={(odontograma) => alterar({ odontograma })}
          />
        </Secao>

        <Secao titulo={t('procedimentosRealizados')}>
          <Multiplas
            valores={form.procedimentos}
            opcoes={PROCEDIMENTOS}
            aoAlternar={(p) =>
              alterar({
                procedimentos: form.procedimentos.includes(p)
                  ? form.procedimentos.filter((x) => x !== p)
                  : [...form.procedimentos, p],
              })
            }
            tabela={procedimentosOdontologicos}
            idioma={idioma}
          />

          {form.procedimentos.includes('Outro') ? (
            <Campo rotulo={t('procedimentos')}>
              <input
                className="campo"
                value={form.outroProcedimento}
                onChange={(e) => alterar({ outroProcedimento: e.target.value })}
              />
            </Campo>
          ) : null}
        </Secao>

        <Secao titulo={t('dispensacao')}>
          <ListaDispensacao
            linhas={form.dispensacoes}
            aoMudar={(dispensacoes) => alterar({ dispensacoes })}
          />
        </Secao>

        <Secao titulo={t('desfecho')}>
          <Opcoes
            valor={form.desfecho}
            opcoes={DESFECHOS}
            aoEscolher={(desfecho) => alterar({ desfecho })}
            tabela={desfechos}
            idioma={idioma}
          />
        </Secao>

        <Erros erros={erros} />

        <button type="submit" className="botao" disabled={enviando}>
          {enviando ? t('carregando') : t('salvar')}
        </button>
      </form>
    );
  }

  const form = consulta.valor;
  const alterar = (mudanca: Partial<FormConsulta>) => consulta.setValor({ ...form, ...mudanca });

  return (
    <form onSubmit={enviarConsulta} className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <h1 className="titulo">{traduzir(especialidades, idioma, especialidadeAtual)}</h1>
      {cabecalhoPaciente}

      <Secao titulo={t('sintomas')}>
        <textarea
          className="campo min-h-24"
          value={form.sintomas}
          onChange={(e) => alterar({ sintomas: e.target.value })}
        />
      </Secao>

      {especialidadeAtual === 'Ortopedia' ? (
        <Secao titulo={traduzir(especialidades, idioma, 'Ortopedia')}>
          <Campo rotulo={t('localizacaoLesao')}>
            <input
              className="campo"
              value={form.localizacao}
              onChange={(e) => alterar({ localizacao: e.target.value })}
            />
          </Campo>
          <Campo rotulo={t('mecanismoTrauma')}>
            <textarea
              className="campo min-h-20"
              value={form.mecanismoTrauma}
              onChange={(e) => alterar({ mecanismoTrauma: e.target.value })}
            />
          </Campo>
          <Interruptor
            rotulo={t('imobilizacao')}
            valor={form.imobilizacao}
            aoMudar={(imobilizacao) => alterar({ imobilizacao })}
          />
          <Interruptor
            rotulo={t('necessitaRaioX')}
            valor={form.necessitaRaioX}
            aoMudar={(necessitaRaioX) => alterar({ necessitaRaioX })}
          />
        </Secao>
      ) : null}

      <Secao titulo={t('diagnostico')}>
        <BuscaCid
          codigo={form.cid10Codigo}
          descricao={form.cid10Descricao}
          aoEscolher={(cid) =>
            alterar({ cid10Codigo: cid?.codigo ?? null, cid10Descricao: cid?.descricao ?? null })
          }
        />

        <Campo rotulo={t('observacaoDiagnostico')}>
          <textarea
            className="campo min-h-20"
            value={form.diagnosticoObservacao}
            onChange={(e) => alterar({ diagnosticoObservacao: e.target.value })}
          />
        </Campo>
      </Secao>

      {/*
        Campo dedicado para a conduta. É o destino correto do texto que, no
        sistema antigo, acabava registrado como item dispensado.
      */}
      <Secao titulo={t('conduta')}>
        <textarea
          className="campo min-h-24"
          value={form.conduta}
          onChange={(e) => alterar({ conduta: e.target.value })}
        />
      </Secao>

      <Secao titulo={t('dispensacao')}>
        <ListaDispensacao
          linhas={form.dispensacoes}
          aoMudar={(dispensacoes) => alterar({ dispensacoes })}
        />
        {form.dispensacoes.length === 0 ? (
          <button
            type="button"
            className="hidden"
            onClick={() => alterar({ dispensacoes: [novaLinha()] })}
          />
        ) : null}
      </Secao>

      <Secao titulo={t('desfecho')}>
        <Opcoes
          valor={form.desfecho}
          opcoes={DESFECHOS}
          aoEscolher={(desfecho) => alterar({ desfecho })}
          tabela={desfechos}
          idioma={idioma}
        />

        {form.desfecho === 'Encaminhado' ? (
          <div>
            <span className="rotulo">{t('encaminhadoPara')}</span>
            <Opcoes
              valor={form.encaminhadoPara}
              opcoes={DESTINOS}
              aoEscolher={(encaminhadoPara) => alterar({ encaminhadoPara })}
              tabela={especialidades}
              idioma={idioma}
            />
          </div>
        ) : null}
      </Secao>

      <Erros erros={erros} />

      <button type="submit" className="botao" disabled={enviando}>
        {enviando ? t('carregando') : t('salvar')}
      </button>
    </form>
  );
}
