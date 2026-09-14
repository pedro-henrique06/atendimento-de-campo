import { api } from '../api/cliente';
import type { DesfechoConsulta, Especialidade } from '../api/tipos';
import { Secao } from '../componentes/Basicos';
import { FichaDeEtapa, SecaoDesfecho, useTituloDaFila } from '../componentes/FichaDeEtapa';
import { useI18n } from '../i18n';

interface FormUltrassom {
  exameSolicitado: string;
  indicacao: string;
  analise: string;
  conclusao: string;
  desfecho: DesfechoConsulta | null;
  encaminhadoPara: Especialidade | null;
}

const INICIAL: FormUltrassom = {
  exameSolicitado: '',
  indicacao: '',
  analise: '',
  conclusao: '',
  desfecho: null,
  encaminhadoPara: null,
};

/**
 * O laudo do exame de imagem.
 *
 * Não tem CID-10 nem conduta, e é de propósito: quem faz o exame descreve e
 * conclui; quem decide o que fazer com isso é quem pediu. O caminho de volta
 * até ele é o desfecho "encaminhado" daqui.
 */
export function Ultrassom() {
  const { t } = useI18n();
  const titulo = useTituloDaFila('Ultrassom');

  return (
    <FichaDeEtapa<FormUltrassom>
      chave="ultrassom"
      inicial={INICIAL}
      titulo={titulo}
      especialidade="Ultrassom"
      enviar={(id, form) =>
        api.registrarUltrassom(id, {
          exameSolicitado: form.exameSolicitado.trim() || null,
          indicacao: form.indicacao.trim() || null,
          analise: form.analise.trim() || null,
          conclusao: form.conclusao.trim() || null,
          desfecho: form.desfecho,
          encaminhadoPara: form.encaminhadoPara,
        })
      }
    >
      {(form, alterar) => (
        <>
          <Secao titulo={t('exameSolicitado')}>
            <input
              className="campo"
              aria-label={t('exameSolicitado')}
              value={form.exameSolicitado}
              onChange={(e) => alterar({ exameSolicitado: e.target.value })}
            />
          </Secao>

          <Secao titulo={t('indicacaoExame')}>
            <textarea
              className="campo min-h-20"
              aria-label={t('indicacaoExame')}
              value={form.indicacao}
              onChange={(e) => alterar({ indicacao: e.target.value })}
            />
          </Secao>

          <Secao titulo={t('analise')}>
            <textarea
              className="campo min-h-40"
              aria-label={t('analise')}
              value={form.analise}
              onChange={(e) => alterar({ analise: e.target.value })}
            />
          </Secao>

          {/*
            Separada da análise porque é ela que quem pediu lê primeiro, e no
            papel as duas são linhas distintas. Juntas numa caixa só, a conclusão
            vira o último parágrafo de um texto corrido e deixa de ser achável.
          */}
          <Secao titulo={t('conclusaoLaudo')}>
            <textarea
              className="campo min-h-24"
              aria-label={t('conclusaoLaudo')}
              value={form.conclusao}
              onChange={(e) => alterar({ conclusao: e.target.value })}
            />
          </Secao>

          <SecaoDesfecho
            valor={form.desfecho}
            destino={form.encaminhadoPara}
            aoEscolher={(desfecho) => alterar({ desfecho })}
            aoEscolherDestino={(encaminhadoPara) => alterar({ encaminhadoPara })}
          />
        </>
      )}
    </FichaDeEtapa>
  );
}
