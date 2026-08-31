import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { exigirConsultor } from '@/lib/auth/guards';
import { listarOrcamentosDoConsultor, listarTodosOrcamentos } from '@/lib/orcamento/data';
import { listarOficinas } from '@/lib/oficinas/data';
import { listarConsultores } from '@/lib/consultores/data';
import { OrcamentosList } from './OrcamentosList';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';

export default async function DashboardPage() {
  const consultor = await exigirConsultor();
  const supabase = await createServerClient();

  // Admin vê todos os orçamentos de todas as oficinas aqui mesmo (com filtro
  // por oficina/consultor); um consultor comum continua vendo só os seus.
  if (consultor.papel === 'admin') {
    const [orcamentos, oficinas, consultores] = await Promise.all([
      listarTodosOrcamentos(supabase),
      listarOficinas(supabase),
      listarConsultores(supabase),
    ]);
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
        <OrcamentosList orcamentosIniciais={orcamentos} oficinas={oficinas} consultores={consultores} />
      </div>
    );
  }

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
