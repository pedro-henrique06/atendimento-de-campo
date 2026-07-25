import { useEffect, useState } from 'react';
import { api } from '../api/cliente';
import type { ItemCatalogo, ViaAdministracao } from '../api/tipos';
import { useI18n, traduzir } from '../i18n';
import { formas, unidades, vias as tabelaVias } from '../i18n/enums';
import { Campo, Interruptor } from './Basicos';

export interface LinhaDispensacao {
  chave: string;
  itemId: string | null;
  rotuloItem: string;
  descricaoLivre: string;
  justificativaItemLivre: string;
  quantidade: number;
  via: ViaAdministracao | null;
  viasPermitidas: ViaAdministracao[];
  unidade: string | null;
  posologia: string;
}

export function novaLinha(): LinhaDispensacao {
  return {
    chave: crypto.randomUUID(),
    itemId: null,
    rotuloItem: '',
    descricaoLivre: '',
    justificativaItemLivre: '',
    quantidade: 1,
    via: null,
    viasPermitidas: [],
    unidade: null,
    posologia: '',
  };
}

export function paraEnvio(linhas: LinhaDispensacao[]) {
  return linhas.map((linha) => ({
    itemId: linha.itemId,
    descricaoLivre: linha.itemId ? null : linha.descricaoLivre.trim() || null,
    justificativaItemLivre: linha.itemId ? null : linha.justificativaItemLivre.trim() || null,
    quantidade: linha.quantidade,
    via: linha.via,
    posologia: linha.posologia.trim() || null,
  }));
}

/**
 * Busca no catálogo com autocomplete.
 *
 * É este campo que impede o problema central do sistema de referência, onde o
 * item era digitado livremente e o mesmo fármaco virava "Acetaminofen",
 * "Acetaminofeno", "Acetominofen" e "1. Paracetamol 1 gramo" em quatro linhas
 * distintas do relatório de consumo.
 */
function BuscaCatalogo({ aoEscolher }: { aoEscolher: (item: ItemCatalogo) => void }) {
  const { t, idioma } = useI18n();
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<ItemCatalogo[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (termo.trim().length < 2) {
      setResultados([]);
      return;
    }

    let cancelado = false;
    setBuscando(true);

    // Espera a digitação parar antes de bater na rede: em 3G de campo, uma
    // requisição por tecla deixa o campo travado.
    const timer = setTimeout(() => {
      api
        .itensCatalogo(termo.trim())
        .then((itens) => {
          if (!cancelado) setResultados(itens);
        })
        .catch(() => {
          if (!cancelado) setResultados([]);
        })
        .finally(() => {
          if (!cancelado) setBuscando(false);
        });
    }, 300);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [termo]);

  return (
    <div className="space-y-2">
      <input
        className="campo"
        placeholder={t('buscarItem')}
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
      />

      {buscando ? <p className="text-sm text-texto-suave">{t('carregando')}</p> : null}

      {resultados.length > 0 ? (
        <ul className="max-h-60 overflow-y-auto rounded-xl border border-borda">
          {resultados.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  aoEscolher(item);
                  setTermo('');
                  setResultados([]);
                }}
                className="w-full border-b border-borda px-3 py-2 text-left last:border-0 hover:bg-superficie-2"
              >
                <span className="font-medium">
                  {item.nome}
                  {item.concentracao ? ` ${item.concentracao}` : ''}
                </span>
                <span className="ml-2 text-sm text-texto-suave">
                  {traduzir(formas, idioma, item.forma)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function ListaDispensacao({
  linhas,
  aoMudar,
}: {
  linhas: LinhaDispensacao[];
  aoMudar: (linhas: LinhaDispensacao[]) => void;
}) {
  const { t, idioma } = useI18n();
  const [adicionando, setAdicionando] = useState(false);
  const [foraCatalogo, setForaCatalogo] = useState(false);

  function adicionarDoCatalogo(item: ItemCatalogo) {
    aoMudar([
      ...linhas,
      {
        ...novaLinha(),
        itemId: item.id,
        rotuloItem: `${item.nome}${item.concentracao ? ` ${item.concentracao}` : ''}`,
        viasPermitidas: item.viasPermitidas,
        // Uma via possível é a escolha certa por padrão; oferecer um select de
        // uma opção só é ruído.
        via: item.viasPermitidas.length === 1 ? item.viasPermitidas[0] : null,
        unidade: traduzir(unidades, idioma, item.unidade),
      },
    ]);

    setAdicionando(false);
  }

  function atualizar(chave: string, mudanca: Partial<LinhaDispensacao>) {
    aoMudar(linhas.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)));
  }

  function remover(chave: string) {
    aoMudar(linhas.filter((l) => l.chave !== chave));
  }

  return (
    <div className="space-y-3">
      {linhas.length === 0 && !adicionando ? (
        <p className="text-sm text-texto-suave">{t('semItens')}</p>
      ) : null}

      {linhas.map((linha) => (
        <div key={linha.chave} className="space-y-3 rounded-xl border border-borda bg-superficie-2 p-3">
          <div className="flex items-start justify-between gap-3">
            <span className="font-medium">
              {linha.itemId ? linha.rotuloItem : linha.descricaoLivre || t('itemForaCatalogo')}
            </span>
            <button
              type="button"
              onClick={() => remover(linha.chave)}
              className="shrink-0 text-sm text-texto-suave underline"
            >
              {t('remover')}
            </button>
          </div>

          {linha.itemId ? null : (
            <>
              <Campo rotulo={t('itemForaCatalogo')} obrigatorio>
                <input
                  className="campo"
                  value={linha.descricaoLivre}
                  onChange={(e) => atualizar(linha.chave, { descricaoLivre: e.target.value })}
                />
              </Campo>
              <Campo
                rotulo={t('justificativaItemLivre')}
                obrigatorio
                dica={t('justificativaItemLivre')}
              >
                <input
                  className="campo"
                  value={linha.justificativaItemLivre}
                  onChange={(e) =>
                    atualizar(linha.chave, { justificativaItemLivre: e.target.value })
                  }
                />
              </Campo>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo={t('quantidade')} obrigatorio>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                className="campo"
                value={linha.quantidade}
                onChange={(e) =>
                  atualizar(linha.chave, { quantidade: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </Campo>

            <Campo rotulo={t('via')} obrigatorio={linha.itemId !== null}>
              {/*
                Só as vias compatíveis com a apresentação aparecem. É o que
                impede registros como "comprimido por via xarope" e
                "ampola por via oral", ambos presentes no sistema antigo.
              */}
              <select
                className="campo"
                value={linha.via ?? ''}
                onChange={(e) =>
                  atualizar(linha.chave, { via: (e.target.value || null) as ViaAdministracao | null })
                }
              >
                <option value="">—</option>
                {(linha.viasPermitidas.length > 0
                  ? linha.viasPermitidas
                  : (Object.keys(tabelaVias.Pt) as ViaAdministracao[])
                ).map((via) => (
                  <option key={via} value={via}>
                    {traduzir(tabelaVias, idioma, via)}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          {linha.unidade ? (
            <p className="text-sm text-texto-suave">
              {linha.quantidade} {linha.unidade}
            </p>
          ) : null}

          <Campo rotulo={t('posologia')}>
            <input
              className="campo"
              value={linha.posologia}
              onChange={(e) => atualizar(linha.chave, { posologia: e.target.value })}
            />
          </Campo>
        </div>
      ))}

      {adicionando ? (
        <div className="space-y-3 rounded-xl border border-borda p-3">
          <Interruptor
            rotulo={t('itemForaCatalogo')}
            valor={foraCatalogo}
            aoMudar={setForaCatalogo}
          />

          {foraCatalogo ? (
            <button
              type="button"
              className="botao"
              onClick={() => {
                aoMudar([...linhas, novaLinha()]);
                setAdicionando(false);
                setForaCatalogo(false);
              }}
            >
              {t('adicionarItem')}
            </button>
          ) : (
            <BuscaCatalogo aoEscolher={adicionarDoCatalogo} />
          )}

          <button type="button" className="botao-secundario w-full" onClick={() => setAdicionando(false)}>
            {t('cancelar')}
          </button>
        </div>
      ) : (
        <button type="button" className="botao-secundario w-full" onClick={() => setAdicionando(true)}>
          {t('adicionarItem')}
        </button>
      )}
    </div>
  );
}
