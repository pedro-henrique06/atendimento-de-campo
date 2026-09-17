import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ErroDeRede } from '../api/cliente';
import type { Base } from '../api/tipos';
import { Carregando, Erros } from '../componentes/Basicos';
import { Marca } from '../componentes/Marca';
import { useSessao } from '../hooks/useSessao';
import { useI18n, traduzir } from '../i18n';
import { tiposMissao } from '../i18n/enums';

/**
 * Troca de base.
 *
 * Deixou de ser a parada obrigatória depois do login — quem entra já cai na
 * fila, com a base resolvida. Aqui se chega de propósito, pelo botão do
 * cabeçalho, ou quando não há base ativa nenhuma para resolver.
 */
export function SelecaoBase() {
  const { t, idioma } = useI18n();
  const { base: baseAtual, definirBase, sair } = useSessao();
  const navegar = useNavigate();

  const [bases, setBases] = useState<Base[] | null>(null);
  const [escolhida, setEscolhida] = useState(baseAtual?.id ?? '');
  const [erros, setErros] = useState<string[]>([]);

  function carregar() {
    setErros([]);
    setBases(null);

    api
      .bases()
      .then((lista) => {
        setBases(lista);

        // A base de agora vem selecionada: quem entrou aqui para trocar precisa
        // ver de onde está saindo, e quem entrou sem querer sai sem mudar nada.
        setEscolhida((atual) =>
          lista.some((b) => b.id === atual) ? atual : (lista[0]?.id ?? ''),
        );
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
            <div className="mb-4 flex justify-center">
              <Marca />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{t('app')}</h1>
            <p className="mt-1 text-texto-suave">{t('escolhaBase')}</p>
          </div>

          {bases === null ? (
            <Carregando texto={t('carregando')} />
          ) : bases.length === 0 && erros.length === 0 ? (
            /*
              Sem base ativa não há o que escolher, e é para cá que o app manda
              quem não teve base resolvida. Dizer o motivo evita a pessoa ficar
              olhando um seletor vazio sem entender por quê.
            */
            <>
              <p className="text-center text-texto-suave">{t('semBasesAtivas')}</p>
              <button type="button" className="botao-secundario w-full" onClick={carregar}>
                {t('tentarDeNovo')}
              </button>
            </>
          ) : (
            <>
              <label className="block">
                <span className="rotulo">{t('base')}</span>
                <select
                  className="campo"
                  value={escolhida}
                  onChange={(e) => setEscolhida(e.target.value)}
                >
                  {/*
                    O tipo da operação aparece já na escolha: entrar numa base
                    de catástrofe é um turno diferente de entrar numa missão
                    programada, e quem chega no meio do plantão precisa saber
                    disso antes de abrir a primeira ficha.
                  */}
                  {bases.map((base) => (
                    <option key={base.id} value={base.id}>
                      {base.tipoMissao
                        ? `${base.nome} · ${traduzir(tiposMissao, idioma, base.tipoMissao)}`
                        : base.nome}
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

          {/*
            Voltar só existe quando há base valendo: sem ela não há para onde
            voltar, e o app mandaria a pessoa direto para cá de novo.
          */}
          {baseAtual ? (
            <button
              type="button"
              onClick={() => navegar('/atendimentos', { replace: true })}
              className="w-full text-center text-marca-clara underline"
            >
              {t('voltar')}
            </button>
          ) : (
            <button
              type="button"
              onClick={sair}
              className="w-full text-center text-marca-clara underline"
            >
              {t('sair')}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
