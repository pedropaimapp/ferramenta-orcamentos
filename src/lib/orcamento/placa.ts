// Formata enquanto o usuário digita: maiúsculo, só letras e dígitos, no máximo 7 caracteres.
export function formatarPlacaInput(valor: string): string {
  return valor
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7);
}

// Aceita o formato antigo (LLL9999) e o formato Mercosul (LLL9L99).
export function placaValida(valor: string): boolean {
  return /^[A-Z]{3}[0-9]([A-Z][0-9]{2}|[0-9]{3})$/.test(valor);
}
