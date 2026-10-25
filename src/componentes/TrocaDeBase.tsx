import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ErroDeRede } from '../api/cliente';
import type { Base } from '../api/tipos';
import { useSessao } from '../hooks/useSessao';
import { traduzir, useI18n } from '../i18n';
import { tiposMissao } from '../i18n/enums';
import { IconeConcluido, IconeLocal, IconeSeta } from './Icones';

/**
 * Onde se vê e se troca a missão: a base, no cabeçalho de todas as telas.
 *
 * A base é a missão — é ela que carrega o tipo da operação (programada ou
 * catástrofe), o prefixo do código do paciente e a fila que se está vendo. Por
 * isso o nome dela ocupa o topo: quem troca de base e não repara registra o
 * atendimento no lugar errado.
 *
 * A troca era uma página: o botão levava para `/bases`, um seletor e um
 * "continuar" — três toques e a fila sumindo da tela para escolher uma coisa
 * que, na maioria dos plantões, tem uma opção só. Agora a lista abre aqui
 * mesmo, com o tipo de missão de cada base ao lado do nome, e trocar é um
 * toque. A página continua existindo para o caso em que não há base ativa
 * nenhuma, que é quando ela tem o que dizer.
 */
export function TrocaDeBase() {
  const { t, idioma } = useI18n();
  const { base, definirBase } = useSessao();
  const navegar = useNavigate();

  const [aberto, setAberto] = useState(false);
  const [bases, setBases] = useState<Base[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  // Fecha ao tocar fora e ao apertar Esc, como o menu da conta: num celular,
  // tocar fora é o gesto de desistir.
  useEffect(() => {
    if (!aberto) return;

    function aoTocarFora(evento: MouseEvent) {
      if (!caixa.current?.contains(evento.target as Node)) setAberto(false);
    }

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAberto(false);
    }

    document.addEventListener('mousedown', aoTocarFora);
    document.addEventListener('keydown', aoTeclar);

    return () => {
      document.removeEventListener('mousedown', aoTocarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  /*
    A lista é pedida a cada abertura, e não uma vez só.

    Base é coisa que a coordenação cria e desativa no meio do plantão — uma
    lista guardada da primeira abertura mostraria a operação de ontem.
  */
  function carregar() {
    setErro(null);
    setBases(null);

    api
      .bases()
      .then(setBases)
      .catch((e) => {
        setBases([]);
        setErro(e instanceof ErroDeRede ? t('semConexao') : t('erroInesperado'));
      });
  }

  function alternar() {
    const proximo = !aberto;
    setAberto(proximo);
    if (proximo) carregar();
  }

  function escolher(nova: Base) {
    setAberto(false);

    if (nova.id === base?.id) return;

    definirBase(nova);

    /*
      Volta para a fila, mesmo que a troca tenha acontecido dentro de uma ficha.

      A ficha aberta é de um paciente da base anterior: seguir nela depois da
      troca gravaria o atendimento na missão errada, que é exatamente o erro
      que ter a base no topo existe para evitar.
    */
    navegar('/atendimentos', { replace: true });
  }

  return (
    <div className="relative min-w-0 flex-1" ref={caixa}>
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        aria-haspopup="menu"
        aria-label={t('trocarBase')}
        className="flex w-full min-w-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-sm font-medium"
      >
        <IconeLocal className="h-4 w-4 shrink-0" />
        <span className="truncate">{base?.nome ?? t('base')}</span>
        <IconeSeta className="h-4 w-4 shrink-0 opacity-70" />
      </button>

      {aberto ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-borda bg-superficie text-texto shadow-lg"
        >
          {/*
            Sem cabeçalho repetindo onde se está: a base de agora é a primeira
            da lista e vem marcada, com o tipo da operação embaixo do nome.
            Escrito duas vezes seguidas, o mesmo nome fazia a lista parecer
            começar na segunda linha.
          */}
          {bases === null ? (
            <p className="px-4 py-3 text-sm text-texto-suave">{t('carregando')}</p>
          ) : bases.length === 0 ? (
            <div className="space-y-2 px-4 py-3">
              <p className="text-sm text-texto-suave">{erro ?? t('semBasesAtivas')}</p>
              <button type="button" className="botao-secundario w-full" onClick={carregar}>
                {t('tentarDeNovo')}
              </button>
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {bases.map((opcao, indice) => (
                <li key={opcao.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => escolher(opcao)}
                    className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm hover:bg-superficie-2 ${
                      indice < bases.length - 1 ? 'border-b border-borda' : ''
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{opcao.nome}</span>
                      {opcao.tipoMissao ? (
                        <span className="block truncate text-xs text-texto-suave">
                          {traduzir(tiposMissao, idioma, opcao.tipoMissao)}
                        </span>
                      ) : null}
                    </span>

                    {/* A base de agora fica marcada: a lista responde "onde estou"
                        antes de responder "para onde vou". */}
                    {opcao.id === base?.id ? (
                      <IconeConcluido className="h-5 w-5 shrink-0 text-marca-clara" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
