import { useMemo, useState } from 'react';
import type { EstadoDente, FaceDentaria, MarcacaoDente } from '../api/tipos';
import { useI18n, traduzir } from '../i18n';
import { estadosDente as tabelaEstados, faces as tabelaFaces } from '../i18n/enums';

/** Quadrantes na disposição anatômica, como o profissional vê o paciente. */
const SUPERIOR_DIREITO = [18, 17, 16, 15, 14, 13, 12, 11];
const SUPERIOR_ESQUERDO = [21, 22, 23, 24, 25, 26, 27, 28];
const INFERIOR_DIREITO = [48, 47, 46, 45, 44, 43, 42, 41];
const INFERIOR_ESQUERDO = [31, 32, 33, 34, 35, 36, 37, 38];

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
 * Cor de cada estado. Serve para a legenda e para as faixas do dente — nunca
 * como único portador da informação: o dente também exibe as iniciais dos
 * estados, e a lista textual embaixo repete tudo por extenso.
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

const INICIAIS: Record<EstadoDente, string> = {
  Higido: '',
  Carie: 'C',
  Restaurado: 'R',
  Ausente: 'A',
  ExtracaoIndicada: 'E',
  Fratura: 'F',
  Selante: 'S',
  Protese: 'P',
  Implante: 'I',
  RestoRadicular: 'RR',
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

function Dente({
  numero,
  marcacoes,
  selecionado,
  aoTocar,
  rotuloEstados,
}: {
  numero: number;
  marcacoes: MarcacaoDente[];
  selecionado: boolean;
  aoTocar: () => void;
  rotuloEstados: string;
}) {
  const ausente = marcacoes.some((m) => m.estado === 'Ausente');

  return (
    <button
      type="button"
      onClick={aoTocar}
      aria-pressed={selecionado}
      aria-label={`${numero}${rotuloEstados ? `: ${rotuloEstados}` : ''}`}
      className={`flex h-12 w-9 shrink-0 flex-col items-center justify-between rounded-md border p-0.5 transition ${
        selecionado ? 'border-marca-clara ring-2 ring-marca-clara/50' : 'border-borda'
      } ${ausente ? 'opacity-50' : ''} bg-superficie-2`}
    >
      <span className="text-[10px] font-semibold text-texto-suave">{numero}</span>

      {/*
        Um dente pode carregar vários estados ao mesmo tempo — cárie e extração
        indicada, por exemplo. Cada estado ganha a sua própria faixa, em vez de
        uma cor sobrescrever a outra e apagar a informação do desenho.
      */}
      <span className="flex w-full flex-1 flex-col justify-end gap-px pb-0.5">
        {marcacoes.map((m) => (
          <span
            key={m.estado}
            className="block h-1.5 w-full rounded-sm"
            style={{ backgroundColor: CORES[m.estado] }}
            aria-hidden
          />
        ))}
      </span>

      <span className="text-[9px] font-bold leading-none text-texto" aria-hidden>
        {marcacoes.map((m) => INICIAIS[m.estado]).join('')}
      </span>
    </button>
  );
}

function Arcada({
  dentes,
  marcacoesPorDente,
  selecionado,
  aoSelecionar,
  rotularEstados,
}: {
  dentes: number[];
  marcacoesPorDente: Map<number, MarcacaoDente[]>;
  selecionado: number | null;
  aoSelecionar: (dente: number) => void;
  rotularEstados: (marcacoes: MarcacaoDente[]) => string;
}) {
  return (
    <div className="flex gap-1">
      {dentes.map((numero) => {
        const marcacoes = marcacoesPorDente.get(numero) ?? [];

        return (
          <Dente
            key={numero}
            numero={numero}
            marcacoes={marcacoes}
            selecionado={selecionado === numero}
            aoTocar={() => aoSelecionar(numero)}
            rotuloEstados={rotularEstados(marcacoes)}
          />
        );
      })}
    </div>
  );
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

  const rotularEstados = (lista: MarcacaoDente[]) =>
    lista.map((m) => traduzirEstado(m.estado)).join(', ');

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

  return (
    <div className="space-y-4">
      {/* A arcada é larga; no celular ela rola dentro do próprio contêiner e a
          página nunca ganha rolagem horizontal. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <div className="inline-flex min-w-full flex-col items-center gap-3">
          <div className="flex gap-3">
            <Arcada
              dentes={SUPERIOR_DIREITO}
              marcacoesPorDente={porDente}
              selecionado={selecionado}
              aoSelecionar={setSelecionado}
              rotularEstados={rotularEstados}
            />
            <Arcada
              dentes={SUPERIOR_ESQUERDO}
              marcacoesPorDente={porDente}
              selecionado={selecionado}
              aoSelecionar={setSelecionado}
              rotularEstados={rotularEstados}
            />
          </div>

          <div className="h-px w-full bg-borda" />

          <div className="flex gap-3">
            <Arcada
              dentes={INFERIOR_DIREITO}
              marcacoesPorDente={porDente}
              selecionado={selecionado}
              aoSelecionar={setSelecionado}
              rotularEstados={rotularEstados}
            />
            <Arcada
              dentes={INFERIOR_ESQUERDO}
              marcacoesPorDente={porDente}
              selecionado={selecionado}
              aoSelecionar={setSelecionado}
              rotularEstados={rotularEstados}
            />
          </div>
        </div>
      </div>

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
