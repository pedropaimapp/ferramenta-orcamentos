import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ItemsTable } from './ItemsTable';

describe('ItemsTable', () => {
  it('mostra uma mensagem quando não há itens', () => {
    render(<ItemsTable itens={[]} onRemover={vi.fn()} onEditar={vi.fn()} />);
    expect(screen.getByText('Nenhum item adicionado ainda.')).toBeInTheDocument();
  });

  it('mostra os itens com subtotal calculado', () => {
    render(
      <ItemsTable
        itens={[{ id: '1', descricao: 'Pastilha de freio', tipo: 'peca', quantidade: 2, valorUnitarioCentavos: 15000 }]}
        onRemover={vi.fn()}
        onEditar={vi.fn()}
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
        onEditar={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));
    expect(onRemover).toHaveBeenCalledWith('1');
  });

  it('entra em modo de edição ao clicar em Editar, com os campos preenchidos', () => {
    render(
      <ItemsTable
        itens={[{ id: '1', descricao: 'Pastilha de freio', tipo: 'peca', quantidade: 2, valorUnitarioCentavos: 15000 }]}
        onRemover={vi.fn()}
        onEditar={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

    expect(screen.getByLabelText('Descrição do item')).toHaveValue('Pastilha de freio');
    expect(screen.getByLabelText('Quantidade do item')).toHaveValue(2);
    expect(screen.getByLabelText('Valor unitário do item')).toHaveValue('150,00');
  });

  it('chama onEditar com os dados alterados ao salvar', () => {
    const onEditar = vi.fn();
    render(
      <ItemsTable
        itens={[{ id: '1', descricao: 'Pastilha de freio', tipo: 'peca', quantidade: 2, valorUnitarioCentavos: 15000 }]}
        onRemover={vi.fn()}
        onEditar={onEditar}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Descrição do item'), { target: { value: 'Pastilha de freio dianteira' } });
    fireEvent.change(screen.getByLabelText('Quantidade do item'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Valor unitário do item'), { target: { value: '160,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onEditar).toHaveBeenCalledWith('1', {
      descricao: 'Pastilha de freio dianteira',
      tipo: 'peca',
      quantidade: 3,
      valorUnitarioCentavos: 16000,
    });
    expect(screen.queryByLabelText('Descrição do item')).not.toBeInTheDocument();
  });

  it('cancela a edição sem chamar onEditar e restaura a linha original', () => {
    const onEditar = vi.fn();
    render(
      <ItemsTable
        itens={[{ id: '1', descricao: 'Pastilha de freio', tipo: 'peca', quantidade: 2, valorUnitarioCentavos: 15000 }]}
        onRemover={vi.fn()}
        onEditar={onEditar}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Descrição do item'), { target: { value: 'Outra coisa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onEditar).not.toHaveBeenCalled();
    expect(screen.getByText('Pastilha de freio')).toBeInTheDocument();
  });

  it('mostra erro e não chama onEditar quando a quantidade é inválida', () => {
    const onEditar = vi.fn();
    render(
      <ItemsTable
        itens={[{ id: '1', descricao: 'Pastilha de freio', tipo: 'peca', quantidade: 2, valorUnitarioCentavos: 15000 }]}
        onRemover={vi.fn()}
        onEditar={onEditar}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Quantidade do item'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText('Quantidade deve ser maior que zero')).toBeInTheDocument();
    expect(onEditar).not.toHaveBeenCalled();
  });
});
