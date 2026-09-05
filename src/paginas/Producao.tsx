import { useCallback, useEffect, useState } from 'react';
import { api, ErroDeRede } from '../api/cliente';
import type { ProducaoProfissional } from '../api/tipos';
import { Carregando, Erros, Vazio } from '../componentes/Basicos';
import { useSessao } from '../hooks/useSessao';
import { useI18n, traduzir } from '../i18n';
import { conselhos, especialidades, funcoes } from '../i18n/enums';

/** Períodos oferecidos. Sete dias é o padrão da API quando nada é informado. */
const PERIODOS = [1, 7, 30] as const;

type Periodo = (typeof PERIODOS)[number];

/**
 * Início do dia local, e não UTC.
 *
 * "Hoje" para quem está no plantão é o dia do relógio dele. Cortar em UTC faria
 * o relatório da manhã no Panamá mostrar metade da véspera.
 */
function inicioDeDiasAtras(dias: number): Date {
  const data = new Date();
  data.setDate(data.getDate() - (dias - 1));
  data.setHours(0, 0, 0, 0);

  return data;
}

function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos}min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return resto === 0 ? `${horas}h` : `${horas}h${String(resto).padStart(2, '0')}`;
}

/**
 * Produção por profissional.
 *
 * Não há dado novo aqui: cada etapa já gravava quem atendeu, quando começou e
 * quando terminou. O que faltava era a leitura — e sem ela a coordenação não
 * tinha como responder quantos pacientes cada pessoa atendeu nem que fila
 * consome o plantão, que é o que decide escala.
 *
 * Quem não é coordenação vê só a própria produção, e é a API que decide isso.
 */
export function Producao() {
  const { t, idioma } = useI18n();
  const { base, profissional } = useSessao();

  const [periodo, setPeriodo] = useState<Periodo>(7);
  const [linhas, setLinhas] = useState<ProducaoProfissional[] | null>(null);
  const [erros, setErros] = useState<string[]>([]);

  const carregar = useCallback(() => {
    if (!base) return;

    setErros([]);

    api
      .producao({ baseId: base.id, de: inicioDeDiasAtras(periodo) })
      .then(setLinhas)
      .catch((e) => {
        setLinhas([]);
        setErros([e instanceof ErroDeRede ? t('semConexao') : t('erroInesperado')]);
      });
  }, [base, periodo, t]);

  useEffect(carregar, [carregar]);

  const totalAtendimentos = (linhas ?? []).reduce((soma, l) => soma + l.atendimentos, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <div>
        <h1 className="titulo">{t('producao')}</h1>
        <p className="mt-1 text-sm text-texto-suave">
          {profissional?.ehAdministrador ? t('producaoSubtitulo') : t('producaoSubtituloPropria')}
        </p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1">
          {PERIODOS.map((dias) => (
            <button
              key={dias}
              type="button"
              onClick={() => setPeriodo(dias)}
              aria-pressed={periodo === dias}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                periodo === dias
                  ? 'border-marca bg-marca text-white'
                  : 'border-borda bg-superficie text-texto'
              }`}
            >
              {dias === 1 ? t('hoje') : t('ultimosDias').replace('{dias}', String(dias))}
            </button>
          ))}
        </div>
      </div>

      <Erros erros={erros} />

      {linhas === null ? (
        <Carregando texto={t('carregando')} />
      ) : linhas.length === 0 ? (
        <Vazio texto={t('semProducao')} />
      ) : (
        <>
          <p className="text-sm text-texto-suave">
            {totalAtendimentos}{' '}
            {totalAtendimentos === 1 ? t('atendimentoConcluido') : t('atendimentosConcluidos')}
          </p>

          <ul className="space-y-3">
            {linhas.map((linha) => (
              <li key={linha.profissionalId} className="cartao space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <div className="min-w-0">
                    <p className="font-bold">{linha.nome}</p>
                    <p className="text-sm text-texto-suave">
                      {traduzir(funcoes, idioma, linha.funcao)}
                      {linha.conselho !== 'Nenhum' && linha.registro
                        ? ` · ${traduzir(conselhos, idioma, linha.conselho)} ${linha.registro}`
                        : ''}
                    </p>
                  </div>

                  <p className="shrink-0 text-right">
                    <span className="text-2xl font-bold tabular-nums">{linha.atendimentos}</span>{' '}
                    <span className="text-sm text-texto-suave">{t('atendimentosCurto')}</span>
                  </p>
                </div>

                <dl className="flex flex-wrap gap-x-6 gap-y-1 border-t border-borda pt-3 text-sm">
                  <div className="flex gap-1.5">
                    <dt className="text-texto-suave">{t('tempoTotal')}</dt>
                    <dd className="font-medium tabular-nums">
                      {formatarDuracao(linha.minutosTotais)}
                    </dd>
                  </div>
                  {linha.minutosMedianos !== null ? (
                    <div className="flex gap-1.5">
                      {/*
                        Mediana, e não média: uma ficha esquecida aberta por
                        horas puxaria a média e faria a tabela mentir sobre o
                        dia inteiro.
                      */}
                      <dt className="text-texto-suave">{t('tempoTipico')}</dt>
                      <dd className="font-medium tabular-nums">
                        {formatarDuracao(linha.minutosMedianos)}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <ul className="flex flex-wrap gap-2">
                  {linha.porFila.map((fila) => (
                    <li
                      key={fila.especialidade}
                      className="rounded-full border border-borda bg-superficie-2 px-3 py-1 text-sm"
                    >
                      {traduzir(especialidades, idioma, fila.especialidade)}{' '}
                      <span className="font-semibold tabular-nums">{fila.atendimentos}</span>
                      <span className="ml-1.5 text-texto-suave tabular-nums">
                        {formatarDuracao(fila.minutosTotais)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
