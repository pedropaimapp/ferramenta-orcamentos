import { describe, it, expect, vi } from 'vitest';
import { listarFaixas, criarFaixa, atualizarFaixa, removerFaixa, obterConfiguracao, atualizarConfiguracao } from './data';

function fakeSupabase(response: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(response);
  return {
    from: vi.fn(() => ({
      select: () => ({ order: vi.fn().mockResolvedValue(response), eq: () => ({ single }) }),
      insert: () => ({ select: () => ({ single }) }),
      update: () => ({ eq: () => ({ select: () => ({ single }) }) }),
      delete: () => ({ eq: vi.fn().mockResolvedValue(response) }),
    })),
  } as any;
}

describe('listarFaixas', () => {
  it('mapeia as linhas para o tipo de domínio', async () => {
    const supabase = fakeSupabase({ data: [{ id: '1', valor_min_centavos: 0, valor_max_centavos: 100000, parcelas_sem_juros: 1 }], error: null });
    const faixas = await listarFaixas(supabase);
    expect(faixas).toEqual([{ id: '1', valorMinCentavos: 0, valorMaxCentavos: 100000, parcelasSemJuros: 1 }]);
  });
});

describe('criarFaixa', () => {
  it('insere e retorna a faixa criada', async () => {
    const supabase = fakeSupabase({ data: { id: '2', valor_min_centavos: 400000, valor_max_centavos: null, parcelas_sem_juros: 4 }, error: null });
    const criada = await criarFaixa(supabase, { valorMinCentavos: 400000, valorMaxCentavos: null, parcelasSemJuros: 4 });
    expect(criada.valorMaxCentavos).toBeNull();
  });
});

describe('atualizarFaixa', () => {
  it('atualiza e retorna a faixa', async () => {
    const supabase = fakeSupabase({ data: { id: '1', valor_min_centavos: 0, valor_max_centavos: 120000, parcelas_sem_juros: 1 }, error: null });
    const atualizada = await atualizarFaixa(supabase, '1', { valorMinCentavos: 0, valorMaxCentavos: 120000, parcelasSemJuros: 1 });
    expect(atualizada.valorMaxCentavos).toBe(120000);
  });
});

describe('removerFaixa', () => {
  it('lança erro quando a remoção falha', async () => {
    const supabase = fakeSupabase({ data: null, error: { message: 'em uso' } });
    await expect(removerFaixa(supabase, '1')).rejects.toThrow('em uso');
  });
});

describe('obterConfiguracao', () => {
  it('mapeia a linha singleton para o tipo de domínio', async () => {
    const supabase = fakeSupabase({
      data: { percentual_entrada_minima: 0.3, percentual_desconto_avista: 0.05, cartao_porto_max_parcelas: 6, cartao_porto_parcela_minima_centavos: 10000 },
      error: null,
    });
    const config = await obterConfiguracao(supabase);
    expect(config).toEqual({ percentualEntradaMinima: 0.3, percentualDescontoAVista: 0.05, cartaoPortoMaxParcelas: 6, cartaoPortoParcelaMinimaCentavos: 10000 });
  });
});

describe('atualizarConfiguracao', () => {
  it('atualiza e retorna a configuração', async () => {
    const supabase = fakeSupabase({
      data: { percentual_entrada_minima: 0.2, percentual_desconto_avista: 0.05, cartao_porto_max_parcelas: 6, cartao_porto_parcela_minima_centavos: 10000 },
      error: null,
    });
    const atualizada = await atualizarConfiguracao(supabase, {
      percentualEntradaMinima: 0.2,
      percentualDescontoAVista: 0.05,
      cartaoPortoMaxParcelas: 6,
      cartaoPortoParcelaMinimaCentavos: 10000,
    });
    expect(atualizada.percentualEntradaMinima).toBe(0.2);
  });

  it('envia updated_at no payload de atualização', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { percentual_entrada_minima: 0.2, percentual_desconto_avista: 0.05, cartao_porto_max_parcelas: 6, cartao_porto_parcela_minima_centavos: 10000 },
      error: null,
    });
    const updatePayloads: Record<string, unknown>[] = [];
    const supabase = {
      from: vi.fn(() => ({
        update: (payload: Record<string, unknown>) => {
          updatePayloads.push(payload);
          return { eq: () => ({ select: () => ({ single }) }) };
        },
      })),
    } as any;

    await atualizarConfiguracao(supabase, {
      percentualEntradaMinima: 0.2,
      percentualDescontoAVista: 0.05,
      cartaoPortoMaxParcelas: 6,
      cartaoPortoParcelaMinimaCentavos: 10000,
    });

    expect(updatePayloads[0]).toHaveProperty('updated_at');
    expect(typeof updatePayloads[0].updated_at).toBe('string');
  });
});
