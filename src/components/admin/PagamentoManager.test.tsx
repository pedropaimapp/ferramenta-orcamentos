import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PagamentoManager } from './PagamentoManager';

vi.mock('@/lib/supabase/client', () => ({ createBrowserClient: () => ({}) }));

const criarFaixaMock = vi.fn();
const atualizarConfiguracaoMock = vi.fn();
vi.mock('@/lib/pagamento/data', () => ({
  criarFaixa: (...args: unknown[]) => criarFaixaMock(...args),
  atualizarFaixa: vi.fn(),
  removerFaixa: vi.fn(),
  atualizarConfiguracao: (...args: unknown[]) => atualizarConfiguracaoMock(...args),
}));

const configuracao = { percentualEntradaMinima: 0.3, percentualDescontoAVista: 0.05, cartaoPortoMaxParcelas: 6, cartaoPortoParcelaMinimaCentavos: 10000 };

describe('PagamentoManager', () => {
  beforeEach(() => {
    criarFaixaMock.mockReset();
    atualizarConfiguracaoMock.mockReset();
  });

  it('cria uma nova faixa convertendo os valores em reais para centavos', async () => {
    criarFaixaMock.mockResolvedValue({ id: '1', valorMinCentavos: 400000, valorMaxCentavos: null, parcelasSemJuros: 4 });
    render(<PagamentoManager faixasIniciais={[]} configuracaoInicial={configuracao} />);

    fireEvent.change(screen.getByPlaceholderText('Valor mínimo (R$)'), { target: { value: '4000,00' } });
    fireEvent.change(screen.getByPlaceholderText('Parcelas sem juros'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(criarFaixaMock).toHaveBeenCalledWith({}, { valorMinCentavos: 400000, valorMaxCentavos: null, parcelasSemJuros: 4 })
    );
  });

  it('atualiza a configuração convertendo percentuais para fração', async () => {
    atualizarConfiguracaoMock.mockResolvedValue({ ...configuracao, percentualEntradaMinima: 0.4 });
    render(<PagamentoManager faixasIniciais={[]} configuracaoInicial={configuracao} />);

    fireEvent.change(screen.getByLabelText(/entrada mínima/i), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    await waitFor(() =>
      expect(atualizarConfiguracaoMock).toHaveBeenCalledWith({}, {
        percentualEntradaMinima: 0.4,
        percentualDescontoAVista: 0.05,
        cartaoPortoMaxParcelas: 6,
        cartaoPortoParcelaMinimaCentavos: 10000,
      })
    );
  });

  it('rejeita entrada mínima em branco sem salvar', async () => {
    render(<PagamentoManager faixasIniciais={[]} configuracaoInicial={configuracao} />);

    fireEvent.change(screen.getByLabelText(/entrada mínima/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Entrada mínima (%) deve ser um número entre 0 e 100');
    expect(atualizarConfiguracaoMock).not.toHaveBeenCalled();
  });

  it('rejeita percentual de desconto fora do intervalo 0-100', async () => {
    render(<PagamentoManager faixasIniciais={[]} configuracaoInicial={configuracao} />);

    fireEvent.change(screen.getByLabelText(/desconto à vista/i), { target: { value: '300' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Desconto à vista (%) deve ser um número entre 0 e 100');
    expect(atualizarConfiguracaoMock).not.toHaveBeenCalled();
  });

  it('rejeita cartão Porto máximo de parcelas igual a zero', async () => {
    render(<PagamentoManager faixasIniciais={[]} configuracaoInicial={configuracao} />);

    fireEvent.change(screen.getByLabelText(/máximo de parcelas/i), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Cartão Porto - máximo de parcelas deve ser um número inteiro maior ou igual a 1');
    expect(atualizarConfiguracaoMock).not.toHaveBeenCalled();
  });

  it('rejeita parcela mínima em branco sem lançar exceção não tratada', async () => {
    render(<PagamentoManager faixasIniciais={[]} configuracaoInicial={configuracao} />);

    fireEvent.change(screen.getByLabelText(/parcela mínima/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Valor inválido/);
    expect(atualizarConfiguracaoMock).not.toHaveBeenCalled();
  });
});
