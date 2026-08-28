export function formatarReais(centavos: number): string {
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100);
  // Replace non-breaking space (U+00A0) with regular space
  return formatted.replace(/ /g, ' ');
}
