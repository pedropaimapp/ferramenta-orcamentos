'use server';

import { createAdminClient } from '../supabase/admin';
import { exigirAdmin } from '../auth/guards';
import type { Consultor } from '../types';

export interface CriarConsultorInput {
  nome: string;
  login: string;
  senha: string;
  papel: 'consultor' | 'admin';
  oficinaIds: string[];
}

async function vincularOficinas(
  admin: ReturnType<typeof createAdminClient>,
  consultorId: string,
  oficinaIds: string[]
): Promise<void> {
  if (oficinaIds.length === 0) return;
  const { error } = await admin
    .from('consultor_oficinas')
    .insert(oficinaIds.map((oficinaId) => ({ consultor_id: consultorId, oficina_id: oficinaId })));
  if (error) throw new Error(`Erro ao vincular oficinas: ${error.message}`);
}

export async function criarConsultor(input: CriarConsultorInput): Promise<Consultor> {
  await exigirAdmin();
  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.login,
    password: input.senha,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    throw new Error(`Erro ao criar usuário: ${authError?.message ?? 'desconhecido'}`);
  }

  const { data, error: dbError } = await admin
    .from('consultores')
    .insert({
      auth_user_id: authData.user.id,
      nome: input.nome,
      login: input.login,
      papel: input.papel,
      ativo: true,
    })
    .select()
    .single();

  if (dbError || !data) {
    await admin.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Erro ao salvar consultor: ${dbError?.message ?? 'desconhecido'}`);
  }

  try {
    await vincularOficinas(admin, data.id, input.oficinaIds);
  } catch (err) {
    await admin.auth.admin.deleteUser(authData.user.id); // cascata: remove consultores + consultor_oficinas
    throw err;
  }

  return {
    id: data.id,
    authUserId: data.auth_user_id,
    nome: data.nome,
    login: data.login,
    papel: data.papel,
    oficinaIds: input.oficinaIds,
    ativo: data.ativo,
  };
}

export async function atualizarConsultor(
  id: string,
  input: { nome: string; papel: 'consultor' | 'admin'; oficinaIds: string[] }
): Promise<void> {
  await exigirAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('consultores').update({ nome: input.nome, papel: input.papel }).eq('id', id);
  if (error) throw new Error(`Erro ao atualizar consultor: ${error.message}`);

  const { error: delError } = await admin.from('consultor_oficinas').delete().eq('consultor_id', id);
  if (delError) throw new Error(`Erro ao atualizar oficinas do consultor: ${delError.message}`);

  await vincularOficinas(admin, id, input.oficinaIds);
}

export async function desativarConsultor(id: string): Promise<void> {
  await exigirAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('consultores').update({ ativo: false }).eq('id', id);
  if (error) throw new Error(`Erro ao desativar consultor: ${error.message}`);
}
