export function formatarReais(centavos: number): string {
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100);
  // Replace non-breaking space (U+00A0) with regular space
  return formatted.replace(/ /g, ' ');
}

export function parseReaisParaCentavos(valor: string): number {
  const trimado = valor.trim();
  if (trimado === '') {
    throw new Error(`Valor inválido: ${valor}`);
  }
  const normalizado = trimado.replace(/\./g, '').replace(',', '.');
  const numero = Number(normalizado);
  if (Number.isNaN(numero)) {
    throw new Error(`Valor inválido: ${valor}`);
  }
  return Math.round(numero * 100);
}
