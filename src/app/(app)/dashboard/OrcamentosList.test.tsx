import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { OrcamentosList } from './OrcamentosList';
import type { Orcamento, Oficina, Consultor } from '@/lib/types';

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

// A lista renderiza duas versões (cards no mobile, tabela no desktop) do
// mesmo conteúdo, trocadas via CSS. Os testes seguem a versão desktop.
function tabela() {
  return within(screen.getByTestId('orcamentos-tabela'));
}

describe('OrcamentosList', () => {
  beforeEach(() => {
    pushMock.mockReset();
    duplicarOrcamentoMock.mockReset();
    removerOrcamentoMock.mockReset();
  });

  it('filtra por status', () => {
    render(<OrcamentosList orcamentosIniciais={orcamentos} />);
    fireEvent.change(screen.getByDisplayValue('Todos os status'), { target: { value: 'enviado' } });
    expect(tabela().queryByText('Maria')).not.toBeInTheDocument();
    expect(tabela().getByText('João')).toBeInTheDocument();
  });

  it('filtra por busca de cliente ou placa', () => {
    render(<OrcamentosList orcamentosIniciais={orcamentos} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar por cliente ou placa'), { target: { value: 'xyz9k88' } });
    expect(tabela().queryByText('Maria')).not.toBeInTheDocument();
    expect(tabela().getByText('João')).toBeInTheDocument();
  });

  it('duplica um orçamento e navega para o novo', async () => {
    duplicarOrcamentoMock.mockResolvedValue({ id: 'o3' });
    render(<OrcamentosList orcamentosIniciais={orcamentos} />);

    fireEvent.click(tabela().getAllByRole('button', { name: 'Duplicar' })[0]);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/orcamentos/o3'));
    expect(duplicarOrcamentoMock).toHaveBeenCalledWith('o1');
  });

  it('exclui um orçamento após confirmação e o remove da lista', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    removerOrcamentoMock.mockResolvedValue(undefined);
    render(<OrcamentosList orcamentosIniciais={orcamentos} />);

    fireEvent.click(tabela().getAllByRole('button', { name: 'Excluir' })[0]);

    await waitFor(() => expect(tabela().queryByText('Maria')).not.toBeInTheDocument());
    expect(removerOrcamentoMock).toHaveBeenCalledWith('o1');
    expect(tabela().getByText('João')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('não exclui nada se o usuário cancelar a confirmação', () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    render(<OrcamentosList orcamentosIniciais={orcamentos} />);

    fireEvent.click(tabela().getAllByRole('button', { name: 'Excluir' })[0]);

    expect(removerOrcamentoMock).not.toHaveBeenCalled();
    expect(tabela().getByText('Maria')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('mostra também a versão em cards (mobile) com os mesmos dados', () => {
    render(<OrcamentosList orcamentosIniciais={orcamentos} />);
    const cards = within(screen.getByTestId('orcamentos-cards'));
    expect(cards.getByText('Maria')).toBeInTheDocument();
    expect(cards.getByText('João')).toBeInTheDocument();
  });
});

describe('OrcamentosList (modo admin, com oficinas e consultores)', () => {
  const oficinaIpiranga: Oficina = { id: 'of1', nome: 'Ipiranga', endereco: '', telefone: '', logoUrl: null };
  const oficinaSantana: Oficina = { id: 'of2', nome: 'Santana', endereco: '', telefone: '', logoUrl: null };
  const consultorAna: Consultor = { id: 'c1', authUserId: 'a1', nome: 'Ana', login: 'ana@topstop.local', papel: 'consultor', oficinaIds: ['of1'], ativo: true };
  const consultorBia: Consultor = { id: 'c2', authUserId: 'a2', nome: 'Bia', login: 'bia@topstop.local', papel: 'consultor', oficinaIds: ['of2'], ativo: true };

  const orcamentosAdmin: Orcamento[] = [
    { id: 'o1', clienteNome: 'Maria', clienteTelefone: '5511987654321', veiculoPlaca: 'ABC1D23', veiculoModelo: 'Onix', consultorId: 'c1', oficinaId: 'of1', status: 'rascunho', validadeDias: 7, createdAt: '', updatedAt: '' },
    { id: 'o2', clienteNome: 'João', clienteTelefone: '5511999999999', veiculoPlaca: 'XYZ9K88', veiculoModelo: 'Gol', consultorId: 'c2', oficinaId: 'of2', status: 'enviado', validadeDias: 7, createdAt: '', updatedAt: '' },
  ];

  it('mostra as colunas Oficina e Consultor e os filtros correspondentes', () => {
    render(<OrcamentosList orcamentosIniciais={orcamentosAdmin} oficinas={[oficinaIpiranga, oficinaSantana]} consultores={[consultorAna, consultorBia]} />);
    const tabelaAdmin = within(screen.getByTestId('orcamentos-tabela'));
    expect(tabelaAdmin.getByText('Ipiranga')).toBeInTheDocument();
    expect(tabelaAdmin.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Todas as oficinas')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Todos os consultores')).toBeInTheDocument();
  });

  it('filtra por oficina', () => {
    render(<OrcamentosList orcamentosIniciais={orcamentosAdmin} oficinas={[oficinaIpiranga, oficinaSantana]} consultores={[consultorAna, consultorBia]} />);
    fireEvent.change(screen.getByDisplayValue('Todas as oficinas'), { target: { value: 'of2' } });
    const tabelaAdmin = within(screen.getByTestId('orcamentos-tabela'));
    expect(tabelaAdmin.queryByText('Maria')).not.toBeInTheDocument();
    expect(tabelaAdmin.getByText('João')).toBeInTheDocument();
  });

  it('filtra por consultor', () => {
    render(<OrcamentosList orcamentosIniciais={orcamentosAdmin} oficinas={[oficinaIpiranga, oficinaSantana]} consultores={[consultorAna, consultorBia]} />);
    fireEvent.change(screen.getByDisplayValue('Todos os consultores'), { target: { value: 'c1' } });
    const tabelaAdmin = within(screen.getByTestId('orcamentos-tabela'));
    expect(tabelaAdmin.getByText('Maria')).toBeInTheDocument();
    expect(tabelaAdmin.queryByText('João')).not.toBeInTheDocument();
  });

  it('não mostra colunas nem filtros extras quando oficinas/consultores não são passados (consultor comum)', () => {
    render(<OrcamentosList orcamentosIniciais={orcamentos} />);
    expect(screen.queryByDisplayValue('Todas as oficinas')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Todos os consultores')).not.toBeInTheDocument();
  });
});
