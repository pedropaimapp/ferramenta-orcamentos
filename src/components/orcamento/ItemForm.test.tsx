import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ItemForm } from './ItemForm';
import type { CatalogoItem } from '@/lib/types';

const catalogo: CatalogoItem[] = [
  { id: 'cat-1', descricao: 'Pastilha de freio', tipo: 'peca', marcaCodigo: 'BOSCH-123', valorPadraoCentavos: 15000 },
  { id: 'cat-2', descricao: 'Troca de óleo', tipo: 'servico', marcaCodigo: null, valorPadraoCentavos: 10000 },
];

describe('ItemForm', () => {
  it('adiciona um item digitado manualmente (sem selecionar sugestão do catálogo)', () => {
    const onAdicionar = vi.fn();
    render(<ItemForm catalogo={[]} onAdicionar={onAdicionar} />);

    fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: 'Filtro de ar' } });
    fireEvent.change(screen.getByPlaceholderText('Quantidade'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('Valor unitário (R$)'), { target: { value: '50,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));

    expect(onAdicionar).toHaveBeenCalledWith({ catalogoItemId: null, descricao: 'Filtro de ar', tipo: 'peca', quantidade: 2, valorUnitarioCentavos: 5000 });
  });

  it('mostra sugestões do catálogo filtradas pelo tipo selecionado enquanto digita', () => {
    render(<ItemForm catalogo={catalogo} onAdicionar={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: 'o' } });

    expect(screen.getByText('Pastilha de freio')).toBeInTheDocument();
    expect(screen.queryByText('Troca de óleo')).not.toBeInTheDocument();
  });

  it('preenche descrição, tipo e valor ao selecionar uma sugestão do catálogo', () => {
    const onAdicionar = vi.fn();
    render(<ItemForm catalogo={catalogo} onAdicionar={onAdicionar} />);

    fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: 'Pastilha' } });
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Pastilha de freio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));

    expect(onAdicionar).toHaveBeenCalledWith({ catalogoItemId: 'cat-1', descricao: 'Pastilha de freio', tipo: 'peca', quantidade: 1, valorUnitarioCentavos: 15000 });
  });

  it('só sugere itens do tipo "Serviço" quando esse tipo está selecionado', () => {
    render(<ItemForm catalogo={catalogo} onAdicionar={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Serviço' }));
    fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: 'o' } });

    expect(screen.getByText('Troca de óleo')).toBeInTheDocument();
    expect(screen.queryByText('Pastilha de freio')).not.toBeInTheDocument();
  });

  it('mostra erro e não chama onAdicionar quando a quantidade é inválida', () => {
    const onAdicionar = vi.fn();
    render(<ItemForm catalogo={[]} onAdicionar={onAdicionar} />);

    fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: 'Item' } });
    fireEvent.change(screen.getByPlaceholderText('Quantidade'), { target: { value: '0' } });
    fireEvent.change(screen.getByPlaceholderText('Valor unitário (R$)'), { target: { value: '10,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Quantidade deve ser maior que zero');
    expect(onAdicionar).not.toHaveBeenCalled();
  });

  it('mostra erro e não chama onAdicionar quando a quantidade não é um número (NaN)', () => {
    const onAdicionar = vi.fn();
    render(<ItemForm catalogo={[]} onAdicionar={onAdicionar} />);

    fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: 'Item' } });

    // A native `type="number"` input sanitizes any assigned invalid string down
    // to an empty value, so it can't carry a NaN-producing string through a
    // normal fireEvent.change. To exercise the defense-in-depth NaN guard we
    // bypass that sanitization by overriding the element's `value` property
    // directly, simulating a non-numeric value reaching React's change handler.
    const quantidadeInput = screen.getByPlaceholderText('Quantidade') as HTMLInputElement;
    Object.defineProperty(quantidadeInput, 'value', { value: 'abc', configurable: true });
    fireEvent.change(quantidadeInput);

    fireEvent.change(screen.getByPlaceholderText('Valor unitário (R$)'), { target: { value: '10,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Quantidade deve ser maior que zero');
    expect(onAdicionar).not.toHaveBeenCalled();
  });
});
