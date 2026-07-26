import { useState } from 'react';
import { useI18n } from '../i18n';

/**
 * O código do paciente, em destaque no topo do cadastro.
 *
 * Aparece antes de qualquer campo ser preenchido porque é o que a equipe anota
 * e entrega à pessoa. Esperar o formulário terminar significaria perder o
 * código se o aparelho desligasse no meio — e é ele que reencontra quem não tem
 * documento na visita seguinte.
 *
 * Monoespaçado e com espaçamento entre caracteres: ele é lido em voz alta e
 * copiado à mão num papel que vai passar semanas no bolso.
 */
export function CodigoPaciente({ codigo }: { codigo: string }) {
  const { t } = useI18n();
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem permissão de área de transferência o código continua na tela,
      // legível, que é o que importa. Falhar em silêncio é melhor que um erro
      // que não ajuda em nada.
    }
  }

  return (
    <div className="rounded-card border border-marca/40 bg-marca/10 p-4">
      <p className="sobretitulo text-marca-clara">{t('codigoDoPaciente')}</p>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-3xl font-bold tracking-widest text-marca-clara">{codigo}</p>

        <button type="button" onClick={copiar} className="botao-secundario shrink-0">
          {copiado ? t('copiado') : t('copiar')}
        </button>
      </div>

      <p className="mt-2 text-sm text-texto-suave">{t('codigoExplicacao')}</p>
    </div>
  );
}
