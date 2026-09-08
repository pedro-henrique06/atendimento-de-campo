import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/cliente';
import type { Profissional } from '../api/tipos';
import { ProvedorSessao } from '../hooks/useSessao';
import { ProvedorI18n } from '../i18n';
import { NovoAtendimento } from './NovoAtendimento';
import { Triagem } from './Triagem';

const ENFERMEIRA: Profissional = {
  id: 'p1',
  usuario: 'claudia.luz',
  nome: 'Cláudia Luz',
  email: null,
  funcao: 'Enfermeiro',
  conselhoTipo: 'Coren',
  registro: '52728',
  idioma: 'Pt',
  status: 'Ativa',
  ehAdministrador: false,
  motivoRecusa: null,
  criadoEm: '2026-01-01T12:00:00Z',
  filas: ['Triagem', 'Enfermagem'],
  precisaTrocarSenha: false,
};

function comSessao(children: React.ReactNode) {
  localStorage.setItem('atendimento.token', 'token-de-teste');
  localStorage.setItem('atendimento.profissional', JSON.stringify(ENFERMEIRA));
  localStorage.setItem(
    'atendimento.base',
    JSON.stringify({ id: 'b1', nome: 'Acampamento Panamá', prefixoCodigo: 'ACA', ativa: true }),
  );

  return render(
    <ProvedorI18n>
      <ProvedorSessao>
        <MemoryRouter>{children}</MemoryRouter>
      </ProvedorSessao>
    </ProvedorI18n>,
  );
}

/**
 * Passa da tela de escolha para o formulário e dá o consentimento.
 *
 * O consentimento vem primeiro e desabilita o resto do formulário até ser
 * marcado — é a regra da tela, não um detalhe do teste: sem ele nenhum campo
 * aceita interação.
 */
async function abrirFormulario(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(await screen.findByRole('button', { name: /Novo paciente/i }));
  await usuario.click(await screen.findByLabelText(/consente com o registro/i));
  await screen.findByLabelText(/^Nome/);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('atendimento.idioma', 'Pt');
  vi.spyOn(api, 'codigoNovoPaciente').mockResolvedValue({ codigo: 'ACAB-4K7Z' });
  vi.spyOn(api, 'comunidades').mockResolvedValue([
    { id: 'c1', nome: 'Vila União', ativa: true },
    { id: 'c2', nome: 'Praia Verde', ativa: true },
  ]);
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('Cadastro do paciente', () => {
  it('pede o cartão do SUS separado do documento', async () => {
    const usuario = userEvent.setup();
    comSessao(<NovoAtendimento />);
    await abrirFormulario(usuario);

    // Como tipo de documento, um excluiria o outro e o número do cartão se
    // perderia. São campos separados justamente por isso.
    expect(screen.getByLabelText(/Cartão do SUS/i)).toBeInTheDocument();
  });

  it('oferece a comunidade como lista, não como texto livre', async () => {
    const usuario = userEvent.setup();
    comSessao(<NovoAtendimento />);
    await abrirFormulario(usuario);

    const campo = await screen.findByLabelText(/Comunidade/i);

    // Digitada à mão, a mesma vila vira três grafias e a contagem para de fechar.
    expect(campo.tagName).toBe('SELECT');
    expect(await screen.findByRole('option', { name: 'Vila União' })).toBeInTheDocument();
  });

  it('quando não há comunidade cadastrada, não cai em texto livre', async () => {
    vi.spyOn(api, 'comunidades').mockResolvedValue([]);

    const usuario = userEvent.setup();
    comSessao(<NovoAtendimento />);
    await abrirFormulario(usuario);

    expect(await screen.findByText(/Nenhuma comunidade cadastrada/i)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Comunidade/i })).not.toBeInTheDocument();
  });

  it('não pede nome da mãe para adulto', async () => {
    const usuario = userEvent.setup();
    comSessao(<NovoAtendimento />);
    await abrirFormulario(usuario);

    await usuario.click(screen.getByLabelText(/Não sei a data de nascimento/i));
    await usuario.type(screen.getByLabelText(/Idade aproximada/i), '40');

    expect(screen.queryByLabelText(/Nome da mãe/i)).not.toBeInTheDocument();
  });

  it('pede nome da mãe e endereço quando a idade indica menor', async () => {
    const usuario = userEvent.setup();
    comSessao(<NovoAtendimento />);
    await abrirFormulario(usuario);

    await usuario.click(screen.getByLabelText(/Não sei a data de nascimento/i));
    await usuario.type(screen.getByLabelText(/Idade aproximada/i), '8');

    // Em campo a criança chega acompanhada de quem não é o responsável legal.
    expect(await screen.findByLabelText(/Nome da mãe/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Endereço/i)).toBeInTheDocument();
  });

  it('a regra do menor também vale pela data de nascimento', async () => {
    const usuario = userEvent.setup();
    comSessao(<NovoAtendimento />);
    await abrirFormulario(usuario);

    const dezAnosAtras = new Date();
    dezAnosAtras.setFullYear(dezAnosAtras.getFullYear() - 10);

    // Quem informou a data não pode escapar da regra só porque não digitou a
    // idade.
    await usuario.type(
      screen.getByLabelText(/^Data de nascimento/),
      dezAnosAtras.toISOString().slice(0, 10),
    );

    expect(await screen.findByLabelText(/Nome da mãe/i)).toBeInTheDocument();
  });

  it('separa raça/cor de etnia', async () => {
    const usuario = userEvent.setup();
    comSessao(<NovoAtendimento />);
    await abrirFormulario(usuario);

    // A lista fechada do IBGE não comporta o povo, e juntar as duas apagaria a
    // etnia — que é o dado que orienta o atendimento a população indígena.
    const raca = await screen.findByLabelText(/Raça\/cor/i);
    expect(raca.tagName).toBe('SELECT');
    expect(await screen.findByRole('option', { name: 'Indígena' })).toBeInTheDocument();

    const etnia = screen.getByLabelText(/^Etnia/);
    expect(etnia.tagName).toBe('INPUT');
  });

  it('pede polo base e DSEI', async () => {
    const usuario = userEvent.setup();
    comSessao(<NovoAtendimento />);
    await abrirFormulario(usuario);

    expect(screen.getByLabelText(/Polo base/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/DSEI/i)).toBeInTheDocument();
  });

  it('o CPF é campo próprio, e não um tipo de documento', async () => {
    const usuario = userEvent.setup();
    comSessao(<NovoAtendimento />);
    await abrirFormulario(usuario);

    // Como tipo, excluiria o RG — o mesmo problema que o cartão do SUS já teve.
    expect(screen.getByLabelText(/^CPF/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cartão do SUS/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tipo de documento/i)).toBeInTheDocument();
  });

  it('tabagismo entra nos antecedentes', async () => {
    const usuario = userEvent.setup();
    comSessao(<NovoAtendimento />);
    await abrirFormulario(usuario);

    // Consta dos antecedentes de todos os formulários, ao lado de HAS e DM.
    expect(screen.getByRole('button', { name: 'Tabagista' })).toBeInTheDocument();
  });

  it('idade desconhecida não presume menor', async () => {
    const usuario = userEvent.setup();
    comSessao(<NovoAtendimento />);
    await abrirFormulario(usuario);

    // Exigir nome da mãe de um adulto sem documento ensinaria a recepção a
    // inventar dado, que é pior que não ter o dado.
    expect(screen.queryByLabelText(/Nome da mãe/i)).not.toBeInTheDocument();
  });
});

describe('Triagem', () => {
  beforeEach(() => {
    vi.spyOn(api, 'prontuario').mockResolvedValue({
      id: 'a1',
      codigo: 'ACA-4K7Z',
      base: { id: 'b1', nome: 'Acampamento Panamá', prefixoCodigo: 'ACA', ativa: true },
      paciente: {
        id: 'pa1',
        codigo: 'ACAB-4K7Z',
        nome: 'Yesenia Navarro',
        tipoDocumento: 'SemDocumento',
        numeroDocumento: null,
        cartaoSus: null,
        cpf: null,
        racaCor: 'NaoInformado',
        etnia: null,
        poloBase: null,
        dsei: null,
        municipioNascimento: null,
        paisNascimento: null,
        estadoResidencia: null,
        comunidadeId: null,
        comunidade: null,
        nomeDaMae: null,
        endereco: null,
        dataNascimento: null,
        idade: 34,
        ehMenor: false,
        sexo: 'Feminino',
        statusAlergia: 'NaoPerguntado',
        alergias: null,
        alerta: { exibir: false, texto: null },
        condicoesCronicas: [],
        vulnerabilidades: [],
        consentimentoRegistro: true,
      },
      status: 'Aberto',
      classificacaoRisco: null,
      queixaPrincipal: null,
      localizacao: null,
      criadoPor: 'Cláudia Luz',
      criadoEm: '2026-09-05T12:00:00Z',
      finalizadoPor: null,
      finalizadoEm: null,
      desfecho: null,
      desfechoDetalhe: null,
      triagem: null,
      consultas: [],
      odontologia: null,
      enfermagem: null,
      tempoNasFilas: [],
      historico: [],
      etapas: [],
    });
  });

  it('mostra o IMC assim que peso e altura existem', async () => {
    const usuario = userEvent.setup();
    comSessao(<Triagem />);

    await usuario.type(await screen.findByLabelText(/Peso/i), '70');
    await usuario.type(screen.getByLabelText(/Altura/i), '175');

    // Conferir depois de gravar chega tarde: o número aparece ainda no
    // preenchimento.
    expect(await screen.findByText(/22\.9/)).toBeInTheDocument();
  });

  it('a escala de dor começa em zero, e não em um', async () => {
    comSessao(<Triagem />);

    // "Sem dor" é uma resposta válida e diferente de não ter perguntado.
    expect(await screen.findByRole('button', { name: '0' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '11' })).not.toBeInTheDocument();
  });

  /**
   * A seção da dor. "Não perguntado" também é opção de status de alergia, então
   * a busca precisa ser escopada — senão o teste passaria por acidente lendo o
   * botão errado.
   */
  async function secaoDaDor() {
    const titulo = await screen.findByRole('heading', { name: /Dor \(0 a 10\)/i });
    return within(titulo.closest('section')!);
  }

  it('pede perímetro cefálico e os dois testes rápidos', async () => {
    comSessao(<Triagem />);

    expect(await screen.findByLabelText(/Circunferência cefálica/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/TR COVID-19/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/TR Malária/i)).toBeInTheDocument();
  });

  it('teste não feito é o estado inicial', async () => {
    comSessao(<Triagem />);

    // O vazio já significa "não fiz": uma terceira opção criaria duas formas de
    // dizer a mesma coisa.
    const covid = await screen.findByLabelText(/TR COVID-19/i);
    expect(covid).toHaveValue('');
  });

  it('"quais cirurgias" só aparece depois de responder que sim', async () => {
    const usuario = userEvent.setup();
    comSessao(<Triagem />);

    const pergunta = await screen.findByLabelText(/Cirurgias prévias/i);
    expect(screen.queryByLabelText(/Quais cirurgias/i)).not.toBeInTheDocument();

    await usuario.selectOptions(pergunta, 'sim');

    expect(await screen.findByLabelText(/Quais cirurgias/i)).toBeInTheDocument();
  });

  it('"não perguntado" é o estado inicial da dor', async () => {
    comSessao(<Triagem />);

    const dor = await secaoDaDor();

    // O vazio significa "não perguntei"; sem essa opção não haveria como voltar
    // a ele depois de tocar num número por engano.
    await waitFor(() =>
      expect(dor.getByRole('button', { name: /Não perguntado/i })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
  });

  it('escolher zero é diferente de não perguntar', async () => {
    const usuario = userEvent.setup();
    comSessao(<Triagem />);

    const dor = await secaoDaDor();

    await usuario.click(dor.getByRole('button', { name: '0' }));

    expect(dor.getByRole('button', { name: '0' })).toHaveAttribute('aria-pressed', 'true');
    expect(dor.getByRole('button', { name: /Não perguntado/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
