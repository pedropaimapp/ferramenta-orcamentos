import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrcamentoDetalheClient } from './OrcamentoDetalheClient';
import type { Orcamento, OrcamentoItem, FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

const salvarEdicaoOrcamentoMock = vi.fn();
const mudarStatusOrcamentoMock = vi.fn();
const removerOrcamentoMock = vi.fn();
vi.mock('@/lib/orcamento/actions', () => ({
  salvarEdicaoOrcamento: (...args: unknown[]) => salvarEdicaoOrcamentoMock(...args),
  mudarStatusOrcamento: (...args: unknown[]) => mudarStatusOrcamentoMock(...args),
  removerOrcamento: (...args: unknown[]) => removerOrcamentoMock(...args),
}));

const orcamento: Orcamento = {
  id: 'o1',
  clienteNome: 'Maria',
  clienteTelefone: '5511987654321',
  veiculoPlaca: 'ABC1D23',
  veiculoModelo: 'Onix',
  consultorId: 'c1',
  oficinaId: 'of1',
  status: 'rascunho',
  validadeDias: 7,
  createdAt: '2026-08-28T00:00:00Z',
  updatedAt: '2026-08-28T00:00:00Z',
};
const itens: OrcamentoItem[] = [
  { id: 'i1', orcamentoId: 'o1', catalogoItemId: null, descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valorUnitarioCentavos: 10000 },
];
const faixas: FaixaPagamento[] = [{ id: 'f1', valorMinCentavos: 0, valorMaxCentavos: null, parcelasSemJuros: 1 }];
const config: ConfiguracaoPagamento = { percentualEntradaMinima: 0.3, percentualDescontoAVista: 0.05, cartaoPortoMaxParcelas: 6, cartaoPortoParcelaMinimaCentavos: 10000 };

describe('OrcamentoDetalheClient', () => {
  beforeEach(() => {
    salvarEdicaoOrcamentoMock.mockReset();
    mudarStatusOrcamentoMock.mockReset();
    removerOrcamentoMock.mockReset();
    pushMock.mockReset();
  });

  it('pré-carrega o formulário com os dados existentes', () => {
    render(<OrcamentoDetalheClient orcamento={orcamento} itens={itens} catalogo={[]} faixas={faixas} config={config} oficinaNome="Top Stop Centro" consultorNome="Ana" />);
    expect(screen.getByDisplayValue('Maria')).toBeInTheDocument();
    expect(screen.getByText('Troca de óleo')).toBeInTheDocument();
  });

  it('muda o status do orçamento', async () => {
    mudarStatusOrcamentoMock.mockResolvedValue(undefined);
    render(<OrcamentoDetalheClient orcamento={orcamento} itens={itens} catalogo={[]} faixas={faixas} config={config} oficinaNome="Top Stop Centro" consultorNome="Ana" />);

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'enviado' } });

    await waitFor(() => expect(mudarStatusOrcamentoMock).toHaveBeenCalledWith('o1', 'enviado'));
  });

  it('salva edições através de salvarEdicaoOrcamento com o id correto', async () => {
    salvarEdicaoOrcamentoMock.mockResolvedValue(undefined);
    render(<OrcamentoDetalheClient orcamento={orcamento} itens={itens} catalogo={[]} faixas={faixas} config={config} oficinaNome="Top Stop Centro" consultorNome="Ana" />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar orçamento' }));

    await waitFor(() => expect(salvarEdicaoOrcamentoMock).toHaveBeenCalledWith('o1', expect.objectContaining({ clienteNome: 'Maria' })));
  });

  it('mostra um link para baixar o PDF do orçamento', () => {
    render(<OrcamentoDetalheClient orcamento={orcamento} itens={itens} catalogo={[]} faixas={faixas} config={config} oficinaNome="Top Stop Centro" consultorNome="Ana" />);
    expect(screen.getByRole('link', { name: 'Baixar PDF' })).toHaveAttribute('href', '/orcamentos/o1/pdf');
  });
});

describe('excluir orçamento', () => {
  beforeEach(() => {
    removerOrcamentoMock.mockReset();
    pushMock.mockReset();
  });

  it('pede confirmação, remove e volta para o dashboard', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    removerOrcamentoMock.mockResolvedValue(undefined);
    render(<OrcamentoDetalheClient orcamento={orcamento} itens={itens} catalogo={[]} faixas={faixas} config={config} oficinaNome="Top Stop Centro" consultorNome="Ana" />);

    fireEvent.click(screen.getByRole('button', { name: 'Excluir orçamento' }));

    await waitFor(() => expect(removerOrcamentoMock).toHaveBeenCalledWith('o1'));
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
    vi.unstubAllGlobals();
  });

  it('não remove nada se o usuário cancelar a confirmação', () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    render(<OrcamentoDetalheClient orcamento={orcamento} itens={itens} catalogo={[]} faixas={faixas} config={config} oficinaNome="Top Stop Centro" consultorNome="Ana" />);

    fireEvent.click(screen.getByRole('button', { name: 'Excluir orçamento' }));

    expect(removerOrcamentoMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('envio por WhatsApp', () => {
  it('abre o link do WhatsApp com a mensagem formatada', () => {
    const openMock = vi.fn();
    vi.stubGlobal('open', openMock);

    render(
      <OrcamentoDetalheClient orcamento={orcamento} itens={itens} catalogo={[]} faixas={faixas} config={config} oficinaNome="Top Stop Centro" consultorNome="Ana" />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enviar por WhatsApp' }));

    expect(openMock).toHaveBeenCalledTimes(1);
    const [url] = openMock.mock.calls[0];
    expect(url).toContain('https://wa.me/5511987654321');
    expect(decodeURIComponent(url)).toContain('Troca de óleo');

    vi.unstubAllGlobals();
  });

  it('mostra erro quando o telefone do cliente é inválido', () => {
    render(
      <OrcamentoDetalheClient
        orcamento={{ ...orcamento, clienteTelefone: '123' }}
        itens={itens}
        catalogo={[]}
        faixas={faixas}
        config={config}
        oficinaNome="Top Stop Centro"
        consultorNome="Ana"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enviar por WhatsApp' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Telefone inválido');
  });
});
