import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminOrcamentosList } from './AdminOrcamentosList';
import type { Orcamento } from '@/lib/types';

const removerOrcamentoMock = vi.fn();
vi.mock('@/lib/orcamento/actions', () => ({ removerOrcamento: (...args: unknown[]) => removerOrcamentoMock(...args) }));

const orcamentos: Orcamento[] = [
  { id: 'o1', clienteNome: 'Maria', clienteTelefone: '5511987654321', veiculoPlaca: 'ABC1D23', veiculoModelo: 'Onix', consultorId: 'c1', oficinaId: 'of1', status: 'rascunho', validadeDias: 7, createdAt: '', updatedAt: '' },
  { id: 'o2', clienteNome: 'João', clienteTelefone: '5511999999999', veiculoPlaca: 'XYZ9K88', veiculoModelo: 'Gol', consultorId: 'c2', oficinaId: 'of2', status: 'enviado', validadeDias: 7, createdAt: '', updatedAt: '' },
];
const consultoresPorId = { c1: 'Ana', c2: 'Pedro' };
const oficinasPorId = { of1: 'Top Stop Centro', of2: 'Top Stop Norte' };

describe('AdminOrcamentosList', () => {
  beforeEach(() => removerOrcamentoMock.mockReset());

  it('mostra o nome do consultor e da oficina de cada orçamento', () => {
    render(<AdminOrcamentosList orcamentosIniciais={orcamentos} consultoresPorId={consultoresPorId} oficinasPorId={oficinasPorId} />);
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Top Stop Norte')).toBeInTheDocument();
  });

  it('filtra por status', () => {
    render(<AdminOrcamentosList orcamentosIniciais={orcamentos} consultoresPorId={consultoresPorId} oficinasPorId={oficinasPorId} />);
    fireEvent.change(screen.getByDisplayValue('Todos os status'), { target: { value: 'rascunho' } });
    expect(screen.getByText('Maria')).toBeInTheDocument();
    expect(screen.queryByText('João')).not.toBeInTheDocument();
  });

  it('exclui um orçamento (de qualquer consultor) após confirmação', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    removerOrcamentoMock.mockResolvedValue(undefined);
    render(<AdminOrcamentosList orcamentosIniciais={orcamentos} consultoresPorId={consultoresPorId} oficinasPorId={oficinasPorId} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Excluir' })[1]);

    await waitFor(() => expect(screen.queryByText('João')).not.toBeInTheDocument());
    expect(removerOrcamentoMock).toHaveBeenCalledWith('o2');
    vi.unstubAllGlobals();
  });
});
