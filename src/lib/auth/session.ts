import { createServerClient } from '../supabase/server';
import { mapConsultor, SELECT_CONSULTOR_COM_OFICINAS } from '../consultores/data';
import type { Consultor } from '../types';

export async function getConsultorLogado(): Promise<Consultor | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('consultores')
    .select(SELECT_CONSULTOR_COM_OFICINAS)
    .eq('auth_user_id', user.id)
    .single();
  if (error || !data) return null;

  return mapConsultor(data);
}
