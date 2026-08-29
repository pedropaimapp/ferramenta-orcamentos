import { createServerClient } from '@/lib/supabase/server';
import { listarCatalogo } from '@/lib/catalogo/data';
import { listarFaixas, obterConfiguracao } from '@/lib/pagamento/data';
import { obterOrcamentoComItens } from '@/lib/orcamento/data';
import { OrcamentoDetalheClient } from './OrcamentoDetalheClient';

export default async function OrcamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const [catalogo, faixas, config, { orcamento, itens }] = await Promise.all([
    listarCatalogo(supabase),
    listarFaixas(supabase),
    obterConfiguracao(supabase),
    obterOrcamentoComItens(supabase, id),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Orçamento de {orcamento.clienteNome}</h1>
      <OrcamentoDetalheClient orcamento={orcamento} itens={itens} catalogo={catalogo} faixas={faixas} config={config} />
    </div>
  );
}
