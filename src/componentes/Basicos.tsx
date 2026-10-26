import { useId } from 'react';
import type { ReactNode } from 'react';
import type { Autor, ClassificacaoRisco, Idioma } from '../api/tipos';
import { useI18n, traduzir } from '../i18n';
import { classificacoesCurtas, conselhos } from '../i18n/enums';
import { IconeAlerta } from './Icones';

export function Cartao({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`cartao ${className}`}>{children}</div>;
}

export function Titulo({ children }: { children: ReactNode }) {
  return <h1 className="titulo">{children}</h1>;
}

/**
 * Assinatura da ficha: quem atendeu, com o registro do conselho.
 *
 * O registro já estava no cadastro do profissional e nunca chegava aqui — a
 * ficha mostrava só o nome, que é o que menos identifica alguém fora do sistema.
 * É o que a equipe, a auditoria e o serviço de referência procuram.
 */
function Assinatura({ autor }: { autor: Autor }) {
  const { idioma } = useI18n();
  const conselho = autor.conselho === 'Nenhum' ? null : traduzir(conselhos, idioma, autor.conselho);

  return (
    <span className="text-sm text-texto-suave">
      {autor.nome}
      {conselho && autor.registro ? (
        <span className="ml-1.5 whitespace-nowrap font-medium">
          {conselho} {autor.registro}
        </span>
      ) : null}
    </span>
  );
}

export function Secao({
  titulo,
  autor,
  children,
}: {
  titulo: string;
  /** Texto puro para as seções sem ficha clínica; `Autor` onde há assinatura. */
  autor?: string | Autor | null;
  children: ReactNode;
}) {
  return (
    <section className="cartao space-y-3">
      {/*
        A assinatura embaixo do título, e não ao lado dele.

        Lado a lado, "Coordenacao E2E" ocupava metade da largura do cabeçalho de
        cada seção e disputava peso com o nome dela — três seções seguidas viram
        três nomes de gente onde se procura o nome da ficha. Quem assinou importa
        depois, na hora de perguntar a alguém; qual ficha é, importa agora.
      */}
      <header className="border-b border-borda pb-2">
        <h2 className="text-base font-bold text-marca-clara">{titulo}</h2>
        {typeof autor === 'string' ? (
          <span className="text-sm text-texto-suave">{autor}</span>
        ) : autor ? (
          <Assinatura autor={autor} />
        ) : null}
      </header>
      {children}
    </section>
  );
}

/**
 * Um valor medido: o número grande, a unidade junto e o rótulo embaixo.
 *
 * Sinais vitais estavam como lista de rótulo e valor, numa coluna de 9rem que
 * fazia "Pressão arterial (mmHg)" e "Classificação de risco (START)" quebrarem
 * em duas linhas cada. Numa ficha de papel eles são um bloco que se lê de
 * relance, e é assim que a equipe procura por eles: o olho vai ao número.
 *
 * Sem marcação de fora da faixa aqui de propósito. O servidor só calcula faixa
 * de referência para a folha de observação, e inventar o corte no navegador
 * produziria alarme onde não há — em criança, que é metade dos atendimentos, os
 * cortes de adulto acusariam quase todo mundo.
 */
export function Medida({
  rotulo,
  valor,
  unidade,
}: {
  rotulo: string;
  valor: ReactNode;
  unidade?: string;
}) {
  if (valor === null || valor === undefined || valor === '') return null;

  /*
    Os rótulos do formulário trazem a unidade entre parênteses — "Frequência
    cardíaca (bpm)" —, porque ali ela diz em que unidade digitar. Aqui a unidade
    já está ao lado do número, e repeti-la faria a etiqueta dizer "bpm" duas
    vezes e ocupar três linhas numa caixa de um terço de tela.

    Só quando há unidade: sem ela o parêntese pode estar dizendo outra coisa.
  */
  const nome = unidade ? rotulo.replace(/\s*\([^)]*\)\s*$/, '') : rotulo;

  return (
    <div className="rounded-lg bg-superficie-2 px-3 py-2">
      <div className="flex items-baseline gap-1">
        <span className="dado text-lg font-semibold leading-tight">{valor}</span>
        {unidade ? <span className="text-xs text-texto-suave">{unidade}</span> : null}
      </div>
      <div className="mt-0.5 text-xs leading-tight text-texto-suave">{nome}</div>
    </div>
  );
}

/**
 * A grade das medidas.
 *
 * Não decide se está vazia: cada `Medida` sem valor já não desenha nada, e uma
 * grade sem filhos visíveis não ocupa altura. Contar os filhos aqui daria a
 * resposta errada — o elemento existe mesmo quando o que ele desenha é nulo.
 */
export function Medidas({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{children}</div>;
}

export function Campo({
  rotulo,
  obrigatorio = false,
  dica,
  children,
}: {
  rotulo: string;
  obrigatorio?: boolean;
  dica?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="rotulo">
        {rotulo}
        {obrigatorio ? <span className="ml-1 text-vermelho">*</span> : null}
      </span>
      {children}
      {dica ? <span className="mt-1 block text-sm text-texto-suave">{dica}</span> : null}
    </label>
  );
}

/**
 * Um rótulo para um grupo de botões — `Opcoes`, `Multiplas` — em vez de para um
 * campo.
 *
 * Existe porque `Campo` é um `<label>`, e `<button>` é elemento rotulável: um
 * grupo de opções dentro de um `Campo` faz o rótulo ser associado ao PRIMEIRO
 * botão da lista. "Ar ambiente" passa a se chamar "Oxigenação Ar ambiente" para
 * quem usa leitor de tela, e tocar no texto do rótulo marca essa opção — as
 * outras três ficam sem rótulo nenhum. O erro é silencioso: na tela tudo
 * parece certo.
 *
 * Aqui o rótulo aponta para o grupo, e não para um dos botões.
 */
export function Grupo({
  rotulo,
  dica,
  children,
}: {
  rotulo: string;
  dica?: string;
  children: ReactNode;
}) {
  const id = useId();

  return (
    <div role="group" aria-labelledby={id}>
      <span className="rotulo" id={id}>
        {rotulo}
      </span>
      {children}
      {dica ? <span className="mt-1 block text-sm text-texto-suave">{dica}</span> : null}
    </div>
  );
}

export function Erros({ erros }: { erros: string[] }) {
  if (erros.length === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border border-vermelho/40 bg-vermelho/10 px-4 py-3 text-sm text-vermelho"
    >
      {erros.length === 1 ? (
        erros[0]
      ) : (
        <ul className="list-inside list-disc space-y-1">
          {erros.map((erro) => (
            <li key={erro}>{erro}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const CORES_RISCO: Record<ClassificacaoRisco, string> = {
  Vermelho: 'bg-vermelho',
  Amarelo: 'bg-amarelo',
  Verde: 'bg-verde',
  Preto: 'bg-preto',
};

export function PontoRisco({ risco }: { risco: ClassificacaoRisco | null }) {
  const { idioma } = useI18n();

  if (!risco) {
    return <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-borda" aria-hidden />;
  }

  return (
    <span
      className={`inline-block h-3 w-3 shrink-0 rounded-full ${CORES_RISCO[risco]}`}
      // A cor sozinha não comunica: quem usa leitor de tela ou não distingue
      // as cores precisa do rótulo.
      role="img"
      aria-label={traduzir(classificacoesCurtas, idioma, risco)}
    />
  );
}

/** Fundo e tinta de cada risco, para a etiqueta que se lê sem depender da cor. */
const ETIQUETA_RISCO: Record<ClassificacaoRisco, string> = {
  Vermelho: 'bg-fundo-vermelho text-tinta-vermelho',
  Amarelo: 'bg-fundo-amarelo text-tinta-amarelo',
  Verde: 'bg-fundo-verde text-tinta-verde',
  Preto: 'bg-fundo-preto text-tinta-preto',
};

/**
 * O risco como etiqueta legível, e não como ponto.
 *
 * O ponto de 12px continua servindo onde o texto ao lado já diz a cor. Onde o
 * risco é o critério de leitura — a fila —, ele precisa do peso que tem na
 * decisão: é por ele que se escolhe quem passa na frente, e procurar um ponto
 * de 12px em vinte cartões é o contrário disso.
 *
 * Fundo tingido com tinta escura, e não a cor cheia com texto branco: o amarelo
 * e o verde cheios não dão contraste para texto branco, e a mesma etiqueta
 * precisa funcionar nos quatro riscos e nos dois temas.
 */
export function EtiquetaRisco({ risco }: { risco: ClassificacaoRisco | null }) {
  const { t, idioma } = useI18n();

  if (!risco) {
    return (
      <span className="rounded-md bg-superficie-2 px-2 py-0.5 text-xs font-semibold text-texto-suave">
        {t('semRisco')}
      </span>
    );
  }

  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${ETIQUETA_RISCO[risco]}`}>
      {traduzir(classificacoesCurtas, idioma, risco)}
    </span>
  );
}

export function Etiqueta({
  children,
  tom = 'neutro',
}: {
  children: ReactNode;
  /** `aviso` é o que está acontecendo agora e precisa saltar da lista. */
  tom?: 'neutro' | 'sucesso' | 'aviso';
}) {
  const cor =
    tom === 'sucesso'
      ? 'border-verde/40 bg-verde/10 text-verde'
      : tom === 'aviso'
        ? 'border-amarelo/50 bg-amarelo/10 text-amarelo'
        : 'border-borda bg-superficie-2 text-texto-suave';

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${cor}`}>{children}</span>;
}

/**
 * Alerta de alergia do topo do prontuário.
 *
 * Só é renderizado quando o backend diz que há alergia registrada. No sistema
 * de referência este alerta aparecia para qualquer texto preenchido — inclusive
 * "Nega alergia medicamentosa" — e a equipe parava de olhar. Aqui a decisão de
 * exibir vem inteira do servidor, sem heurística de front.
 */
export function AlertaAlergia({ exibir, texto }: { exibir: boolean; texto: string | null }) {
  const { t } = useI18n();

  if (!exibir) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-vermelho/50 bg-vermelho/10 px-3 py-2 text-sm font-semibold text-vermelho"
    >
      <IconeAlerta className="mt-0.5 h-5 w-5 shrink-0" />
      <span>
        {t('alertaAlergia')}: {texto}
      </span>
    </div>
  );
}

export function Carregando({ texto }: { texto: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-texto-suave">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-borda border-t-marca-clara" aria-hidden />
      {texto}
    </div>
  );
}

export function Vazio({ texto }: { texto: string }) {
  return <div className="cartao py-10 text-center text-texto-suave">{texto}</div>;
}

/**
 * Grupo de opções em botões, mais confortável que `select` no celular.
 *
 * O escolhido era um bloco azul sólido com texto branco. Numa lista de sete
 * sintomas marcados, viravam sete blocos pesados e o título da seção sumia
 * entre eles — o estado ativo precisa se distinguir do repouso, não gritar.
 */
export function Opcoes<T extends string>({
  valor,
  opcoes,
  aoEscolher,
  tabela,
  idioma,
}: {
  valor: T | null;
  opcoes: readonly T[];
  aoEscolher: (valor: T) => void;
  tabela: Record<Idioma, Record<T, string>>;
  idioma: Idioma;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((opcao) => {
        const ativo = valor === opcao;

        return (
          <button
            key={opcao}
            type="button"
            aria-pressed={ativo}
            onClick={() => aoEscolher(opcao)}
            className={`opcao ${ativo ? 'opcao-ativa' : 'opcao-repouso'}`}
          >
            {traduzir(tabela, idioma, opcao)}
          </button>
        );
      })}
    </div>
  );
}

/** Múltipla escolha com o mesmo visual de `Opcoes`. */
export function Multiplas<T extends string>({
  valores,
  opcoes,
  aoAlternar,
  tabela,
  idioma,
}: {
  valores: T[];
  opcoes: readonly T[];
  aoAlternar: (valor: T) => void;
  tabela: Record<Idioma, Record<T, string>>;
  idioma: Idioma;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((opcao) => {
        const ativo = valores.includes(opcao);

        return (
          <button
            key={opcao}
            type="button"
            aria-pressed={ativo}
            onClick={() => aoAlternar(opcao)}
            className={`opcao ${ativo ? 'opcao-ativa' : 'opcao-repouso'}`}
          >
            {traduzir(tabela, idioma, opcao)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Sim ou não, no formato do sistema: a chave que desliza.
 *
 * Era uma caixa de marcar de 24px. A caixa é a forma de "escolha um ou vários
 * desta lista" — e aqui a lista é de um item só, onde o que se diz é ligado ou
 * desligado. A chave diz isso pela posição, que se lê de longe e sem precisar
 * enxergar se há um tique dentro do quadrado: no sol, com a tela suja, essa
 * diferença é a leitura.
 *
 * O `input` continua existindo, só que invisível, e a `label` em volta continua
 * sendo o alvo: quem usa leitor de tela ou teclado não perde nada, e o
 * `peer-checked` do desenho acompanha o estado real do campo em vez de um
 * estado paralelo em React.
 */
export function Interruptor({
  rotulo,
  dica,
  valor,
  aoMudar,
}: {
  rotulo: string;
  /**
   * O que o rótulo não cabe dizer.
   *
   * Existe para as conferências cujo nome é uma sigla: "verificação anestésica
   * de segurança" só quer dizer alguma coisa com a lista do que se confere —
   * ambu, laringoscópio, aspirador, seringas identificadas — ao lado.
   */
  dica?: string;
  valor: boolean;
  aoMudar: (valor: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-superficie-2 px-4 py-3">
      <span className="text-sm font-medium">
        {rotulo}
        {dica ? <span className="mt-0.5 block font-normal text-texto-suave">{dica}</span> : null}
      </span>

      <input
        type="checkbox"
        checked={valor}
        onChange={(e) => aoMudar(e.target.checked)}
        className="peer sr-only"
      />

      {/*
        O deslocamento da bolinha é escrito na pista, e não na bolinha:
        `peer-checked` só enxerga irmão do campo, e a bolinha é neta dele.
      */}
      <span
        aria-hidden
        className="relative h-[31px] w-[51px] shrink-0 rounded-full bg-borda transition
                   duration-200 ease-sistema peer-checked:bg-marca
                   peer-checked:[&>span]:translate-x-5 peer-focus-visible:ring-2
                   peer-focus-visible:ring-marca-clara/50"
      >
        <span
          className="absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white
                     shadow-[0_1px_3px_rgb(0_0_0_/_0.3)] transition duration-200
                     ease-sistema"
        />
      </span>
    </label>
  );
}

/**
 * O rodapé onde mora o botão de gravar, colado no fim da tela.
 *
 * As fichas são longas — a da triagem tem uns 6.000px, a cirúrgica mais —, e o
 * botão morava no fim delas: gravar o que já estava preenchido custava rolar o
 * formulário inteiro. Grudado, ele fica a um toque de qualquer ponto.
 *
 * O `-mx-4` cancela o padding lateral da página para a faixa ir de borda a
 * borda, e o fundo quase opaco impede que o texto por baixo apareça através
 * dela. Fica dentro do `form`, e não fixo na janela: assim ele acompanha o fim
 * do formulário em vez de cobrir o que vier depois na página.
 */
export function RodapeDeSalvar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-4 space-y-1 border-t border-borda bg-fundo/95 px-4 pb-2 pt-3 backdrop-blur">
      {children}
    </div>
  );
}
