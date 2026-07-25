import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type { ClassificacaoRisco, Especialidade, Sintoma, StatusAlergia } from '../api/tipos';
import { Campo, Erros, Interruptor, Multiplas, Opcoes, Secao } from '../componentes/Basicos';
import { useRascunho } from '../hooks/useRascunho';
import { useI18n, traduzir } from '../i18n';
import {
  classificacoes,
  especialidades,
  sintomas as tabelaSintomas,
  statusAlergia as tabelaAlergia,
} from '../i18n/enums';

const SINTOMAS: Sintoma[] = [
  'Dor',
  'Tosse',
  'Febre',
  'Diarreia',
  'Vomito',
  'ErupcaoCutanea',
  'FaltaDeAr',
  'Cefaleia',
  'Outro',
];

const RISCOS: ClassificacaoRisco[] = ['Vermelho', 'Amarelo', 'Verde', 'Preto'];
const ESTADOS_ALERGIA: StatusAlergia[] = ['SemAlergiaConhecida', 'PossuiAlergia', 'NaoPerguntado'];

const DESTINOS: Especialidade[] = [
  'ClinicaGeral',
  'Pediatria',
  'Ortopedia',
  'Odontologia',
  'Enfermagem',
  'SaudeMental',
];

interface Formulario {
  sistolica: string;
  diastolica: string;
  frequenciaCardiaca: string;
  frequenciaRespiratoria: string;
  saturacaoO2: string;
  temperatura: string;
  glicemia: string;
  sintomas: Sintoma[];
  outroSintoma: string;
  medicamentosEmUso: string;
  statusAlergia: StatusAlergia;
  alergias: string;
  classificacaoRisco: ClassificacaoRisco | null;
  encaminhamento: Especialidade | null;
  observacoes: string;
  deambula: boolean;
  respiraEspontaneamente: boolean;
  respiraAposViaAerea: boolean;
  pulsoRadialPresente: boolean;
  enchimentoCapilar: string;
  obedeceComandos: boolean;
}

const INICIAL: Formulario = {
  sistolica: '',
  diastolica: '',
  frequenciaCardiaca: '',
  frequenciaRespiratoria: '',
  saturacaoO2: '',
  temperatura: '',
  glicemia: '',
  sintomas: [],
  outroSintoma: '',
  medicamentosEmUso: '',
  statusAlergia: 'NaoPerguntado',
  alergias: '',
  classificacaoRisco: null,
  encaminhamento: null,
  observacoes: '',
  deambula: true,
  respiraEspontaneamente: true,
  respiraAposViaAerea: false,
  pulsoRadialPresente: true,
  enchimentoCapilar: '',
  obedeceComandos: true,
};

function numero(valor: string): number | null {
  const n = Number(valor);
  return valor.trim() === '' || Number.isNaN(n) ? null : n;
}

export function Triagem() {
  const { t, idioma } = useI18n();
  const { id = '' } = useParams();
  const navegar = useNavigate();

  const { valor: form, setValor: setForm, recuperado, descartar, limpar } = useRascunho<Formulario>(
    `triagem-${id}`,
    INICIAL,
  );

  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [divergencia, setDivergencia] = useState<string | null>(null);

  function alterar(mudanca: Partial<Formulario>) {
    setForm({ ...form, ...mudanca });
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();

    if (!form.classificacaoRisco) return;

    setErros([]);
    setDivergencia(null);
    setEnviando(true);

    try {
      const sugestao = await api.registrarTriagem(id, {
        pressaoSistolica: numero(form.sistolica),
        pressaoDiastolica: numero(form.diastolica),
        frequenciaCardiaca: numero(form.frequenciaCardiaca),
        frequenciaRespiratoria: numero(form.frequenciaRespiratoria),
        saturacaoO2: numero(form.saturacaoO2),
        temperaturaCelsius: numero(form.temperatura),
        glicemiaCapilar: numero(form.glicemia),
        sintomas: form.sintomas,
        outroSintoma: form.outroSintoma.trim() || null,
        medicamentosEmUso: form.medicamentosEmUso.trim() || null,
        statusAlergia: form.statusAlergia,
        alergias: form.statusAlergia === 'PossuiAlergia' ? form.alergias.trim() : null,
        classificacaoRisco: form.classificacaoRisco,
        encaminhamento: form.encaminhamento,
        observacoes: form.observacoes.trim() || null,
        achadosStart: {
          deambula: form.deambula,
          respiraEspontaneamente: form.respiraEspontaneamente,
          respiraAposAberturaViaAerea: form.respiraAposViaAerea,
          frequenciaRespiratoria: numero(form.frequenciaRespiratoria),
          pulsoRadialPresente: form.pulsoRadialPresente,
          tempoEnchimentoCapilarSegundos: numero(form.enchimentoCapilar),
          obedeceComandos: form.obedeceComandos,
        },
      });

      limpar();

      // A divergência não bloqueia nada: o registro já foi aceito com a
      // classificação escolhida. É só um aviso antes de seguir.
      if (sugestao?.divergente) {
        setDivergencia(
          `${t('sugestaoStart')}: ${traduzir(classificacoes, idioma, sugestao.sugerida)} — ${sugestao.motivo}`,
        );
        setEnviando(false);
        return;
      }

      navegar(`/atendimentos/${id}`, { replace: true });
    } catch (erro) {
      if (erro instanceof ErroDeRede) {
        setErros([t('semConexao')]);
      } else if (erro instanceof ErroApi) {
        setErros(erro.erros);
      } else {
        setErros([t('erroInesperado')]);
      }

      setEnviando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <h1 className="text-3xl font-bold">{t('triagem')}</h1>

      {recuperado ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-marca-clara/40 bg-marca-clara/10 px-4 py-3 text-sm">
          <span>{t('rascunhoRecuperado')}</span>
          <button type="button" onClick={descartar} className="shrink-0 underline">
            {t('descartarRascunho')}
          </button>
        </div>
      ) : null}

      <Secao titulo={t('sinaisVitais')}>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo={t('sistolica')}>
            <input
              type="number"
              inputMode="numeric"
              className="campo"
              value={form.sistolica}
              onChange={(e) => alterar({ sistolica: e.target.value })}
            />
          </Campo>
          <Campo rotulo={t('diastolica')}>
            <input
              type="number"
              inputMode="numeric"
              className="campo"
              value={form.diastolica}
              onChange={(e) => alterar({ diastolica: e.target.value })}
            />
          </Campo>
          <Campo rotulo={t('frequenciaCardiaca')}>
            <input
              type="number"
              inputMode="numeric"
              className="campo"
              value={form.frequenciaCardiaca}
              onChange={(e) => alterar({ frequenciaCardiaca: e.target.value })}
            />
          </Campo>
          <Campo rotulo={t('frequenciaRespiratoria')}>
            <input
              type="number"
              inputMode="numeric"
              className="campo"
              value={form.frequenciaRespiratoria}
              onChange={(e) => alterar({ frequenciaRespiratoria: e.target.value })}
            />
          </Campo>
          <Campo rotulo={t('saturacaoO2')}>
            <input
              type="number"
              inputMode="numeric"
              className="campo"
              value={form.saturacaoO2}
              onChange={(e) => alterar({ saturacaoO2: e.target.value })}
            />
          </Campo>
          <Campo rotulo={t('temperatura')}>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              className="campo"
              value={form.temperatura}
              onChange={(e) => alterar({ temperatura: e.target.value })}
            />
          </Campo>
        </div>

        <Campo rotulo={t('glicemia')}>
          <input
            type="number"
            inputMode="numeric"
            className="campo"
            value={form.glicemia}
            onChange={(e) => alterar({ glicemia: e.target.value })}
          />
        </Campo>
      </Secao>

      <Secao titulo={t('sintomasAtuais')}>
        <Multiplas
          valores={form.sintomas}
          opcoes={SINTOMAS}
          aoAlternar={(sintoma) =>
            alterar({
              sintomas: form.sintomas.includes(sintoma)
                ? form.sintomas.filter((s) => s !== sintoma)
                : [...form.sintomas, sintoma],
            })
          }
          tabela={tabelaSintomas}
          idioma={idioma}
        />

        {form.sintomas.includes('Outro') ? (
          <Campo rotulo={t('outroSintoma')}>
            <input
              className="campo"
              value={form.outroSintoma}
              onChange={(e) => alterar({ outroSintoma: e.target.value })}
            />
          </Campo>
        ) : null}

        {/*
          Campo separado e explícito. No sistema de referência a resposta de
          sintoma caía aqui, no campo de medicamentos, porque os dois estavam
          colados sem separação visual.
        */}
        <Campo rotulo={t('medicamentosEmUso')}>
          <textarea
            className="campo min-h-20"
            value={form.medicamentosEmUso}
            onChange={(e) => alterar({ medicamentosEmUso: e.target.value })}
          />
        </Campo>
      </Secao>

      <Secao titulo={t('alergia')}>
        <Opcoes
          valor={form.statusAlergia}
          opcoes={ESTADOS_ALERGIA}
          aoEscolher={(statusAlergia) =>
            alterar({ statusAlergia, alergias: statusAlergia === 'PossuiAlergia' ? form.alergias : '' })
          }
          tabela={tabelaAlergia}
          idioma={idioma}
        />

        {form.statusAlergia === 'PossuiAlergia' ? (
          <Campo rotulo={t('quaisAlergias')} obrigatorio>
            <input
              className="campo"
              value={form.alergias}
              onChange={(e) => alterar({ alergias: e.target.value })}
              required
            />
          </Campo>
        ) : null}
      </Secao>

      <Secao titulo={t('achadosStart')}>
        <div className="space-y-2">
          <Interruptor
            rotulo={t('deambula')}
            valor={form.deambula}
            aoMudar={(v) => alterar({ deambula: v })}
          />
          <Interruptor
            rotulo={t('respiraEspontaneamente')}
            valor={form.respiraEspontaneamente}
            aoMudar={(v) => alterar({ respiraEspontaneamente: v })}
          />
          {form.respiraEspontaneamente ? null : (
            <Interruptor
              rotulo={t('respiraAposViaAerea')}
              valor={form.respiraAposViaAerea}
              aoMudar={(v) => alterar({ respiraAposViaAerea: v })}
            />
          )}
          <Interruptor
            rotulo={t('pulsoRadialPresente')}
            valor={form.pulsoRadialPresente}
            aoMudar={(v) => alterar({ pulsoRadialPresente: v })}
          />
          <Interruptor
            rotulo={t('obedeceComandos')}
            valor={form.obedeceComandos}
            aoMudar={(v) => alterar({ obedeceComandos: v })}
          />
        </div>

        <Campo rotulo={t('enchimentoCapilar')}>
          <input
            type="number"
            inputMode="numeric"
            className="campo"
            value={form.enchimentoCapilar}
            onChange={(e) => alterar({ enchimentoCapilar: e.target.value })}
          />
        </Campo>
      </Secao>

      <Secao titulo={t('classificacaoRisco')}>
        {/*
          A escolha é do profissional. O protocolo sugere; a sugestão aparece
          depois do envio e nunca substitui o que foi marcado aqui.
        */}
        <Opcoes
          valor={form.classificacaoRisco}
          opcoes={RISCOS}
          aoEscolher={(classificacaoRisco) => alterar({ classificacaoRisco })}
          tabela={classificacoes}
          idioma={idioma}
        />

        <div>
          <span className="rotulo">{t('encaminhamento')}</span>
          <Opcoes
            valor={form.encaminhamento}
            opcoes={DESTINOS}
            aoEscolher={(encaminhamento) => alterar({ encaminhamento })}
            tabela={especialidades}
            idioma={idioma}
          />
        </div>

        <Campo rotulo={t('observacoes')}>
          <textarea
            className="campo min-h-20"
            value={form.observacoes}
            onChange={(e) => alterar({ observacoes: e.target.value })}
          />
        </Campo>
      </Secao>

      {divergencia ? (
        <div className="space-y-3 rounded-xl border border-amarelo/50 bg-amarelo/10 px-4 py-3 text-sm">
          <p className="font-semibold">{divergencia}</p>
          <p>{t('divergenteDaSugestao')}</p>
          <button
            type="button"
            className="botao-secundario w-full"
            onClick={() => navegar(`/atendimentos/${id}`, { replace: true })}
          >
            {t('continuar')}
          </button>
        </div>
      ) : null}

      <Erros erros={erros} />

      <button type="submit" className="botao" disabled={enviando || !form.classificacaoRisco}>
        {enviando ? t('carregando') : t('salvar')}
      </button>
    </form>
  );
}
