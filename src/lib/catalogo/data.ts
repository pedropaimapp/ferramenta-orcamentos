import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogoItem } from '../types';

interface CatalogoItemRow {
  id: string;
  descricao: string;
  tipo: 'peca' | 'servico';
  marca_codigo: string | null;
  valor_padrao_centavos: number;
}

function mapCatalogoItem(row: CatalogoItemRow): CatalogoItem {
  return { id: row.id, descricao: row.descricao, tipo: row.tipo, marcaCodigo: row.marca_codigo, valorPadraoCentavos: row.valor_padrao_centavos };
}

export async function listarCatalogo(supabase: SupabaseClient): Promise<CatalogoItem[]> {
  const { data, error } = await supabase.from('catalogo_itens').select('*').order('descricao');
  if (error) throw new Error(`Erro ao listar catálogo: ${error.message}`);
  return (data ?? []).map(mapCatalogoItem);
}

export async function criarItemCatalogo(
  supabase: SupabaseClient,
  input: { descricao: string; tipo: 'peca' | 'servico'; marcaCodigo: string | null; valorPadraoCentavos: number }
): Promise<CatalogoItem> {
  const { data, error } = await supabase
    .from('catalogo_itens')
    .insert({ descricao: input.descricao, tipo: input.tipo, marca_codigo: input.marcaCodigo, valor_padrao_centavos: input.valorPadraoCentavos })
    .select()
    .single();
  if (error) throw new Error(`Erro ao criar item: ${error.message}`);
  return mapCatalogoItem(data);
}

export async function atualizarItemCatalogo(
  supabase: SupabaseClient,
  id: string,
  input: { descricao: string; tipo: 'peca' | 'servico'; marcaCodigo: string | null; valorPadraoCentavos: number }
): Promise<CatalogoItem> {
  const { data, error } = await supabase
    .from('catalogo_itens')
    .update({ descricao: input.descricao, tipo: input.tipo, marca_codigo: input.marcaCodigo, valor_padrao_centavos: input.valorPadraoCentavos })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Erro ao atualizar item: ${error.message}`);
  return mapCatalogoItem(data);
}

export async function removerItemCatalogo(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('catalogo_itens').delete().eq('id', id);
  if (error) throw new Error(`Erro ao remover item: ${error.message}`);
}
