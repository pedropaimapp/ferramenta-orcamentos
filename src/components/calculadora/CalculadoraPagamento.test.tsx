import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalculadoraPagamento } from './CalculadoraPagamento';
import type { FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';

const faixas: FaixaPagamento[] = [
  { id: '1', valorMinCentavos: 0, valorMaxCentavos: 100000, parcelasSemJuros: 1 },
  { id: '2', valorMinCentavos: 100000, valorMaxCentavos: 250000, parcelasSemJuros: 2 },
  { id: '3', valorMinCentavos: 250000, valorMaxCentavos: 400000, parcelasSemJuros: 3 },
  { id: '4', valorMinCentavos: 400000, valorMaxCentavos: null, parcelasSemJuros: 4 },
];
const config: ConfiguracaoPagamento = { percentualEntradaMinima: 0.3, percentualDescontoAVista: 0.05, cartaoPortoMaxParcelas: 6, cartaoPortoParcelaMinimaCentavos: 10000 };

function digitarValorDoServico(valor: string) {
  fireEvent.change(screen.getByLabelText('Valor do serviço'), { target: { value: valor } });
}

describe('CalculadoraPagamento', () => {
  it('não mostra a condição de pagamento antes de digitar um valor', () => {
    render(<CalculadoraPagamento faixas={faixas} config={config} />);
    expect(screen.queryByText(/Opções de pagamento do saldo/)).not.toBeInTheDocument();
  });

  it('calcula entrada mínima, saldo, máximo de parcelas e opções ao digitar o valor', () => {
    render(<CalculadoraPagamento faixas={faixas} config={config} />);
    digitarValorDoServico('3650,00');

    expect(screen.getByText('R$ 1.095,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 2.555,00')).toBeInTheDocument();
    expect(screen.getByText('até 3x')).toBeInTheDocument();
    expect(screen.getByText(/À vista R\$ 2\.555,00/)).toBeInTheDocument();
    expect(screen.getByText(/2x de R\$ 1\.277,50/)).toBeInTheDocument();
    expect(screen.getByText(/3x de R\$ 851,66/)).toBeInTheDocument();
    expect(screen.getByText(/Cartão Porto em até 6x de R\$ 608,33/)).toBeInTheDocument();
  });

  it('mostra o desconto à vista quando a entrada chega a 100%', () => {
    render(<CalculadoraPagamento faixas={faixas} config={config} />);
    digitarValorDoServico('3650,00');

    fireEvent.change(screen.getByRole('slider'), { target: { value: '100' } });

    expect(screen.getByText(/Pagamento total via Pix\/Débito/)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 3\.467,50/)).toBeInTheDocument();
    expect(screen.queryByText(/Opções de pagamento do saldo/)).not.toBeInTheDocument();
  });
});
