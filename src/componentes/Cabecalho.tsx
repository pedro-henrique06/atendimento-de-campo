import { useEffect, useState } from 'react';
import { api } from '../api/cliente';
import { useNavigate } from 'react-router-dom';
import { useSessao } from '../hooks/useSessao';
import { IDIOMAS, rotuloIdioma, useI18n } from '../i18n';
import { IconeLocal, IconeLua, IconeSeta, IconeSol } from './Icones';
import { Marca } from './Marca';
import type { Tema } from '../hooks/useTema';

export function Cabecalho({ tema, alternarTema }: { tema: Tema; alternarTema: () => void }) {
  const { t, idioma, definirIdioma } = useI18n();
  const { profissional, base, definirBase, sair } = useSessao();
  const navegar = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const [pendentes, setPendentes] = useState(0);

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

  return (
    <header className="sticky top-0 z-10 bg-marca text-white shadow-md">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navegar('/atendimentos')}
            className="flex min-w-0 items-center gap-2.5 text-left"
          >
            <Marca contexto="cabecalho" />
            <span className="min-w-0 truncate text-lg font-bold">{t('app')}</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuAberto((v) => !v)}
              aria-expanded={menuAberto}
              className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium"
            >
              <span className="h-2 w-2 rounded-full bg-verde" aria-hidden />
              {profissional?.nome.split(' ')[0] ?? '—'}
            </button>

            {menuAberto ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-xl border border-borda bg-superficie text-texto shadow-lg">
                {/*
                  Para todo mundo: quem não é coordenação recebe da API só a
                  própria produção, e ver o próprio trabalho somado não é
                  privilégio de ninguém.
                */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuAberto(false);
                    navegar('/producao');
                  }}
                  className="w-full border-b border-borda px-4 py-3 text-left text-sm hover:bg-superficie-2"
                >
                  {t('producao')}
                </button>

                {profissional?.ehAdministrador ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAberto(false);
                      navegar('/contas');
                    }}
                    className="flex w-full items-center justify-between gap-2 border-b border-borda px-4 py-3 text-left text-sm hover:bg-superficie-2"
                  >
                    {t('gestaoContas')}
                    {pendentes > 0 ? (
                      <span className="rounded-full bg-marca px-2 py-0.5 text-xs font-semibold text-white">
                        {pendentes}
                      </span>
                    ) : null}
                  </button>
                ) : null}

                {profissional?.ehAdministrador ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAberto(false);
                      navegar('/bases/gerenciar');
                    }}
                    className="w-full border-b border-borda px-4 py-3 text-left text-sm hover:bg-superficie-2"
                  >
                    {t('gestaoBases')}
                  </button>
                ) : null}

                {profissional?.ehAdministrador ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAberto(false);
                      navegar('/comunidades');
                    }}
                    className="w-full border-b border-borda px-4 py-3 text-left text-sm hover:bg-superficie-2"
                  >
                    {t('gestaoComunidades')}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setMenuAberto(false);
                    sair();
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-superficie-2"
                >
                  {t('sair')}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              definirBase(null);
              navegar('/bases');
            }}
            className="flex min-w-0 items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-sm font-medium"
          >
            <IconeLocal className="h-4 w-4 shrink-0" />
            <span className="truncate">{base?.nome ?? t('base')}</span>
            <IconeSeta className="h-4 w-4 shrink-0" />
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={alternarTema}
              aria-label={tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
            >
              {tema === 'escuro' ? <IconeSol /> : <IconeLua />}
            </button>

            <select
              value={idioma}
              onChange={(e) => definirIdioma(e.target.value as typeof idioma)}
              aria-label="Idioma"
              className="rounded-full border-0 bg-white/15 px-3 py-2 text-sm font-medium text-white [&>option]:text-texto"
            >
              {IDIOMAS.map((codigo) => (
                <option key={codigo} value={codigo}>
                  {rotuloIdioma[codigo]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
