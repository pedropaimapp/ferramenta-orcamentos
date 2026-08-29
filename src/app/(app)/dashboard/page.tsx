import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { exigirConsultor } from '@/lib/auth/guards';
import { listarOrcamentosDoConsultor } from '@/lib/orcamento/data';
import { OrcamentosList } from './OrcamentosList';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';

export default async function DashboardPage() {
  const consultor = await exigirConsultor();
  const supabase = await createServerClient();
  const orcamentos = await listarOrcamentosDoConsultor(supabase, consultor.id);
  return (
    <div>
      <PageHeader
        title="Meus orçamentos"
        actions={
          <Link href="/orcamentos/novo" className={buttonClasses('primary')}>
            + Novo orçamento
          </Link>
        }
      />
      <OrcamentosList orcamentosIniciais={orcamentos} />
    </div>
  );
}
