import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CondicaoPagamentoResumo } from './CondicaoPagamentoResumo';
import type { FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';

const faixas: FaixaPagamento[] = [{ id: '1', valorMinCentavos: 0, valorMaxCentavos: null, parcelasSemJuros: 2 }];
const config: ConfiguracaoPagamento = { percentualEntradaMinima: 0.3, percentualDescontoAVista: 0.05, cartaoPortoMaxParcelas: 6, cartaoPortoParcelaMinimaCentavos: 10000 };

describe('CondicaoPagamentoResumo', () => {
  it('pede para adicionar itens quando o total é zero', () => {
    render(<CondicaoPagamentoResumo totalCentavos={0} faixas={faixas} config={config} />);
    expect(screen.getByText('Adicione itens para calcular a condição de pagamento.')).toBeInTheDocument();
  });

  it('mostra entrada, parcelas, desconto e cartão Porto calculados', () => {
    render(<CondicaoPagamentoResumo totalCentavos={100000} faixas={faixas} config={config} />);
    expect(screen.getByText(/Entrada mínima \(30%\): R\$ 300,00/)).toBeInTheDocument();
    expect(screen.getByText(/Saldo em 2x de R\$ 350,00 no crédito sem juros/)).toBeInTheDocument();
    expect(screen.getByText(/Desconto à vista no Pix\/Débito: R\$ 50,00/)).toBeInTheDocument();
  });
});
