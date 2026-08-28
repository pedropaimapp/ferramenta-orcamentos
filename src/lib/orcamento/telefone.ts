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
