import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { api } from './api/cliente';
import { AvisoAtualizacao } from './componentes/AvisoAtualizacao';
import { Carregando } from './componentes/Basicos';
import { Cabecalho } from './componentes/Cabecalho';
import { ProvedorSessao, useSessao } from './hooks/useSessao';
import { useTema } from './hooks/useTema';
import { ProvedorI18n, useI18n } from './i18n';
import { Atendimento } from './paginas/Atendimento';
import { Cirurgia } from './paginas/Cirurgia';
import { Enfermagem } from './paginas/Enfermagem';
import { Farmacia } from './paginas/Farmacia';
import { ListaAtendimentos } from './paginas/ListaAtendimentos';
import { GestaoBases } from './paginas/GestaoBases';
import { GestaoComunidades } from './paginas/GestaoComunidades';
import { GestaoContas } from './paginas/GestaoContas';
import { Login } from './paginas/Login';
import { NovoAtendimento } from './paginas/NovoAtendimento';
import { Producao } from './paginas/Producao';
import { Prontuario } from './paginas/Prontuario';
import { SelecaoBase } from './paginas/SelecaoBase';
import { SinaisVitais } from './paginas/SinaisVitais';
import { TrocarSenha } from './paginas/TrocarSenha';
import { Triagem } from './paginas/Triagem';
import { Ultrassom } from './paginas/Ultrassom';
import type { Tema } from './hooks/useTema';

/**
 * Exige sessão; sem ela, volta para o login.
 *
 * Quem ainda está com a senha provisória vai para a troca e não passa daqui: a
 * API recusaria tudo de qualquer forma, e sem o desvio a pessoa colecionaria
 * 403 sem entender o motivo.
 */
function Protegido() {
  const { autenticado, profissional } = useSessao();

  if (!autenticado) {
    return <Navigate to="/entrar" replace />;
  }

  return profissional?.precisaTrocarSenha ? (
    <Navigate to="/trocar-senha" replace />
  ) : (
    <Outlet />
  );
}

/** Restringe a rota a quem administra contas. */
function SomenteAdministrador() {
  const { profissional } = useSessao();

  return profissional?.ehAdministrador ? <Outlet /> : <Navigate to="/atendimentos" replace />;
}

/**
 * Garante a base que o resto do app usa para tudo — escolhendo uma sozinho.
 *
 * Antes isto desviava para a tela de seleção, e todo mundo passava por ela
 * depois de entrar. Só que na prática a base é uma: a pessoa fazia login,
 * escolhia a única opção da lista e apertava continuar, três toques até chegar
 * onde ia trabalhar. Agora quem entra cai direto na fila, e troca de base pelo
 * botão do cabeçalho quando precisar — que é o caso raro.
 *
 * A seleção continua existindo, e é para onde isto manda quando não há base
 * ativa nenhuma ou a lista não carrega: ali a pessoa vê o motivo e pode tentar
 * de novo, em vez de olhar uma tela vazia.
 */
function ComBase({ tema, alternarTema }: { tema: Tema; alternarTema: () => void }) {
  const { t } = useI18n();
  const { base, definirBase } = useSessao();
  const [semBase, setSemBase] = useState(false);

  useEffect(() => {
    if (base) return;

    let cancelado = false;

    api
      .bases()
      .then((lista) => {
        if (cancelado) return;

        // A API devolve só as ativas. A primeira é a escolha: com uma base, é a
        // dela; com várias, o cabeçalho diz qual ficou e troca em um toque.
        if (lista.length > 0) definirBase(lista[0]);
        else setSemBase(true);
      })
      .catch(() => {
        if (!cancelado) setSemBase(true);
      });

    return () => {
      cancelado = true;
    };
  }, [base, definirBase]);

  if (!base) {
    return semBase ? <Navigate to="/bases" replace /> : <Carregando texto={t('carregando')} />;
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
  const { autenticado, profissional } = useSessao();

  const precisaTrocarSenha = profissional?.precisaTrocarSenha ?? false;

  return (
    <Routes>
      <Route
        path="/entrar"
        element={
          !autenticado ? (
            <Login tema={tema} alternarTema={alternar} />
          ) : (
            <Navigate to={precisaTrocarSenha ? '/trocar-senha' : '/atendimentos'} replace />
          )
        }
      />

      {/*
        Fora de <Protegido> de propósito: é justamente a tela para onde ele
        desvia, e aninhar produziria um redirecionamento em círculo.
      */}
      <Route
        path="/trocar-senha"
        element={
          !autenticado ? (
            <Navigate to="/entrar" replace />
          ) : precisaTrocarSenha ? (
            <TrocarSenha tema={tema} alternarTema={alternar} />
          ) : (
            <Navigate to="/atendimentos" replace />
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
          <Route path="/atendimentos/:id/enfermagem" element={<Enfermagem />} />
          <Route path="/atendimentos/:id/ultrassom" element={<Ultrassom />} />
          <Route path="/atendimentos/:id/farmacia" element={<Farmacia />} />
          <Route path="/atendimentos/:id/sinais-vitais" element={<SinaisVitais />} />
          <Route path="/atendimentos/:id/cirurgia" element={<Cirurgia />} />

          {/*
            Aberta a todo mundo de propósito: quem não é coordenação recebe da
            API só a própria produção, e ver o próprio trabalho somado não é
            privilégio de ninguém.
          */}
          <Route path="/producao" element={<Producao />} />

          {/*
            A tela some para quem não é administrador, mas quem garante a
            restrição é o servidor: a API responde 403 de qualquer forma.
          */}
          <Route element={<SomenteAdministrador />}>
            <Route path="/contas" element={<GestaoContas />} />
            <Route path="/comunidades" element={<GestaoComunidades />} />
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
