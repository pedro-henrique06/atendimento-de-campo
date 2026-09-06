import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type { Dispensacao, EsperaFila, Prontuario as ProntuarioDto } from '../api/tipos';
import { AlertaAlergia, Carregando, Erros, Etiqueta, PontoRisco, Secao } from '../componentes/Basicos';
import { Encaminhar } from '../componentes/Encaminhar';
import { Odontograma } from '../componentes/Odontograma';
import { useI18n, traduzir } from '../i18n';
import { traduzirCampoAuditoria, traduzirValorAuditoria } from '../i18n/auditoria';
import {
  acoesAuditoria,
  classificacoes,
  desfechos,
  especialidades,
  faixasImc,
  procedimentosOdontologicos,
  sexos,
  sintomas as tabelaSintomas,
  statusAtendimento,
  tiposDocumento,
  unidades,
  vias,
} from '../i18n/enums';

function Linha({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  if (valor === null || valor === undefined || valor === '') return null;

  return (
    <div className="grid grid-cols-[minmax(0,9rem)_1fr] gap-3 py-1.5">
      <dt className="text-sm text-texto-suave">{rotulo}</dt>
      <dd className="text-sm">{valor}</dd>
    </div>
  );
}

function ListaItens({ itens }: { itens: Dispensacao[] }) {
  const { t, idioma } = useI18n();

  if (itens.length === 0) return <p className="text-sm text-texto-suave">{t('semItens')}</p>;

  return (
    <ul className="space-y-1 text-sm">
      {itens.map((item) => (
        <li key={item.id}>
          · {item.quantidade} {traduzir(unidades, idioma, item.unidade)} — {item.item}
          {item.via ? ` · ${traduzir(vias, idioma, item.via)}` : ''}
          {item.posologia ? ` · ${item.posologia}` : ''}
          {item.foraDoCatalogo ? (
            <span className="ml-2 text-amarelo">({t('itemForaCatalogo')})</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function TempoNasFilas({ filas }: { filas: EsperaFila[] }) {
  const { t, idioma } = useI18n();

  return (
    <ul className="space-y-2 text-sm">
      {filas.map((fila) => (
        <li key={`${fila.especialidade}-${fila.entrouEm}`} className="border-l-2 border-borda pl-3">
          <span className="font-semibold">{traduzir(especialidades, idioma, fila.especialidade)}</span>{' '}
          <span className="text-texto-suave">
            {t('entrou')} {new Date(fila.entrouEm).toLocaleTimeString(undefined, { timeStyle: 'short' })}
            {fila.esperaMinutos !== null
              ? ` · ${t('esperou')} ${fila.esperaMinutos} ${t('minutos')}`
              : ''}
            {fila.saiuEm
              ? ` · ${t('saiu')} ${new Date(fila.saiuEm).toLocaleTimeString(undefined, { timeStyle: 'short' })}`
              : ` · ${t('aguardando')}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Prontuario() {
  const { t, idioma } = useI18n();
  const { id = '' } = useParams();

  const [prontuario, setProntuario] = useState<ProntuarioDto | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [copiado, setCopiado] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [reabrindo, setReabrindo] = useState(false);

  const carregar = useCallback(() => {
    api
      .prontuario(id)
      .then(setProntuario)
      .catch((erro) => {
        setErros([erro instanceof ErroDeRede ? t('semConexao') : t('erroInesperado')]);
      });
  }, [id, t]);

  useEffect(carregar, [carregar]);

  async function finalizar() {
    setErros([]);

    try {
      await api.finalizar(id);
      carregar();
    } catch (erro) {
      if (erro instanceof ErroApi) setErros(erro.erros);
      else if (erro instanceof ErroDeRede) setErros([t('semConexao')]);
      else setErros([t('erroInesperado')]);
    }
  }

  async function reabrir() {
    setErros([]);

    try {
      await api.reabrir(id, justificativa.trim());
      setJustificativa('');
      setReabrindo(false);
      carregar();
    } catch (erro) {
      if (erro instanceof ErroApi) setErros(erro.erros);
      else if (erro instanceof ErroDeRede) setErros([t('semConexao')]);
      else setErros([t('erroInesperado')]);
    }
  }

  if (!prontuario) {
    return erros.length > 0 ? (
      <div className="mx-auto max-w-3xl px-4 py-5">
        <Erros erros={erros} />
      </div>
    ) : (
      <Carregando texto={t('carregando')} />
    );
  }

  const paciente = prontuario.paciente;
  const finalizado = prontuario.status === 'Finalizado';

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="titulo">{prontuario.codigo}</h1>
        <button
          type="button"
          className="botao-secundario"
          onClick={() => {
            navigator.clipboard?.writeText(prontuario.codigo);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
          }}
        >
          {copiado ? t('copiado') : t('copiar')}
        </button>
        <Etiqueta tom={finalizado ? 'sucesso' : 'neutro'}>
          {traduzir(statusAtendimento, idioma, prontuario.status)}
        </Etiqueta>
      </div>

      <div className="cartao space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-lg font-bold">{paciente.nome}</span>
          <span className="text-sm text-texto-suave">
            {paciente.idade !== null ? `${paciente.idade} ${t('anos')} · ` : ''}
            {traduzir(sexos, idioma, paciente.sexo)}
            {paciente.numeroDocumento ? ` · ${paciente.numeroDocumento}` : ''}
          </span>
        </div>

        <AlertaAlergia exibir={paciente.alerta.exibir} texto={paciente.alerta.texto} />

        <div className="flex items-center gap-2 text-sm">
          <PontoRisco risco={prontuario.classificacaoRisco} />
          <span>{traduzir(classificacoes, idioma, prontuario.classificacaoRisco)}</span>
        </div>

        {/*
          Quando o atendimento foi aberto e por quem. O dado já estava gravado
          desde sempre e nunca aparecia — e é o que responde "há quanto tempo
          essa pessoa está aqui", que é a primeira pergunta de quem chega no
          meio do plantão.
        */}
        <p className="border-t border-borda pt-3 text-sm text-texto-suave">
          {t('abertoEm')} {new Date(prontuario.criadoEm).toLocaleString()} · {prontuario.criadoPor}
        </p>
      </div>

      <Erros erros={erros} />

      <Encaminhar prontuario={prontuario} aoEncaminhar={setProntuario} />

      <Secao titulo={t('dadosPessoais')} autor={prontuario.criadoPor}>
        <dl className="divide-y divide-borda">
          <Linha rotulo={t('consentimento')} valor={paciente.consentimentoRegistro ? t('sim') : t('nao')} />
          <Linha rotulo={t('nome')} valor={paciente.nome} />
          <Linha rotulo={t('tipoDocumento')} valor={traduzir(tiposDocumento, idioma, paciente.tipoDocumento)} />
          <Linha rotulo={t('numeroDocumento')} valor={paciente.numeroDocumento} />
          <Linha rotulo={t('cartaoSus')} valor={paciente.cartaoSus} />
          <Linha rotulo={t('comunidade')} valor={paciente.comunidade} />
          <Linha
            rotulo={t('dataNascimento')}
            valor={
              paciente.dataNascimento
                ? `${new Date(paciente.dataNascimento).toLocaleDateString()} (${paciente.idade} ${t('anos')})`
                : null
            }
          />
          <Linha rotulo={t('sexo')} valor={traduzir(sexos, idioma, paciente.sexo)} />
          {/*
            Só aparecem para menor: num adulto seriam duas linhas vazias em toda
            ficha, e linha vazia treina a equipe a parar de ler.
          */}
          {paciente.ehMenor ? (
            <>
              <Linha rotulo={t('nomeDaMae')} valor={paciente.nomeDaMae} />
              <Linha rotulo={t('endereco')} valor={paciente.endereco} />
            </>
          ) : null}
        </dl>
      </Secao>

      {prontuario.triagem ? (
        <Secao titulo={t('triagem')} autor={prontuario.triagem.profissional}>
          <dl className="divide-y divide-borda">
            <Linha
              rotulo={t('pressaoArterial')}
              valor={
                prontuario.triagem.pressaoSistolica
                  ? `${prontuario.triagem.pressaoSistolica}x${prontuario.triagem.pressaoDiastolica}`
                  : null
              }
            />
            <Linha rotulo={t('frequenciaCardiaca')} valor={prontuario.triagem.frequenciaCardiaca} />
            <Linha rotulo={t('frequenciaRespiratoria')} valor={prontuario.triagem.frequenciaRespiratoria} />
            <Linha rotulo={t('saturacaoO2')} valor={prontuario.triagem.saturacaoO2} />
            <Linha rotulo={t('temperatura')} valor={prontuario.triagem.temperaturaCelsius} />
            <Linha rotulo={t('glicemia')} valor={prontuario.triagem.glicemiaCapilar} />
            <Linha rotulo={t('peso')} valor={prontuario.triagem.pesoKg} />
            <Linha rotulo={t('altura')} valor={prontuario.triagem.alturaCm} />
            <Linha
              rotulo={t('imc')}
              valor={
                prontuario.triagem.imc === null
                  ? null
                  : /*
                      A faixa só vem do servidor quando a idade permite lê-la: em
                      criança o IMC se lê em curva, e o corte de adulto diria
                      "baixo peso" para uma criança saudável.
                    */
                    `${prontuario.triagem.imc.toFixed(1)}${
                      prontuario.triagem.faixaImc
                        ? ` · ${traduzir(faixasImc, idioma, prontuario.triagem.faixaImc)}`
                        : ''
                    }`
              }
            />
            <Linha
              rotulo={t('escalaDor')}
              valor={
                // Zero é resposta, e `?? null` deixaria o 0 passar como valor —
                // que é o que se quer. Só o nulo significa "não perguntei".
                prontuario.triagem.escalaDor === null ? null : `${prontuario.triagem.escalaDor} / 10`
              }
            />
            <Linha
              rotulo={t('sintomasAtuais')}
              valor={prontuario.triagem.sintomas
                .map((s) => traduzir(tabelaSintomas, idioma, s))
                .join(', ')}
            />
            <Linha rotulo={t('outroSintoma')} valor={prontuario.triagem.outroSintoma} />
            <Linha rotulo={t('medicamentosEmUso')} valor={prontuario.triagem.medicamentosEmUso} />
            <Linha
              rotulo={t('classificacaoRisco')}
              valor={traduzir(classificacoes, idioma, prontuario.triagem.classificacaoRisco)}
            />
            <Linha
              rotulo={t('encaminhamento')}
              valor={
                prontuario.triagem.encaminhamento
                  ? traduzir(especialidades, idioma, prontuario.triagem.encaminhamento)
                  : null
              }
            />
            <Linha rotulo={t('observacoes')} valor={prontuario.triagem.observacoes} />
          </dl>
        </Secao>
      ) : null}

      {prontuario.consultas.map((consulta) => (
        <Secao
          key={consulta.etapaId}
          titulo={traduzir(especialidades, idioma, consulta.especialidade)}
          autor={consulta.profissional}
        >
          <dl className="divide-y divide-borda">
            <Linha rotulo={t('sintomas')} valor={consulta.sintomasDescricao} />
            <Linha
              rotulo={t('diagnostico')}
              valor={
                consulta.cid10Codigo
                  ? `${consulta.cid10Codigo} — ${consulta.cid10Descricao ?? ''}`
                  : null
              }
            />
            <Linha rotulo={t('observacaoDiagnostico')} valor={consulta.diagnosticoObservacao} />
            <Linha rotulo={t('conduta')} valor={consulta.conduta} />
            <Linha rotulo={t('localizacaoLesao')} valor={consulta.ortopedia?.localizacao} />
            <Linha rotulo={t('mecanismoTrauma')} valor={consulta.ortopedia?.mecanismoTrauma} />
            <Linha
              rotulo={t('imobilizacao')}
              valor={consulta.ortopedia ? (consulta.ortopedia.imobilizacao ? t('sim') : t('nao')) : null}
            />
            <Linha
              rotulo={t('necessitaRaioX')}
              valor={consulta.ortopedia ? (consulta.ortopedia.necessitaRaioX ? t('sim') : t('nao')) : null}
            />
            <Linha
              rotulo={t('desfecho')}
              valor={consulta.desfecho ? traduzir(desfechos, idioma, consulta.desfecho) : null}
            />
          </dl>

          <div>
            <h3 className="rotulo">{t('dispensacao')}</h3>
            <ListaItens itens={consulta.dispensacoes} />
          </div>
        </Secao>
      ))}

      {prontuario.odontologia ? (
        <Secao titulo={t('odontologia')} autor={prontuario.odontologia.profissional}>
          <dl className="divide-y divide-borda">
            <Linha rotulo={t('sintomas')} valor={prontuario.odontologia.queixa} />
            <Linha
              rotulo={t('diagnostico')}
              valor={
                prontuario.odontologia.cid10Codigo
                  ? `${prontuario.odontologia.cid10Codigo} — ${prontuario.odontologia.cid10Descricao ?? ''}`
                  : null
              }
            />
            <Linha
              rotulo={t('procedimentosRealizados')}
              valor={prontuario.odontologia.procedimentos
                .map((p) => traduzir(procedimentosOdontologicos, idioma, p))
                .join(', ')}
            />
            <Linha
              rotulo={t('desfecho')}
              valor={
                prontuario.odontologia.desfecho
                  ? traduzir(desfechos, idioma, prontuario.odontologia.desfecho)
                  : null
              }
            />
          </dl>

          <div>
            <h3 className="rotulo">{t('odontograma')}</h3>
            <Odontograma marcacoes={prontuario.odontologia.odontograma} somenteLeitura />
          </div>

          <div>
            <h3 className="rotulo">{t('dispensacao')}</h3>
            <ListaItens itens={prontuario.odontologia.dispensacoes} />
          </div>
        </Secao>
      ) : null}

      {prontuario.localizacao ? (
        <div className="cartao text-sm">
          <span className="font-semibold">{t('localizacaoAtendimento')}: </span>
          <a
            className="text-marca-clara underline"
            href={`https://www.openstreetmap.org/?mlat=${prontuario.localizacao.latitude}&mlon=${prontuario.localizacao.longitude}#map=17/${prontuario.localizacao.latitude}/${prontuario.localizacao.longitude}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            {prontuario.localizacao.latitude.toFixed(5)}, {prontuario.localizacao.longitude.toFixed(5)}
            {prontuario.localizacao.precisaoMetros
              ? ` (±${Math.round(prontuario.localizacao.precisaoMetros)} m)`
              : ''}{' '}
            · {t('verNoMapa')}
          </a>
        </div>
      ) : null}

      <details className="cartao">
        <summary className="cursor-pointer font-semibold text-marca-clara">{t('tempoNasFilas')}</summary>
        <div className="mt-3">
          <TempoNasFilas filas={prontuario.tempoNasFilas} />
        </div>
      </details>

      <details className="cartao">
        <summary className="cursor-pointer font-semibold text-marca-clara">
          {t('historicoAlteracoes')} ({prontuario.historico.length})
        </summary>
        <ul className="mt-3 space-y-3 text-sm">
          {prontuario.historico.map((registro, indice) => (
            <li
              key={`${registro.criadaEm}-${indice}`}
              className={`border-l-2 pl-3 ${
                registro.acao === 'EditouAposFinalizacao' ? 'border-amarelo' : 'border-borda'
              }`}
            >
              <div>
                <span className="font-semibold">{registro.profissional}</span>{' '}
                <span className="text-texto-suave">
                  {traduzir(acoesAuditoria, idioma, registro.acao)}
                  {registro.especialidade
                    ? ` (${traduzir(especialidades, idioma, registro.especialidade)})`
                    : ''}{' '}
                  · {new Date(registro.criadaEm).toLocaleString()}
                </span>
              </div>

              {/*
                A auditoria guarda chave e valor canônicos; a tradução acontece
                aqui, no idioma de quem está lendo. Gravar o rótulo pronto
                congelaria o histórico no idioma de quem digitou e faria o nome
                do enum vazar para a tela.
              */}
              {registro.campo ? (
                <div className="mt-1">
                  <span className="font-medium">
                    {traduzirCampoAuditoria(registro.campo, idioma)}:
                  </span>{' '}
                  <span className="text-vermelho">
                    {traduzirValorAuditoria(registro.campo, registro.valorAnterior, idioma)}
                  </span>
                  {' → '}
                  <span className="text-verde">
                    {traduzirValorAuditoria(registro.campo, registro.valorNovo, idioma)}
                  </span>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </details>

      {finalizado ? (
        <div className="cartao space-y-3">
          <p className="text-sm text-texto-suave">
            {t('finalizadoPor')}: {prontuario.finalizadoPor} ·{' '}
            {prontuario.finalizadoEm ? new Date(prontuario.finalizadoEm).toLocaleString() : ''}
          </p>

          {/*
            Reabrir exige motivo. Corrigir registro em campo é legítimo, mas a
            edição posterior precisa deixar rastro — no sistema antigo ela não
            deixava nenhum.
          */}
          {reabrindo ? (
            <div className="space-y-3">
              <label className="block">
                <span className="rotulo">{t('justificativaReabertura')}</span>
                <textarea
                  className="campo min-h-20"
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="botao"
                  onClick={reabrir}
                  disabled={justificativa.trim().length === 0}
                >
                  {t('reabrir')}
                </button>
                <button type="button" className="botao-secundario" onClick={() => setReabrindo(false)}>
                  {t('cancelar')}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="botao-secundario w-full" onClick={() => setReabrindo(true)}>
              {t('reabrir')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Link className="botao-secundario" to={`/atendimentos/${id}/triagem`}>
              {t('triagem')}
            </Link>
            <Link className="botao-secundario" to={`/atendimentos/${id}/consulta/ClinicaGeral`}>
              {t('consulta')}
            </Link>
            <Link className="botao-secundario" to={`/atendimentos/${id}/odontologia`}>
              {t('odontologia')}
            </Link>
          </div>

          <button type="button" className="botao" onClick={finalizar}>
            {t('finalizar')}
          </button>
        </div>
      )}
    </div>
  );
}
