import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { SelecionarBase } from './pages/SelecionarBase';
import { Login } from './pages/Login';
import { Fila } from './pages/Fila';
import { NovoAtendimento } from './pages/NovoAtendimento';
import { AtendimentoDetalhe } from './pages/AtendimentoDetalhe';
import { Painel } from './pages/Painel';

function RotaProtegida({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useAuth();
  if (carregando) return null;
  if (!usuario) return <Navigate to="/selecionar-base" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/selecionar-base" element={<SelecionarBase />} />
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <RotaProtegida>
            <Layout />
          </RotaProtegida>
        }
      >
        <Route path="/atendimentos" element={<Fila />} />
        <Route path="/atendimentos/novo" element={<NovoAtendimento />} />
        <Route path="/atendimentos/:id" element={<AtendimentoDetalhe />} />
        <Route path="/painel" element={<Painel />} />
      </Route>

      <Route path="*" element={<Navigate to="/atendimentos" replace />} />
    </Routes>
  );
}
