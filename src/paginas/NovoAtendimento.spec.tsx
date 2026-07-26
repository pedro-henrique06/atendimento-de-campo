import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/cliente';
import type { PacienteConhecido } from '../api/tipos';
import { ProvedorSessao } from '../hooks/useSessao';
import { ProvedorI18n } from '../i18n';
import { NovoAtendimento } from './NovoAtendimento';

const CONHECIDO: PacienteConhecido = {
  paciente: {
    id: 'p1',
    codigo: '4K7Z-2YAP',
    nome: 'Yesenia Retorno',
    tipoDocumento: 'SemDocumento',
    numeroDocumento: null,
    dataNascimento: null,
    idade: 34,
    sexo: 'Feminino',
    statusAlergia: 'PossuiAlergia',
    alergias: 'Dipirona',
    alerta: { exibir: true, texto: 'Dipirona' },
    condicoesCronicas: ['Hipertensao'],
    vulnerabilidades: [],
    consentimentoRegistro: true,
  },
  totalAtendimentos: 2,
  ultimoAtendimentoEm: '2026-05-10T12:00:00Z',
  ultimaBase: 'Acampamento Panamá',
};

function renderizar() {
  return render(
    <ProvedorI18n>
      <ProvedorSessao>
        <MemoryRouter>
          <NovoAtendimento />
        </MemoryRouter>
      </ProvedorSessao>
    </ProvedorI18n>,
  );
}

beforeEach(() => {
  localStorage.clear();
  // O provedor cai no idioma do aparelho quando nao ha nada guardado, e no
  // jsdom isso e ingles. As asserções abaixo sao em portugues.
  localStorage.setItem('atendimento.idioma', 'Pt');
  vi.spyOn(api, 'codigoNovoPaciente').mockResolvedValue({ codigo: '4K7Z-2YAP' });
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('Novo atendimento', () => {
  it('pergunta primeiro se o paciente é novo ou já foi atendido', () => {
    // Sem essa bifurcação quem volta vira cadastro novo, e o histórico da
    // pessoa se perde — em campo isso é a regra, não a exceção.
    renderizar();

    expect(screen.getByRole('button', { name: /Novo paciente/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /já atendido/ })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nome/)).not.toBeInTheDocument();
  });

  it('mostra o código antes de pedir qualquer dado', async () => {
    // A equipe anota o código e entrega à pessoa. Esperar o formulário terminar
    // significaria perder o código se o aparelho desligasse no meio.
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: /Novo paciente/ }));

    expect(await screen.findByText('4K7Z-2YAP')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome/)).toHaveValue('');
  });

  it('trava o formulário até o consentimento ser marcado', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: /Novo paciente/ }));

    const nome = await screen.findByLabelText(/Nome/);
    expect(nome).toBeDisabled();

    await usuario.click(screen.getByRole('checkbox', { name: /consente/ }));

    expect(nome).toBeEnabled();
  });

  it('recupera o cadastro de quem volta com o código', async () => {
    vi.spyOn(api, 'pacientePorCodigo').mockResolvedValue(CONHECIDO);

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: /já atendido/ }));
    await usuario.type(screen.getByLabelText(/Informe o código/), '4K7Z-2YAP');
    await usuario.click(screen.getByRole('button', { name: 'Procurar' }));

    // Confirmação antes de abrir: nome e visitas anteriores para a equipe ver
    // que é a pessoa certa.
    expect(await screen.findByText('Yesenia Retorno')).toBeInTheDocument();
    expect(screen.getByText(/2 atendimentos anteriores/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Usar este cadastro' }));

    await waitFor(() => expect(screen.getByLabelText(/Nome/)).toHaveValue('Yesenia Retorno'));
    expect(screen.getByText('4K7Z-2YAP')).toBeInTheDocument();
  });

  it('pede o consentimento de novo mesmo para quem já é cadastrado', async () => {
    // O consentimento é por atendimento. Herdar o de meses atrás registraria a
    // visita de hoje sem ninguém ter perguntado nada.
    vi.spyOn(api, 'pacientePorCodigo').mockResolvedValue(CONHECIDO);

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: /já atendido/ }));
    await usuario.type(screen.getByLabelText(/Informe o código/), '4K7Z-2YAP');
    await usuario.click(screen.getByRole('button', { name: 'Procurar' }));
    await usuario.click(await screen.findByRole('button', { name: 'Usar este cadastro' }));

    expect(screen.getByRole('checkbox', { name: /consente/ })).not.toBeChecked();
    expect(screen.getByLabelText(/Nome/)).toBeDisabled();
  });

  it('avisa quando o código não existe, em vez de abrir um cadastro em branco', async () => {
    vi.spyOn(api, 'pacientePorCodigo').mockResolvedValue(null);

    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: /já atendido/ }));
    await usuario.type(screen.getByLabelText(/Informe o código/), 'XXXX-XXXX');
    await usuario.click(screen.getByRole('button', { name: 'Procurar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Nenhum paciente encontrado/);
    expect(screen.queryByLabelText(/Nome/)).not.toBeInTheDocument();
  });

  it('deixa trocar de paciente depois de escolher', async () => {
    // Código digitado errado não pode obrigar a salvar o atendimento na pessoa
    // errada.
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole('button', { name: /Novo paciente/ }));
    await usuario.click(await screen.findByRole('button', { name: 'Trocar paciente' }));

    expect(screen.getByRole('button', { name: /Novo paciente/ })).toBeInTheDocument();
  });
});
