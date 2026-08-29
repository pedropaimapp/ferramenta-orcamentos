import { createServerClient } from '@/lib/supabase/server';
import { listarTodosOrcamentos } from '@/lib/orcamento/data';
import { listarConsultores } from '@/lib/consultores/data';
import { listarOficinas } from '@/lib/oficinas/data';
import { AdminOrcamentosList } from './AdminOrcamentosList';

export default async function AdminOrcamentosPage() {
  const supabase = await createServerClient();
  const [orcamentos, consultores, oficinas] = await Promise.all([
    listarTodosOrcamentos(supabase),
    listarConsultores(supabase),
    listarOficinas(supabase),
  ]);

  const consultoresPorId = Object.fromEntries(consultores.map((c) => [c.id, c.nome]));
  const oficinasPorId = Object.fromEntries(oficinas.map((o) => [o.id, o.nome]));

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Todos os orçamentos</h1>
      <AdminOrcamentosList orcamentosIniciais={orcamentos} consultoresPorId={consultoresPorId} oficinasPorId={oficinasPorId} />
    </div>
  );
}
