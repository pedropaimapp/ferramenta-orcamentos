'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '../supabase/server';
import { exigirConsultor } from '../auth/guards';
import { criarOrcamento, atualizarOrcamento, atualizarStatusOrcamento, obterOrcamentoComItens } from './data';
import type { DadosOrcamentoParaSalvar } from './data';
import type { StatusOrcamento } from '../types';

export async function salvarNovoOrcamento(dados: DadosOrcamentoParaSalvar, oficinaIdParaAdmin?: string): Promise<{ id: string }> {
  const consultor = await exigirConsultor();
  const oficinaId = consultor.papel === 'admin' ? oficinaIdParaAdmin : consultor.oficinaId;
  if (!oficinaId) {
    throw new Error('Selecione uma oficina para o orçamento.');
  }
  const supabase = await createServerClient();
  const orcamento = await criarOrcamento(supabase, consultor.id, oficinaId, dados);
  revalidatePath('/dashboard');
  return { id: orcamento.id };
}

export async function salvarEdicaoOrcamento(id: string, dados: DadosOrcamentoParaSalvar): Promise<void> {
  await exigirConsultor();
  const supabase = await createServerClient();
  await atualizarOrcamento(supabase, id, dados);
  revalidatePath(`/orcamentos/${id}`);
}

export async function mudarStatusOrcamento(id: string, status: StatusOrcamento): Promise<void> {
  await exigirConsultor();
  const supabase = await createServerClient();
  await atualizarStatusOrcamento(supabase, id, status);
  revalidatePath(`/orcamentos/${id}`);
}

export async function duplicarOrcamento(id: string): Promise<{ id: string }> {
  const consultor = await exigirConsultor();
  const supabase = await createServerClient();
  const { orcamento, itens } = await obterOrcamentoComItens(supabase, id);
  const oficinaId = consultor.papel === 'admin' ? orcamento.oficinaId : consultor.oficinaId;
  if (!oficinaId) {
    throw new Error('Selecione uma oficina para o orçamento.');
  }
  const novo = await criarOrcamento(supabase, consultor.id, oficinaId, {
    clienteNome: orcamento.clienteNome,
    clienteTelefone: orcamento.clienteTelefone,
    veiculoPlaca: orcamento.veiculoPlaca,
    veiculoModelo: orcamento.veiculoModelo,
    itens: itens.map((item) => ({
      catalogoItemId: item.catalogoItemId,
      descricao: item.descricao,
      tipo: item.tipo,
      quantidade: item.quantidade,
      valorUnitarioCentavos: item.valorUnitarioCentavos,
    })),
  });
  revalidatePath('/dashboard');
  return { id: novo.id };
}
