import { createServerClient } from '@/lib/supabase/server';
import { exigirConsultor } from '@/lib/auth/guards';
import { listarCatalogo } from '@/lib/catalogo/data';
import { listarFaixas, obterConfiguracao } from '@/lib/pagamento/data';
import { listarOficinas } from '@/lib/oficinas/data';
import { NovoOrcamentoClient } from './NovoOrcamentoClient';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function NovoOrcamentoPage() {
  const consultor = await exigirConsultor();
  const supabase = await createServerClient();
  const [catalogo, faixas, config, todasOficinas] = await Promise.all([
    listarCatalogo(supabase),
    listarFaixas(supabase),
    obterConfiguracao(supabase),
    listarOficinas(supabase),
  ]);
  const oficinas = consultor.papel === 'admin' ? todasOficinas : todasOficinas.filter((o) => consultor.oficinaIds.includes(o.id));

  return (
    <div>
      <PageHeader title="Novo orçamento" />
      <NovoOrcamentoClient papel={consultor.papel} oficinas={oficinas} catalogo={catalogo} faixas={faixas} config={config} />
    </div>
  );
}
