import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import { FUNCOES_PARA_CADASTRO } from '../api/tipos';
import type { ConselhoTipo, ContaCriada, FuncaoProfissional } from '../api/tipos';
import { Campo, Erros } from '../componentes/Basicos';
import { useI18n, traduzir } from '../i18n';
import { conselhos, especialidades, funcoes } from '../i18n/enums';
import { CredencialProvisoria } from './CredencialProvisoria';

/** Conselho exigido por profissão. Espelha `ServicoAutenticacao.ConselhoPara`. */
const CONSELHO_POR_FUNCAO: Record<FuncaoProfissional, ConselhoTipo> = {
  Medico: 'Crm',
  ClinicoGeral: 'Crm',
  Pediatra: 'Crm',
  Ortopedista: 'Crm',
  Enfermeiro: 'Coren',
  TecnicoEnfermagem: 'Coren',
  Dentista: 'Cro',
  Psicologo: 'Crp',
  Fisioterapeuta: 'Crefito',
  Farmaceutico: 'Crf',
  Recepcao: 'Nenhum',
  Coordenacao: 'Nenhum',
  Outro: 'Nenhum',
};

/**
 * Fila que cada profissão abre. Espelha `FilasDaFuncao` no backend.
 *
 * Existe aqui só para a coordenação ver, no momento em que escolhe a profissão,
 * onde aquela pessoa vai atender — que é a decisão que ela está tomando sem
 * perceber. Quem manda continua sendo o servidor: as filas de verdade chegam no
 * login, em `profissional.filas`.
 */
const FILAS_POR_FUNCAO: Record<FuncaoProfissional, string[]> = {
  Medico: ['ClinicaGeral', 'Pediatria', 'Ortopedia'],
  ClinicoGeral: ['ClinicaGeral'],
  Pediatra: ['Pediatria'],
  Ortopedista: ['Ortopedia'],
  Enfermeiro: ['Triagem', 'Enfermagem'],
  TecnicoEnfermagem: ['Triagem', 'Enfermagem'],
  Dentista: ['Odontologia'],
  Psicologo: ['SaudeMental'],
  Fisioterapeuta: ['Ortopedia'],
  Farmaceutico: ['Enfermagem'],
  Recepcao: ['Triagem'],
  Coordenacao: ['Triagem', 'ClinicaGeral', 'Pediatria', 'Ortopedia', 'Odontologia', 'Enfermagem', 'SaudeMental'],
  Outro: ['Triagem', 'ClinicaGeral', 'Pediatria', 'Ortopedia', 'Odontologia', 'Enfermagem', 'SaudeMental'],
};

/** Mesma normalização do backend, para o campo não aceitar o que a API recusa. */
function normalizarUsuario(valor: string): string {
  return valor
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Sugere `claudia.luz` a partir de "Cláudia Cândido da Luz". */
function sugerirUsuario(nome: string): string {
  const partes = normalizarUsuario(nome)
    .split(/\s+/)
    .filter((p) => p && !['de', 'da', 'do', 'das', 'dos', 'e'].includes(p));

  if (partes.length === 0) return '';

  const bruto = partes.length === 1 ? partes[0] : `${partes[0]}.${partes[partes.length - 1]}`;

  return bruto.replace(/[^a-z0-9.]/g, '').slice(0, 40);
}

/**
 * Cadastro de profissional pela coordenação.
 *
 * Não há campo de senha, e isso é o ponto: quem cadastra não escolhe a senha de
 * outra pessoa. O sistema sorteia, mostra uma vez, e a pessoa troca no primeiro
 * acesso.
 */
export function NovaConta({ aoCriar }: { aoCriar: () => void }) {
  const { t, idioma } = useI18n();

  const [nome, setNome] = useState('');
  const [usuario, setUsuario] = useState('');
  const [usuarioEditado, setUsuarioEditado] = useState(false);
  const [email, setEmail] = useState('');
  const [funcao, setFuncao] = useState<FuncaoProfissional>('ClinicoGeral');
  const [registro, setRegistro] = useState('');
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [criada, setCriada] = useState<ContaCriada | null>(null);

  const conselho = CONSELHO_POR_FUNCAO[funcao];
  const exigeRegistro = conselho !== 'Nenhum';

  // Enquanto ninguém mexer no campo, o usuário acompanha o nome digitado.
  useEffect(() => {
    if (!usuarioEditado) setUsuario(sugerirUsuario(nome));
  }, [nome, usuarioEditado]);

  // Consulta depois que a digitação para, para não bater na rede a cada tecla
  // num 3G de campo.
  useEffect(() => {
    const valor = normalizarUsuario(usuario);

    if (valor.length < 3) {
      setDisponivel(null);
      return;
    }

    let cancelado = false;

    const timer = setTimeout(() => {
      api
        .usuarioDisponivel(valor)
        .then((r) => {
          if (!cancelado) setDisponivel(r.disponivel);
        })
        .catch(() => {
          // Sem conexão não é hora de acusar nada: o envio valida de novo.
          if (!cancelado) setDisponivel(null);
        });
    }, 400);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [usuario]);

  function limpar() {
    setNome('');
    setUsuario('');
    setUsuarioEditado(false);
    setEmail('');
    setRegistro('');
    setDisponivel(null);
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErros([]);
    setEnviando(true);

    try {
      const conta = await api.criarConta({
        usuario: normalizarUsuario(usuario),
        nome: nome.trim(),
        email: email.trim() || null,
        funcao,
        registro: registro.trim() || null,
        idioma,
      });

      setCriada(conta);
      limpar();
      aoCriar();
    } catch (e) {
      if (e instanceof ErroDeRede) setErros([t('semConexao')]);
      else if (e instanceof ErroApi) setErros(e.erros);
      else setErros([t('erroInesperado')]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="cartao space-y-5">
      <div>
        <h2 className="titulo">{t('novaConta')}</h2>
        <p className="mt-1 text-sm text-texto-suave">{t('novaContaSubtitulo')}</p>
      </div>

      {criada ? (
        <CredencialProvisoria
          titulo={t('contaCadastrada')}
          nome={criada.profissional.nome}
          usuario={criada.profissional.usuario}
          senha={criada.senhaProvisoria}
          aoFechar={() => setCriada(null)}
        />
      ) : null}

      <form onSubmit={aoEnviar} className="space-y-5">
        <Campo rotulo={t('nomeCompleto')} obrigatorio>
          <input
            className="campo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="off"
            required
          />
        </Campo>

        <Campo rotulo={t('usuario')} obrigatorio dica={t('dicaUsuario')}>
          <input
            className="campo"
            value={usuario}
            onChange={(e) => {
              setUsuarioEditado(true);
              setUsuario(e.target.value);
            }}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            minLength={3}
            required
          />
          {disponivel === true ? (
            <span className="mt-1 block text-sm text-verde">{t('usuarioLivre')}</span>
          ) : null}
          {disponivel === false ? (
            <span className="mt-1 block text-sm text-vermelho">{t('usuarioEmUso')}</span>
          ) : null}
        </Campo>

        {/*
          Sem `dica`: a linha "Fila: ..." logo abaixo já diz a mesma coisa de
          forma concreta, e as duas juntas ficavam na ordem errada — o exemplo
          antes da explicação.
        */}
        <Campo rotulo={t('profissao')} obrigatorio>
          <select
            className="campo"
            value={funcao}
            onChange={(e) => setFuncao(e.target.value as FuncaoProfissional)}
          >
            {FUNCOES_PARA_CADASTRO.map((f) => (
              <option key={f} value={f}>
                {traduzir(funcoes, idioma, f)}
              </option>
            ))}
          </select>

          {/*
            Mostrar a fila aqui é o que torna a escolha visível: a coordenação
            está decidindo onde a pessoa vai atender, não preenchendo um rótulo.
          */}
          <span className="mt-2 block text-sm text-texto-suave">
            {t('filaDaProfissao')}:{' '}
            <span className="font-medium text-texto">
              {FILAS_POR_FUNCAO[funcao]
                .map((f) => traduzir(especialidades, idioma, f as never))
                .join(' · ')}
            </span>
          </span>
        </Campo>

        {exigeRegistro ? (
          <Campo rotulo={`${t('registro')} (${traduzir(conselhos, idioma, conselho)})`} obrigatorio>
            <input
              className="campo"
              value={registro}
              onChange={(e) => setRegistro(e.target.value)}
              inputMode="numeric"
              required
            />
          </Campo>
        ) : null}

        <Campo rotulo={t('emailOpcional')}>
          <input
            className="campo"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
          />
        </Campo>

        <Erros erros={erros} />

        <button type="submit" className="botao" disabled={enviando || disponivel === false}>
          {enviando ? t('carregando') : t('cadastrar')}
        </button>
      </form>
    </div>
  );
}
