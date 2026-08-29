import type { SupabaseClient } from '@supabase/supabase-js';
import type { Consultor } from '../types';

interface ConsultorRow {
  id: string;
  auth_user_id: string;
  nome: string;
  login: string;
  papel: 'consultor' | 'admin';
  ativo: boolean;
  consultor_oficinas?: { oficina_id: string }[] | null;
}

export const SELECT_CONSULTOR_COM_OFICINAS = '*, consultor_oficinas(oficina_id)';

export function mapConsultor(row: ConsultorRow): Consultor {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    nome: row.nome,
    login: row.login,
    papel: row.papel,
    oficinaIds: (row.consultor_oficinas ?? []).map((co) => co.oficina_id),
    ativo: row.ativo,
  };
}

export async function listarConsultores(supabase: SupabaseClient): Promise<Consultor[]> {
  const { data, error } = await supabase.from('consultores').select(SELECT_CONSULTOR_COM_OFICINAS).order('nome');
  if (error) throw new Error(`Erro ao listar consultores: ${error.message}`);
  return (data ?? []).map(mapConsultor);
}
