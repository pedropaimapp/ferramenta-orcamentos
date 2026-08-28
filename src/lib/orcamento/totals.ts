export function calcularTotalItens(itens: { quantidade: number; valorUnitarioCentavos: number }[]): number {
  return itens.reduce((soma, item) => soma + item.quantidade * item.valorUnitarioCentavos, 0);
}
