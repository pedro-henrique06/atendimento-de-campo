import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProvedorI18n } from '../i18n';
import { AlertaAlergia, PontoRisco } from './Basicos';

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
