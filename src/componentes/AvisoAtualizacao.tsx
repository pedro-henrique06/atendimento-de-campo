import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useI18n } from '../i18n';

/**
 * Avisa quando há versão nova e quando o aparelho está sem sinal.
 *
 * A atualização é **oferecida, não imposta**: recarregar sozinho no meio de um
 * atendimento apagaria o formulário que a pessoa está preenchendo. Mas também
 * não pode ficar em silêncio — num prontuário, rodar uma versão velha sem
 * saber é o tipo de coisa que só aparece quando já deu problema.
 *
 * O aviso de sem sinal existe porque o app instalado abre normalmente offline
 * (a casca está em cache) e nada denuncia a falta de rede até alguém tentar
 * salvar e perder o trabalho.
 */
export function AvisoAtualizacao() {
  const { t } = useI18n();
  const [semSinal, setSemSinal] = useState(() => !navigator.onLine);

  const {
    needRefresh: [precisaAtualizar],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    const online = () => setSemSinal(false);
    const offline = () => setSemSinal(true);

    window.addEventListener('online', online);
    window.addEventListener('offline', offline);

    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  if (!precisaAtualizar && !semSinal) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm"
      style={{ backgroundColor: precisaAtualizar ? 'rgb(var(--cor-marca))' : '#8a6d1f' }}
    >
      <span className="text-white">
        {precisaAtualizar ? t('versaoNova') : t('semSinal')}
      </span>

      {precisaAtualizar ? (
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="shrink-0 rounded-full bg-white px-4 py-1.5 font-semibold text-marca"
        >
          {t('atualizarAgora')}
        </button>
      ) : null}
    </div>
  );
}
