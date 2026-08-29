import { createServerClient } from '@/lib/supabase/server';
import { listarTodosOrcamentos } from '@/lib/orcamento/data';
import { listarConsultores } from '@/lib/consultores/data';
import { listarOficinas } from '@/lib/oficinas/data';
import { AdminOrcamentosList } from './AdminOrcamentosList';
import { PageHeader } from '@/components/ui/PageHeader';

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
      <PageHeader title="Todos os orçamentos" />
      <AdminOrcamentosList orcamentosIniciais={orcamentos} consultoresPorId={consultoresPorId} oficinasPorId={oficinasPorId} />
    </div>
  );
}
