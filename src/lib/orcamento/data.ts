import type { SupabaseClient } from '@supabase/supabase-js';
import type { Orcamento, OrcamentoItem, StatusOrcamento } from '../types';

interface OrcamentoRow {
  id: string;
  cliente_nome: string;
  cliente_telefone: string;
  veiculo_placa: string;
  veiculo_modelo: string;
  consultor_id: string;
  oficina_id: string;
  status: StatusOrcamento;
  validade_dias: number;
  created_at: string;
  updated_at: string;
}

interface OrcamentoItemRow {
  id: string;
  orcamento_id: string;
  catalogo_item_id: string | null;
  descricao: string;
  tipo: 'peca' | 'servico';
  quantidade: number;
  valor_unitario_centavos: number;
}

function mapOrcamento(row: OrcamentoRow): Orcamento {
  return {
    id: row.id,
    clienteNome: row.cliente_nome,
    clienteTelefone: row.cliente_telefone,
    veiculoPlaca: row.veiculo_placa,
    veiculoModelo: row.veiculo_modelo,
    consultorId: row.consultor_id,
    oficinaId: row.oficina_id,
    status: row.status,
    validadeDias: row.validade_dias,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrcamentoItem(row: OrcamentoItemRow): OrcamentoItem {
  return {
    id: row.id,
    orcamentoId: row.orcamento_id,
    catalogoItemId: row.catalogo_item_id,
    descricao: row.descricao,
    tipo: row.tipo,
    quantidade: row.quantidade,
    valorUnitarioCentavos: row.valor_unitario_centavos,
  };
}

export interface ItemParaSalvar {
  catalogoItemId: string | null;
  descricao: string;
  tipo: 'peca' | 'servico';
  quantidade: number;
  valorUnitarioCentavos: number;
}

export interface DadosOrcamentoParaSalvar {
  clienteNome: string;
  clienteTelefone: string;
  veiculoPlaca: string;
  veiculoModelo: string;
  itens: ItemParaSalvar[];
}

async function inserirItens(supabase: SupabaseClient, orcamentoId: string, itens: ItemParaSalvar[]): Promise<void> {
  if (itens.length === 0) return;
  const { error } = await supabase.from('orcamento_itens').insert(
    itens.map((item) => ({
      orcamento_id: orcamentoId,
      catalogo_item_id: item.catalogoItemId,
      descricao: item.descricao,
      tipo: item.tipo,
      quantidade: item.quantidade,
      valor_unitario_centavos: item.valorUnitarioCentavos,
    }))
  );
  if (error) throw new Error(`Erro ao salvar itens do orçamento: ${error.message}`);
}

export async function criarOrcamento(
  supabase: SupabaseClient,
  consultorId: string,
  oficinaId: string,
  dados: DadosOrcamentoParaSalvar
): Promise<Orcamento> {
  const { data, error } = await supabase
    .from('orcamentos')
    .insert({
      cliente_nome: dados.clienteNome,
      cliente_telefone: dados.clienteTelefone,
      veiculo_placa: dados.veiculoPlaca,
      veiculo_modelo: dados.veiculoModelo,
      consultor_id: consultorId,
      oficina_id: oficinaId,
    })
    .select()
    .single();
  if (error || !data) throw new Error(`Erro ao criar orçamento: ${error?.message ?? 'desconhecido'}`);

  await inserirItens(supabase, data.id, dados.itens);
  return mapOrcamento(data);
}

export async function atualizarOrcamento(supabase: SupabaseClient, id: string, dados: DadosOrcamentoParaSalvar): Promise<Orcamento> {
  const { data, error } = await supabase
    .from('orcamentos')
    .update({
      cliente_nome: dados.clienteNome,
      cliente_telefone: dados.clienteTelefone,
      veiculo_placa: dados.veiculoPlaca,
      veiculo_modelo: dados.veiculoModelo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw new Error(`Erro ao atualizar orçamento: ${error?.message ?? 'desconhecido'}`);

  const { error: deleteError } = await supabase.from('orcamento_itens').delete().eq('orcamento_id', id);
  if (deleteError) throw new Error(`Erro ao atualizar itens do orçamento: ${deleteError.message}`);
  await inserirItens(supabase, id, dados.itens);

  return mapOrcamento(data);
}

export async function atualizarStatusOrcamento(supabase: SupabaseClient, id: string, status: StatusOrcamento): Promise<void> {
  const { error } = await supabase.from('orcamentos').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Erro ao atualizar status: ${error.message}`);
}

export async function obterOrcamentoComItens(supabase: SupabaseClient, id: string): Promise<{ orcamento: Orcamento; itens: OrcamentoItem[] }> {
  const { data: orcamentoRow, error: orcamentoError } = await supabase.from('orcamentos').select('*').eq('id', id).single();
  if (orcamentoError || !orcamentoRow) throw new Error(`Erro ao carregar orçamento: ${orcamentoError?.message ?? 'não encontrado'}`);

  const { data: itensRows, error: itensError } = await supabase.from('orcamento_itens').select('*').eq('orcamento_id', id);
  if (itensError) throw new Error(`Erro ao carregar itens: ${itensError.message}`);

  return { orcamento: mapOrcamento(orcamentoRow), itens: (itensRows ?? []).map(mapOrcamentoItem) };
}

export async function listarOrcamentosDoConsultor(supabase: SupabaseClient, consultorId: string): Promise<Orcamento[]> {
  const { data, error } = await supabase.from('orcamentos').select('*').eq('consultor_id', consultorId).order('created_at', { ascending: false });
  if (error) throw new Error(`Erro ao listar orçamentos: ${error.message}`);
  return (data ?? []).map(mapOrcamento);
}

export async function listarTodosOrcamentos(supabase: SupabaseClient): Promise<Orcamento[]> {
  const { data, error } = await supabase.from('orcamentos').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Erro ao listar orçamentos: ${error.message}`);
  return (data ?? []).map(mapOrcamento);
}

// orcamento_itens é removido em cascata pelo banco (foreign key on delete cascade).
export async function removerOrcamento(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('orcamentos').delete().eq('id', id);
  if (error) throw new Error(`Erro ao remover orçamento: ${error.message}`);
}
