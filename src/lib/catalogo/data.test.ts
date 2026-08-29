import { describe, it, expect, vi } from 'vitest';
import { listarCatalogo, criarItemCatalogo, atualizarItemCatalogo, removerItemCatalogo } from './data';

function fakeSupabase(response: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(response);
  const eqDelete = vi.fn().mockResolvedValue(response);
  return {
    from: vi.fn(() => ({
      select: () => ({ order: vi.fn().mockResolvedValue(response) }),
      insert: () => ({ select: () => ({ single }) }),
      update: () => ({ eq: () => ({ select: () => ({ single }) }) }),
      delete: () => ({ eq: eqDelete }),
    })),
  } as any;
}

describe('listarCatalogo', () => {
  it('mapeia as linhas para o tipo de domínio', async () => {
    const supabase = fakeSupabase({
      data: [{ id: '1', descricao: 'Pastilha de freio', tipo: 'peca', marca_codigo: 'BOSCH-123', valor_padrao_centavos: 15000 }],
      error: null,
    });
    const itens = await listarCatalogo(supabase);
    expect(itens).toEqual([{ id: '1', descricao: 'Pastilha de freio', tipo: 'peca', marcaCodigo: 'BOSCH-123', valorPadraoCentavos: 15000 }]);
  });
});

describe('criarItemCatalogo', () => {
  it('insere e retorna o item criado', async () => {
    const supabase = fakeSupabase({
      data: { id: '2', descricao: 'Troca de óleo', tipo: 'servico', marca_codigo: null, valor_padrao_centavos: 10000 },
      error: null,
    });
    const criado = await criarItemCatalogo(supabase, { descricao: 'Troca de óleo', tipo: 'servico', marcaCodigo: null, valorPadraoCentavos: 10000 });
    expect(criado.id).toBe('2');
  });
});

describe('atualizarItemCatalogo', () => {
  it('atualiza e retorna o item', async () => {
    const supabase = fakeSupabase({
      data: { id: '1', descricao: 'Pastilha de freio dianteira', tipo: 'peca', marca_codigo: 'BOSCH-123', valor_padrao_centavos: 16000 },
      error: null,
    });
    const atualizado = await atualizarItemCatalogo(supabase, '1', { descricao: 'Pastilha de freio dianteira', tipo: 'peca', marcaCodigo: 'BOSCH-123', valorPadraoCentavos: 16000 });
    expect(atualizado.valorPadraoCentavos).toBe(16000);
  });
});

describe('removerItemCatalogo', () => {
  it('remove sem lançar erro quando a resposta não tem erro', async () => {
    const supabase = fakeSupabase({ data: null, error: null });
    await expect(removerItemCatalogo(supabase, '1')).resolves.toBeUndefined();
  });

  it('lança erro quando a remoção falha', async () => {
    const supabase = fakeSupabase({ data: null, error: { message: 'em uso' } });
    await expect(removerItemCatalogo(supabase, '1')).rejects.toThrow('em uso');
  });
});
