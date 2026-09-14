import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type { Prontuario } from '../api/tipos';
import { AlertaAlergia, Campo, Carregando, Erros, Secao } from '../componentes/Basicos';
import { FolhaDeObservacao } from '../componentes/FolhaDeObservacao';
import { useRascunho } from '../hooks/useRascunho';
import { useI18n } from '../i18n';

interface FormVitais {
  /** `HH:MM` local. Vazio significa agora. */
  hora: string;
  pressaoSistolica: string;
  pressaoDiastolica: string;
  frequenciaCardiaca: string;
  frequenciaRespiratoria: string;
  saturacaoO2: string;
  temperaturaCelsius: string;
  glicemiaCapilar: string;
  escalaDor: string;
  observacao: string;
}

const INICIAL: FormVitais = {
  hora: '',
  pressaoSistolica: '',
  pressaoDiastolica: '',
  frequenciaCardiaca: '',
  frequenciaRespiratoria: '',
  saturacaoO2: '',
  temperaturaCelsius: '',
  glicemiaCapilar: '',
  escalaDor: '',
  observacao: '',
};

/** Número digitado, ou nulo quando o campo ficou vazio — que é "não medi". */
function numeroOuNulo(texto: string): number | null {
  const limpo = texto.trim().replace(',', '.');
  if (limpo === '') return null;

  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * `HH:MM` de hoje, em ISO. Vazio devolve nulo, e a API usa a hora de agora.
 *
 * Se a hora digitada ainda não chegou, é de ontem: às 00:30 alguém anota a
 * medida das 23:00, e a alternativa seria a API recusar por hora no futuro.
 */
function horaParaIso(hora: string): string | null {
  if (!hora.trim()) return null;

  const [h, m] = hora.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;

  const quando = new Date();
  quando.setHours(h, m, 0, 0);

  if (quando.getTime() > Date.now()) {
    quando.setDate(quando.getDate() - 1);
  }

  return quando.toISOString();
}

/** Campo numérico curto, do tamanho do número que ele recebe. */
function Medida({
  rotulo,
  valor,
  aoMudar,
  passo,
  min,
  max,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  passo?: string;
  min?: number;
  max?: number;
}) {
  return (
    <Campo rotulo={rotulo}>
      <input
        type="number"
        inputMode="decimal"
        step={passo}
        min={min}
        max={max}
        className="campo"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
      />
    </Campo>
  );
}

/**
 * A folha de observação: acrescenta uma linha na tabela horária.
 *
 * Não é ficha de fila. Em observação quem mede é quem está por perto, e a
 * pergunta que a tabela responde — "a pressão está caindo?" — só tem resposta
 * com as medidas todas na mesma lista.
 */
export function SinaisVitais() {
  const { t } = useI18n();
  const { id = '' } = useParams();
  const navegar = useNavigate();

  const [prontuario, setProntuario] = useState<Prontuario | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  const rascunho = useRascunho<FormVitais>(`vitais-${id}`, INICIAL);

  useEffect(() => {
    api
      .prontuario(id)
      .then(setProntuario)
      .catch((erro) => {
        setErros([erro instanceof ErroDeRede ? t('semConexao') : t('erroInesperado')]);
      });
  }, [id, t]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErros([]);
    setEnviando(true);

    const form = rascunho.valor;

    try {
      await api.registrarSinaisVitais(id, {
        medidaEm: horaParaIso(form.hora),
        pressaoSistolica: numeroOuNulo(form.pressaoSistolica),
        pressaoDiastolica: numeroOuNulo(form.pressaoDiastolica),
        frequenciaCardiaca: numeroOuNulo(form.frequenciaCardiaca),
        frequenciaRespiratoria: numeroOuNulo(form.frequenciaRespiratoria),
        saturacaoO2: numeroOuNulo(form.saturacaoO2),
        temperaturaCelsius: numeroOuNulo(form.temperaturaCelsius),
        glicemiaCapilar: numeroOuNulo(form.glicemiaCapilar),
        escalaDor: numeroOuNulo(form.escalaDor),
        observacao: form.observacao.trim() || null,
      });

      rascunho.limpar();
      navegar(`/atendimentos/${id}`, { replace: true });
    } catch (erro) {
      if (erro instanceof ErroDeRede) setErros([t('semConexao')]);
      else if (erro instanceof ErroApi) setErros(erro.erros);
      else setErros([t('erroInesperado')]);
    } finally {
      setEnviando(false);
    }
  }

  if (!prontuario) {
    return <Carregando texto={t('carregando')} />;
  }

  const form = rascunho.valor;
  const alterar = (mudanca: Partial<FormVitais>) => rascunho.setValor({ ...form, ...mudanca });

  return (
    <form onSubmit={enviar} className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <h1 className="titulo">{t('sinaisVitais')}</h1>

      <div className="cartao space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-bold">{prontuario.paciente.nome}</span>
          <span className="text-sm text-texto-suave">
            {prontuario.paciente.idade !== null ? `${prontuario.paciente.idade} ${t('anos')}` : ''}
          </span>
        </div>

        <AlertaAlergia
          exibir={prontuario.paciente.alerta.exibir}
          texto={prontuario.paciente.alerta.texto}
        />
      </div>

      {/*
        A tabela de agora aparece antes do formulário: a medida nova se lê contra
        as anteriores, e sem elas na tela a pessoa anota sem saber se subiu ou
        desceu.
      */}
      {prontuario.sinaisVitais.length > 0 ? (
        <Secao titulo={t('folhaDeObservacao')}>
          <FolhaDeObservacao medicoes={prontuario.sinaisVitais} />
        </Secao>
      ) : null}

      <Secao titulo={t('novaMedida')}>
        <Campo rotulo={t('hora')} dica={t('horaAgoraSeVazio')}>
          <input
            type="time"
            className="campo"
            value={form.hora}
            onChange={(e) => alterar({ hora: e.target.value })}
          />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Medida
            rotulo={t('pressaoSistolica')}
            valor={form.pressaoSistolica}
            aoMudar={(pressaoSistolica) => alterar({ pressaoSistolica })}
            min={40}
            max={300}
          />
          <Medida
            rotulo={t('pressaoDiastolica')}
            valor={form.pressaoDiastolica}
            aoMudar={(pressaoDiastolica) => alterar({ pressaoDiastolica })}
            min={20}
            max={200}
          />
          <Medida
            rotulo={t('frequenciaCardiaca')}
            valor={form.frequenciaCardiaca}
            aoMudar={(frequenciaCardiaca) => alterar({ frequenciaCardiaca })}
            min={20}
            max={250}
          />
          <Medida
            rotulo={t('frequenciaRespiratoria')}
            valor={form.frequenciaRespiratoria}
            aoMudar={(frequenciaRespiratoria) => alterar({ frequenciaRespiratoria })}
            min={4}
            max={80}
          />
          <Medida
            rotulo={t('saturacaoO2')}
            valor={form.saturacaoO2}
            aoMudar={(saturacaoO2) => alterar({ saturacaoO2 })}
            min={50}
            max={100}
          />
          <Medida
            rotulo={t('temperatura')}
            valor={form.temperaturaCelsius}
            aoMudar={(temperaturaCelsius) => alterar({ temperaturaCelsius })}
            passo="0.1"
            min={28}
            max={45}
          />
          <Medida
            rotulo={t('glicemia')}
            valor={form.glicemiaCapilar}
            aoMudar={(glicemiaCapilar) => alterar({ glicemiaCapilar })}
            min={10}
            max={800}
          />
          <Medida
            rotulo={t('escalaDor')}
            valor={form.escalaDor}
            aoMudar={(escalaDor) => alterar({ escalaDor })}
            min={0}
            max={10}
          />
        </div>

        <Campo rotulo={t('observacoes')}>
          <textarea
            className="campo min-h-20"
            aria-label={t('observacoes')}
            value={form.observacao}
            onChange={(e) => alterar({ observacao: e.target.value })}
          />
        </Campo>
      </Secao>

      <Erros erros={erros} />

      <button type="submit" className="botao" disabled={enviando}>
        {enviando ? t('carregando') : t('salvar')}
      </button>
    </form>
  );
}
