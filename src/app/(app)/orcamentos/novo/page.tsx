import { createServerClient } from '@/lib/supabase/server';
import { exigirConsultor } from '@/lib/auth/guards';
import { listarCatalogo } from '@/lib/catalogo/data';
import { listarFaixas, obterConfiguracao } from '@/lib/pagamento/data';
import { listarOficinas } from '@/lib/oficinas/data';
import { NovoOrcamentoClient } from './NovoOrcamentoClient';

export default async function NovoOrcamentoPage() {
  const consultor = await exigirConsultor();
  const supabase = await createServerClient();
  const [catalogo, faixas, config, oficinas] = await Promise.all([
    listarCatalogo(supabase),
    listarFaixas(supabase),
    obterConfiguracao(supabase),
    consultor.papel === 'admin' ? listarOficinas(supabase) : Promise.resolve([]),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Novo orçamento</h1>
      <NovoOrcamentoClient papel={consultor.papel} oficinas={oficinas} catalogo={catalogo} faixas={faixas} config={config} />
    </div>
  );
}
