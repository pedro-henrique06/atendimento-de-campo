import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type { AtendimentoResumo, ClassificacaoRisco, Especialidade } from '../api/tipos';
import { Carregando, Erros, Etiqueta, PontoRisco, Vazio } from '../componentes/Basicos';
import { IconeConcluido, IconePendente } from '../componentes/Icones';
import { useSessao } from '../hooks/useSessao';
import { useI18n, traduzir } from '../i18n';
import { classificacoesCurtas, especialidades, statusAtendimento } from '../i18n/enums';

const FILAS: Especialidade[] = [
  'Triagem',
  'ClinicaGeral',
  'Pediatria',
  'Ortopedia',
  'Odontologia',
  'Enfermagem',
  'SaudeMental',
];

const RISCOS: ClassificacaoRisco[] = ['Vermelho', 'Amarelo', 'Verde', 'Preto'];

/** "Meus" é uma fila a mais na barra, mas filtra por quem assumiu, não por especialidade. */
type Aba = Especialidade | 'Todas' | 'Meus';

export function ListaAtendimentos() {
  const { t, idioma } = useI18n();
  const { base, profissional } = useSessao();
  const navegar = useNavigate();

  /*
    A barra abre na fila da função de quem entrou, e lista as filas dela
    primeiro. Antes abria sempre em "Triagem": o dentista entrava e via a fila
    da enfermagem, tendo que descobrir sozinho onde ficava a dele.

    Não é permissão — "Todas" continua ali, e em campo as funções se cobrem.
  */
  const filasDaFuncao = profissional?.filas ?? [];
  const outrasFilas = FILAS.filter((f) => !filasDaFuncao.includes(f));

  const [atendimentos, setAtendimentos] = useState<AtendimentoResumo[] | null>(null);
  const [aba, setAba] = useState<Aba>(filasDaFuncao[0] ?? 'Todas');
  const [assumindo, setAssumindo] = useState<string | null>(null);
  const [risco, setRisco] = useState<ClassificacaoRisco | null>(null);
  const [busca, setBusca] = useState('');
  const [erros, setErros] = useState<string[]>([]);

  const carregar = useCallback(() => {
    if (!base) return;

    setErros([]);

    api
      .atendimentos({
        baseId: base.id,
        fila: aba === 'Todas' || aba === 'Meus' ? null : aba,
        risco,
        busca: busca.trim() || undefined,
        meus: aba === 'Meus',
        // Só a fila de uma especialidade esconde o que já está com outra
        // pessoa. Em "Todas" a coordenação precisa enxergar a operação inteira.
        ocultarAssumidos: aba !== 'Todas' && aba !== 'Meus',
      })
      .then(setAtendimentos)
      .catch((erro) => {
        setAtendimentos([]);
        setErros([erro instanceof ErroDeRede ? t('semConexao') : t('erroInesperado')]);
      });
  }, [base, aba, risco, busca, t]);

  useEffect(() => {
    const timer = setTimeout(carregar, busca ? 300 : 0);
    return () => clearTimeout(timer);
  }, [carregar, busca]);

  async function alternarPosse(
    atendimentoId: string,
    especialidade: Especialidade,
    souEu: boolean,
  ) {
    setErros([]);
    setAssumindo(atendimentoId);

    try {
      if (souEu) await api.liberarEtapa(atendimentoId, especialidade);
      else await api.assumirEtapa(atendimentoId, especialidade);

      carregar();
    } catch (erro) {
      // A recusa do servidor diz com quem o atendimento está. Trocar isso por
      // um erro genérico deixaria a equipe sem saber a quem perguntar.
      if (erro instanceof ErroApi) setErros(erro.erros);
      else if (erro instanceof ErroDeRede) setErros([t('semConexao')]);
      else setErros([t('erroInesperado')]);
    } finally {
      setAssumindo(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="titulo">{t('atendimentos')}</h1>
        <button type="button" className="botao w-auto px-5" onClick={() => navegar('/atendimentos/novo')}>
          {t('novo')}
        </button>
      </div>

      <input
        className="campo"
        placeholder={t('buscarPorCodigoOuNome')}
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1">
          <ChipFiltro ativo={aba === 'Meus'} aoClicar={() => setAba('Meus')}>
            {t('meusAtendimentos')}
          </ChipFiltro>
          {filasDaFuncao.map((f) => (
            <ChipFiltro key={f} ativo={aba === f} aoClicar={() => setAba(f)}>
              {traduzir(especialidades, idioma, f)}
            </ChipFiltro>
          ))}
          <ChipFiltro ativo={aba === 'Todas'} aoClicar={() => setAba('Todas')}>
            {t('todasAsFilas')}
          </ChipFiltro>
          {outrasFilas.map((f) => (
            <ChipFiltro key={f} ativo={aba === f} aoClicar={() => setAba(f)}>
              {traduzir(especialidades, idioma, f)}
            </ChipFiltro>
          ))}
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1">
          <ChipFiltro ativo={risco === null} aoClicar={() => setRisco(null)}>
            {t('total')}
          </ChipFiltro>
          {RISCOS.map((r) => (
            <ChipFiltro key={r} ativo={risco === r} aoClicar={() => setRisco(r)}>
              <span className="flex items-center gap-1.5">
                <PontoRisco risco={r} />
                {traduzir(classificacoesCurtas, idioma, r)}
              </span>
            </ChipFiltro>
          ))}
        </div>
      </div>

      <Erros erros={erros} />

      {atendimentos === null ? (
        <Carregando texto={t('carregando')} />
      ) : atendimentos.length === 0 ? (
        <Vazio texto={aba === 'Meus' ? t('semAtendimentosMeus') : t('filaVazia')} />
      ) : (
        <ul className="space-y-3">
          {atendimentos.map((atendimento) => (
            <li key={atendimento.id}>
              <Link
                to={`/atendimentos/${atendimento.id}`}
                className="cartao block transition hover:border-marca-clara"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <PontoRisco risco={atendimento.classificacaoRisco} />
                    <span className="truncate font-bold">
                      {atendimento.codigo} · {atendimento.pacienteNome}
                    </span>
                  </div>
                  <Etiqueta tom={atendimento.status === 'Finalizado' ? 'sucesso' : 'neutro'}>
                    {traduzir(statusAtendimento, idioma, atendimento.status)}
                  </Etiqueta>
                </div>

                {atendimento.resumo ? (
                  <p className="mt-1 line-clamp-2 text-sm text-texto-suave">{atendimento.resumo}</p>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {atendimento.etapas.map((etapa) => (
                    <span
                      key={etapa.id}
                      className={`inline-flex items-center gap-1 ${
                        etapa.status === 'Concluida' ? 'text-verde' : 'text-texto-suave'
                      }`}
                    >
                      {etapa.status === 'Concluida' ? <IconeConcluido /> : <IconePendente />}
                      {traduzir(especialidades, idioma, etapa.especialidade)}
                    </span>
                  ))}
                </div>

                <BlocoPosse
                  atendimento={atendimento}
                  aba={aba}
                  meuNome={profissional?.nome ?? null}
                  ocupado={assumindo === atendimento.id}
                  aoAlternar={alternarPosse}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChipFiltro({
  ativo,
  aoClicar,
  children,
}: {
  ativo: boolean;
  aoClicar: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativo}
      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
        ativo ? 'border-marca bg-marca text-white' : 'border-borda bg-superficie text-texto'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Quem está com o paciente, e o botão para assumir ou devolver.
 *
 * Em "Todas" a lista mistura filas e não há uma etapa óbvia para assumir, mas
 * quem está com o paciente continua aparecendo: é justamente ali que a
 * coordenação olha a operação inteira e precisa ver o que já tem dono.
 *
 * Em "Meus" cada linha já é de quem está olhando, e o botão vira "devolver à
 * fila".
 */
function BlocoPosse({
  atendimento,
  aba,
  meuNome,
  ocupado,
  aoAlternar,
}: {
  atendimento: AtendimentoResumo;
  aba: Especialidade | 'Todas' | 'Meus';
  meuNome: string | null;
  ocupado: boolean;
  aoAlternar: (id: string, especialidade: Especialidade, souEu: boolean) => void;
}) {
  const { t } = useI18n();

  const etapa =
    aba === 'Meus'
      ? atendimento.etapas.find((e) => e.status !== 'Concluida' && e.profissional === meuNome)
      : aba === 'Todas'
        ? atendimento.etapas.find((e) => e.status !== 'Concluida' && e.profissional !== null)
        : atendimento.etapas.find((e) => e.especialidade === aba && e.status !== 'Concluida');

  if (!etapa) return null;

  const souEu = etapa.profissional !== null && etapa.profissional === meuNome;
  const deOutro = etapa.profissional !== null && !souEu;

  // Em "Todas" só o aviso de quem está com o paciente, sem botão: a etapa a
  // assumir seria uma escolha arbitrária entre as filas que a lista mistura.
  const podeAgir = aba !== 'Todas';

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-borda pt-3">
      <span className="text-sm text-texto-suave">
        {souEu ? t('comigo') : null}
        {deOutro ? (
          <>
            {t('emAtendimentoCom')}{' '}
            <span className="font-medium text-texto">{etapa.profissional}</span>
          </>
        ) : null}
      </span>

      {deOutro || !podeAgir ? null : (
        <button
          type="button"
          disabled={ocupado}
          onClick={(e) => {
            // O cartão inteiro é um link para o prontuário; sem isto, assumir
            // navegaria para lá no mesmo clique.
            e.preventDefault();
            e.stopPropagation();
            aoAlternar(atendimento.id, etapa.especialidade, souEu);
          }}
          className="botao-secundario shrink-0"
        >
          {souEu ? t('liberar') : t('assumir')}
        </button>
      )}
    </div>
  );
}




