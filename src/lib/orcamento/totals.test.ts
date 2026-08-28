import { describe, it, expect } from 'vitest';
import { calcularTotalItens } from './totals';

describe('calcularTotalItens', () => {
  it('soma quantidade vezes valor unitário de cada item', () => {
    const total = calcularTotalItens([
      { quantidade: 2, valorUnitarioCentavos: 5000 },
      { quantidade: 1, valorUnitarioCentavos: 15000 },
    ]);
    expect(total).toBe(25000);
  });

  it('retorna zero para lista vazia', () => {
    expect(calcularTotalItens([])).toBe(0);
  });
});
