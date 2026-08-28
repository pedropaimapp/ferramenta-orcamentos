import type { ConfiguracaoPagamento } from '../types';

export function calcularDescontoAVista(
  totalCentavos: number,
  config: ConfiguracaoPagamento
): { descontoCentavos: number; valorComDescontoCentavos: number } {
  const descontoCentavos = Math.round(totalCentavos * config.percentualDescontoAVista);
  return { descontoCentavos, valorComDescontoCentavos: totalCentavos - descontoCentavos };
}

export function calcularCartaoPorto(
  totalCentavos: number,
  config: ConfiguracaoPagamento
): { parcelas: number; valorParcelaCentavos: number } {
  for (let n = config.cartaoPortoMaxParcelas; n >= 1; n--) {
    if (Math.floor(totalCentavos / n) >= config.cartaoPortoParcelaMinimaCentavos) {
      return { parcelas: n, valorParcelaCentavos: Math.round(totalCentavos / n) };
    }
  }
  return { parcelas: 1, valorParcelaCentavos: totalCentavos };
}
