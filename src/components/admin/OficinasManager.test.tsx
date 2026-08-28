import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OficinasManager } from './OficinasManager';

vi.mock('@/lib/supabase/client', () => ({ createBrowserClient: () => ({}) }));

const criarOficinaMock = vi.fn();
const atualizarOficinaMock = vi.fn();
const enviarLogoOficinaMock = vi.fn();
vi.mock('@/lib/oficinas/data', () => ({
  criarOficina: (...args: unknown[]) => criarOficinaMock(...args),
  atualizarOficina: (...args: unknown[]) => atualizarOficinaMock(...args),
  enviarLogoOficina: (...args: unknown[]) => enviarLogoOficinaMock(...args),
}));

const oficinaExistente = { id: '1', nome: 'Top Stop Centro', endereco: 'Rua A', telefone: '11999999999', logoUrl: null };

describe('OficinasManager', () => {
  beforeEach(() => {
    criarOficinaMock.mockReset();
    atualizarOficinaMock.mockReset();
    enviarLogoOficinaMock.mockReset();
  });

  it('lista as oficinas recebidas', () => {
    render(<OficinasManager oficinasIniciais={[oficinaExistente]} />);
    expect(screen.getByText('Top Stop Centro')).toBeInTheDocument();
  });

  it('cria uma nova oficina e adiciona à lista', async () => {
    criarOficinaMock.mockResolvedValue({ id: '2', nome: 'Top Stop Norte', endereco: 'Rua B', telefone: '11888888888', logoUrl: null });
    render(<OficinasManager oficinasIniciais={[]} />);

    fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: 'Top Stop Norte' } });
    fireEvent.change(screen.getByPlaceholderText('Endereço'), { target: { value: 'Rua B' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone'), { target: { value: '11888888888' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.getByText('Top Stop Norte')).toBeInTheDocument());
    expect(enviarLogoOficinaMock).not.toHaveBeenCalled();
  });

  it('mostra erro quando a criação falha', async () => {
    criarOficinaMock.mockRejectedValue(new Error('Erro ao criar oficina: falhou'));
    render(<OficinasManager oficinasIniciais={[]} />);

    fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: 'X' } });
    fireEvent.change(screen.getByPlaceholderText('Endereço'), { target: { value: 'Y' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone'), { target: { value: 'Z' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('falhou'));
  });

  it('envia o logo depois de criar a oficina, quando um arquivo é escolhido', async () => {
    const arquivo = new File(['conteudo'], 'logo.png', { type: 'image/png' });
    criarOficinaMock.mockResolvedValue({ id: '2', nome: 'Top Stop Norte', endereco: 'Rua B', telefone: '11888888888', logoUrl: null });
    enviarLogoOficinaMock.mockResolvedValue('https://storage.example/logos/2/logo.png');
    atualizarOficinaMock.mockResolvedValue({ id: '2', nome: 'Top Stop Norte', endereco: 'Rua B', telefone: '11888888888', logoUrl: 'https://storage.example/logos/2/logo.png' });

    render(<OficinasManager oficinasIniciais={[]} />);

    fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: 'Top Stop Norte' } });
    fireEvent.change(screen.getByPlaceholderText('Endereço'), { target: { value: 'Rua B' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone'), { target: { value: '11888888888' } });
    fireEvent.change(screen.getByLabelText('Logo (opcional)'), { target: { files: [arquivo] } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(enviarLogoOficinaMock).toHaveBeenCalledWith({}, '2', arquivo));
    expect(atualizarOficinaMock).toHaveBeenCalledWith({}, '2', {
      nome: 'Top Stop Norte',
      endereco: 'Rua B',
      telefone: '11888888888',
      logoUrl: 'https://storage.example/logos/2/logo.png',
    });
  });
});
