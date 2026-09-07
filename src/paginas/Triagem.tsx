import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type {
  ClassificacaoRisco,
  Especialidade,
  ResultadoTesteRapido,
  Sintoma,
  StatusAlergia,
} from '../api/tipos';
import { Campo, Erros, Interruptor, Multiplas, Opcoes, Secao } from '../componentes/Basicos';
import { useRascunho } from '../hooks/useRascunho';
import { useI18n, traduzir } from '../i18n';
import {
  classificacoes,
  especialidades,
  resultadosTesteRapido,
  sintomas as tabelaSintomas,
  statusAlergia as tabelaAlergia,
} from '../i18n/enums';

const RESULTADOS: ResultadoTesteRapido[] = ['Positivo', 'Negativo'];

/** Notas da escala de dor. Zero entra: "sem dor" é resposta. */
const NOTAS_DOR = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

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
  peso: string;
  altura: string;
  circunferenciaCefalica: string;
  /** Vazio significa "não fiz o teste". */
  testeRapidoCovid: ResultadoTesteRapido | '';
  testeRapidoMalaria: ResultadoTesteRapido | '';
  /** Vazio significa "não perguntei"; distinto de ter respondido que não. */
  teveCirurgiaPrevia: '' | 'sim' | 'nao';
  cirurgiasPrevias: string;
  /** Vazio significa "não perguntei"; "0" significa "sem dor". */
  escalaDor: string;
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
  peso: '',
  altura: '',
  circunferenciaCefalica: '',
  testeRapidoCovid: '',
  testeRapidoMalaria: '',
  teveCirurgiaPrevia: '',
  cirurgiasPrevias: '',
  escalaDor: '',
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

  /*
    O IMC aparece assim que peso e altura existem, ainda antes de salvar: é
    conferência, e conferir depois de gravar chega tarde. A faixa (adequado,
    sobrepeso) não é mostrada aqui de propósito — ela depende da idade e o corte
    da OMS é de adulto; quem decide isso é o servidor, no prontuário.
  */
  const imc = (() => {
    const peso = Number(form.peso);
    const altura = Number(form.altura);

    if (!(peso > 0) || !(altura > 0)) return null;

    const metros = altura / 100;
    return peso / (metros * metros);
  })();

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
        pesoKg: numero(form.peso),
        alturaCm: numero(form.altura),
        circunferenciaCefalicaCm: numero(form.circunferenciaCefalica),
        testeRapidoCovid: form.testeRapidoCovid || null,
        testeRapidoMalaria: form.testeRapidoMalaria || null,
        teveCirurgiaPrevia:
          form.teveCirurgiaPrevia === '' ? null : form.teveCirurgiaPrevia === 'sim',
        // Só vai quando houve: "quais" junto de "não teve" é contradição
        // gravada, e alguém vai ler só um dos dois.
        cirurgiasPrevias:
          form.teveCirurgiaPrevia === 'sim' ? form.cirurgiasPrevias.trim() || null : null,
        escalaDor: numero(form.escalaDor),
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
      <h1 className="titulo">{t('triagem')}</h1>

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

        <div className="grid grid-cols-2 gap-3">
          {/*
            Peso não é só estatística: é o que permite conferir dose pediátrica
            na dispensação, que até agora dependia de alguém lembrar do número.
          */}
          <Campo rotulo={t('peso')}>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min={0.5}
              max={400}
              className="campo"
              value={form.peso}
              onChange={(e) => alterar({ peso: e.target.value })}
            />
          </Campo>

          <Campo rotulo={t('altura')}>
            <input
              type="number"
              inputMode="numeric"
              min={20}
              max={250}
              className="campo"
              value={form.altura}
              onChange={(e) => alterar({ altura: e.target.value })}
            />
          </Campo>

          {/* Medida de acompanhamento de criança; sem regra de faixa aqui. */}
          <Campo rotulo={t('circunferenciaCefalica')}>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min={20}
              max={80}
              className="campo"
              value={form.circunferenciaCefalica}
              onChange={(e) => alterar({ circunferenciaCefalica: e.target.value })}
            />
          </Campo>
        </div>

        {/*
          Testes rápidos. Vazio já significa "não foi feito" — um terceiro botão
          para isso criaria duas formas de dizer a mesma coisa.
        */}
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo={t('testeRapidoCovid')}>
            <select
              className="campo"
              value={form.testeRapidoCovid}
              onChange={(e) =>
                alterar({ testeRapidoCovid: e.target.value as ResultadoTesteRapido | '' })
              }
            >
              <option value="">{t('naoFeito')}</option>
              {RESULTADOS.map((r) => (
                <option key={r} value={r}>
                  {traduzir(resultadosTesteRapido, idioma, r)}
                </option>
              ))}
            </select>
          </Campo>

          <Campo rotulo={t('testeRapidoMalaria')}>
            <select
              className="campo"
              value={form.testeRapidoMalaria}
              onChange={(e) =>
                alterar({ testeRapidoMalaria: e.target.value as ResultadoTesteRapido | '' })
              }
            >
              <option value="">{t('naoFeito')}</option>
              {RESULTADOS.map((r) => (
                <option key={r} value={r}>
                  {traduzir(resultadosTesteRapido, idioma, r)}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <Campo rotulo={t('cirurgiasPrevias')}>
          <select
            className="campo"
            value={form.teveCirurgiaPrevia}
            onChange={(e) =>
              alterar({ teveCirurgiaPrevia: e.target.value as '' | 'sim' | 'nao' })
            }
          >
            <option value="">{t('naoPerguntado')}</option>
            <option value="nao">{t('nao')}</option>
            <option value="sim">{t('sim')}</option>
          </select>
        </Campo>

        {/* "Quais" só aparece quando houve: senão é uma linha vazia em toda ficha. */}
        {form.teveCirurgiaPrevia === 'sim' ? (
          <Campo rotulo={t('quaisCirurgias')}>
            <textarea
              className="campo min-h-16"
              value={form.cirurgiasPrevias}
              onChange={(e) => alterar({ cirurgiasPrevias: e.target.value })}
            />
          </Campo>
        ) : null}

        {imc !== null ? (
          <p className="text-sm">
            <span className="text-texto-suave">{t('imc')}: </span>
            <span className="font-semibold tabular-nums">{imc.toFixed(1)}</span>
          </p>
        ) : null}
      </Secao>

      <Secao titulo={t('escalaDor')}>
        {/*
          De 0 a 10, e não de 1: "sem dor" é uma resposta válida e diferente de
          não ter perguntado — que é o que o campo vazio significa.
        */}
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex gap-2 pb-1">
            <button
              type="button"
              aria-pressed={form.escalaDor === ''}
              onClick={() => alterar({ escalaDor: '' })}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                form.escalaDor === ''
                  ? 'border-marca bg-marca text-white'
                  : 'border-borda bg-superficie-2 text-texto'
              }`}
            >
              {t('naoPerguntado')}
            </button>

            {NOTAS_DOR.map((nota) => (
              <button
                key={nota}
                type="button"
                aria-pressed={form.escalaDor === String(nota)}
                onClick={() => alterar({ escalaDor: String(nota) })}
                className={`h-11 w-11 shrink-0 rounded-full border text-sm font-semibold tabular-nums transition ${
                  form.escalaDor === String(nota)
                    ? 'border-marca bg-marca text-white'
                    : 'border-borda bg-superficie-2 text-texto'
                }`}
              >
                {nota}
              </button>
            ))}
          </div>
        </div>

        <p className="flex justify-between text-sm text-texto-suave">
          <span>0 — {t('semDor')}</span>
          <span>10 — {t('dorMaxima')}</span>
        </p>
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
