export function normalizarTelefone(telefone: string): string {
  const digitos = telefone.replace(/\D/g, '');

  if (digitos.length === 10 || digitos.length === 11) {
    return `55${digitos}`;
  }
  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    return digitos;
  }
  throw new Error(`Telefone inválido: ${telefone}`);
}

export function telefoneValido(telefone: string): boolean {
  try {
    normalizarTelefone(telefone);
    return true;
  } catch {
    return false;
  }
}

// Formata progressivamente enquanto o usuário digita, no padrão brasileiro:
// (DD) 9XXXX-XXXX para celular (9 dígitos após o DDD) ou (DD) XXXX-XXXX para
// fixo (8 dígitos) — decide qual dos dois assim que o primeiro dígito após o
// DDD é digitado (celular sempre começa com 9).
export function formatarTelefoneInput(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (digitos.length === 0) return '';
  if (digitos.length <= 2) return `(${digitos}`;

  const ddd = digitos.slice(0, 2);
  const restante = digitos.slice(2);
  const celular = restante.startsWith('9') || digitos.length === 11;
  const separador = celular ? 5 : 4;

  if (restante.length <= separador) return `(${ddd}) ${restante}`;
  return `(${ddd}) ${restante.slice(0, separador)}-${restante.slice(separador)}`;
}
