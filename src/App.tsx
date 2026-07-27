import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AvisoAtualizacao } from './componentes/AvisoAtualizacao';
import { Cabecalho } from './componentes/Cabecalho';
import { ProvedorSessao, useSessao } from './hooks/useSessao';
import { useTema } from './hooks/useTema';
import { ProvedorI18n } from './i18n';
import { Atendimento } from './paginas/Atendimento';
import { ListaAtendimentos } from './paginas/ListaAtendimentos';
import { CriarConta } from './paginas/CriarConta';
import { GestaoBases } from './paginas/GestaoBases';
import { GestaoContas } from './paginas/GestaoContas';
import { Login } from './paginas/Login';
import { NovoAtendimento } from './paginas/NovoAtendimento';
import { Prontuario } from './paginas/Prontuario';
import { SelecaoBase } from './paginas/SelecaoBase';
import { Triagem } from './paginas/Triagem';
import type { Tema } from './hooks/useTema';

/** Exige sessão; sem ela, volta para o login. */
function Protegido() {
  const { autenticado } = useSessao();
  return autenticado ? <Outlet /> : <Navigate to="/entrar" replace />;
}

/** Restringe a rota a quem administra contas. */
function SomenteAdministrador() {
  const { profissional } = useSessao();

  return profissional?.ehAdministrador ? <Outlet /> : <Navigate to="/atendimentos" replace />;
}

/** Exige base escolhida; o resto do app depende dela para tudo. */
function ComBase({ tema, alternarTema }: { tema: Tema; alternarTema: () => void }) {
  const { base } = useSessao();

  if (!base) {
    return <Navigate to="/bases" replace />;
  }

  return (
    <>
      <Cabecalho tema={tema} alternarTema={alternarTema} />
      <Outlet />
    </>
  );
}

function Rotas() {
  const { tema, alternar } = useTema();
  const { autenticado } = useSessao();

  return (
    <Routes>
      <Route
        path="/entrar"
        element={
          autenticado ? <Navigate to="/atendimentos" replace /> : <Login tema={tema} alternarTema={alternar} />
        }
      />

      <Route
        path="/criar-conta"
        element={
          autenticado ? (
            <Navigate to="/atendimentos" replace />
          ) : (
            <CriarConta tema={tema} alternarTema={alternar} />
          )
        }
      />

      <Route element={<Protegido />}>
        <Route path="/bases" element={<SelecaoBase />} />

        <Route element={<ComBase tema={tema} alternarTema={alternar} />}>
          <Route path="/atendimentos" element={<ListaAtendimentos />} />
          <Route path="/atendimentos/novo" element={<NovoAtendimento />} />
          <Route path="/atendimentos/:id" element={<Prontuario />} />
          <Route path="/atendimentos/:id/triagem" element={<Triagem />} />
          <Route
            path="/atendimentos/:id/consulta/:especialidade"
            element={<Atendimento modo="consulta" />}
          />
          <Route path="/atendimentos/:id/odontologia" element={<Atendimento modo="odontologia" />} />

          {/*
            A tela some para quem não é administrador, mas quem garante a
            restrição é o servidor: a API responde 403 de qualquer forma.
          */}
          <Route element={<SomenteAdministrador />}>
            <Route path="/contas" element={<GestaoContas />} />
            <Route path="/bases/gerenciar" element={<GestaoBases />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/atendimentos" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <ProvedorI18n>
      <ProvedorSessao>
        <BrowserRouter>
          <AvisoAtualizacao />
          <Rotas />
        </BrowserRouter>
      </ProvedorSessao>
    </ProvedorI18n>
  );
}
