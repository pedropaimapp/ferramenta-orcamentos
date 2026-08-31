import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

// O OrcamentoForm renderizado aqui dentro chama essa action ao adicionar um item
// digitado manualmente; mockada para não carregar a cadeia real (guards/cookies).
vi.mock('@/lib/catalogo/actions', () => ({
  garantirItemNoCatalogo: vi.fn(),
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
    expect(within(screen.getByTestId('itens-tabela')).getByText('Troca de óleo')).toBeInTheDocument();
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

  it('mostra a data de criação do orçamento', () => {
    render(<OrcamentoDetalheClient orcamento={orcamento} itens={itens} catalogo={[]} faixas={faixas} config={config} oficinaNome="Top Stop Centro" consultorNome="Ana" />);
    expect(screen.getByText(`Criado em ${new Date(orcamento.createdAt).toLocaleDateString('pt-BR')}`)).toBeInTheDocument();
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
  beforeEach(() => {
    mudarStatusOrcamentoMock.mockReset().mockResolvedValue(undefined);
  });

  it('abre o link do WhatsApp com a mensagem formatada', async () => {
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

    await waitFor(() => expect(mudarStatusOrcamentoMock).toHaveBeenCalledWith('o1', 'enviado'));
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

  it('muda o status para Enviado automaticamente ao enviar por WhatsApp um orçamento em Rascunho', async () => {
    vi.stubGlobal('open', vi.fn());
    render(
      <OrcamentoDetalheClient orcamento={orcamento} itens={itens} catalogo={[]} faixas={faixas} config={config} oficinaNome="Top Stop Centro" consultorNome="Ana" />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enviar por WhatsApp' }));

    await waitFor(() => expect(screen.getByLabelText('Status')).toHaveValue('enviado'));
    vi.unstubAllGlobals();
  });

  it('não muda o status ao reenviar por WhatsApp um orçamento já Aprovado', async () => {
    vi.stubGlobal('open', vi.fn());
    render(
      <OrcamentoDetalheClient
        orcamento={{ ...orcamento, status: 'aprovado' }}
        itens={itens}
        catalogo={[]}
        faixas={faixas}
        config={config}
        oficinaNome="Top Stop Centro"
        consultorNome="Ana"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enviar por WhatsApp' }));

    await waitFor(() => expect(vi.mocked(window.open)).toHaveBeenCalled());
    expect(mudarStatusOrcamentoMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Status')).toHaveValue('aprovado');
    vi.unstubAllGlobals();
  });
});

describe('botões de atalho Aprovado/Recusado', () => {
  beforeEach(() => {
    mudarStatusOrcamentoMock.mockReset().mockResolvedValue(undefined);
  });

  it('não aparecem quando o orçamento está em Rascunho', () => {
    render(<OrcamentoDetalheClient orcamento={orcamento} itens={itens} catalogo={[]} faixas={faixas} config={config} oficinaNome="Top Stop Centro" consultorNome="Ana" />);
    expect(screen.queryByRole('button', { name: 'Aprovado' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recusado' })).not.toBeInTheDocument();
  });

  it('aparecem e mudam o status quando o orçamento está Enviado', async () => {
    render(
      <OrcamentoDetalheClient
        orcamento={{ ...orcamento, status: 'enviado' }}
        itens={itens}
        catalogo={[]}
        faixas={faixas}
        config={config}
        oficinaNome="Top Stop Centro"
        consultorNome="Ana"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Aprovado' }));

    await waitFor(() => expect(mudarStatusOrcamentoMock).toHaveBeenCalledWith('o1', 'aprovado'));
    expect(screen.getByLabelText('Status')).toHaveValue('aprovado');
  });
});
