import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { OrcamentoForm } from './OrcamentoForm';
import { garantirItemNoCatalogo } from '@/lib/catalogo/actions';
import type { FaixaPagamento, ConfiguracaoPagamento, CatalogoItem } from '@/lib/types';

vi.mock('@/lib/catalogo/actions', () => ({
  garantirItemNoCatalogo: vi.fn(),
}));

const garantirItemNoCatalogoMock = vi.mocked(garantirItemNoCatalogo);

const faixas: FaixaPagamento[] = [{ id: '1', valorMinCentavos: 0, valorMaxCentavos: null, parcelasSemJuros: 1 }];
const config: ConfiguracaoPagamento = { percentualEntradaMinima: 0.3, percentualDescontoAVista: 0.05, cartaoPortoMaxParcelas: 6, cartaoPortoParcelaMinimaCentavos: 10000 };

function preencherItem() {
  fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: 'Troca de óleo' } });
  fireEvent.change(screen.getByPlaceholderText('Quantidade'), { target: { value: '1' } });
  fireEvent.change(screen.getByPlaceholderText('Valor unitário (R$)'), { target: { value: '100,00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));
}

beforeEach(() => {
  garantirItemNoCatalogoMock.mockReset();
  garantirItemNoCatalogoMock.mockResolvedValue({
    id: 'cat-novo',
    descricao: 'Troca de óleo',
    tipo: 'servico',
    marcaCodigo: null,
    valorPadraoCentavos: 10000,
  });
});

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

  it('formata o telefone digitado com a máscara brasileira', () => {
    render(<OrcamentoForm catalogo={[]} faixas={faixas} config={config} aoSalvar={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Telefone (WhatsApp)'), { target: { value: '11987654321' } });
    expect(screen.getByPlaceholderText('Telefone (WhatsApp)')).toHaveValue('(11) 98765-4321');
  });

  it('deixa a placa maiúscula enquanto digita', () => {
    render(<OrcamentoForm catalogo={[]} faixas={faixas} config={config} aoSalvar={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Placa'), { target: { value: 'abc1d23' } });
    expect(screen.getByPlaceholderText('Placa')).toHaveValue('ABC1D23');
  });

  it('bloqueia salvar com placa em formato inválido', async () => {
    const aoSalvar = vi.fn();
    render(<OrcamentoForm catalogo={[]} faixas={faixas} config={config} aoSalvar={aoSalvar} />);

    preencherItem();
    fireEvent.change(screen.getByPlaceholderText('Telefone (WhatsApp)'), { target: { value: '11987654321' } });
    fireEvent.change(screen.getByPlaceholderText('Placa'), { target: { value: 'AB1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar orçamento' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Placa inválida'));
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
    expect(dados.clienteTelefone).toBe('(11) 98765-4321');
    expect(dados.veiculoPlaca).toBe('ABC1D23');
    expect(dados.veiculoModelo).toBe('Onix');
    expect(dados.itens).toHaveLength(1);
    expect(dados.itens[0]).toMatchObject({ descricao: 'Troca de óleo', quantidade: 1, valorUnitarioCentavos: 10000 });
  });

  it('salva no catálogo um item digitado manualmente e o disponibiliza no formulário sem recarregar a página', async () => {
    render(<OrcamentoForm catalogo={[]} faixas={faixas} config={config} aoSalvar={vi.fn()} />);

    preencherItem();

    await waitFor(() =>
      expect(garantirItemNoCatalogoMock).toHaveBeenCalledWith({ descricao: 'Troca de óleo', tipo: 'peca', valorPadraoCentavos: 10000 })
    );
    // o item recém-criado no catálogo já vira sugestão para o próximo item adicionado
    fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: 'Troca' } });
    await waitFor(() => expect(screen.getAllByText('Troca de óleo').length).toBeGreaterThan(0));
  });

  it('não tenta salvar no catálogo um item selecionado a partir de uma sugestão existente', async () => {
    const catalogo: CatalogoItem[] = [{ id: 'cat-1', descricao: 'Pastilha de freio', tipo: 'peca', marcaCodigo: null, valorPadraoCentavos: 15000 }];
    render(<OrcamentoForm catalogo={catalogo} faixas={faixas} config={config} aoSalvar={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: 'Pastilha' } });
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Pastilha de freio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));

    expect(garantirItemNoCatalogoMock).not.toHaveBeenCalled();
  });

  it('permite editar um item já adicionado através da tabela', async () => {
    render(<OrcamentoForm catalogo={[]} faixas={faixas} config={config} aoSalvar={vi.fn()} />);

    preencherItem();
    await waitFor(() => expect(garantirItemNoCatalogoMock).toHaveBeenCalled());

    const tabela = within(screen.getByTestId('itens-tabela'));
    fireEvent.click(tabela.getByRole('button', { name: 'Editar' }));
    fireEvent.change(tabela.getByLabelText('Quantidade do item'), { target: { value: '4' } });
    fireEvent.click(tabela.getByRole('button', { name: 'Salvar' }));

    expect(tabela.getByText('R$ 400,00')).toBeInTheDocument();
  });
});
