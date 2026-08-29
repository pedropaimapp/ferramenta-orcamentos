import { describe, it, expect, vi } from 'vitest';
import {
  criarOrcamento,
  atualizarOrcamento,
  atualizarStatusOrcamento,
  obterOrcamentoComItens,
  listarOrcamentosDoConsultor,
  listarTodosOrcamentos,
} from './data';

const orcamentoRow = {
  id: 'o1',
  cliente_nome: 'Maria',
  cliente_telefone: '5511987654321',
  veiculo_placa: 'ABC1D23',
  veiculo_modelo: 'Onix',
  consultor_id: 'c1',
  oficina_id: 'of1',
  status: 'rascunho',
  validade_dias: 7,
  created_at: '2026-08-28T00:00:00Z',
  updated_at: '2026-08-28T00:00:00Z',
};

const dadosParaSalvar = {
  clienteNome: 'Maria',
  clienteTelefone: '5511987654321',
  veiculoPlaca: 'ABC1D23',
  veiculoModelo: 'Onix',
  itens: [{ catalogoItemId: null, descricao: 'Troca de óleo', tipo: 'servico' as const, quantidade: 1, valorUnitarioCentavos: 10000 }],
};

describe('criarOrcamento', () => {
  it('insere o orçamento e seus itens', async () => {
    const single = vi.fn().mockResolvedValue({ data: orcamentoRow, error: null });
    const insertItens = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: (tabela: string) => (tabela === 'orcamentos' ? { insert: () => ({ select: () => ({ single }) }) } : { insert: insertItens }),
    } as any;

    const orcamento = await criarOrcamento(supabase, 'c1', 'of1', dadosParaSalvar);

    expect(orcamento.id).toBe('o1');
    expect(insertItens).toHaveBeenCalledWith([
      { orcamento_id: 'o1', catalogo_item_id: null, descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valor_unitario_centavos: 10000 },
    ]);
  });

  it('lança erro quando salvar os itens falha', async () => {
    const single = vi.fn().mockResolvedValue({ data: orcamentoRow, error: null });
    const insertItens = vi.fn().mockResolvedValue({ error: { message: 'item inválido' } });
    const supabase = {
      from: (tabela: string) => (tabela === 'orcamentos' ? { insert: () => ({ select: () => ({ single }) }) } : { insert: insertItens }),
    } as any;

    await expect(criarOrcamento(supabase, 'c1', 'of1', dadosParaSalvar)).rejects.toThrow('item inválido');
  });
});

describe('atualizarOrcamento', () => {
  it('atualiza os dados, apaga os itens antigos e insere os novos', async () => {
    const single = vi.fn().mockResolvedValue({ data: orcamentoRow, error: null });
    const eqDelete = vi.fn().mockResolvedValue({ error: null });
    const insertItens = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: (tabela: string) =>
        tabela === 'orcamentos' ? { update: () => ({ eq: () => ({ select: () => ({ single }) }) }) } : { delete: () => ({ eq: eqDelete }), insert: insertItens },
    } as any;

    const orcamento = await atualizarOrcamento(supabase, 'o1', dadosParaSalvar);

    expect(orcamento.id).toBe('o1');
    expect(eqDelete).toHaveBeenCalledWith('orcamento_id', 'o1');
    expect(insertItens).toHaveBeenCalledWith([
      { orcamento_id: 'o1', catalogo_item_id: null, descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valor_unitario_centavos: 10000 },
    ]);
  });
});

describe('atualizarStatusOrcamento', () => {
  it('atualiza o status do orçamento', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const supabase = { from: () => ({ update: () => ({ eq }) }) } as any;
    await atualizarStatusOrcamento(supabase, 'o1', 'enviado');
    expect(eq).toHaveBeenCalledWith('id', 'o1');
  });
});

describe('obterOrcamentoComItens', () => {
  it('retorna o orçamento e seus itens mapeados', async () => {
    const singleOrcamento = vi.fn().mockResolvedValue({ data: orcamentoRow, error: null });
    const itemRow = { id: 'i1', orcamento_id: 'o1', catalogo_item_id: null, descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valor_unitario_centavos: 10000 };
    const eqItens = vi.fn().mockResolvedValue({ data: [itemRow], error: null });
    const supabase = {
      from: (tabela: string) =>
        tabela === 'orcamentos' ? { select: () => ({ eq: () => ({ single: singleOrcamento }) }) } : { select: () => ({ eq: eqItens }) },
    } as any;

    const resultado = await obterOrcamentoComItens(supabase, 'o1');
    expect(resultado.orcamento.id).toBe('o1');
    expect(resultado.itens).toEqual([
      { id: 'i1', orcamentoId: 'o1', catalogoItemId: null, descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valorUnitarioCentavos: 10000 },
    ]);
  });
});

describe('listarOrcamentosDoConsultor', () => {
  it('filtra pelo consultor e ordena por data', async () => {
    const order = vi.fn().mockResolvedValue({ data: [orcamentoRow], error: null });
    const eq = vi.fn(() => ({ order }));
    const supabase = { from: () => ({ select: () => ({ eq }) }) } as any;

    const orcamentos = await listarOrcamentosDoConsultor(supabase, 'c1');
    expect(eq).toHaveBeenCalledWith('consultor_id', 'c1');
    expect(orcamentos).toHaveLength(1);
  });
});

describe('listarTodosOrcamentos', () => {
  it('lista todos ordenados por data', async () => {
    const order = vi.fn().mockResolvedValue({ data: [orcamentoRow], error: null });
    const supabase = { from: () => ({ select: () => ({ order }) }) } as any;

    const orcamentos = await listarTodosOrcamentos(supabase);
    expect(orcamentos).toHaveLength(1);
  });
});
