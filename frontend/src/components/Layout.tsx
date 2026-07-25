import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { usuario, base, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-base-teal/90">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-bold">Atendimento de Campo</h1>
            <p className="text-sm text-white/80">{base?.nome}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
              {usuario?.nome}
            </span>
            <button onClick={logout} className="text-sm underline text-white/80 hover:text-white">
              Sair
            </button>
          </div>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-6 text-sm">
          <NavLink
            to="/atendimentos"
            className={({ isActive }) =>
              `pb-2 border-b-2 ${isActive ? 'border-white font-semibold' : 'border-transparent text-white/70'}`
            }
          >
            Atendimentos
          </NavLink>
          <NavLink
            to="/painel"
            className={({ isActive }) =>
              `pb-2 border-b-2 ${isActive ? 'border-white font-semibold' : 'border-transparent text-white/70'}`
            }
          >
            Painel
          </NavLink>
        </nav>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
