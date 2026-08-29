import { createServerClient } from '@/lib/supabase/server';
import { exigirConsultor } from '@/lib/auth/guards';
import { listarOrcamentosDoConsultor } from '@/lib/orcamento/data';
import { OrcamentosList } from './OrcamentosList';

export default async function DashboardPage() {
  const consultor = await exigirConsultor();
  const supabase = await createServerClient();
  const orcamentos = await listarOrcamentosDoConsultor(supabase, consultor.id);
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Meus orçamentos</h1>
      <OrcamentosList orcamentosIniciais={orcamentos} />
    </div>
  );
}
