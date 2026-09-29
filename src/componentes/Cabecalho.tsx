import { useEffect, useRef, useState } from 'react';
import { api } from '../api/cliente';
import { useNavigate } from 'react-router-dom';
import { useSessao } from '../hooks/useSessao';
import { IDIOMAS, rotuloIdioma, useI18n } from '../i18n';
import { IconeLocal, IconeLua, IconeMenu, IconeSeta, IconeSol } from './Icones';
import { Marca } from './Marca';
import type { Tema } from '../hooks/useTema';

/**
 * A casca do app: onde estou e quem sou eu.
 *
 * Eram duas faixas e uns 240px — um quarto de um celular gasto antes da
 * primeira linha de conteúdo, em toda tela, e ainda assim com o nome do app
 * cortado em "Atendimento de …". Nome cortado não identifica nada, e quem abriu
 * o app já sabe qual app abriu.
 *
 * Agora é uma faixa. Fica o que muda e é preciso conferir — a base em que se
 * está atendendo, porque atender na base errada é erro de registro — e o tema,
 * que é ação de campo: a mesma pessoa atende sob sol forte de manhã e no escuro
 * à noite. Idioma, produção, gestão e sair foram para o menu: são escolhas de
 * uma vez, e não mereciam espaço fixo no topo de todas as telas.
 */
export function Cabecalho({ tema, alternarTema }: { tema: Tema; alternarTema: () => void }) {
  const { t, idioma, definirIdioma } = useI18n();
  const { profissional, base, sair } = useSessao();
  const navegar = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const [pendentes, setPendentes] = useState(0);
  const menu = useRef<HTMLDivElement>(null);

  // Contas esperando aprovação viram um número ao lado do menu: sem isso o
  // administrador só descobre que alguém está travado quando a pessoa avisa.
  useEffect(() => {
    if (!profissional?.ehAdministrador) return;

    let cancelado = false;

    api
      .contarPendentes()
      .then((total) => {
        if (!cancelado) setPendentes(total);
      })
      .catch(() => {
        // Um aviso que falha não pode atrapalhar o resto da tela.
      });

    return () => {
      cancelado = true;
    };
  }, [profissional?.ehAdministrador]);

  /*
    Fecha ao tocar fora e ao apertar Esc.

    Antes o menu só fechava no mesmo botão que o abriu. Num celular, tocar fora
    é o gesto de desistir, e sem isso o menu ficava aberto por cima da fila até
    alguém acertar o botão de novo.
  */
  useEffect(() => {
    if (!menuAberto) return;

    function aoTocarFora(evento: MouseEvent) {
      if (!menu.current?.contains(evento.target as Node)) setMenuAberto(false);
    }

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setMenuAberto(false);
    }

    document.addEventListener('mousedown', aoTocarFora);
    document.addEventListener('keydown', aoTeclar);

    return () => {
      document.removeEventListener('mousedown', aoTocarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [menuAberto]);

  function irPara(rota: string) {
    setMenuAberto(false);
    navegar(rota);
  }

  return (
    <header className="sticky top-0 z-20 bg-marca text-white shadow-md">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => navegar('/atendimentos')}
          aria-label={t('app')}
          className="shrink-0"
        >
          <Marca contexto="cabecalho" />
        </button>

        {/*
          A base ocupa o lugar que era do nome do app. É o dado que muda e que
          precisa ser conferido: quem troca de base e não repara registra o
          atendimento no lugar errado, e o código do paciente sai com o prefixo
          de outra base.
        */}
        <button
          type="button"
          onClick={() => navegar('/bases')}
          aria-label={t('trocarBase')}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-sm font-medium"
        >
          <IconeLocal className="h-4 w-4 shrink-0" />
          <span className="truncate">{base?.nome ?? t('base')}</span>
          <IconeSeta className="h-4 w-4 shrink-0 opacity-70" />
        </button>

        <button
          type="button"
          onClick={alternarTema}
          aria-label={tema === 'escuro' ? t('temaClaro') : t('temaEscuro')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15"
        >
          {tema === 'escuro' ? <IconeSol /> : <IconeLua />}
        </button>

        <div className="relative shrink-0" ref={menu}>
          <button
            type="button"
            onClick={() => setMenuAberto((v) => !v)}
            aria-expanded={menuAberto}
            aria-haspopup="menu"
            aria-label={profissional?.nome ?? t('menu')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
          >
            <IconeMenu />

            {/*
              O número de contas pendentes some junto com o menu aberto. Fora
              dele, é um ponto no canto: o administrador precisa ver que há algo
              esperando sem abrir nada.
            */}
            {pendentes > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-vermelho px-1 text-[11px] font-bold text-white">
                {pendentes}
              </span>
            ) : null}
          </button>

          {menuAberto ? (
            <div
              role="menu"
              className="absolute right-0 top-full z-30 mt-2 w-60 overflow-hidden rounded-xl border border-borda bg-superficie text-texto shadow-lg"
            >
              {/*
                Quem está logado, escrito por extenso. No cabeçalho cabia só o
                primeiro nome, e numa equipe com duas Anas o primeiro nome não
                diz de quem é o plantão aberto naquele aparelho.
              */}
              <div className="border-b border-borda px-4 py-3">
                <p className="truncate font-semibold">{profissional?.nome ?? '—'}</p>
                <p className="truncate text-sm text-texto-suave">{base?.nome ?? t('base')}</p>
              </div>

              {/*
                Para todo mundo: quem não é coordenação recebe da API só a
                própria produção, e ver o próprio trabalho somado não é
                privilégio de ninguém.
              */}
              <button
                type="button"
                role="menuitem"
                onClick={() => irPara('/producao')}
                className="w-full border-b border-borda px-4 py-3 text-left text-sm hover:bg-superficie-2"
              >
                {t('producao')}
              </button>

              {profissional?.ehAdministrador ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => irPara('/contas')}
                    className="flex w-full items-center justify-between gap-2 border-b border-borda px-4 py-3 text-left text-sm hover:bg-superficie-2"
                  >
                    {t('gestaoContas')}
                    {pendentes > 0 ? (
                      <span className="rounded-full bg-marca px-2 py-0.5 text-xs font-semibold text-white">
                        {pendentes}
                      </span>
                    ) : null}
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => irPara('/bases/gerenciar')}
                    className="w-full border-b border-borda px-4 py-3 text-left text-sm hover:bg-superficie-2"
                  >
                    {t('gestaoBases')}
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => irPara('/comunidades')}
                    className="w-full border-b border-borda px-4 py-3 text-left text-sm hover:bg-superficie-2"
                  >
                    {t('gestaoComunidades')}
                  </button>
                </>
              ) : null}

              <label className="flex items-center justify-between gap-2 border-b border-borda px-4 py-3 text-sm">
                <span>{t('idioma')}</span>
                <select
                  value={idioma}
                  onChange={(e) => definirIdioma(e.target.value as typeof idioma)}
                  className="rounded-lg border border-borda bg-superficie-2 px-2 py-1 text-sm"
                >
                  {IDIOMAS.map((codigo) => (
                    <option key={codigo} value={codigo}>
                      {rotuloIdioma[codigo]}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuAberto(false);
                  sair();
                }}
                className="w-full px-4 py-3 text-left text-sm text-vermelho hover:bg-superficie-2"
              >
                {t('sair')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
