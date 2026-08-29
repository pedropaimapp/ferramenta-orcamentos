import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrcamentoForm } from './OrcamentoForm';
import type { FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';

const faixas: FaixaPagamento[] = [{ id: '1', valorMinCentavos: 0, valorMaxCentavos: null, parcelasSemJuros: 1 }];
const config: ConfiguracaoPagamento = { percentualEntradaMinima: 0.3, percentualDescontoAVista: 0.05, cartaoPortoMaxParcelas: 6, cartaoPortoParcelaMinimaCentavos: 10000 };

function preencherItem() {
  fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: 'Troca de óleo' } });
  fireEvent.change(screen.getByPlaceholderText('Quantidade'), { target: { value: '1' } });
  fireEvent.change(screen.getByPlaceholderText('Valor unitário (R$)'), { target: { value: '100,00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));
}

describe('OrcamentoForm', () => {
  it('bloqueia salvar sem nenhum item', async () => {
    const aoSalvar = vi.fn();
    render(<OrcamentoForm catalogo={[]} faixas={faixas} config={config} aoSalvar={aoSalvar} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar orçamento' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Adicione ao menos um item'));
    expect(aoSalvar).not.toHaveBeenCalled();
  });

  it('bloqueia salvar com telefone inválido', async () => {
    const aoSalvar = vi.fn();
    render(<OrcamentoForm catalogo={[]} faixas={faixas} config={config} aoSalvar={aoSalvar} />);

    preencherItem();
    fireEvent.change(screen.getByPlaceholderText('Telefone (WhatsApp)'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar orçamento' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Telefone do cliente inválido'));
    expect(aoSalvar).not.toHaveBeenCalled();
  });

  it('chama aoSalvar com os dados preenchidos quando válido', async () => {
    const aoSalvar = vi.fn().mockResolvedValue(undefined);
    render(<OrcamentoForm catalogo={[]} faixas={faixas} config={config} aoSalvar={aoSalvar} />);

    fireEvent.change(screen.getByPlaceholderText('Nome do cliente'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone (WhatsApp)'), { target: { value: '11987654321' } });
    fireEvent.change(screen.getByPlaceholderText('Placa'), { target: { value: 'ABC1D23' } });
    fireEvent.change(screen.getByPlaceholderText('Modelo/marca'), { target: { value: 'Onix' } });
    preencherItem();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar orçamento' }));

    await waitFor(() => expect(aoSalvar).toHaveBeenCalledTimes(1));
    const dados = aoSalvar.mock.calls[0][0];
    expect(dados.clienteNome).toBe('Maria');
    expect(dados.clienteTelefone).toBe('11987654321');
    expect(dados.veiculoPlaca).toBe('ABC1D23');
    expect(dados.veiculoModelo).toBe('Onix');
    expect(dados.itens).toHaveLength(1);
    expect(dados.itens[0]).toMatchObject({ descricao: 'Troca de óleo', quantidade: 1, valorUnitarioCentavos: 10000 });
  });
});
