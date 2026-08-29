'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '../supabase/server';
import { exigirConsultor } from '../auth/guards';
import { criarOrcamento, atualizarOrcamento, atualizarStatusOrcamento, obterOrcamentoComItens, removerOrcamento as removerOrcamentoDb } from './data';
import type { DadosOrcamentoParaSalvar } from './data';
import type { StatusOrcamento } from '../types';

export async function salvarNovoOrcamento(dados: DadosOrcamentoParaSalvar, oficinaId: string): Promise<{ id: string }> {
  const consultor = await exigirConsultor();
  if (!oficinaId) {
    throw new Error('Selecione uma oficina para o orçamento.');
  }
  if (consultor.papel !== 'admin' && !consultor.oficinaIds.includes(oficinaId)) {
    throw new Error('Você não tem acesso a essa oficina.');
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
  const oficinaId = orcamento.oficinaId;
  if (consultor.papel !== 'admin' && !consultor.oficinaIds.includes(oficinaId)) {
    throw new Error('Você não tem acesso à oficina deste orçamento.');
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

// RLS garante quem pode: consultor só remove os próprios orçamentos, admin remove
// qualquer um (mesma policy que já cobre leitura/edição/status).
export async function removerOrcamento(id: string): Promise<void> {
  await exigirConsultor();
  const supabase = await createServerClient();
  await removerOrcamentoDb(supabase, id);
  revalidatePath('/dashboard');
  revalidatePath('/admin/orcamentos');
}
