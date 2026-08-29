import { createServerClient } from '@/lib/supabase/server';
import { listarCatalogo } from '@/lib/catalogo/data';
import { listarFaixas, obterConfiguracao } from '@/lib/pagamento/data';
import { obterOrcamentoComItens } from '@/lib/orcamento/data';
import { listarOficinas } from '@/lib/oficinas/data';
import { listarConsultores } from '@/lib/consultores/data';
import { OrcamentoDetalheClient } from './OrcamentoDetalheClient';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function OrcamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const [catalogo, faixas, config, { orcamento, itens }, oficinas, consultores] = await Promise.all([
    listarCatalogo(supabase),
    listarFaixas(supabase),
    obterConfiguracao(supabase),
    obterOrcamentoComItens(supabase, id),
    listarOficinas(supabase),
    listarConsultores(supabase),
  ]);

  const oficinaNome = oficinas.find((o) => o.id === orcamento.oficinaId)?.nome ?? '—';
  const consultorNome = consultores.find((c) => c.id === orcamento.consultorId)?.nome ?? '—';

  return (
    <div>
      <PageHeader title={`Orçamento de ${orcamento.clienteNome}`} />
      <OrcamentoDetalheClient
        orcamento={orcamento}
        itens={itens}
        catalogo={catalogo}
        faixas={faixas}
        config={config}
        oficinaNome={oficinaNome}
        consultorNome={consultorNome}
      />
    </div>
  );
}
