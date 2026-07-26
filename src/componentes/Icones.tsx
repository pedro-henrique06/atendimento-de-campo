/**
 * Ícones da interface, desenhados aqui em vez de emoji.
 *
 * Emoji é fonte, não desenho: cada sistema entrega o seu, então o mesmo botão
 * saía com aparência diferente no Android, no iPhone e no navegador do posto —
 * alguns coloridos, alguns não, e nenhum acompanhando a cor do texto ao lado.
 * Estes são SVG traçado em `currentColor`: herdam a cor de quem os contém e
 * ficam iguais em todo lugar.
 *
 * Todos são decorativos (`aria-hidden`). O que dá significado é o texto ou o
 * `aria-label` do botão que os envolve — nunca o ícone sozinho.
 */

type Props = { className?: string };

const PADRAO = 'h-5 w-5';

function Traco({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? PADRAO}
    >
      {children}
    </svg>
  );
}

export function IconeAlerta({ className }: Props) {
  return (
    <Traco className={className}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Traco>
  );
}

export function IconeLocal({ className }: Props) {
  return (
    <Traco className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </Traco>
  );
}

export function IconeSol({ className }: Props) {
  return (
    <Traco className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Traco>
  );
}

export function IconeLua({ className }: Props) {
  return (
    <Traco className={className}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </Traco>
  );
}

export function IconeOlho({ className }: Props) {
  return (
    <Traco className={className}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Traco>
  );
}

/** Olho cortado: a senha está visível e o clique volta a escondê-la. */
export function IconeOlhoFechado({ className }: Props) {
  return (
    <Traco className={className}>
      <path d="M10.7 5.1A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-2.5 3.4M6.6 6.6A18 18 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </Traco>
  );
}

export function IconeSeta({ className }: Props) {
  return (
    <Traco className={className ?? 'h-4 w-4'}>
      <path d="m6 9 6 6 6-6" />
    </Traco>
  );
}

export function IconeConcluido({ className }: Props) {
  return (
    <Traco className={className ?? 'h-4 w-4'}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </Traco>
  );
}

export function IconePendente({ className }: Props) {
  return (
    <Traco className={className ?? 'h-4 w-4'}>
      <circle cx="12" cy="12" r="9" />
    </Traco>
  );
}
