import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type { PacienteConhecido } from '../api/tipos';
import { Erros } from './Basicos';
import { useI18n, traduzir } from '../i18n';
import { sexos as tabelaSexos } from '../i18n/enums';

/**
 * Primeira pergunta do cadastro: é alguém novo ou alguém que já foi atendido?
 *
 * Sem essa bifurcação, quem volta vira um cadastro novo e o histórico da pessoa
 * se perde. Em campo isso é a regra, não a exceção: a maioria não tem documento,
 * e o código é o único fio que liga uma visita à seguinte.
 */
export function EscolhaDePaciente({
  aoEscolherNovo,
  aoEscolherConhecido,
}: {
  aoEscolherNovo: (codigo: string) => void;
  aoEscolherConhecido: (conhecido: PacienteConhecido) => void;
}) {
  const { t, idioma } = useI18n();

  const [codigo, setCodigo] = useState('');
  const [achado, setAchado] = useState<PacienteConhecido | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [erros, setErros] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);

  function tratar(erro: unknown) {
    if (erro instanceof ErroDeRede) setErros([t('semConexao')]);
    else if (erro instanceof ErroApi) setErros(erro.erros);
    else setErros([t('erroInesperado')]);
  }

  async function comecarNovo() {
    setErros([]);
    setOcupado(true);

    try {
      const { codigo: sorteado } = await api.codigoNovoPaciente();
      aoEscolherNovo(sorteado);
    } catch (erro) {
      tratar(erro);
    } finally {
      setOcupado(false);
    }
  }

  async function procurar(evento: FormEvent) {
    evento.preventDefault();
    setErros([]);
    setNaoEncontrado(false);
    setAchado(null);
    setOcupado(true);

    try {
      const encontrado = await api.pacientePorCodigo(codigo.trim());

      if (encontrado) setAchado(encontrado);
      else setNaoEncontrado(true);
    } catch (erro) {
      tratar(erro);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-4">
      {/*
        A busca pelo código vem primeiro, e já com o campo aberto.

        Era uma bifurcação em tela própria: dois botões, 70% de tela vazia, e a
        busca atrás de um segundo toque. Só que é a busca que evita o cadastro
        duplicado, e quem volta é a regra em campo — deixar o caminho que perde
        o histórico a um toque e o que o preserva a dois é o incentivo invertido.
      */}
      <section className="cartao space-y-3">
        <div>
          <h2 className="font-bold">{t('jaFoiAtendido')}</h2>
          <p className="text-sm text-texto-suave">{t('dicaCodigo')}</p>
        </div>

        <form onSubmit={procurar} className="space-y-3">
          <label className="block">
            <span className="rotulo">{t('informeOCodigo')}</span>
            <input
              className="campo dado uppercase"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="XXXX-XXXX"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>

          <button
            type="submit"
            className="botao"
            disabled={ocupado || codigo.trim().length === 0}
          >
            {ocupado ? t('carregando') : t('procurar')}
          </button>
        </form>

        {naoEncontrado ? (
          <p
            role="alert"
            className="rounded-xl border border-vermelho/40 bg-vermelho/10 px-4 py-3 text-sm text-vermelho"
          >
            {t('codigoNaoEncontrado')}
          </p>
        ) : null}

        {achado ? (
          <div className="space-y-3 rounded-xl border border-marca/40 bg-marca/10 p-4">
            <p className="sobretitulo text-marca-clara">{t('pacienteEncontrado')}</p>

            {/*
              Nome, idade e visitas anteriores: o bastante para a equipe conferir
              que é a pessoa certa antes de abrir o prontuário dela.
            */}
            <div>
              <p className="font-bold">{achado.paciente.nome}</p>
              <p className="text-sm text-texto-suave">
                <span className="dado">{achado.paciente.codigo}</span>
                {achado.paciente.idade !== null ? ` · ${achado.paciente.idade}` : ''}
                {` · ${traduzir(tabelaSexos, idioma, achado.paciente.sexo)}`}
              </p>
              <p className="mt-1 text-sm text-texto-suave">
                {achado.totalAtendimentos === 1
                  ? t('umAtendimentoAnterior')
                  : `${achado.totalAtendimentos} ${t('atendimentosAnteriores')}`}
                {achado.ultimoAtendimentoEm
                  ? ` · ${t('ultimaVisita')}: ${new Date(achado.ultimoAtendimentoEm).toLocaleDateString()}`
                  : ''}
                {achado.ultimaBase ? ` · ${achado.ultimaBase}` : ''}
              </p>
            </div>

            <button type="button" className="botao" onClick={() => aoEscolherConhecido(achado)}>
              {t('usarEsteCadastro')}
            </button>
          </div>
        ) : null}
      </section>

      <Erros erros={erros} />

      {/*
        A primeira visita, embaixo e sem disputar destaque. Não é o caso raro —
        numa missão nova, é quase todo mundo —, mas é o caminho que não tem
        volta: cadastrar de novo quem já tinha código quebra o histórico da
        pessoa, e o código é o único fio que liga uma visita à seguinte.
      */}
      <section className="cartao space-y-3">
        <div>
          <h2 className="font-bold">{t('primeiraVez')}</h2>
          <p className="text-sm text-texto-suave">{t('dicaPacienteNovo')}</p>
        </div>

        <button
          type="button"
          className="botao-secundario w-full"
          onClick={comecarNovo}
          disabled={ocupado}
        >
          {ocupado ? t('carregando') : t('pacienteNovo')}
        </button>
      </section>
    </div>
  );
}
