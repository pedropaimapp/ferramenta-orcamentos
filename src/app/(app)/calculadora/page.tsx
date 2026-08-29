import { createServerClient } from '@/lib/supabase/server';
import { listarFaixas, obterConfiguracao } from '@/lib/pagamento/data';
import { CalculadoraPagamento } from '@/components/calculadora/CalculadoraPagamento';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function CalculadoraPage() {
  const supabase = await createServerClient();
  const [faixas, config] = await Promise.all([listarFaixas(supabase), obterConfiguracao(supabase)]);
  return (
    <div>
      <PageHeader title="Calculadora de condição de pagamento" />
      <CalculadoraPagamento faixas={faixas} config={config} />
    </div>
  );
}
