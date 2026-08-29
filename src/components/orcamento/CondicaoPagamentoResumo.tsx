import React from 'react';
import { formatarReais } from '@/lib/format';
import { encontrarFaixa, calcularEntradaMinima, dividirEmParcelas } from '@/lib/payment/faixas';
import { calcularDescontoAVista, calcularCartaoPorto } from '@/lib/payment/alternativas';
import type { FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';
import { Card, CardTitle } from '@/components/ui/Card';

export function CondicaoPagamentoResumo({
  totalCentavos,
  faixas,
  config,
}: {
  totalCentavos: number;
  faixas: FaixaPagamento[];
  config: ConfiguracaoPagamento;
}) {
  if (totalCentavos <= 0 || faixas.length === 0) {
    return <p className="text-sm text-porto-gray">Adicione itens para calcular a condição de pagamento.</p>;
  }

  const faixa = encontrarFaixa(totalCentavos, faixas);
  const entradaCentavos = calcularEntradaMinima(totalCentavos, config);
  const parcelas = dividirEmParcelas(totalCentavos - entradaCentavos, faixa.parcelasSemJuros);
  const desconto = calcularDescontoAVista(totalCentavos, config);
  const cartaoPorto = calcularCartaoPorto(totalCentavos, config);

  return (
    <Card className="space-y-2 border-porto-blue/20 bg-porto-blue/[0.04]">
      <CardTitle>Condição de pagamento</CardTitle>
      <p className="text-2xl font-bold text-porto-black">{formatarReais(totalCentavos)}</p>
      <div className="space-y-1 text-sm text-porto-black/80">
        <p>Entrada mínima ({Math.round(config.percentualEntradaMinima * 100)}%): {formatarReais(entradaCentavos)}</p>
        <p>
          Saldo em {parcelas.length}x de {formatarReais(parcelas[0])} no crédito sem juros
        </p>
        <p>
          Desconto à vista no Pix/Débito: {formatarReais(desconto.descontoCentavos)} → {formatarReais(desconto.valorComDescontoCentavos)}
        </p>
        <p>
          Alternativa: Cartão Porto em até {cartaoPorto.parcelas}x de {formatarReais(cartaoPorto.valorParcelaCentavos)} sem juros
        </p>
      </div>
    </Card>
  );
}
