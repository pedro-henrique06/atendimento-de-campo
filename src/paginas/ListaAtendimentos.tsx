import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ErroDeRede } from '../api/cliente';
import type { AtendimentoResumo, ClassificacaoRisco, Especialidade } from '../api/tipos';
import { Carregando, Erros, Etiqueta, PontoRisco, Vazio } from '../componentes/Basicos';
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

export function ListaAtendimentos() {
  const { t, idioma } = useI18n();
  const { base } = useSessao();
  const navegar = useNavigate();

  const [atendimentos, setAtendimentos] = useState<AtendimentoResumo[] | null>(null);
  const [fila, setFila] = useState<Especialidade | null>('Triagem');
  const [risco, setRisco] = useState<ClassificacaoRisco | null>(null);
  const [busca, setBusca] = useState('');
  const [erros, setErros] = useState<string[]>([]);

  const carregar = useCallback(() => {
    if (!base) return;

    setErros([]);

    api
      .atendimentos({ baseId: base.id, fila, risco, busca: busca.trim() || undefined })
      .then(setAtendimentos)
      .catch((erro) => {
        setAtendimentos([]);
        setErros([erro instanceof ErroDeRede ? t('semConexao') : t('erroInesperado')]);
      });
  }, [base, fila, risco, busca, t]);

  useEffect(() => {
    const timer = setTimeout(carregar, busca ? 300 : 0);
    return () => clearTimeout(timer);
  }, [carregar, busca]);

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
          <ChipFiltro ativo={fila === null} aoClicar={() => setFila(null)}>
            {t('todasAsFilas')}
          </ChipFiltro>
          {FILAS.map((f) => (
            <ChipFiltro key={f} ativo={fila === f} aoClicar={() => setFila(f)}>
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
        <Vazio texto={t('filaVazia')} />
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
                      className={
                        etapa.status === 'Concluida' ? 'text-verde' : 'text-texto-suave'
                      }
                    >
                      {etapa.status === 'Concluida' ? '✓' : '○'}{' '}
                      {traduzir(especialidades, idioma, etapa.especialidade)}
                    </span>
                  ))}
                </div>
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
