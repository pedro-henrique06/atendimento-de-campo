import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import { FILAS } from '../api/tipos';
import type {
  AtendimentoResumo,
  ClassificacaoRisco,
  Especialidade,
  EtapaResumo,
} from '../api/tipos';
import { BarraDaPagina } from '../componentes/BarraDaPagina';
import { Carregando, Erros, EtiquetaRisco, PontoRisco, Vazio } from '../componentes/Basicos';
import { Cronometro, Espera } from '../componentes/Cronometro';
import { IconeConcluido, IconePendente } from '../componentes/Icones';
import { useSessao } from '../hooks/useSessao';
import { useI18n, traduzir } from '../i18n';
import {
  classificacoesCurtas,
  especialidades,
  statusAtendimento,
  statusEtapa,
} from '../i18n/enums';

const RISCOS: ClassificacaoRisco[] = ['Vermelho', 'Amarelo', 'Verde', 'Preto'];

/**
 * De quanto em quanto tempo a fila se atualiza sozinha.
 *
 * Sem isso, quem recebia um encaminhamento não tinha como saber: a lista era
 * carregada uma vez e ficava parada até alguém recarregar a página. Quinze
 * segundos deixa a fila viva sem transformar o plantão em tráfego constante —
 * e é bem menos do que o tempo de atravessar o posto até a próxima sala.
 */
export const INTERVALO_ATUALIZACAO = 15_000;

/** "Meus" é uma fila a mais na barra, mas filtra por quem assumiu, não por especialidade. */
type Aba = Especialidade | 'Todas' | 'Meus';

/**
 * A etapa que esta aba está olhando.
 *
 * Numa fila de especialidade é a etapa dela. Em "Meus" é a que está comigo, e em
 * "Todas" é a que tem dono — ali a lista mistura filas, e a etapa a mostrar
 * seria uma escolha arbitrária entre elas.
 */
function etapaRelevante(
  atendimento: AtendimentoResumo,
  aba: Aba,
  meuNome: string | null,
): EtapaResumo | undefined {
  const abertas = atendimento.etapas.filter((e) => e.status !== 'Concluida');

  if (aba === 'Meus') return abertas.find((e) => e.profissional === meuNome);
  if (aba === 'Todas') return abertas.find((e) => e.profissional !== null);

  return abertas.find((e) => e.especialidade === aba);
}

export function ListaAtendimentos() {
  const { t, idioma } = useI18n();
  const { base, profissional } = useSessao();
  const navegar = useNavigate();

  /*
    A barra abre na fila da função de quem entrou, e lista as filas dela
    primeiro. Antes abria sempre em "Triagem": o dentista entrava e via a fila
    da enfermagem, tendo que descobrir sozinho onde ficava a dele.

    Não é permissão — "Todas" continua ali, e em campo as funções se cobrem.
  */
  const filasDaFuncao = profissional?.filas ?? [];
  const outrasFilas = FILAS.filter((f) => !filasDaFuncao.includes(f));

  const [atendimentos, setAtendimentos] = useState<AtendimentoResumo[] | null>(null);
  const [aba, setAba] = useState<Aba>(filasDaFuncao[0] ?? 'Todas');
  const [assumindo, setAssumindo] = useState<string | null>(null);
  const [risco, setRisco] = useState<ClassificacaoRisco | null>(null);
  const [busca, setBusca] = useState('');
  const [erros, setErros] = useState<string[]>([]);

  /*
    Toda busca leva um número e só a mais recente pode escrever na tela. Com a
    atualização periódica ligada há sempre duas em voo: a resposta lenta da fila
    anterior chega depois da troca de aba e mostraria a fila errada.
  */
  const requisicao = useRef(0);

  const carregar = useCallback(
    async (silenciosa = false) => {
      if (!base) return;
      if (!silenciosa) setErros([]);

      const minha = ++requisicao.current;

      try {
        const lista = await api.atendimentos({
          baseId: base.id,
          fila: aba === 'Todas' || aba === 'Meus' ? null : aba,
          risco,
          busca: busca.trim() || undefined,
          meus: aba === 'Meus',
          // Só a fila de uma especialidade esconde o que já está com outra
          // pessoa. Em "Todas" a coordenação precisa enxergar a operação inteira.
          ocultarAssumidos: aba !== 'Todas' && aba !== 'Meus',
        });

        if (minha !== requisicao.current) return;
        setAtendimentos(lista);
      } catch (erro) {
        if (minha !== requisicao.current) return;

        /*
          Falha na atualização de fundo não apaga a lista nem acusa erro: em
          campo o sinal cai o tempo todo, e uma fila que some sozinha a cada
          quinze segundos é pior que uma fila desatualizada.
        */
        if (silenciosa) return;

        setAtendimentos([]);
        setErros([erro instanceof ErroDeRede ? t('semConexao') : t('erroInesperado')]);
      }
    },
    [base, aba, risco, busca, t],
  );

  useEffect(() => {
    const timer = setTimeout(() => carregar(), busca ? 300 : 0);
    return () => clearTimeout(timer);
  }, [carregar, busca]);

  /*
    A atualização periódica só corre com a aba à vista. O aparelho passa boa
    parte do plantão no bolso, e buscar uma lista que ninguém está olhando gasta
    bateria e dados à toa. Ao voltar, busca na hora — é justamente o momento em
    que a pessoa olha a fila.
  */
  useEffect(() => {
    let intervalo: ReturnType<typeof setInterval> | null = null;

    function parar() {
      if (intervalo === null) return;
      clearInterval(intervalo);
      intervalo = null;
    }

    function comecar() {
      parar();
      intervalo = setInterval(() => carregar(true), INTERVALO_ATUALIZACAO);
    }

    function aoMudarVisibilidade() {
      if (document.visibilityState !== 'visible') {
        parar();
        return;
      }

      carregar(true);
      comecar();
    }

    if (document.visibilityState === 'visible') comecar();
    document.addEventListener('visibilitychange', aoMudarVisibilidade);

    return () => {
      parar();
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
    };
  }, [carregar]);

  async function alternarPosse(
    atendimentoId: string,
    especialidade: Especialidade,
    souEu: boolean,
  ) {
    setErros([]);
    setAssumindo(atendimentoId);

    try {
      if (souEu) await api.liberarEtapa(atendimentoId, especialidade);
      else await api.assumirEtapa(atendimentoId, especialidade);

      await carregar();
    } catch (erro) {
      // A recusa do servidor diz com quem o atendimento está. Trocar isso por
      // um erro genérico deixaria a equipe sem saber a quem perguntar.
      if (erro instanceof ErroApi) setErros(erro.erros);
      else if (erro instanceof ErroDeRede) setErros([t('semConexao')]);
      else setErros([t('erroInesperado')]);
    } finally {
      setAssumindo(null);
    }
  }

  /*
    O agrupamento só faz sentido numa fila de especialidade: é lá que a lista
    traz os que ninguém pegou junto dos que estão comigo. Em "Meus" tudo já é
    meu, e em "Todas" a lista mistura filas.
  */
  const agrupar = aba !== 'Todas' && aba !== 'Meus';
  const meuNome = profissional?.nome ?? null;

  const atendendo = (atendimentos ?? []).filter((a) => {
    const etapa = etapaRelevante(a, aba, meuNome);
    return etapa?.status === 'EmAndamento' && etapa.profissional === meuNome;
  });

  const aguardando = (atendimentos ?? []).filter((a) => !atendendo.includes(a));

  const adereços = (atendimento: AtendimentoResumo) => ({
    atendimento,
    aba,
    meuNome,
    ocupado: assumindo === atendimento.id,
    agrupado: agrupar,
    aoAlternar: alternarPosse,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      {/* Sem voltar: esta é a tela inicial, de onde todo o resto parte. */}
      <BarraDaPagina
        titulo={t('atendimentos')}
        acao={
          <button
            type="button"
            className="botao w-auto px-5"
            onClick={() => navegar('/atendimentos/novo')}
          >
            {t('novo')}
          </button>
        }
      />

      <input
        className="campo"
        placeholder={t('buscarPorCodigoOuNome')}
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1">
          <ChipFiltro ativo={aba === 'Meus'} aoClicar={() => setAba('Meus')}>
            {t('meusAtendimentos')}
          </ChipFiltro>
          {filasDaFuncao.map((f) => (
            <ChipFiltro key={f} ativo={aba === f} aoClicar={() => setAba(f)}>
              {traduzir(especialidades, idioma, f)}
            </ChipFiltro>
          ))}
          <ChipFiltro ativo={aba === 'Todas'} aoClicar={() => setAba('Todas')}>
            {t('todasAsFilas')}
          </ChipFiltro>
          {outrasFilas.map((f) => (
            <ChipFiltro key={f} ativo={aba === f} aoClicar={() => setAba(f)}>
              {traduzir(especialidades, idioma, f)}
            </ChipFiltro>
          ))}
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1">
          <ChipFiltro ativo={risco === null} aoClicar={() => setRisco(null)}>
            {t('total')}
          </ChipFiltro>
          {RISCOS.map((r) => (
            <ChipFiltro key={r} ativo={risco === r} aoClicar={() => setRisco(r)}>
              <span className="flex items-center gap-1.5">
                <PontoRisco risco={r} />
                {traduzir(classificacoesCurtas, idioma, r)}
              </span>
            </ChipFiltro>
          ))}
        </div>
      </div>

      <Erros erros={erros} />

      {atendimentos === null ? (
        <Carregando texto={t('carregando')} />
      ) : atendimentos.length === 0 ? (
        <Vazio texto={aba === 'Meus' ? t('semAtendimentosMeus') : t('filaVazia')} />
      ) : agrupar ? (
        /*
          Numa fila de especialidade a lista vem com os que ninguém pegou mais os
          que estão comigo — a API esconde só o que está com outra pessoa. Sem
          separar os dois, o paciente que estou atendendo agora fica perdido no
          meio da fila de espera.
        */
        <div className="space-y-5">
          {atendendo.length > 0 ? (
            <Grupo titulo={t('atendendoAgora')} total={atendendo.length}>
              {atendendo.map((atendimento) => (
                <Cartao key={atendimento.id} {...adereços(atendimento)} />
              ))}
            </Grupo>
          ) : null}

          {aguardando.length > 0 ? (
            <Grupo titulo={t('aguardandoNaFila')} total={aguardando.length}>
              {aguardando.map((atendimento) => (
                <Cartao key={atendimento.id} {...adereços(atendimento)} />
              ))}
            </Grupo>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {atendimentos.map((atendimento) => (
            <Cartao key={atendimento.id} {...adereços(atendimento)} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Uma seção da fila, com a contagem ao lado do título. */
function Grupo({
  titulo,
  total,
  children,
}: {
  titulo: string;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 flex items-baseline gap-2 text-sm font-semibold uppercase tracking-wide text-texto-suave">
        {titulo}
        <span className="rounded-full bg-superficie-2 px-2 py-0.5 text-xs tabular-nums">
          {total}
        </span>
      </h2>
      <ul className="space-y-3">{children}</ul>
    </section>
  );
}

/**
 * Uma linha da fila.
 *
 * Era um cartão de ~300px para três informações, com uma faixa vazia embaixo só
 * para o botão. Cabiam três pacientes numa tela de celular — numa fila de
 * quarenta pessoas debaixo da lona, isso é rolagem sem fim.
 *
 * O que mudou, e por quê:
 *
 * - **o nome vem inteiro.** Era o código em negrito e o nome truncado depois
 *   dele ("Anaís Palaci…"), e dois pacientes diferentes liam igual. Na tenda se
 *   chama pelo nome; o código serve para cruzar com o papel, e por isso desceu
 *   para a segunda linha, em mono, onde se lê letra por letra;
 * - **o risco vira etiqueta.** Era um ponto de 12px, e é o critério de
 *   ordenação do protocolo START — procurá-lo em vinte cartões é o contrário de
 *   priorizar;
 * - **a espera aparece.** É o outro número da decisão, e não existia em lugar
 *   nenhum da tela;
 * - **"Aguardando" sai do cartão.** O título do grupo logo acima já diz isso,
 *   e repetir em cada linha gasta o canto onde o estado *diferente* — o
 *   atendimento com outra pessoa — precisa aparecer.
 */
function Cartao({
  atendimento,
  aba,
  meuNome,
  ocupado,
  agrupado,
  aoAlternar,
}: {
  atendimento: AtendimentoResumo;
  aba: Aba;
  meuNome: string | null;
  ocupado: boolean;
  /** O grupo acima já diz o estado; repetir na etiqueta seria dizer duas vezes. */
  agrupado: boolean;
  aoAlternar: (id: string, especialidade: Especialidade, souEu: boolean) => void;
}) {
  const { t, idioma } = useI18n();
  const etapa = etapaRelevante(atendimento, aba, meuNome);

  const souEu = etapa?.profissional != null && etapa.profissional === meuNome;
  const deOutro = etapa?.profissional != null && !souEu;

  // Em "Todas" a lista mistura filas e não há etapa óbvia para assumir.
  const podeAgir = aba !== 'Todas' && etapa !== undefined && !deOutro;

  /*
    O selo só aparece quando diz algo que o grupo não disse: fora do
    agrupamento, ou quando o paciente está com outra pessoa.
  */
  const selo = deOutro
    ? etapa!.profissional
    : agrupado
      ? null
      : etapa
        ? traduzir(statusEtapa, idioma, etapa.status)
        : traduzir(statusAtendimento, idioma, atendimento.status);

  return (
    <li>
      <Link
        to={`/atendimentos/${atendimento.id}`}
        className="cartao block space-y-1 p-3 transition hover:border-marca-clara"
      >
        <div className="flex items-start gap-2">
          {/*
            Sem risco não vira etiqueta: na fila da triagem ninguém foi triado
            ainda, e "Sem triagem" repetido em todo cartão é uma coluna inteira
            de ruído. Quem diz que falta triar é a própria fila, logo abaixo.
          */}
          {atendimento.classificacaoRisco ? (
            <EtiquetaRisco risco={atendimento.classificacaoRisco} />
          ) : null}

          {/*
            Sem `truncate`: o nome quebra para a segunda linha em vez de ser
            cortado. Dois "Paciente Da…" na mesma tela não identificam ninguém.
          */}
          <span className="min-w-0 flex-1 font-bold leading-tight">
            {atendimento.pacienteNome}
          </span>

          {/* A espera, que é metade da decisão de quem passa na frente. */}
          {souEu || deOutro ? (
            <Cronometro assumidaEm={etapa!.assumidaEm} />
          ) : (
            <Espera entrouEm={etapa?.entrouNaFilaEm ?? null} />
          )}
        </div>

        {atendimento.resumo ? (
          <p className="line-clamp-2 text-sm text-texto-suave">{atendimento.resumo}</p>
        ) : null}

        {/*
          Código, estado e caminho do paciente numa linha só, com o botão.

          O botão tem 44px de altura — o alvo de toque para quem usa luva e está
          no sol —, então uma linha só para ele deixava um vão morto do tamanho
          dele em todo cartão. Centralizado contra o texto, o mesmo botão não
          gasta altura nenhuma a mais.
        */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-texto-suave">
            <span className="dado">{atendimento.codigo}</span>

            {selo ? (
              <span className="truncate">
                {deOutro ? `${t('emAtendimentoCom')} ${selo}` : selo}
              </span>
            ) : null}

            {souEu ? <span className="font-medium text-marca-clara">{t('comigo')}</span> : null}

            {atendimento.etapas.map((e) => (
              <span
                key={e.id}
                className={`inline-flex items-center gap-1 ${
                  e.status === 'Concluida' ? 'text-verde' : ''
                }`}
              >
                {e.status === 'Concluida' ? (
                  <IconeConcluido className="h-3.5 w-3.5" />
                ) : (
                  <IconePendente className="h-3.5 w-3.5" />
                )}
                {traduzir(especialidades, idioma, e.especialidade)}
              </span>
            ))}
          </div>

          {podeAgir ? (
            <button
              type="button"
              disabled={ocupado}
              onClick={(e) => {
                // O cartão inteiro é um link para o prontuário; sem isto,
                // assumir navegaria para lá no mesmo clique.
                e.preventDefault();
                e.stopPropagation();
                aoAlternar(atendimento.id, etapa!.especialidade, souEu);
              }}
              className="botao-secundario shrink-0 py-1.5"
            >
              {souEu ? t('liberar') : t('assumir')}
            </button>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

function ChipFiltro({
  ativo,
  aoClicar,
  children,
}: {
  ativo: boolean;
  aoClicar: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativo}
      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
        ativo ? 'border-marca bg-marca text-white' : 'border-borda bg-superficie text-texto'
      }`}
    >
      {children}
    </button>
  );
}
