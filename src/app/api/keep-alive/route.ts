import { createClient } from '@supabase/supabase-js';

// Chamada uma vez por dia pelo Cron da Vercel (ver vercel.json).
//
// No plano gratuito, a Supabase pausa o projeto depois de ~7 dias sem uso —
// e, pausado, o endereço do banco some e a ferramenta inteira cai com
// MIDDLEWARE_INVOCATION_TIMEOUT. Uma consulta diária ao banco basta para o
// projeto nunca ser considerado inativo.
//
// Usa a chave pública (anon) de propósito: com RLS, a consulta volta vazia,
// mas ainda chega ao Postgres — que é o que conta como atividade — e esta
// rota pública não expõe nem dados nem a chave de serviço.
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await supabase.from('oficinas').select('id').limit(1);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
