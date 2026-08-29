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

  it('não reformata o campo "Valor de entrada" a cada tecla digitada e ainda assim atualiza saldo/entrada corretamente', () => {
    render(<CalculadoraPagamento faixas={faixas} config={config} />);
    digitarValorDoServico('3650,00');

    const campoEntrada = screen.getByLabelText('Valor de entrada') as HTMLInputElement;

    // Digita "1500,00" caractere a caractere. Antes da correção, valores parciais como "1"
    // eram parseados com sucesso (parseReaisParaCentavos("1") === 100 centavos) e o campo era
    // imediatamente reformatado para "1,00", sobrescrevendo o que o usuário estava digitando.
    const sequenciaDigitada = ['1', '15', '150', '1500', '1500,', '1500,0', '1500,00'];
    for (const valorParcial of sequenciaDigitada) {
      fireEvent.change(campoEntrada, { target: { value: valorParcial } });
      expect(campoEntrada.value).toBe(valorParcial);
    }

    // Ao fim da digitação, sem perder o foco, o campo ainda mostra exatamente o que foi digitado.
    expect(campoEntrada.value).toBe('1500,00');

    // O valor completo e válido já se refletiu corretamente no restante da calculadora.
    expect(screen.getByText('R$ 1.500,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 2.150,00')).toBeInTheDocument();

    // Ao perder o foco, o campo passa a exibir o valor canônico formatado (sincronizado de volta).
    fireEvent.blur(campoEntrada);
    expect(campoEntrada.value).toBe('1500,00');
  });

  it('o slider ainda sincroniza o campo "Valor de entrada" (sincronia bidirecional preservada)', () => {
    render(<CalculadoraPagamento faixas={faixas} config={config} />);
    digitarValorDoServico('3650,00');

    const campoEntrada = screen.getByLabelText('Valor de entrada') as HTMLInputElement;
    fireEvent.change(screen.getByRole('slider'), { target: { value: '50' } });

    expect(campoEntrada.value).toBe('1825,00');
  });
});
