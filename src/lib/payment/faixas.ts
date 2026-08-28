import type { ConfiguracaoPagamento, FaixaPagamento } from '../types';

export function encontrarFaixa(totalCentavos: number, faixas: FaixaPagamento[]): FaixaPagamento {
  const ordenadas = [...faixas].sort((a, b) => a.valorMinCentavos - b.valorMinCentavos);
  const encontrada = ordenadas.find(
    (f) => totalCentavos >= f.valorMinCentavos && (f.valorMaxCentavos === null || totalCentavos < f.valorMaxCentavos)
  );
  if (!encontrada) {
    throw new Error(`Nenhuma faixa de pagamento cobre o valor de ${totalCentavos} centavos`);
  }
  return encontrada;
}

export function calcularEntradaMinima(totalCentavos: number, config: ConfiguracaoPagamento): number {
  return Math.round(totalCentavos * config.percentualEntradaMinima);
}

export function dividirEmParcelas(valorCentavos: number, n: number): number[] {
  const base = Math.floor(valorCentavos / n);
  const resto = valorCentavos - base * n;
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? base + resto : base));
}
