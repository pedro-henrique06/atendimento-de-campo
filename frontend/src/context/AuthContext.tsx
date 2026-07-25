import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setToken, getToken } from '../api/client';
import type { BaseDto, LoginResponse, UsuarioDto } from '../types';

interface AuthState {
  usuario: UsuarioDto | null;
  base: BaseDto | null;
  carregando: boolean;
  login: (baseId: string, nome: string, funcao: string, registro: string, senha: string) => Promise<void>;
  logout: () => void;
  selecionarBase: (base: BaseDto) => void;
  baseSelecionada: BaseDto | null;
}

const AuthContext = createContext<AuthState | null>(null);

const USUARIO_KEY = 'atendimento_campo_usuario';
const BASE_KEY = 'atendimento_campo_base';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioDto | null>(null);
  const [base, setBase] = useState<BaseDto | null>(null);
  const [baseSelecionada, setBaseSelecionada] = useState<BaseDto | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = getToken();
    const usuarioSalvo = localStorage.getItem(USUARIO_KEY);
    const baseSalva = localStorage.getItem(BASE_KEY);
    if (token && usuarioSalvo && baseSalva) {
      setUsuario(JSON.parse(usuarioSalvo));
      setBase(JSON.parse(baseSalva));
    }
    setCarregando(false);
  }, []);

  async function login(baseId: string, nome: string, funcao: string, registro: string, senha: string) {
    const resposta = await api.post<LoginResponse>('/api/auth/login', {
      baseId,
      nome,
      funcao,
      registro: registro || null,
      senha,
    });
    setToken(resposta.token);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(resposta.usuario));
    localStorage.setItem(BASE_KEY, JSON.stringify(resposta.base));
    setUsuario(resposta.usuario);
    setBase(resposta.base);
  }

  function logout() {
    setToken(null);
    localStorage.removeItem(USUARIO_KEY);
    localStorage.removeItem(BASE_KEY);
    setUsuario(null);
    setBase(null);
    setBaseSelecionada(null);
  }

  return (
    <AuthContext.Provider
      value={{ usuario, base, carregando, login, logout, selecionarBase: setBaseSelecionada, baseSelecionada }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
