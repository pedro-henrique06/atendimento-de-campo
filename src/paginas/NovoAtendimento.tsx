import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type {
  Comunidade,
  CondicaoCronica,
  PacienteConhecido,
  Sexo,
  StatusAlergia,
  TipoDocumento,
  Vulnerabilidade,
} from '../api/tipos';
import { Campo, Erros, Interruptor, Multiplas, Opcoes, Secao } from '../componentes/Basicos';
import { CodigoPaciente } from '../componentes/CodigoPaciente';
import { EscolhaDePaciente } from '../componentes/EscolhaDePaciente';
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
  /** Vazio enquanto ninguem escolheu entre paciente novo e paciente conhecido. */
  codigo: string;
  /** Verdadeiro quando o cadastro veio de um codigo que ja existia. */
  jaCadastrado: boolean;
  nome: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  cartaoSus: string;
  comunidadeId: string;
  nomeDaMae: string;
  endereco: string;
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
  codigo: '',
  jaCadastrado: false,
  nome: '',
  tipoDocumento: 'SemDocumento',
  numeroDocumento: '',
  cartaoSus: '',
  comunidadeId: '',
  nomeDaMae: '',
  endereco: '',
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

/** Maioridade civil no Brasil, no Panamá e na Venezuela. Espelha `RegrasDoMenor`. */
const MAIORIDADE = 18;

/** Anos completos desde a data informada; nulo se ela estiver vazia ou inválida. */
function anosDesde(dataIso: string): number | null {
  if (!dataIso) return null;

  const nascimento = new Date(dataIso);
  if (Number.isNaN(nascimento.getTime())) return null;

  const hoje = new Date();
  let anos = hoje.getFullYear() - nascimento.getFullYear();

  const aniversario = new Date(nascimento);
  aniversario.setFullYear(nascimento.getFullYear() + anos);

  // Ainda não fez aniversário neste ano.
  if (hoje < aniversario) anos--;

  return anos;
}

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
  const [comunidades, setComunidades] = useState<Comunidade[]>([]);

  useEffect(() => {
    // Falha silenciosa de propósito: a comunidade é opcional, e sem sinal o
    // cadastro precisa seguir em vez de travar num campo que não é obrigatório.
    api.comunidades().then(setComunidades).catch(() => setComunidades([]));
  }, []);

  /*
    A regra do menor vale pela idade calculada, e não por um campo à parte:
    assim ela pega tanto quem informou a data de nascimento quanto quem só soube
    dizer a idade aproximada.

    Idade desconhecida não presume menor — em campo boa parte dos pacientes
    chega sem saber a própria idade, e exigir nome da mãe de um adulto ensinaria
    a recepção a inventar dado.
  */
  const idade = form.semDataNascimento
    ? Number(form.idadeAproximada) || null
    : anosDesde(form.dataNascimento);

  const ehMenor = idade !== null && idade < MAIORIDADE;

  function alterar(mudanca: Partial<Formulario>) {
    setForm({ ...form, ...mudanca });
  }

  /** Paciente novo: o codigo ja sorteado passa a ser o do cadastro que vai nascer. */
  function comecarComCodigo(codigo: string) {
    setForm({ ...INICIAL, codigo, jaCadastrado: false });
  }

  /**
   * Paciente conhecido: traz o cadastro para a tela em vez de pedir tudo de
   * novo. Quem esta atendendo confere e corrige o que mudou — redigitar nome,
   * idade e alergia a cada visita e como o dado se perde.
   */
  function comecarComCadastro({ paciente }: PacienteConhecido) {
    setForm({
      ...INICIAL,
      codigo: paciente.codigo,
      jaCadastrado: true,
      nome: paciente.nome,
      tipoDocumento: paciente.tipoDocumento,
      numeroDocumento: paciente.numeroDocumento ?? '',
      cartaoSus: paciente.cartaoSus ?? '',
      comunidadeId: paciente.comunidadeId ?? '',
      nomeDaMae: paciente.nomeDaMae ?? '',
      endereco: paciente.endereco ?? '',
      semDataNascimento: paciente.dataNascimento === null,
      dataNascimento: paciente.dataNascimento ?? '',
      idadeAproximada: paciente.dataNascimento === null ? String(paciente.idade ?? '') : '',
      sexo: paciente.sexo,
      statusAlergia: paciente.statusAlergia,
      alergias: paciente.alergias ?? '',
      condicoesCronicas: paciente.condicoesCronicas,
      vulnerabilidades: paciente.vulnerabilidades,
      // O consentimento e por atendimento: e perguntado de novo a cada visita,
      // nao herdado do cadastro antigo.
      consentimento: false,
    });
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
          codigo: form.codigo,
          nome: form.nome.trim(),
          tipoDocumento: form.tipoDocumento,
          numeroDocumento: form.numeroDocumento.trim() || null,
          cartaoSus: form.cartaoSus.trim() || null,
          comunidadeId: form.comunidadeId || null,
          nomeDaMae: form.nomeDaMae.trim() || null,
          endereco: form.endereco.trim() || null,
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

  if (!form.codigo) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <h1 className="titulo">{t('novoAtendimento')}</h1>

        <EscolhaDePaciente
          aoEscolherNovo={comecarComCodigo}
          aoEscolherConhecido={comecarComCadastro}
        />
      </div>
    );
  }

  return (
    <form onSubmit={aoEnviar} className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <h1 className="titulo">{t('novoAtendimento')}</h1>

      <CodigoPaciente codigo={form.codigo} />

      {/*
        Codigo errado e digitacao errada: sem esta saida, a unica forma de
        corrigir seria salvar o atendimento na pessoa errada.
      */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        {form.jaCadastrado ? (
          <span className="text-texto-suave">{t('pacienteEncontrado')}</span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setForm({ ...INICIAL })}
          className="text-marca-clara underline"
        >
          {t('trocarPaciente')}
        </button>
      </div>

      {recuperado ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-marca-clara/40 bg-marca-clara/10 px-4 py-3 text-sm">
          <span>{t('rascunhoRecuperado')}</span>
          <button type="button" onClick={descartar} className="shrink-0 underline">
            {t('descartarRascunho')}
          </button>
        </div>
      ) : null}

      <Secao titulo={t('dadosPessoais')}>
        {/*
          O consentimento vem antes de tudo, e desabilita o resto enquanto nao
          for marcado. Perguntar depois do formulario preenchido inverte a
          ordem: o dado ja teria sido digitado sem a pessoa ter concordado.
        */}
        <Interruptor
          rotulo={t('consentimento')}
          valor={form.consentimento}
          aoMudar={(v) => alterar({ consentimento: v })}
        />
        <p className="text-sm text-texto-suave">{t('consentimentoObrigatorio')}</p>

        <fieldset disabled={!form.consentimento} className="space-y-4 disabled:opacity-50">
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

        {/*
          Fora do bloco do documento de propósito: a pessoa pode ter RG *e*
          cartão do SUS, e como tipo de documento um excluiria o outro.
        */}
        <Campo rotulo={t('cartaoSus')}>
          <input
            className="campo"
            inputMode="numeric"
            value={form.cartaoSus}
            onChange={(e) => alterar({ cartaoSus: e.target.value })}
          />
        </Campo>

        <Campo rotulo={t('comunidade')}>
          {comunidades.length === 0 ? (
            // Lista fechada: sem nenhuma cadastrada, não há o que oferecer — e
            // cair em texto livre aqui produziria as três grafias que a lista
            // veio evitar.
            <p className="text-sm text-texto-suave">{t('nenhumaComunidadeCadastrada')}</p>
          ) : (
            <select
              className="campo"
              value={form.comunidadeId}
              onChange={(e) => alterar({ comunidadeId: e.target.value })}
            >
              <option value="">{t('semComunidade')}</option>
              {comunidades.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          )}
        </Campo>

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

        {/*
          Só para menor de idade. Em campo a criança costuma chegar acompanhada
          de quem não é o responsável legal, e são estes dois campos que
          permitem reencontrar a família depois.
        */}
        {ehMenor ? (
          <>
            <Campo rotulo={t('nomeDaMae')} obrigatorio dica={t('exigidoParaMenor')}>
              <input
                className="campo"
                value={form.nomeDaMae}
                onChange={(e) => alterar({ nomeDaMae: e.target.value })}
                required
              />
            </Campo>

            <Campo rotulo={t('endereco')} obrigatorio dica={t('exigidoParaMenor')}>
              <input
                className="campo"
                value={form.endereco}
                onChange={(e) => alterar({ endereco: e.target.value })}
                required
              />
            </Campo>
          </>
        ) : null}

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
        </fieldset>
      </Secao>

      <fieldset disabled={!form.consentimento} className="space-y-4 disabled:opacity-50">
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

      <Erros erros={erros} />

      <button type="submit" className="botao" disabled={enviando}>
        {enviando ? t('carregando') : t('continuar')}
      </button>
      </fieldset>
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
