import type { SupabaseClient } from '@supabase/supabase-js';
import type { FaixaPagamento, ConfiguracaoPagamento } from '../types';

interface FaixaRow {
  id: string;
  valor_min_centavos: number;
  valor_max_centavos: number | null;
  parcelas_sem_juros: number;
}

function mapFaixa(row: FaixaRow): FaixaPagamento {
  return { id: row.id, valorMinCentavos: row.valor_min_centavos, valorMaxCentavos: row.valor_max_centavos, parcelasSemJuros: row.parcelas_sem_juros };
}

export async function listarFaixas(supabase: SupabaseClient): Promise<FaixaPagamento[]> {
  const { data, error } = await supabase.from('faixas_pagamento').select('*').order('valor_min_centavos');
  if (error) throw new Error(`Erro ao listar faixas: ${error.message}`);
  return (data ?? []).map(mapFaixa);
}

export async function criarFaixa(
  supabase: SupabaseClient,
  input: { valorMinCentavos: number; valorMaxCentavos: number | null; parcelasSemJuros: number }
): Promise<FaixaPagamento> {
  const { data, error } = await supabase
    .from('faixas_pagamento')
    .insert({ valor_min_centavos: input.valorMinCentavos, valor_max_centavos: input.valorMaxCentavos, parcelas_sem_juros: input.parcelasSemJuros })
    .select()
    .single();
  if (error) throw new Error(`Erro ao criar faixa: ${error.message}`);
  return mapFaixa(data);
}

export async function atualizarFaixa(
  supabase: SupabaseClient,
  id: string,
  input: { valorMinCentavos: number; valorMaxCentavos: number | null; parcelasSemJuros: number }
): Promise<FaixaPagamento> {
  const { data, error } = await supabase
    .from('faixas_pagamento')
    .update({ valor_min_centavos: input.valorMinCentavos, valor_max_centavos: input.valorMaxCentavos, parcelas_sem_juros: input.parcelasSemJuros })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Erro ao atualizar faixa: ${error.message}`);
  return mapFaixa(data);
}

export async function removerFaixa(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('faixas_pagamento').delete().eq('id', id);
  if (error) throw new Error(`Erro ao remover faixa: ${error.message}`);
}

export async function obterConfiguracao(supabase: SupabaseClient): Promise<ConfiguracaoPagamento> {
  const { data, error } = await supabase.from('configuracao_pagamento').select('*').eq('id', 1).single();
  if (error || !data) throw new Error(`Erro ao carregar configuração: ${error?.message ?? 'não encontrada'}`);
  return {
    percentualEntradaMinima: data.percentual_entrada_minima,
    percentualDescontoAVista: data.percentual_desconto_avista,
    cartaoPortoMaxParcelas: data.cartao_porto_max_parcelas,
    cartaoPortoParcelaMinimaCentavos: data.cartao_porto_parcela_minima_centavos,
  };
}

export async function atualizarConfiguracao(supabase: SupabaseClient, input: ConfiguracaoPagamento): Promise<ConfiguracaoPagamento> {
  const { data, error } = await supabase
    .from('configuracao_pagamento')
    .update({
      percentual_entrada_minima: input.percentualEntradaMinima,
      percentual_desconto_avista: input.percentualDescontoAVista,
      cartao_porto_max_parcelas: input.cartaoPortoMaxParcelas,
      cartao_porto_parcela_minima_centavos: input.cartaoPortoParcelaMinimaCentavos,
    })
    .eq('id', 1)
    .select()
    .single();
  if (error || !data) throw new Error(`Erro ao atualizar configuração: ${error?.message ?? 'desconhecido'}`);
  return {
    percentualEntradaMinima: data.percentual_entrada_minima,
    percentualDescontoAVista: data.percentual_desconto_avista,
    cartaoPortoMaxParcelas: data.cartao_porto_max_parcelas,
    cartaoPortoParcelaMinimaCentavos: data.cartao_porto_parcela_minima_centavos,
  };
}
