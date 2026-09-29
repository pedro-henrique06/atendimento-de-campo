import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconeVoltar } from './Icones';
import { useI18n } from '../i18n';

/**
 * O título da tela, com o caminho de volta e a ação principal na mesma linha.
 *
 * O voltar existe porque o app é instalado como PWA em modo `standalone`, que é
 * uma janela sem barra de navegador: ali não há botão de voltar do sistema.
 * Quem abria uma ficha e desistia ficava preso nela — a única saída era o
 * logotipo, que leva para a fila e perde o paciente de vista. Num celular
 * comum o gesto do sistema ainda funciona, mas a tela não pode depender de
 * estar num navegador para ter saída.
 *
 * `voltarPara` é uma rota, e não `history.back()`: as fichas chegam por
 * `replace`, e voltar no histórico levaria para a tela de onde a pessoa veio
 * duas navegações atrás, que raramente é o prontuário do paciente aberto.
 *
 * A ação principal fica aqui, ao lado do título, e não no fim da rolagem: numa
 * tela longa ela some abaixo da dobra, e o mais usado vira o mais escondido.
 */
export function BarraDaPagina({
  titulo,
  sobretitulo,
  voltarPara,
  acao,
}: {
  titulo: ReactNode;
  /** Uma linha acima do título: de quem é esta ficha, em que fila se está. */
  sobretitulo?: ReactNode;
  /** Para onde o voltar leva. Sem isto, a tela não mostra voltar. */
  voltarPara?: string;
  /** A ação principal da tela, à direita do título. */
  acao?: ReactNode;
}) {
  const { t } = useI18n();
  const navegar = useNavigate();

  return (
    <div className="flex items-start gap-2">
      {voltarPara ? (
        <button
          type="button"
          onClick={() => navegar(voltarPara)}
          aria-label={t('voltar')}
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-texto-suave transition hover:bg-superficie-2 hover:text-texto"
        >
          <IconeVoltar />
        </button>
      ) : null}

      <div className="min-w-0 flex-1 py-1.5">
        {sobretitulo ? <p className="sobretitulo">{sobretitulo}</p> : null}
        <h1 className="titulo">{titulo}</h1>
      </div>

      {acao ? <div className="shrink-0">{acao}</div> : null}
    </div>
  );
}
