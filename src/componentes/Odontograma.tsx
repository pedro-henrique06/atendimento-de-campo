import { useMemo, useState } from 'react';
import { Odontogram } from 'react-odontogram';
import 'react-odontogram/style.css';
import type { EstadoDente, FaceDentaria, MarcacaoDente } from '../api/tipos';
import { useI18n, traduzir } from '../i18n';
import { estadosDente as tabelaEstados, faces as tabelaFaces } from '../i18n/enums';


export const ESTADOS_SELECIONAVEIS: EstadoDente[] = [
  'Carie',
  'Restaurado',
  'Ausente',
  'ExtracaoIndicada',
  'Fratura',
  'Selante',
  'Protese',
  'Implante',
  'RestoRadicular',
];

/**
 * Cor de cada estado.
 *
 * A cor nunca é o único portador da informação. A arcada desenhada não permite
 * escrever nada dentro do dente, então quem carrega o conteúdo por extenso é a
 * legenda logo abaixo dela, o resumo em texto e o painel do dente selecionado —
 * três lugares, nenhum deles dependente de enxergar cor.
 */
const CORES: Record<EstadoDente, string> = {
  Higido: 'transparent',
  Carie: '#e5484d',
  Restaurado: '#3b82f6',
  Ausente: '#6b7280',
  ExtracaoIndicada: '#f5a524',
  Fratura: '#a855f7',
  Selante: '#06b6d4',
  Protese: '#ec4899',
  Implante: '#14b8a6',
  RestoRadicular: '#f97316',
};


function facesValidas(dente: number): FaceDentaria[] {
  const posicao = dente % 10;
  const comuns: FaceDentaria[] = ['Mesial', 'Distal', 'Vestibular', 'Lingual', 'Cervical'];

  return [...comuns, posicao <= 3 ? 'Incisal' : 'Oclusal'];
}

/**
 * Estados que se localizam em faces específicas. Os demais — extração
 * indicada, prótese, implante, resto radicular, ausente — dizem respeito ao
 * dente inteiro, e pedir face neles só produz dado sem significado clínico.
 */
const ESTADOS_COM_FACE: EstadoDente[] = ['Carie', 'Restaurado', 'Fratura', 'Selante'];

const ABREVIACAO_FACE: Record<FaceDentaria, string> = {
  Mesial: 'M',
  Distal: 'D',
  Oclusal: 'O',
  Vestibular: 'V',
  Lingual: 'L',
  Incisal: 'I',
  Cervical: 'C',
};

/**
 * Ordem canônica dos estados, igual à declaração do enum no backend.
 *
 * Sem isso o resumo sairia na ordem em que o dentista tocou nos botões, e a
 * mesma informação apareceria em ordens diferentes no prontuário e no histórico
 * de alterações — que é montado pelo servidor.
 */
const ORDEM_ESTADOS: EstadoDente[] = [
  'Higido',
  'Carie',
  'Restaurado',
  'Ausente',
  'ExtracaoIndicada',
  'Fratura',
  'Selante',
  'Protese',
  'Implante',
  'RestoRadicular',
];

/**
 * Prioridade de exibição no desenho, do mais grave para o menos.
 *
 * A arcada só consegue pintar **uma** cor por dente. Um dente com cárie e
 * extração indicada aparece com a cor de "vários estados" — nunca com uma das
 * duas, porque foi exatamente assim que o odontograma de referência fazia a
 * cárie sumir do desenho. Quando há um estado só, a cor é a dele.
 */
const PRIORIDADE: EstadoDente[] = [
  'Ausente',
  'ExtracaoIndicada',
  'RestoRadicular',
  'Fratura',
  'Carie',
  'Protese',
  'Implante',
  'Restaurado',
  'Selante',
  'Higido',
];

/** Cor do dente que carrega mais de um estado ao mesmo tempo. */
const COR_VARIOS = '#7c3aed';

/** A biblioteca identifica cada dente por `teeth-<FDI>`. */
const idDente = (numero: number) => `teeth-${numero}`;
const numeroDoId = (id: string) => Number(id.replace('teeth-', ''));

/**
 * Monta o resumo textual, no mesmo formato do backend:
 * "Cárie: 38(M,O); Extração indicada: 38".
 */
export function resumirOdontograma(
  marcacoes: MarcacaoDente[],
  traduzirEstado: (estado: EstadoDente) => string,
): string {
  const porEstado = new Map<EstadoDente, MarcacaoDente[]>();

  for (const marcacao of marcacoes) {
    if (marcacao.estado === 'Higido') continue;

    const lista = porEstado.get(marcacao.estado) ?? [];
    lista.push(marcacao);
    porEstado.set(marcacao.estado, lista);
  }

  return [...porEstado.entries()]
    .sort(([a], [b]) => ORDEM_ESTADOS.indexOf(a) - ORDEM_ESTADOS.indexOf(b))
    .map(([estado, lista]) => {
      const dentes = lista
        .slice()
        .sort((a, b) => a.dente - b.dente)
        .map((m) =>
          m.faces.length > 0
            ? `${m.dente}(${m.faces.map((f) => ABREVIACAO_FACE[f]).join(',')})`
            : String(m.dente),
        );

      return `${traduzirEstado(estado)}: ${dentes.join(', ')}`;
    })
    .join('; ');
}

export function Odontograma({
  marcacoes,
  aoMudar,
  somenteLeitura = false,
}: {
  marcacoes: MarcacaoDente[];
  aoMudar?: (marcacoes: MarcacaoDente[]) => void;
  somenteLeitura?: boolean;
}) {
  const { t, idioma } = useI18n();
  const [selecionado, setSelecionado] = useState<number | null>(null);

  const traduzirEstado = (estado: EstadoDente) => traduzir(tabelaEstados, idioma, estado);

  const porDente = useMemo(() => {
    const mapa = new Map<number, MarcacaoDente[]>();

    for (const marcacao of marcacoes) {
      const lista = mapa.get(marcacao.dente) ?? [];
      lista.push(marcacao);
      mapa.set(marcacao.dente, lista);
    }

    return mapa;
  }, [marcacoes]);

  const estadosDoSelecionado = selecionado ? (porDente.get(selecionado) ?? []) : [];

  function alternarEstado(estado: EstadoDente) {
    if (!selecionado || !aoMudar) return;

    const jaTem = estadosDoSelecionado.some((m) => m.estado === estado);

    if (jaTem) {
      aoMudar(marcacoes.filter((m) => !(m.dente === selecionado && m.estado === estado)));
      return;
    }

    // "Ausente" é exclusivo: um dente que não está lá não pode ter cárie.
    // As outras combinações convivem, porque na clínica elas convivem mesmo.
    const semConflito =
      estado === 'Ausente'
        ? marcacoes.filter((m) => m.dente !== selecionado)
        : marcacoes.filter((m) => !(m.dente === selecionado && m.estado === 'Ausente'));

    aoMudar([...semConflito, { dente: selecionado, estado, faces: [] }]);
  }

  function alternarFace(estado: EstadoDente, face: FaceDentaria) {
    if (!selecionado || !aoMudar) return;

    aoMudar(
      marcacoes.map((m) => {
        if (m.dente !== selecionado || m.estado !== estado) return m;

        const tem = m.faces.includes(face);

        return {
          ...m,
          faces: tem ? m.faces.filter((f) => f !== face) : [...m.faces, face],
        };
      }),
    );
  }

  function limparDente() {
    if (!selecionado || !aoMudar) return;
    aoMudar(marcacoes.filter((m) => m.dente !== selecionado));
  }

  const estadosPresentes = [...new Set(marcacoes.map((m) => m.estado))].filter(
    (e) => e !== 'Higido',
  );

  /*
    A arcada pinta uma cor por dente. Dente com mais de um estado ganha a cor de
    "vários estados" em vez de uma das duas: no odontograma de referência a
    segunda condição sobrescrevia a primeira e a cárie sumia do desenho. A lista
    completa continua no painel do dente e no resumo em texto.
  */
  const condicoes = useMemo(() => {
    const porEstado = new Map<EstadoDente, number[]>();
    const varios: number[] = [];

    for (const [dente, lista] of porDente) {
      const estados = lista.map((m) => m.estado).filter((e) => e !== 'Higido');

      if (estados.length === 0) continue;

      if (estados.length > 1) {
        varios.push(dente);
        continue;
      }

      const acc = porEstado.get(estados[0]) ?? [];
      acc.push(dente);
      porEstado.set(estados[0], acc);
    }

    const grupos = [...porEstado.entries()]
      .sort(([a], [b]) => PRIORIDADE.indexOf(a) - PRIORIDADE.indexOf(b))
      .map(([estado, dentes]) => ({
        label: traduzirEstado(estado),
        teeth: dentes.map(idDente),
        fillColor: CORES[estado],
        outlineColor: CORES[estado],
      }));

    if (varios.length > 0) {
      grupos.push({
        label: t('variosEstados'),
        teeth: varios.map(idDente),
        fillColor: COR_VARIOS,
        outlineColor: COR_VARIOS,
      });
    }

    return grupos;
  }, [porDente, idioma, t]);

  const temVariosEstados = condicoes.some((g) => g.label === t('variosEstados'));

  return (
    <div className="space-y-4">
      <Odontogram
        notation="FDI"
        layout="circle"
        singleSelect
        readOnly={somenteLeitura}
        showTooltip={false}
        theme="light"
        defaultSelected={selecionado ? [idDente(selecionado)] : []}
        onChange={(escolhidos) => {
          const ultimo = escolhidos.at(-1);
          setSelecionado(ultimo ? numeroDoId(ultimo.id) : null);
        }}
        teethConditions={condicoes}
      />

      {/*
        Legenda própria, e não a da biblioteca: é ela que garante que nenhum
        estado desapareça, e essa garantia não pode depender de um detalhe
        opcional de renderização de terceiro.
      */}
      {estadosPresentes.length > 0 ? (
        <div className="flex flex-wrap gap-3 text-xs">
          {estadosPresentes.map((estado) => (
            <span key={estado} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: CORES[estado] }}
                aria-hidden
              />
              {traduzirEstado(estado)}
            </span>
          ))}

          {temVariosEstados ? (
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: COR_VARIOS }}
                aria-hidden
              />
              {t('variosEstados')}
            </span>
          ) : null}
        </div>
      ) : null}

      {marcacoes.length > 0 ? (
        <p className="text-sm">
          <span className="font-semibold">{t('resumo')}:</span>{' '}
          {resumirOdontograma(marcacoes, traduzirEstado)}
        </p>
      ) : null}

      {somenteLeitura ? null : (
        <div className="rounded-xl border border-borda bg-superficie-2 p-4">
          {selecionado === null ? (
            <p className="text-sm text-texto-suave">{t('selecioneDente')}</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {t('dente')} {selecionado}
                </h3>
                <button type="button" onClick={limparDente} className="text-sm text-texto-suave underline">
                  {t('limparDente')}
                </button>
              </div>

              <div>
                <span className="rotulo">{t('estados')}</span>
                <div className="flex flex-wrap gap-2">
                  {ESTADOS_SELECIONAVEIS.map((estado) => {
                    const ativo = estadosDoSelecionado.some((m) => m.estado === estado);

                    return (
                      <button
                        key={estado}
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => alternarEstado(estado)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition ${
                          ativo
                            ? 'border-transparent text-white'
                            : 'border-borda bg-superficie text-texto hover:border-marca-clara'
                        }`}
                        style={ativo ? { backgroundColor: CORES[estado] } : undefined}
                      >
                        {traduzirEstado(estado)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {estadosDoSelecionado
                .filter((m) => ESTADOS_COM_FACE.includes(m.estado))
                .map((marcacao) => (
                  <div key={marcacao.estado}>
                    <span className="rotulo">
                      {t('faces')} — {traduzirEstado(marcacao.estado)}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {facesValidas(selecionado).map((face) => {
                        const ativo = marcacao.faces.includes(face);

                        return (
                          <button
                            key={face}
                            type="button"
                            aria-pressed={ativo}
                            onClick={() => alternarFace(marcacao.estado, face)}
                            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                              ativo
                                ? 'border-marca bg-marca text-white'
                                : 'border-borda bg-superficie text-texto'
                            }`}
                          >
                            {traduzir(tabelaFaces, idioma, face)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
