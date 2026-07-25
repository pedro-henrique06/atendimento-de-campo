import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ErroDeRede } from '../api/cliente';
import type { Base } from '../api/tipos';
import { Carregando, Erros } from '../componentes/Basicos';
import { useSessao } from '../hooks/useSessao';
import { useI18n } from '../i18n';

export function SelecaoBase() {
  const { t } = useI18n();
  const { definirBase, sair } = useSessao();
  const navegar = useNavigate();

  const [bases, setBases] = useState<Base[] | null>(null);
  const [escolhida, setEscolhida] = useState('');
  const [erros, setErros] = useState<string[]>([]);

  function carregar() {
    setErros([]);
    setBases(null);

    api
      .bases()
      .then((lista) => {
        setBases(lista);
        setEscolhida((atual) => atual || (lista[0]?.id ?? ''));
      })
      .catch((erro) => {
        setBases([]);
        setErros([erro instanceof ErroDeRede ? t('semConexao') : t('erroInesperado')]);
      });
  }

  useEffect(carregar, []);

  function continuar() {
    const base = bases?.find((b) => b.id === escolhida);

    if (base) {
      definirBase(base);
      navegar('/atendimentos', { replace: true });
    }
  }

  return (
    <div className="min-h-full px-4 py-10">
      <main className="mx-auto max-w-md">
        <div className="cartao space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-marca text-3xl font-light text-white">
              +
            </div>
            <h1 className="text-2xl font-bold">{t('app')}</h1>
            <p className="mt-1 text-texto-suave">{t('escolhaBase')}</p>
          </div>

          {bases === null ? (
            <Carregando texto={t('carregando')} />
          ) : (
            <>
              <label className="block">
                <span className="rotulo">{t('base')}</span>
                <select
                  className="campo"
                  value={escolhida}
                  onChange={(e) => setEscolhida(e.target.value)}
                >
                  {bases.map((base) => (
                    <option key={base.id} value={base.id}>
                      {base.nome}
                    </option>
                  ))}
                </select>
              </label>

              <Erros erros={erros} />

              {erros.length > 0 ? (
                <button type="button" className="botao-secundario w-full" onClick={carregar}>
                  {t('tentarDeNovo')}
                </button>
              ) : null}

              <button type="button" className="botao" onClick={continuar} disabled={!escolhida}>
                {t('continuar')}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={sair}
            className="w-full text-center text-marca-clara underline"
          >
            {t('sair')}
          </button>
        </div>
      </main>
    </div>
  );
}
