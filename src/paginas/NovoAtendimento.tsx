import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type { CondicaoCronica, Sexo, StatusAlergia, TipoDocumento, Vulnerabilidade } from '../api/tipos';
import { Campo, Erros, Interruptor, Multiplas, Opcoes, Secao } from '../componentes/Basicos';
import { useRascunho } from '../hooks/useRascunho';
import { useSessao } from '../hooks/useSessao';
import { useI18n, traduzir } from '../i18n';
import {
  condicoesCronicas as tabelaCondicoes,
  sexos as tabelaSexos,
  statusAlergia as tabelaAlergia,
  tiposDocumento,
  vulnerabilidades as tabelaVulnerabilidades,
} from '../i18n/enums';

const TIPOS_DOCUMENTO: TipoDocumento[] = [
  'SemDocumento',
  'CedulaIdentidade',
  'Passaporte',
  'Cpf',
  'Rg',
  'CarteiraEstrangeiro',
  'CertidaoNascimento',
  'Outro',
];

const SEXOS: Sexo[] = ['Feminino', 'Masculino', 'Outro', 'NaoInformado'];
const ESTADOS_ALERGIA: StatusAlergia[] = ['SemAlergiaConhecida', 'PossuiAlergia', 'NaoPerguntado'];

const CONDICOES: CondicaoCronica[] = [
  'Hipertensao',
  'Diabetes',
  'Asma',
  'Obesidade',
  'Cardiopatia',
  'Epilepsia',
  'Outro',
];

const VULNERABILIDADES: Vulnerabilidade[] = [
  'Idoso65Mais',
  'Gestante',
  'Lactante',
  'CriancaMenor5',
  'AuxilioMobilidade',
  'Deficiencia',
  'Desacompanhado',
];

interface Formulario {
  nome: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  semDataNascimento: boolean;
  dataNascimento: string;
  idadeAproximada: string;
  sexo: Sexo;
  statusAlergia: StatusAlergia;
  alergias: string;
  condicoesCronicas: CondicaoCronica[];
  vulnerabilidades: Vulnerabilidade[];
  consentimento: boolean;
  queixaPrincipal: string;
}

const INICIAL: Formulario = {
  nome: '',
  tipoDocumento: 'SemDocumento',
  numeroDocumento: '',
  semDataNascimento: false,
  dataNascimento: '',
  idadeAproximada: '',
  sexo: 'NaoInformado',
  statusAlergia: 'NaoPerguntado',
  alergias: '',
  condicoesCronicas: [],
  vulnerabilidades: [],
  consentimento: false,
  queixaPrincipal: '',
};

export function NovoAtendimento() {
  const { t, idioma } = useI18n();
  const { base } = useSessao();
  const navegar = useNavigate();

  const { valor: form, setValor: setForm, recuperado, descartar, limpar } = useRascunho<Formulario>(
    'novo-atendimento',
    INICIAL,
  );

  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  function alterar(mudanca: Partial<Formulario>) {
    setForm({ ...form, ...mudanca });
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();

    if (!base) return;

    setErros([]);
    setEnviando(true);

    // A localização é opcional e nunca bloqueia o atendimento: em campo fechado
    // o GPS costuma falhar, e esperar por ele atrasaria o registro.
    const posicao = await obterPosicao();

    try {
      const prontuario = await api.criarAtendimento({
        baseId: base.id,
        queixaPrincipal: form.queixaPrincipal.trim() || null,
        latitude: posicao?.latitude ?? null,
        longitude: posicao?.longitude ?? null,
        precisaoMetros: posicao?.precisao ?? null,
        paciente: {
          nome: form.nome.trim(),
          tipoDocumento: form.tipoDocumento,
          numeroDocumento: form.numeroDocumento.trim() || null,
          dataNascimento: form.semDataNascimento ? null : form.dataNascimento || null,
          idadeAproximada: form.semDataNascimento ? Number(form.idadeAproximada) || null : null,
          sexo: form.sexo,
          statusAlergia: form.statusAlergia,
          alergias: form.statusAlergia === 'PossuiAlergia' ? form.alergias.trim() : null,
          condicoesCronicas: form.condicoesCronicas,
          vulnerabilidades: form.vulnerabilidades,
          consentimentoRegistro: form.consentimento,
        },
      });

      limpar();
      navegar(`/atendimentos/${prontuario.id}/triagem`, { replace: true });
    } catch (erro) {
      if (erro instanceof ErroDeRede) {
        setErros([t('semConexao')]);
      } else if (erro instanceof ErroApi) {
        setErros(erro.erros);
      } else {
        setErros([t('erroInesperado')]);
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <h1 className="titulo">{t('novoAtendimento')}</h1>

      {recuperado ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-marca-clara/40 bg-marca-clara/10 px-4 py-3 text-sm">
          <span>{t('rascunhoRecuperado')}</span>
          <button type="button" onClick={descartar} className="shrink-0 underline">
            {t('descartarRascunho')}
          </button>
        </div>
      ) : null}

      <Secao titulo={t('dadosPessoais')}>
        <Campo rotulo={t('nome')} obrigatorio>
          <input
            className="campo"
            value={form.nome}
            onChange={(e) => alterar({ nome: e.target.value })}
            required
          />
        </Campo>

        <Campo rotulo={t('tipoDocumento')}>
          <select
            className="campo"
            value={form.tipoDocumento}
            onChange={(e) => alterar({ tipoDocumento: e.target.value as TipoDocumento })}
          >
            {TIPOS_DOCUMENTO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {traduzir(tiposDocumento, idioma, tipo)}
              </option>
            ))}
          </select>
        </Campo>

        {form.tipoDocumento === 'SemDocumento' ? null : (
          <Campo rotulo={t('numeroDocumento')}>
            <input
              className="campo"
              value={form.numeroDocumento}
              onChange={(e) => alterar({ numeroDocumento: e.target.value })}
            />
          </Campo>
        )}

        <Interruptor
          rotulo={t('idadeDesconhecida')}
          valor={form.semDataNascimento}
          aoMudar={(v) => alterar({ semDataNascimento: v })}
        />

        {form.semDataNascimento ? (
          <Campo rotulo={t('idadeAproximada')} obrigatorio>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={130}
              className="campo"
              value={form.idadeAproximada}
              onChange={(e) => alterar({ idadeAproximada: e.target.value })}
              required
            />
          </Campo>
        ) : (
          <Campo rotulo={t('dataNascimento')} obrigatorio>
            <input
              type="date"
              className="campo"
              value={form.dataNascimento}
              onChange={(e) => alterar({ dataNascimento: e.target.value })}
              required
            />
          </Campo>
        )}

        <div>
          <span className="rotulo">{t('sexo')}</span>
          <Opcoes
            valor={form.sexo}
            opcoes={SEXOS}
            aoEscolher={(sexo) => alterar({ sexo })}
            tabela={tabelaSexos}
            idioma={idioma}
          />
        </div>
      </Secao>

      <Secao titulo={t('alergia')}>
        {/*
          Estado explícito em vez de texto livre. No sistema de referência a
          alergia era um campo aberto e o prontuário exibia alerta vermelho para
          qualquer valor preenchido — inclusive "Nega alergia medicamentosa".
        */}
        <div>
          <span className="rotulo">{t('statusAlergia')}</span>
          <Opcoes
            valor={form.statusAlergia}
            opcoes={ESTADOS_ALERGIA}
            aoEscolher={(statusAlergia) =>
              alterar({
                statusAlergia,
                alergias: statusAlergia === 'PossuiAlergia' ? form.alergias : '',
              })
            }
            tabela={tabelaAlergia}
            idioma={idioma}
          />
        </div>

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

        <div>
          <span className="rotulo">{t('nenhum')}</span>
          <Multiplas
            valores={form.condicoesCronicas}
            opcoes={CONDICOES}
            aoAlternar={(condicao) =>
              alterar({
                condicoesCronicas: form.condicoesCronicas.includes(condicao)
                  ? form.condicoesCronicas.filter((c) => c !== condicao)
                  : [...form.condicoesCronicas, condicao],
              })
            }
            tabela={tabelaCondicoes}
            idioma={idioma}
          />
        </div>

        <div>
          <Multiplas
            valores={form.vulnerabilidades}
            opcoes={VULNERABILIDADES}
            aoAlternar={(v) =>
              alterar({
                vulnerabilidades: form.vulnerabilidades.includes(v)
                  ? form.vulnerabilidades.filter((x) => x !== v)
                  : [...form.vulnerabilidades, v],
              })
            }
            tabela={tabelaVulnerabilidades}
            idioma={idioma}
          />
        </div>
      </Secao>

      <Secao titulo={t('queixaPrincipal')}>
        <textarea
          className="campo min-h-24"
          value={form.queixaPrincipal}
          onChange={(e) => alterar({ queixaPrincipal: e.target.value })}
        />
      </Secao>

      <Interruptor
        rotulo={t('consentimento')}
        valor={form.consentimento}
        aoMudar={(v) => alterar({ consentimento: v })}
      />

      <Erros erros={erros} />

      <button type="submit" className="botao" disabled={enviando || !form.consentimento}>
        {enviando ? t('carregando') : t('continuar')}
      </button>
    </form>
  );
}

async function obterPosicao(): Promise<{ latitude: number; longitude: number; precisao: number } | null> {
  if (!navigator.geolocation) return null;

  return new Promise((resolver) => {
    navigator.geolocation.getCurrentPosition(
      (posicao) =>
        resolver({
          latitude: posicao.coords.latitude,
          longitude: posicao.coords.longitude,
          precisao: posicao.coords.accuracy,
        }),
      () => resolver(null),
      { timeout: 5000, maximumAge: 60_000 },
    );
  });
}
