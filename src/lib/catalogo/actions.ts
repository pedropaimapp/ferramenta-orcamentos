'use server';

import { createAdminClient } from '../supabase/admin';
import { exigirConsultor } from '../auth/guards';
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

/**
 * Usado quando um item é digitado manualmente (fora do catálogo) ao montar um
 * orçamento: garante que ele fique salvo no catálogo para reaproveitar em
 * orçamentos futuros. Qualquer consultor ativo pode disparar isso — diferente
 * da tela de gestão do catálogo (CatalogoManager), que continua restrita a
 * admin via RLS. Por isso usamos o client de service role aqui, após validar
 * a sessão com exigirConsultor().
 */
export async function garantirItemNoCatalogo(input: {
  descricao: string;
  tipo: 'peca' | 'servico';
  valorPadraoCentavos: number;
}): Promise<CatalogoItem> {
  await exigirConsultor();
  const descricao = input.descricao.trim();
  const admin = createAdminClient();

  const { data: existente, error: erroBusca } = await admin
    .from('catalogo_itens')
    .select('*')
    .ilike('descricao', descricao)
    .maybeSingle();
  if (erroBusca) throw new Error(`Erro ao buscar item no catálogo: ${erroBusca.message}`);
  if (existente) return mapCatalogoItem(existente);

  const { data: criado, error: erroCriar } = await admin
    .from('catalogo_itens')
    .insert({ descricao, tipo: input.tipo, marca_codigo: null, valor_padrao_centavos: input.valorPadraoCentavos })
    .select()
    .single();
  if (erroCriar) throw new Error(`Erro ao salvar item no catálogo: ${erroCriar.message}`);
  return mapCatalogoItem(criado);
}
