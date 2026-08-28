import { describe, it, expect } from 'vitest';
import { formatarReais } from './format';

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
