import { createServerClient } from '@/lib/supabase/server';
import { listarFaixas, obterConfiguracao } from '@/lib/pagamento/data';
import { CalculadoraPagamento } from '@/components/calculadora/CalculadoraPagamento';

export default async function CalculadoraPage() {
  const supabase = await createServerClient();
  const [faixas, config] = await Promise.all([listarFaixas(supabase), obterConfiguracao(supabase)]);
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Calculadora de condição de pagamento</h1>
      <CalculadoraPagamento faixas={faixas} config={config} />
    </div>
  );
}
