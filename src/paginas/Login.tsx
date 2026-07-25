import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ErroApi, ErroDeRede } from '../api/cliente';
import type { FuncaoProfissional } from '../api/tipos';
import { Campo, Erros } from '../componentes/Basicos';
import { useSessao } from '../hooks/useSessao';
import { IDIOMAS, rotuloIdioma, useI18n, traduzir } from '../i18n';
import { conselhos, funcoes } from '../i18n/enums';
import type { Tema } from '../hooks/useTema';

const FUNCOES: FuncaoProfissional[] = [
  'Medico',
  'Enfermeiro',
  'TecnicoEnfermagem',
  'Dentista',
  'Psicologo',
  'Fisioterapeuta',
  'Farmaceutico',
  'Recepcao',
  'Coordenacao',
  'Outro',
];

/** Conselho exigido por função. Espelha a regra do backend. */
const CONSELHO_POR_FUNCAO: Record<FuncaoProfissional, keyof typeof conselhos.Pt> = {
  Medico: 'Crm',
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

export function Login({ tema, alternarTema }: { tema: Tema; alternarTema: () => void }) {
  const { t, idioma, definirIdioma } = useI18n();
  const { entrar } = useSessao();
  const navegar = useNavigate();

  const [nome, setNome] = useState('');
  const [funcao, setFuncao] = useState<FuncaoProfissional>('Enfermeiro');
  const [registro, setRegistro] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  const conselho = CONSELHO_POR_FUNCAO[funcao];
  const exigeRegistro = conselho !== 'Nenhum';

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErros([]);
    setEnviando(true);

    try {
      const resposta = await api.login({
        nome: nome.trim(),
        funcao,
        registro: registro.trim() || undefined,
        senha,
        idioma,
      });

      entrar({ token: resposta.token, profissional: resposta.profissional });
      navegar('/bases', { replace: true });
    } catch (erro) {
      if (erro instanceof ErroDeRede) {
        setErros([t('semConexao')]);
      } else if (erro instanceof ErroApi) {
        // O servidor devolve a mesma mensagem genérica para usuário inexistente
        // e senha errada, de propósito.
        setErros(erro.erros.map((e) => (e === 'nome ou senha invalidos' ? t('credenciaisInvalidas') : e)));
      } else {
        setErros([t('erroInesperado')]);
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-full px-4 py-6">
      <header className="mx-auto mb-6 flex max-w-md items-center justify-between">
        <div className="flex rounded-full border border-borda bg-superficie p-1" role="group">
          {IDIOMAS.map((codigo) => (
            <button
              key={codigo}
              type="button"
              onClick={() => definirIdioma(codigo)}
              aria-pressed={idioma === codigo}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                idioma === codigo ? 'bg-superficie-2 text-marca-clara' : 'text-texto-suave'
              }`}
            >
              {rotuloIdioma[codigo]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={alternarTema}
          aria-label={tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-borda bg-superficie text-lg"
        >
          {tema === 'escuro' ? '☀️' : '🌙'}
        </button>
      </header>

      <main className="mx-auto max-w-md">
        <form onSubmit={aoEnviar} className="cartao space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-marca text-3xl font-light text-white">
              +
            </div>
            <h1 className="text-2xl font-bold">{t('app')}</h1>
            <p className="mt-1 text-texto-suave">{t('loginSubtitulo')}</p>
          </div>

          <Campo rotulo={t('seuNome')} obrigatorio>
            <input
              className="campo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
              required
            />
          </Campo>

          <Campo rotulo={t('suaFuncao')} obrigatorio>
            <select
              className="campo"
              value={funcao}
              onChange={(e) => setFuncao(e.target.value as FuncaoProfissional)}
            >
              {FUNCOES.map((f) => (
                <option key={f} value={f}>
                  {traduzir(funcoes, idioma, f)}
                </option>
              ))}
            </select>
          </Campo>

          {exigeRegistro ? (
            <Campo
              rotulo={`${t('registro')} (${traduzir(conselhos, idioma, conselho)})`}
              obrigatorio
            >
              <input
                className="campo"
                value={registro}
                onChange={(e) => setRegistro(e.target.value)}
                inputMode="numeric"
                required
              />
            </Campo>
          ) : null}

          <Campo rotulo={t('senha')} dica={t('dicaPrimeiroAcesso')}>
            <div className="relative">
              <input
                className="campo pr-14"
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-xl"
              >
                {mostrarSenha ? '🙈' : '👁️'}
              </button>
            </div>
          </Campo>

          <Erros erros={erros} />

          <button type="submit" className="botao" disabled={enviando}>
            {enviando ? t('carregando') : t('entrar')}
          </button>
        </form>
      </main>
    </div>
  );
}
