import React from 'react';
import { formatarReais } from '@/lib/format';
import { encontrarFaixa, calcularEntradaMinima, dividirEmParcelas } from '@/lib/payment/faixas';
import { calcularDescontoAVista, calcularCartaoPorto } from '@/lib/payment/alternativas';
import type { FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';

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
    return <p className="text-sm text-gray-500">Adicione itens para calcular a condição de pagamento.</p>;
  }

  const faixa = encontrarFaixa(totalCentavos, faixas);
  const entradaCentavos = calcularEntradaMinima(totalCentavos, config);
  const parcelas = dividirEmParcelas(totalCentavos - entradaCentavos, faixa.parcelasSemJuros);
  const desconto = calcularDescontoAVista(totalCentavos, config);
  const cartaoPorto = calcularCartaoPorto(totalCentavos, config);

  return (
    <div className="space-y-1 rounded border p-4 text-sm">
      <p>
        Total: <strong>{formatarReais(totalCentavos)}</strong>
      </p>
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
  );
}
