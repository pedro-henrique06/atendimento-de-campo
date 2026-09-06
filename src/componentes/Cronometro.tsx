import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';

/** De quanto em quanto tempo o número na tela avança. */
export const INTERVALO_CRONOMETRO = 30_000;

/** Passado este tempo, o atendimento provavelmente ficou esquecido aberto. */
export const MINUTOS_DE_ATENCAO = 60;

/**
 * Formata a duração como a equipe fala: "8 min", "1h30".
 *
 * Segundos não aparecem de propósito. Ninguém decide nada com eles, e um número
 * que muda a cada segundo puxa o olho para longe do paciente.
 */
export function formatarDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return resto === 0 ? `${horas}h` : `${horas}h${String(resto).padStart(2, '0')}`;
}

/** Minutos inteiros desde o instante, nunca negativo. */
export function minutosDesde(inicio: string, agora: number = Date.now()): number {
  const decorrido = (agora - new Date(inicio).getTime()) / 60_000;

  // Relógio do aparelho atrasado em relação ao servidor produziria tempo
  // negativo, e "-3 min" na ficha assusta sem informar nada.
  return Math.max(Math.floor(decorrido), 0);
}

/**
 * Quanto tempo o paciente está com este profissional.
 *
 * Conta desde que a etapa foi assumida, e não desde a entrada na fila: entre as
 * duas coisas está a espera, e somar as duas faria todo atendimento parecer
 * durar o plantão inteiro.
 *
 * O número avança sozinho a cada meio minuto. Sem isso ele congelaria no valor
 * do carregamento e passaria a mentir quanto mais tempo a tela ficasse aberta —
 * que é justamente o caso que interessa.
 */
export function Cronometro({
  assumidaEm,
  className = '',
}: {
  assumidaEm: string | null;
  className?: string;
}) {
  const { t } = useI18n();
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (!assumidaEm) return;

    const intervalo = setInterval(() => setAgora(Date.now()), INTERVALO_CRONOMETRO);
    return () => clearInterval(intervalo);
  }, [assumidaEm]);

  if (!assumidaEm) return null;

  const minutos = minutosDesde(assumidaEm, agora);
  const atencao = minutos >= MINUTOS_DE_ATENCAO;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-medium tabular-nums ${
        atencao ? 'text-vermelho' : 'text-texto-suave'
      } ${className}`}
      // O tempo muda sozinho; sem isto o leitor de tela anunciaria a mudança a
      // cada meio minuto, no meio da consulta.
      aria-live="off"
      title={t('tempoDeAtendimento')}
    >
      <RelogioPequeno />
      {formatarDuracao(minutos)}
    </span>
  );
}

function RelogioPequeno() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
