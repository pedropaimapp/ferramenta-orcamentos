import type { SupabaseClient } from '@supabase/supabase-js';
import type { Consultor } from '../types';

interface ConsultorRow {
  id: string;
  auth_user_id: string;
  nome: string;
  login: string;
  papel: 'consultor' | 'admin';
  oficina_id: string | null;
  ativo: boolean;
}

function mapConsultor(row: ConsultorRow): Consultor {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    nome: row.nome,
    login: row.login,
    papel: row.papel,
    oficinaId: row.oficina_id,
    ativo: row.ativo,
  };
}

export async function listarConsultores(supabase: SupabaseClient): Promise<Consultor[]> {
  const { data, error } = await supabase.from('consultores').select('*').order('nome');
  if (error) throw new Error(`Erro ao listar consultores: ${error.message}`);
  return (data ?? []).map(mapConsultor);
}
