import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrcamentosList } from './OrcamentosList';
import type { Orcamento } from '@/lib/types';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

const duplicarOrcamentoMock = vi.fn();
const removerOrcamentoMock = vi.fn();
vi.mock('@/lib/orcamento/actions', () => ({
  duplicarOrcamento: (...args: unknown[]) => duplicarOrcamentoMock(...args),
  removerOrcamento: (...args: unknown[]) => removerOrcamentoMock(...args),
}));

const orcamentos: Orcamento[] = [
  { id: 'o1', clienteNome: 'Maria', clienteTelefone: '5511987654321', veiculoPlaca: 'ABC1D23', veiculoModelo: 'Onix', consultorId: 'c1', oficinaId: 'of1', status: 'rascunho', validadeDias: 7, createdAt: '', updatedAt: '' },
  { id: 'o2', clienteNome: 'João', clienteTelefone: '5511999999999', veiculoPlaca: 'XYZ9K88', veiculoModelo: 'Gol', consultorId: 'c1', oficinaId: 'of1', status: 'enviado', validadeDias: 7, createdAt: '', updatedAt: '' },
];

describe('OrcamentosList', () => {
  beforeEach(() => {
    pushMock.mockReset();
    duplicarOrcamentoMock.mockReset();
    removerOrcamentoMock.mockReset();
  });

  it('filtra por status', () => {
    render(<OrcamentosList orcamentosIniciais={orcamentos} />);
    fireEvent.change(screen.getByDisplayValue('Todos os status'), { target: { value: 'enviado' } });
    expect(screen.queryByText('Maria')).not.toBeInTheDocument();
    expect(screen.getByText('João')).toBeInTheDocument();
  });

  it('filtra por busca de cliente ou placa', () => {
    render(<OrcamentosList orcamentosIniciais={orcamentos} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar por cliente ou placa'), { target: { value: 'xyz9k88' } });
    expect(screen.queryByText('Maria')).not.toBeInTheDocument();
    expect(screen.getByText('João')).toBeInTheDocument();
  });

  it('duplica um orçamento e navega para o novo', async () => {
    duplicarOrcamentoMock.mockResolvedValue({ id: 'o3' });
    render(<OrcamentosList orcamentosIniciais={orcamentos} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Duplicar' })[0]);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/orcamentos/o3'));
    expect(duplicarOrcamentoMock).toHaveBeenCalledWith('o1');
  });

  it('exclui um orçamento após confirmação e o remove da lista', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    removerOrcamentoMock.mockResolvedValue(undefined);
    render(<OrcamentosList orcamentosIniciais={orcamentos} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Excluir' })[0]);

    await waitFor(() => expect(screen.queryByText('Maria')).not.toBeInTheDocument());
    expect(removerOrcamentoMock).toHaveBeenCalledWith('o1');
    expect(screen.getByText('João')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('não exclui nada se o usuário cancelar a confirmação', () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    render(<OrcamentosList orcamentosIniciais={orcamentos} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Excluir' })[0]);

    expect(removerOrcamentoMock).not.toHaveBeenCalled();
    expect(screen.getByText('Maria')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
