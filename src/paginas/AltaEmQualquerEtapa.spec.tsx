import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ErroApi } from '../api/cliente';
import type { Especialidade, EtapaResumo, Prontuario } from '../api/tipos';
import { ProvedorI18n } from '../i18n';
import { Atendimento } from './Atendimento';
import { Farmacia } from './Farmacia';
import { Triagem } from './Triagem';

/*
  A alta em qualquer etapa.

  Antes ela existia só no prontuário, e só enquanto houvesse fila aberta. Quem
  estava com o paciente tinha de gravar a ficha, voltar uma tela e achar outro
  botão — e, no caso da triagem que não encaminha ninguém, não havia botão
  nenhum: a etapa fechava, o cartão sumia e o que sobrava era um "finalizar" que
  não gravava desfecho. O paciente mandado para casa não constava como alta em
  lugar algum.
*/

function etapa(sobre: Partial<EtapaResumo> = {}): EtapaResumo {
  return {
    id: 'e1',
    especialidade: 'Triagem',
    status: 'EmAndamento',
    profissional: 'Ana Enfermeira',
    iniciadaEm: '2026-07-26T12:05:00Z',
    concluidaEm: null,
    assumidaEm: '2026-07-26T12:05:00Z',
    encaminhadaPor: null,
    encaminhadaDe: null,
    ...sobre,
  };
}

function prontuario(sobre: Partial<Prontuario> = {}): Prontuario {
  return {
    id: 'a1',
    codigo: 'ACA-4K7Z',
    base: { id: 'b1', nome: 'Acampamento Panamá', prefixoCodigo: 'ACA', ativa: true },
    paciente: {
      id: 'pa1',
      nome: 'Yesenia Navarro',
      idade: 45,
      alerta: { exibir: false, texto: null },
    },
    status: 'EmAndamento',
    finalizadoEm: null,
    consultas: [],
    odontologia: null,
    enfermagem: null,
    ultrassom: null,
    farmacia: null,
    sinaisVitais: [],
    tipoMissao: null,
    cirurgia: null,
    etapas: [etapa()],
    tempoNasFilas: [],
    historico: [],
    ...sobre,
  } as unknown as Prontuario;
}

function renderizar(rota: string) {
  return render(
    <ProvedorI18n>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/atendimentos/:id/triagem" element={<Triagem />} />
          <Route path="/atendimentos/:id/farmacia" element={<Farmacia />} />
          <Route
            path="/atendimentos/:id/consulta/:especialidade"
            element={<Atendimento modo="consulta" />}
          />
          <Route path="/atendimentos/:id/odontologia" element={<Atendimento modo="odontologia" />} />
          <Route path="/atendimentos/:id" element={<p>prontuário</p>} />
        </Routes>
      </MemoryRouter>
    </ProvedorI18n>,
  );
}

/** Abre o cartão, escolhe a alta e confirma. */
async function darAlta(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(screen.getByRole('button', { name: 'Encerrar atendimento' }));
  await usuario.click(screen.getByRole('button', { name: 'Dar alta e encerrar' }));
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('atendimento.idioma', 'Pt');
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('alta a partir da triagem', () => {
  it('grava a triagem e encerra o atendimento pela triagem', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(api, 'prontuario').mockResolvedValue(prontuario());
    const triar = vi.spyOn(api, 'registrarTriagem').mockResolvedValue(null);
    const encerrar = vi.spyOn(api, 'encerrar').mockResolvedValue(prontuario());

    renderizar('/atendimentos/a1/triagem');

    // A classificação é o que a API exige; sem ela a alta não é oferecida.
    await screen.findByRole('button', { name: /^Verde/ });
    await usuario.click(screen.getByRole('button', { name: /^Verde/ }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Encerrar atendimento' })).toBeInTheDocument(),
    );

    await darAlta(usuario);

    // A ficha primeiro: é o registro do que justificou a alta. Sem isto, o que
    // foi medido ficaria só no rascunho do aparelho.
    await waitFor(() => expect(encerrar).toHaveBeenCalled());
    expect(triar).toHaveBeenCalled();

    expect(encerrar).toHaveBeenCalledWith('a1', 'Triagem', {
      desfecho: 'Alta',
      detalhe: undefined,
      cancelarPendentes: true,
    });

    // E volta para o prontuário, que agora mostra o atendimento encerrado.
    expect(await screen.findByText('prontuário')).toBeInTheDocument();
  });

  it('não oferece a alta antes da classificação de risco', async () => {
    vi.spyOn(api, 'prontuario').mockResolvedValue(prontuario());

    renderizar('/atendimentos/a1/triagem');

    await screen.findByRole('button', { name: /^Verde/ });

    expect(
      screen.queryByRole('button', { name: 'Encerrar atendimento' }),
    ).not.toBeInTheDocument();

    // E diz por quê, em vez de só esconder o botão.
    expect(
      screen.getByText('Classifique o risco para poder encerrar o atendimento daqui.'),
    ).toBeInTheDocument();
  });
});

describe('alta a partir da consulta', () => {
  it('encerra pela especialidade da consulta, e não pela primeira fila', async () => {
    const usuario = userEvent.setup();

    vi.spyOn(api, 'prontuario').mockResolvedValue(
      prontuario({
        etapas: [
          etapa({ id: 'e1', especialidade: 'Triagem', status: 'Concluida' }),
          etapa({ id: 'e2', especialidade: 'Pediatria', status: 'EmAndamento' }),
        ],
      }),
    );

    const registrar = vi.spyOn(api, 'registrarConsulta').mockResolvedValue(undefined);
    const encerrar = vi.spyOn(api, 'encerrar').mockResolvedValue(prontuario());

    renderizar('/atendimentos/a1/consulta/Pediatria');

    await screen.findByLabelText('Descreva os sintomas');
    await darAlta(usuario);

    await waitFor(() => expect(encerrar).toHaveBeenCalled());
    expect(registrar).toHaveBeenCalled();

    // Pela pediatria: é a fila em que este profissional está. Lida da lista de
    // etapas, viria a triagem, que é a primeira.
    expect(encerrar).toHaveBeenCalledWith('a1', 'Pediatria', {
      desfecho: 'Alta',
      detalhe: undefined,
      cancelarPendentes: true,
    });
  });

  /*
    A ficha recusada não pode virar alta: a consulta concluída exige CID-10, e
    sem a recusa aparecer o paciente receberia alta sem registro do que
    aconteceu na consulta.
  */
  it('não encerra quando a ficha é recusada', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(api, 'prontuario').mockResolvedValue(prontuario({ etapas: [etapa({ especialidade: 'ClinicaGeral' })] }));

    vi.spyOn(api, 'registrarConsulta').mockRejectedValue(
      new ErroApi(400, ['Informe o CID-10 para concluir a consulta.']),
    );
    const encerrar = vi.spyOn(api, 'encerrar').mockResolvedValue(prontuario());

    renderizar('/atendimentos/a1/consulta/ClinicaGeral');

    await screen.findByLabelText('Descreva os sintomas');
    await darAlta(usuario);

    expect(
      await screen.findByText('Informe o CID-10 para concluir a consulta.'),
    ).toBeInTheDocument();

    expect(encerrar).not.toHaveBeenCalled();
  });
});

describe('alta a partir das outras fichas', () => {
  it('sai da odontologia, que não tem encaminhamento na ficha', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(api, 'prontuario').mockResolvedValue(
      prontuario({ etapas: [etapa({ especialidade: 'Odontologia' })] }),
    );

    const registrar = vi.spyOn(api, 'registrarOdontologia').mockResolvedValue(undefined);
    const encerrar = vi.spyOn(api, 'encerrar').mockResolvedValue(prontuario());

    renderizar('/atendimentos/a1/odontologia');

    await screen.findByRole('heading', { name: 'Odontologia' });
    await darAlta(usuario);

    await waitFor(() => expect(encerrar).toHaveBeenCalled());
    expect(registrar).toHaveBeenCalled();
    expect(encerrar).toHaveBeenCalledWith('a1', 'Odontologia', {
      desfecho: 'Alta',
      detalhe: undefined,
      cancelarPendentes: true,
    });
  });

  it('sai da farmácia avisando quais filas serão canceladas', async () => {
    const usuario = userEvent.setup();

    vi.spyOn(api, 'prontuario').mockResolvedValue(
      prontuario({
        etapas: [
          etapa({ id: 'e1', especialidade: 'Farmacia', status: 'EmAndamento' }),
          etapa({ id: 'e2', especialidade: 'Odontologia', status: 'Aguardando' }),
        ],
      }),
    );

    vi.spyOn(api, 'registrarFarmacia').mockResolvedValue(undefined);
    const encerrar = vi.spyOn(api, 'encerrar').mockResolvedValue(prontuario());

    renderizar('/atendimentos/a1/farmacia');

    await screen.findByLabelText('Orientação farmacêutica');
    await usuario.click(screen.getByRole('button', { name: 'Encerrar atendimento' }));

    // A fila que vai sumir aparece antes de confirmar: sumir sem aviso é como o
    // paciente descobre no dia seguinte que perdeu a vez na odontologia.
    expect(screen.getByText('Este paciente ainda está nestas filas:')).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('Odontologia');

    await usuario.click(screen.getByRole('button', { name: 'Dar alta e encerrar' }));

    await waitFor(() => expect(encerrar).toHaveBeenCalled());
  });

  it('exige o destino da transferência antes de deixar confirmar', async () => {
    const usuario = userEvent.setup();
    vi.spyOn(api, 'prontuario').mockResolvedValue(
      prontuario({ etapas: [etapa({ especialidade: 'Farmacia' })] }),
    );

    renderizar('/atendimentos/a1/farmacia');

    await screen.findByLabelText('Orientação farmacêutica');
    await usuario.click(screen.getByRole('button', { name: 'Encerrar atendimento' }));
    await usuario.click(screen.getByRole('button', { name: 'Transferência hospitalar' }));

    const confirmar = screen.getByRole('button', { name: 'Confirmar encerramento' });
    expect(confirmar).toBeDisabled();

    await usuario.type(screen.getByLabelText(/Para onde foi transferido/), 'Hospital de Metetí');
    expect(confirmar).toBeEnabled();
  });

  /** Atendimento já encerrado não tem alta a dar. */
  it('não aparece em atendimento finalizado', async () => {
    vi.spyOn(api, 'prontuario').mockResolvedValue(
      prontuario({
        status: 'Finalizado',
        finalizadoEm: '2026-07-26T13:00:00Z',
        etapas: [etapa({ especialidade: 'Farmacia' })],
      }),
    );

    renderizar('/atendimentos/a1/farmacia');

    await screen.findByLabelText('Orientação farmacêutica');

    expect(
      screen.queryByRole('button', { name: 'Encerrar atendimento' }),
    ).not.toBeInTheDocument();
  });
});
