import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ItemsTable } from './ItemsTable';

// A tabela de itens renderiza duas versões do mesmo conteúdo — cards (mobile,
// `itens-cards`) e tabela (desktop, `itens-tabela`) — trocadas via CSS
// conforme a largura da tela. Os testes seguem a versão desktop, que é o
// comportamento equivalente ao original antes da versão mobile existir.
function tabela() {
  return within(screen.getByTestId('itens-tabela'));
}

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
    expect(tabela().getByText('Pastilha de freio')).toBeInTheDocument();
    expect(tabela().getByText('R$ 300,00')).toBeInTheDocument();
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
    fireEvent.click(tabela().getByRole('button', { name: 'Editar' }));
    fireEvent.click(tabela().getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(tabela().getByRole('button', { name: 'Remover' }));
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

    fireEvent.click(tabela().getByRole('button', { name: 'Editar' }));

    expect(tabela().getByLabelText('Descrição do item')).toHaveValue('Pastilha de freio');
    expect(tabela().getByLabelText('Quantidade do item')).toHaveValue(2);
    expect(tabela().getByLabelText('Valor unitário do item')).toHaveValue('150,00');
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

    fireEvent.click(tabela().getByRole('button', { name: 'Editar' }));
    fireEvent.change(tabela().getByLabelText('Descrição do item'), { target: { value: 'Pastilha de freio dianteira' } });
    fireEvent.change(tabela().getByLabelText('Quantidade do item'), { target: { value: '3' } });
    fireEvent.change(tabela().getByLabelText('Valor unitário do item'), { target: { value: '160,00' } });
    fireEvent.click(tabela().getByRole('button', { name: 'Salvar' }));

    expect(onEditar).toHaveBeenCalledWith('1', {
      descricao: 'Pastilha de freio dianteira',
      tipo: 'peca',
      quantidade: 3,
      valorUnitarioCentavos: 16000,
    });
    expect(tabela().queryByLabelText('Descrição do item')).not.toBeInTheDocument();
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

    fireEvent.click(tabela().getByRole('button', { name: 'Editar' }));
    fireEvent.change(tabela().getByLabelText('Descrição do item'), { target: { value: 'Outra coisa' } });
    fireEvent.click(tabela().getByRole('button', { name: 'Cancelar' }));

    expect(onEditar).not.toHaveBeenCalled();
    expect(tabela().getByText('Pastilha de freio')).toBeInTheDocument();
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

    fireEvent.click(tabela().getByRole('button', { name: 'Editar' }));
    fireEvent.change(tabela().getByLabelText('Quantidade do item'), { target: { value: '0' } });
    fireEvent.click(tabela().getByRole('button', { name: 'Salvar' }));

    expect(tabela().getByText('Quantidade deve ser maior que zero')).toBeInTheDocument();
    expect(onEditar).not.toHaveBeenCalled();
  });

  it('mostra também a versão em cards (mobile) com os mesmos dados', () => {
    render(
      <ItemsTable
        itens={[{ id: '1', descricao: 'Pastilha de freio', tipo: 'peca', quantidade: 2, valorUnitarioCentavos: 15000 }]}
        onRemover={vi.fn()}
        onEditar={vi.fn()}
      />
    );

    const cards = within(screen.getByTestId('itens-cards'));
    expect(cards.getByText('Pastilha de freio')).toBeInTheDocument();
    expect(cards.getByText('Subtotal: R$ 300,00')).toBeInTheDocument();
    expect(cards.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });
});
