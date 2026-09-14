import { api } from '../api/cliente';
import type { DesfechoConsulta, Dispensacao, Especialidade, Prontuario } from '../api/tipos';
import { Secao } from '../componentes/Basicos';
import { ListaDispensacao, ListaItens, paraEnvio } from '../componentes/Dispensacao';
import type { LinhaDispensacao } from '../componentes/Dispensacao';
import { FichaDeEtapa, SecaoDesfecho, useTituloDaFila } from '../componentes/FichaDeEtapa';
import { useI18n } from '../i18n';

interface FormFarmacia {
  orientacoes: string;
  observacoes: string;
  desfecho: DesfechoConsulta | null;
  encaminhadoPara: Especialidade | null;
  dispensacoes: LinhaDispensacao[];
}

const INICIAL: FormFarmacia = {
  orientacoes: '',
  observacoes: '',
  desfecho: null,
  encaminhadoPara: null,
  dispensacoes: [],
};

/**
 * O que foi prescrito nas outras filas, para conferir contra o que sai daqui.
 *
 * Vem do prontuário, e não é copiado para dentro da ficha: a receita é de quem
 * atendeu, e uma cópia dela na farmácia poderia ficar diferente do original sem
 * ninguém notar.
 */
function Prescrito({ prontuario }: { prontuario: Prontuario }) {
  const { t } = useI18n();

  const itens: Dispensacao[] = [
    ...prontuario.consultas.flatMap((c) => c.dispensacoes),
    ...(prontuario.odontologia?.dispensacoes ?? []),
    ...(prontuario.enfermagem?.dispensacoes ?? []),
  ];

  return (
    <Secao titulo={t('prescrito')}>
      <ListaItens itens={itens} />
    </Secao>
  );
}

/**
 * A passagem pela farmácia.
 *
 * O "medicamento, profissional e hora" da checagem de papel: o primeiro são as
 * linhas daqui; os outros dois são o profissional e a conclusão da própria
 * etapa, que já existem — digitados de novo, poderiam divergir do resto.
 */
export function Farmacia() {
  const { t } = useI18n();
  const titulo = useTituloDaFila('Farmacia');

  return (
    <FichaDeEtapa<FormFarmacia>
      chave="farmacia"
      inicial={INICIAL}
      titulo={titulo}
      especialidade="Farmacia"
      enviar={(id, form) =>
        api.registrarFarmacia(id, {
          orientacoes: form.orientacoes.trim() || null,
          observacoes: form.observacoes.trim() || null,
          desfecho: form.desfecho,
          encaminhadoPara: form.encaminhadoPara,
          dispensacoes: paraEnvio(form.dispensacoes),
        })
      }
    >
      {(form, alterar, prontuario) => (
        <>
          <Prescrito prontuario={prontuario} />

          <Secao titulo={t('entregue')}>
            <ListaDispensacao
              linhas={form.dispensacoes}
              aoMudar={(dispensacoes) => alterar({ dispensacoes })}
            />
          </Secao>

          <Secao titulo={t('orientacaoFarmaceutica')}>
            <textarea
              className="campo min-h-20"
              aria-label={t('orientacaoFarmaceutica')}
              value={form.orientacoes}
              onChange={(e) => alterar({ orientacoes: e.target.value })}
            />
          </Secao>

          {/*
            O que fugiu do previsto: item em falta, dose trocada por outra
            apresentação, receita ilegível. Sem lugar para isso, a troca acontece
            e some — e quem atende de novo não sabe o que a pessoa levou.
          */}
          <Secao titulo={t('observacoes')}>
            <textarea
              className="campo min-h-20"
              aria-label={t('observacoes')}
              value={form.observacoes}
              onChange={(e) => alterar({ observacoes: e.target.value })}
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
