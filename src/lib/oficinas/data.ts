import type { SupabaseClient } from '@supabase/supabase-js';
import type { Oficina } from '../types';

interface OficinaRow {
  id: string;
  nome: string;
  endereco: string;
  telefone: string;
  logo_url: string | null;
}

function mapOficina(row: OficinaRow): Oficina {
  return { id: row.id, nome: row.nome, endereco: row.endereco, telefone: row.telefone, logoUrl: row.logo_url };
}

export async function listarOficinas(supabase: SupabaseClient): Promise<Oficina[]> {
  const { data, error } = await supabase.from('oficinas').select('*').order('nome');
  if (error) throw new Error(`Erro ao listar oficinas: ${error.message}`);
  return (data ?? []).map(mapOficina);
}

export async function criarOficina(
  supabase: SupabaseClient,
  input: { nome: string; endereco: string; telefone: string }
): Promise<Oficina> {
  const { data, error } = await supabase
    .from('oficinas')
    .insert({ nome: input.nome, endereco: input.endereco, telefone: input.telefone })
    .select()
    .single();
  if (error) throw new Error(`Erro ao criar oficina: ${error.message}`);
  return mapOficina(data);
}

export async function atualizarOficina(
  supabase: SupabaseClient,
  id: string,
  input: { nome: string; endereco: string; telefone: string; logoUrl?: string | null }
): Promise<Oficina> {
  const payload: Record<string, unknown> = { nome: input.nome, endereco: input.endereco, telefone: input.telefone };
  if (input.logoUrl !== undefined) payload.logo_url = input.logoUrl;

  const { data, error } = await supabase.from('oficinas').update(payload).eq('id', id).select().single();
  if (error) throw new Error(`Erro ao atualizar oficina: ${error.message}`);
  return mapOficina(data);
}

export async function enviarLogoOficina(supabase: SupabaseClient, oficinaId: string, arquivo: File): Promise<string> {
  const caminho = `${oficinaId}/${Date.now()}-${arquivo.name}`;
  const { error: uploadError } = await supabase.storage.from('logos').upload(caminho, arquivo, { upsert: true });
  if (uploadError) throw new Error(`Erro ao enviar logo: ${uploadError.message}`);
  const { data } = supabase.storage.from('logos').getPublicUrl(caminho);
  return data.publicUrl;
}
