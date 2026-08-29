import { describe, it, expect } from 'vitest';
import { formatarPlacaInput, placaValida } from './placa';

describe('formatarPlacaInput', () => {
  it('deixa maiúsculo e descarta caracteres que não sejam letra ou dígito', () => {
    expect(formatarPlacaInput('abc-1d23')).toBe('ABC1D23');
  });

  it('limita a 7 caracteres', () => {
    expect(formatarPlacaInput('abc1d23456')).toBe('ABC1D23');
  });
});

describe('placaValida', () => {
  it('aceita o formato antigo (3 letras + 4 dígitos)', () => {
    expect(placaValida('ABC1234')).toBe(true);
  });

  it('aceita o formato Mercosul (3 letras + dígito + letra + 2 dígitos)', () => {
    expect(placaValida('ABC1D23')).toBe(true);
  });

  it('rejeita placas incompletas ou em formato inválido', () => {
    expect(placaValida('ABC123')).toBe(false);
    expect(placaValida('AB1234')).toBe(false);
    expect(placaValida('1234ABC')).toBe(false);
    expect(placaValida('')).toBe(false);
  });
});
