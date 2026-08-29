import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ItemsTable } from './ItemsTable';

describe('ItemsTable', () => {
  it('mostra uma mensagem quando não há itens', () => {
    render(<ItemsTable itens={[]} onRemover={vi.fn()} />);
    expect(screen.getByText('Nenhum item adicionado ainda.')).toBeInTheDocument();
  });

  it('mostra os itens com subtotal calculado', () => {
    render(
      <ItemsTable
        itens={[{ id: '1', descricao: 'Pastilha de freio', tipo: 'peca', quantidade: 2, valorUnitarioCentavos: 15000 }]}
        onRemover={vi.fn()}
      />
    );
    expect(screen.getByText('Pastilha de freio')).toBeInTheDocument();
    expect(screen.getByText('R$ 300,00')).toBeInTheDocument();
  });

  it('chama onRemover com o id correto', () => {
    const onRemover = vi.fn();
    render(
      <ItemsTable
        itens={[{ id: '1', descricao: 'Pastilha de freio', tipo: 'peca', quantidade: 1, valorUnitarioCentavos: 15000 }]}
        onRemover={onRemover}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));
    expect(onRemover).toHaveBeenCalledWith('1');
  });
});
