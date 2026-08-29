import { describe, it, expect } from 'vitest';
import { normalizarTelefone, telefoneValido, formatarTelefoneInput } from './telefone';

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

describe('formatarTelefoneInput', () => {
  it('descarta qualquer caractere que não seja dígito', () => {
    expect(formatarTelefoneInput('abc11def98765ghi4321')).toBe('(11) 98765-4321');
  });

  it('aplica a máscara de celular (9 dígitos) progressivamente enquanto digita', () => {
    expect(formatarTelefoneInput('1')).toBe('(1');
    expect(formatarTelefoneInput('11')).toBe('(11');
    expect(formatarTelefoneInput('119')).toBe('(11) 9');
    expect(formatarTelefoneInput('11987')).toBe('(11) 987');
    expect(formatarTelefoneInput('1198765')).toBe('(11) 98765');
    expect(formatarTelefoneInput('11987654321')).toBe('(11) 98765-4321');
  });

  it('aplica a máscara de fixo (8 dígitos) quando o número não começa com 9', () => {
    expect(formatarTelefoneInput('1137654321')).toBe('(11) 3765-4321');
  });

  it('ignora dígitos além do 11º', () => {
    expect(formatarTelefoneInput('119876543219999')).toBe('(11) 98765-4321');
  });

  it('retorna vazio para entrada vazia', () => {
    expect(formatarTelefoneInput('')).toBe('');
  });
});
