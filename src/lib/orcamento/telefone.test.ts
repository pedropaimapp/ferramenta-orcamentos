import { describe, it, expect } from 'vitest';
import { normalizarTelefone, telefoneValido } from './telefone';

describe('normalizarTelefone', () => {
  it('adiciona o código do país 55 a um celular de 11 dígitos', () => {
    expect(normalizarTelefone('(11) 98765-4321')).toBe('5511987654321');
  });

  it('adiciona o código do país 55 a um fixo de 10 dígitos', () => {
    expect(normalizarTelefone('11 3765-4321')).toBe('551137654321');
  });

  it('mantém um número que já vem com código do país', () => {
    expect(normalizarTelefone('+55 11 98765-4321')).toBe('5511987654321');
  });

  it('lança erro para número muito curto', () => {
    expect(() => normalizarTelefone('12345')).toThrow();
  });
});

describe('telefoneValido', () => {
  it('retorna true para número válido e false para inválido', () => {
    expect(telefoneValido('11987654321')).toBe(true);
    expect(telefoneValido('123')).toBe(false);
  });
});
