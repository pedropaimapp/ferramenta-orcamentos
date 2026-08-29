import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CatalogoManager } from './CatalogoManager';

vi.mock('@/lib/supabase/client', () => ({ createBrowserClient: () => ({}) }));

const criarItemCatalogoMock = vi.fn();
vi.mock('@/lib/catalogo/data', () => ({
  criarItemCatalogo: (...args: unknown[]) => criarItemCatalogoMock(...args),
  atualizarItemCatalogo: vi.fn(),
  removerItemCatalogo: vi.fn(),
}));

describe('CatalogoManager', () => {
  beforeEach(() => criarItemCatalogoMock.mockReset());

  it('converte o valor em reais digitado para centavos ao criar um item', async () => {
    criarItemCatalogoMock.mockResolvedValue({ id: '1', descricao: 'Pastilha de freio', tipo: 'peca', marcaCodigo: null, valorPadraoCentavos: 15000 });
    render(<CatalogoManager itensIniciais={[]} />);

    fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: 'Pastilha de freio' } });
    fireEvent.change(screen.getByPlaceholderText('Valor (R$)'), { target: { value: '150,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(criarItemCatalogoMock).toHaveBeenCalledWith(
        {},
        { descricao: 'Pastilha de freio', tipo: 'peca', marcaCodigo: null, valorPadraoCentavos: 15000 }
      )
    );
  });

  it('mostra erro quando o valor digitado não é um número', async () => {
    render(<CatalogoManager itensIniciais={[]} />);

    fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: 'Item' } });
    fireEvent.change(screen.getByPlaceholderText('Valor (R$)'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Valor inválido'));
    expect(criarItemCatalogoMock).not.toHaveBeenCalled();
  });
});
