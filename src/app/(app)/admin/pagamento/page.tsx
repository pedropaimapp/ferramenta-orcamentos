import { createServerClient } from '@/lib/supabase/server';
import { listarFaixas, obterConfiguracao } from '@/lib/pagamento/data';
import { PagamentoManager } from '@/components/admin/PagamentoManager';

export default async function PagamentoPage() {
  const supabase = await createServerClient();
  const [faixas, configuracao] = await Promise.all([listarFaixas(supabase), obterConfiguracao(supabase)]);
  return <PagamentoManager faixasIniciais={faixas} configuracaoInicial={configuracao} />;
}
