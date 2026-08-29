import { describe, it, expect } from 'vitest';
import { formatarReais, parseReaisParaCentavos } from './format';

describe('formatarReais', () => {
  it('formata centavos inteiros como reais com duas casas decimais', () => {
    expect(formatarReais(182500)).toBe('R$ 1.825,00');
  });

  it('formata valores menores que um real', () => {
    expect(formatarReais(50)).toBe('R$ 0,50');
  });

  it('formata zero', () => {
    expect(formatarReais(0)).toBe('R$ 0,00');
  });
});

describe('parseReaisParaCentavos', () => {
  it('converte um valor em formato brasileiro para centavos', () => {
    expect(parseReaisParaCentavos('1.825,00')).toBe(182500);
    expect(parseReaisParaCentavos('50,5')).toBe(5050);
    expect(parseReaisParaCentavos('0')).toBe(0);
  });

  it('lança erro para texto que não é um número', () => {
    expect(() => parseReaisParaCentavos('abc')).toThrow();
  });

  it('lança erro para string em branco', () => {
    expect(() => parseReaisParaCentavos('')).toThrow();
  });

  it('lança erro para string com apenas espaços em branco', () => {
    expect(() => parseReaisParaCentavos('   ')).toThrow();
  });
});
