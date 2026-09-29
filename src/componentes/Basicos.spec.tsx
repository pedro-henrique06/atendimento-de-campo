import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProvedorI18n } from '../i18n';
import { AlertaAlergia, Medida, PontoRisco } from './Basicos';

function comI18n(no: React.ReactNode) {
  return render(<ProvedorI18n>{no}</ProvedorI18n>);
}

/**
 * O sistema de referência exibia alerta vermelho de alergia para qualquer texto
 * preenchido, inclusive "Nega alergia medicamentosa". A decisão de exibir agora
 * vem inteira do backend, e o componente não tem heurística própria — estes
 * testes travam esse contrato.
 */
describe('AlertaAlergia', () => {
  it('não renderiza nada quando o backend diz para não exibir', () => {
    comI18n(<AlertaAlergia exibir={false} texto={null} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('não renderiza mesmo se vier texto junto de exibir falso', () => {
    // Exatamente o caso que gerava o falso positivo.
    comI18n(<AlertaAlergia exibir={false} texto="Nega alergia medicamentosa" />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/Nega alergia/)).not.toBeInTheDocument();
  });

  it('renderiza o alerta quando há alergia registrada', () => {
    comI18n(<AlertaAlergia exibir texto="Dipirona, penicilina" />);

    const alerta = screen.getByRole('alert');

    expect(alerta).toHaveTextContent('Dipirona, penicilina');
  });
});

describe('PontoRisco', () => {
  it('descreve a cor por texto acessível', () => {
    // Cor sozinha não comunica risco.
    comI18n(<PontoRisco risco="Vermelho" />);

    expect(screen.getByRole('img', { name: 'Vermelho' })).toBeInTheDocument();
  });

  it('sem classificação não anuncia risco nenhum', () => {
    comI18n(<PontoRisco risco={null} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('Medida', () => {
  it('não repete a unidade que já está no rótulo do formulário', () => {
    render(
      <ProvedorI18n>
        <Medida rotulo="Frequência cardíaca (bpm)" valor={88} unidade="bpm" />
      </ProvedorI18n>,
    );

    // O rótulo do formulário diz a unidade porque ali ela orienta a digitação.
    // Aqui ela já está ao lado do número: repetida, a etiqueta ocuparia três
    // linhas numa caixa de um terço de tela para dizer "bpm" duas vezes.
    expect(screen.getByText('Frequência cardíaca')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('bpm')).toBeInTheDocument();
  });

  it('mantém o parêntese quando não há unidade a separar', () => {
    render(
      <ProvedorI18n>
        <Medida rotulo="Classificação de risco (START)" valor="Amarelo" />
      </ProvedorI18n>,
    );

    // Sem unidade, o parêntese pode estar dizendo outra coisa — aqui, de qual
    // protocolo é a classificação.
    expect(screen.getByText('Classificação de risco (START)')).toBeInTheDocument();
  });

  it('não desenha nada sem valor, para a grade não ter buracos', () => {
    const { container } = render(
      <ProvedorI18n>
        <Medida rotulo="Glicemia (mg/dL)" valor={null} unidade="mg/dL" />
      </ProvedorI18n>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('zero é um valor medido, e não um campo vazio', () => {
    render(
      <ProvedorI18n>
        <Medida rotulo="Dor (0 a 10)" valor={0} unidade="/ 10" />
      </ProvedorI18n>,
    );

    // "Sem dor" é resposta. Tratar zero como vazio apagaria a única medida da
    // escala que significa que a pergunta foi feita e respondida.
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
