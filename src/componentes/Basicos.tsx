import type { ReactNode } from 'react';
import type { ClassificacaoRisco, Idioma } from '../api/tipos';
import { useI18n, traduzir } from '../i18n';
import { classificacoesCurtas } from '../i18n/enums';

export function Cartao({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`cartao ${className}`}>{children}</div>;
}

export function Titulo({ children }: { children: ReactNode }) {
  return <h1 className="titulo">{children}</h1>;
}

export function Secao({ titulo, autor, children }: { titulo: string; autor?: string | null; children: ReactNode }) {
  return (
    <section className="cartao space-y-4">
      <header className="flex items-baseline justify-between gap-3 border-b border-borda pb-2">
        <h2 className="text-lg font-bold text-marca-clara">{titulo}</h2>
        {autor ? <span className="text-sm text-texto-suave">{autor}</span> : null}
      </header>
      {children}
    </section>
  );
}

export function Campo({
  rotulo,
  obrigatorio = false,
  dica,
  children,
}: {
  rotulo: string;
  obrigatorio?: boolean;
  dica?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="rotulo">
        {rotulo}
        {obrigatorio ? <span className="ml-1 text-vermelho">*</span> : null}
      </span>
      {children}
      {dica ? <span className="mt-1 block text-sm text-texto-suave">{dica}</span> : null}
    </label>
  );
}

export function Erros({ erros }: { erros: string[] }) {
  if (erros.length === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border border-vermelho/40 bg-vermelho/10 px-4 py-3 text-sm text-vermelho"
    >
      {erros.length === 1 ? (
        erros[0]
      ) : (
        <ul className="list-inside list-disc space-y-1">
          {erros.map((erro) => (
            <li key={erro}>{erro}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const CORES_RISCO: Record<ClassificacaoRisco, string> = {
  Vermelho: 'bg-vermelho',
  Amarelo: 'bg-amarelo',
  Verde: 'bg-verde',
  Preto: 'bg-preto',
};

export function PontoRisco({ risco }: { risco: ClassificacaoRisco | null }) {
  const { idioma } = useI18n();

  if (!risco) {
    return <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-borda" aria-hidden />;
  }

  return (
    <span
      className={`inline-block h-3 w-3 shrink-0 rounded-full ${CORES_RISCO[risco]}`}
      // A cor sozinha não comunica: quem usa leitor de tela ou não distingue
      // as cores precisa do rótulo.
      role="img"
      aria-label={traduzir(classificacoesCurtas, idioma, risco)}
    />
  );
}

export function Etiqueta({ children, tom = 'neutro' }: { children: ReactNode; tom?: 'neutro' | 'sucesso' }) {
  const cor =
    tom === 'sucesso'
      ? 'border-verde/40 bg-verde/10 text-verde'
      : 'border-borda bg-superficie-2 text-texto-suave';

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${cor}`}>{children}</span>;
}

/**
 * Alerta de alergia do topo do prontuário.
 *
 * Só é renderizado quando o backend diz que há alergia registrada. No sistema
 * de referência este alerta aparecia para qualquer texto preenchido — inclusive
 * "Nega alergia medicamentosa" — e a equipe parava de olhar. Aqui a decisão de
 * exibir vem inteira do servidor, sem heurística de front.
 */
export function AlertaAlergia({ exibir, texto }: { exibir: boolean; texto: string | null }) {
  const { t } = useI18n();

  if (!exibir) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-vermelho/50 bg-vermelho/10 px-3 py-2 text-sm font-semibold text-vermelho"
    >
      <span aria-hidden>⚠️</span>
      <span>
        {t('alertaAlergia')}: {texto}
      </span>
    </div>
  );
}

export function Carregando({ texto }: { texto: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-texto-suave">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-borda border-t-marca-clara" aria-hidden />
      {texto}
    </div>
  );
}

export function Vazio({ texto }: { texto: string }) {
  return <div className="cartao py-10 text-center text-texto-suave">{texto}</div>;
}

/** Grupo de opções em botões, mais confortável que `select` no celular. */
export function Opcoes<T extends string>({
  valor,
  opcoes,
  aoEscolher,
  tabela,
  idioma,
}: {
  valor: T | null;
  opcoes: readonly T[];
  aoEscolher: (valor: T) => void;
  tabela: Record<Idioma, Record<T, string>>;
  idioma: Idioma;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((opcao) => {
        const ativo = valor === opcao;

        return (
          <button
            key={opcao}
            type="button"
            aria-pressed={ativo}
            onClick={() => aoEscolher(opcao)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              ativo
                ? 'border-marca bg-marca text-white'
                : 'border-borda bg-superficie-2 text-texto hover:border-marca-clara'
            }`}
          >
            {traduzir(tabela, idioma, opcao)}
          </button>
        );
      })}
    </div>
  );
}

/** Múltipla escolha com o mesmo visual de `Opcoes`. */
export function Multiplas<T extends string>({
  valores,
  opcoes,
  aoAlternar,
  tabela,
  idioma,
}: {
  valores: T[];
  opcoes: readonly T[];
  aoAlternar: (valor: T) => void;
  tabela: Record<Idioma, Record<T, string>>;
  idioma: Idioma;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((opcao) => {
        const ativo = valores.includes(opcao);

        return (
          <button
            key={opcao}
            type="button"
            aria-pressed={ativo}
            onClick={() => aoAlternar(opcao)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              ativo
                ? 'border-marca bg-marca text-white'
                : 'border-borda bg-superficie-2 text-texto hover:border-marca-clara'
            }`}
          >
            {traduzir(tabela, idioma, opcao)}
          </button>
        );
      })}
    </div>
  );
}

export function Interruptor({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  valor: boolean;
  aoMudar: (valor: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-borda bg-superficie-2 px-4 py-3">
      <span className="text-sm font-medium">{rotulo}</span>
      <input
        type="checkbox"
        checked={valor}
        onChange={(e) => aoMudar(e.target.checked)}
        className="h-6 w-6 shrink-0 accent-[rgb(var(--cor-marca))]"
      />
    </label>
  );
}
