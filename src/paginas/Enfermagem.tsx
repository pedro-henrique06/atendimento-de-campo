import { api } from '../api/cliente';
import type { DesfechoConsulta, ProcedimentoEnfermagem } from '../api/tipos';
import { Campo, Multiplas, Secao } from '../componentes/Basicos';
import { ListaDispensacao, paraEnvio } from '../componentes/Dispensacao';
import type { LinhaDispensacao } from '../componentes/Dispensacao';
import { FichaDeEtapa, SecaoDesfecho, useTituloDaFila } from '../componentes/FichaDeEtapa';
import { useI18n } from '../i18n';
import { procedimentosEnfermagem } from '../i18n/enums';

const PROCEDIMENTOS: ProcedimentoEnfermagem[] = [
  'Curativo',
  'AdministracaoMedicamento',
  'AfericaoSinaisVitais',
  'GlicemiaCapilar',
  'Nebulizacao',
  'RetiradaPontos',
  'Imobilizacao',
  'Orientacao',
  'Outro',
];

interface FormEnfermagem {
  procedimentos: ProcedimentoEnfermagem[];
  outroProcedimento: string;
  observacoes: string;
  desfecho: DesfechoConsulta | null;
  dispensacoes: LinhaDispensacao[];
}

const INICIAL: FormEnfermagem = {
  procedimentos: [],
  outroProcedimento: '',
  observacoes: '',
  desfecho: null,
  dispensacoes: [],
};

/**
 * A ficha da enfermagem.
 *
 * O endpoint e o bloco do prontuário existiam desde sempre; a tela para
 * preencher, não — a fila da enfermagem recebia paciente e não tinha onde
 * escrever o que foi feito.
 */
export function Enfermagem() {
  const { t, idioma } = useI18n();
  const titulo = useTituloDaFila('Enfermagem');

  return (
    <FichaDeEtapa<FormEnfermagem>
      chave="enfermagem"
      inicial={INICIAL}
      titulo={titulo}
      especialidade="Enfermagem"
      enviar={(id, form) =>
        api.registrarEnfermagem(id, {
          procedimentos: form.procedimentos,
          outroProcedimento: form.outroProcedimento.trim() || null,
          observacoes: form.observacoes.trim() || null,
          desfecho: form.desfecho,
          dispensacoes: paraEnvio(form.dispensacoes),
        })
      }
    >
      {(form, alterar) => (
        <>
          <Secao titulo={t('procedimentosRealizados')}>
            <Multiplas
              valores={form.procedimentos}
              opcoes={PROCEDIMENTOS}
              aoAlternar={(p) =>
                alterar({
                  procedimentos: form.procedimentos.includes(p)
                    ? form.procedimentos.filter((x) => x !== p)
                    : [...form.procedimentos, p],
                })
              }
              tabela={procedimentosEnfermagem}
              idioma={idioma}
            />

            {form.procedimentos.includes('Outro') ? (
              <Campo rotulo={t('procedimentos')}>
                <input
                  className="campo"
                  value={form.outroProcedimento}
                  onChange={(e) => alterar({ outroProcedimento: e.target.value })}
                />
              </Campo>
            ) : null}
          </Secao>

          <Secao titulo={t('observacoes')}>
            <textarea
              className="campo min-h-24"
              aria-label={t('observacoes')}
              value={form.observacoes}
              onChange={(e) => alterar({ observacoes: e.target.value })}
            />
          </Secao>

          <Secao titulo={t('dispensacao')}>
            <ListaDispensacao
              linhas={form.dispensacoes}
              aoMudar={(dispensacoes) => alterar({ dispensacoes })}
            />
          </Secao>

          {/*
            Sem seletor de destino: quem encaminha a partir da enfermagem é o
            cartão do prontuário, como na odontologia.
          */}
          <SecaoDesfecho valor={form.desfecho} aoEscolher={(desfecho) => alterar({ desfecho })} />
        </>
      )}
    </FichaDeEtapa>
  );
}
