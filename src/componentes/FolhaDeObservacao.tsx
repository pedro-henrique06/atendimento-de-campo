import type { MedicaoSinaisVitais, SinalForaDaFaixa } from '../api/tipos';
import { useI18n } from '../i18n';

/** A hora da medida, curta — a tabela é lida em coluna. */
function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { timeStyle: 'short' });
}

/**
 * Uma célula da tabela.
 *
 * O destaque de fora da faixa é do valor, e não da linha inteira: a pergunta de
 * quem olha é *qual* medida saiu, e uma linha toda vermelha não responde isso.
 */
function Celula({
  valor,
  sinal,
  foraDaFaixa,
}: {
  valor: number | null;
  sinal?: SinalForaDaFaixa;
  foraDaFaixa: SinalForaDaFaixa[];
}) {
  const { t } = useI18n();

  if (valor === null) {
    return <td className="px-3 py-2 text-center text-texto-suave">—</td>;
  }

  const fora = sinal !== undefined && foraDaFaixa.includes(sinal);

  return (
    <td
      className={`px-3 py-2 text-center tabular-nums ${
        fora ? 'font-bold text-amarelo' : ''
      }`}
      title={fora ? t('foraDaFaixa') : undefined}
    >
      {valor}
      {fora ? <span className="sr-only"> ({t('foraDaFaixa')})</span> : null}
    </td>
  );
}

/**
 * A folha de observação: a tabela horária de sinais vitais.
 *
 * Tabela mesmo, e não uma lista de cartões, porque a pergunta que ela responde é
 * a comparação entre as linhas — "a pressão está caindo?". Em coluna, os números
 * se comparam de relance; em cartões, não.
 */
export function FolhaDeObservacao({
  medicoes,
  aoRemover,
}: {
  medicoes: MedicaoSinaisVitais[];
  aoRemover?: (id: string) => void;
}) {
  const { t } = useI18n();

  if (medicoes.length === 0) {
    return <p className="text-sm text-texto-suave">{t('semSinaisVitais')}</p>;
  }

  return (
    <div className="space-y-3">
      {/* A tabela rola sozinha: é o corpo da página que não pode rolar de lado. */}
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-borda text-texto-suave">
              <th scope="col" className="px-3 py-2 text-left font-medium">
                {t('hora')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('pressaoArterialCurto')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('frequenciaCardiacaCurto')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('frequenciaRespiratoriaCurto')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('saturacaoCurto')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('temperaturaCurto')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('glicemiaCurto')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('dorCurto')}
              </th>
            </tr>
          </thead>

          <tbody>
            {medicoes.map((m) => (
              <tr key={m.id} className="border-b border-borda last:border-0">
                <th scope="row" className="px-3 py-2 text-left font-medium tabular-nums">
                  {hora(m.medidaEm)}
                </th>

                {/*
                  A pressão é uma medida só, escrita 120x80: separada em duas
                  colunas, deixa de ser lida como par.
                */}
                <td
                  className="px-3 py-2 text-center tabular-nums"
                  title={m.foraDaFaixa.includes('PressaoSistolica') ? t('foraDaFaixa') : undefined}
                >
                  {m.pressaoSistolica === null ? (
                    <span className="text-texto-suave">—</span>
                  ) : (
                    <span
                      className={
                        m.foraDaFaixa.includes('PressaoSistolica') ? 'font-bold text-amarelo' : ''
                      }
                    >
                      {m.pressaoSistolica}
                      {m.pressaoDiastolica === null ? '' : `×${m.pressaoDiastolica}`}

                      {/*
                        A marcação não pode ser só a cor: quem lê por leitor de
                        tela receberia a linha inteira como normal.
                      */}
                      {m.foraDaFaixa.includes('PressaoSistolica') ? (
                        <span className="sr-only"> ({t('foraDaFaixa')})</span>
                      ) : null}
                    </span>
                  )}
                </td>

                <Celula valor={m.frequenciaCardiaca} sinal="FrequenciaCardiaca" foraDaFaixa={m.foraDaFaixa} />
                <Celula
                  valor={m.frequenciaRespiratoria}
                  sinal="FrequenciaRespiratoria"
                  foraDaFaixa={m.foraDaFaixa}
                />
                <Celula valor={m.saturacaoO2} sinal="SaturacaoO2" foraDaFaixa={m.foraDaFaixa} />
                <Celula
                  valor={m.temperaturaCelsius}
                  sinal="Temperatura"
                  foraDaFaixa={m.foraDaFaixa}
                />
                <Celula valor={m.glicemiaCapilar} sinal="Glicemia" foraDaFaixa={m.foraDaFaixa} />
                <Celula valor={m.escalaDor} foraDaFaixa={m.foraDaFaixa} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/*
        Autoria e observação fora da tabela: são de quem leu a linha depois, e
        dentro dela empurrariam os números — que é o que se compara — para fora
        da tela.
      */}
      <ul className="space-y-2 text-sm text-texto-suave">
        {medicoes.map((m) => (
          <li key={m.id}>
            <div className="flex items-baseline justify-between gap-3">
              <span>
                <span className="tabular-nums">{hora(m.medidaEm)}</span> · {m.registradaPor}
              </span>

              {aoRemover ? (
                <button
                  type="button"
                  className="shrink-0 underline"
                  onClick={() => aoRemover(m.id)}
                >
                  {t('remover')}
                </button>
              ) : null}
            </div>

            {/* Em linha própria: junto do autor, o texto longo quebra a linha e
                o separador sobra no começo da seguinte. */}
            {m.observacao ? <p className="text-texto">{m.observacao}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
