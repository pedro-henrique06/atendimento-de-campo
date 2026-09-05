import { useState } from 'react';
import { useI18n } from '../i18n';
import { IconeAlerta } from './Icones';

/**
 * A senha do primeiro acesso, mostrada uma única vez.
 *
 * O servidor guarda só o hash: não existe tela onde consultar isto depois. Se a
 * senha se perder aqui, o caminho é sortear outra — por isso o aviso é explícito
 * em vez de discreto.
 *
 * Fica em fonte monoespaçada e com espaçamento largo porque em campo ela vai ser
 * lida em voz alta ou copiada à mão de um celular.
 */
export function CredencialProvisoria({
  titulo,
  nome,
  usuario,
  senha,
  aoFechar,
}: {
  titulo: string;
  nome: string;
  usuario: string;
  senha: string;
  aoFechar: () => void;
}) {
  const { t } = useI18n();
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(senha);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard negado ou indisponível — a senha continua visível na tela,
      // que é o que importa. Acusar erro aqui só assustaria.
    }
  }

  return (
    <div className="rounded-lg border border-marca-clara bg-marca/5 p-4">
      <p className="font-semibold">{titulo}</p>
      <p className="mt-0.5 text-sm text-texto-suave">
        {nome} · <span className="font-mono">{usuario}</span>
      </p>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-texto-suave">
        {t('senhaProvisoria')}
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <code className="select-all font-mono text-xl font-bold tracking-[0.2em]">{senha}</code>
        <button type="button" onClick={copiar} className="botao-secundario shrink-0">
          {copiado ? t('copiado') : t('copiarSenha')}
        </button>
      </div>

      <p className="mt-3 flex items-start gap-2 text-sm text-texto-suave">
        <span className="mt-0.5 shrink-0 text-amarelo">
          <IconeAlerta />
        </span>
        {t('senhaProvisoriaAviso')}
      </p>

      <button
        type="button"
        onClick={aoFechar}
        className="mt-3 text-sm font-semibold text-marca-clara underline"
      >
        {t('fechar')}
      </button>
    </div>
  );
}
