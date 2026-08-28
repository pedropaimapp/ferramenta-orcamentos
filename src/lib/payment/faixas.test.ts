import { describe, it, expect } from 'vitest';
import { encontrarFaixa, calcularEntradaMinima, dividirEmParcelas } from './faixas';
import type { FaixaPagamento, ConfiguracaoPagamento } from '../types';

const faixas: FaixaPagamento[] = [
  { id: '1', valorMinCentavos: 0, valorMaxCentavos: 100000, parcelasSemJuros: 1 },
  { id: '2', valorMinCentavos: 100000, valorMaxCentavos: 250000, parcelasSemJuros: 2 },
  { id: '3', valorMinCentavos: 250000, valorMaxCentavos: 400000, parcelasSemJuros: 3 },
  { id: '4', valorMinCentavos: 400000, valorMaxCentavos: null, parcelasSemJuros: 4 },
];

const config: ConfiguracaoPagamento = {
  percentualEntradaMinima: 0.3,
  percentualDescontoAVista: 0.05,
  cartaoPortoMaxParcelas: 6,
  cartaoPortoParcelaMinimaCentavos: 10000,
};

describe('encontrarFaixa', () => {
  it('escolhe a primeira faixa para valores abaixo de R$1.000', () => {
    expect(encontrarFaixa(50000, faixas).parcelasSemJuros).toBe(1);
  });

  it('um valor exatamente no limite entra na faixa de cima', () => {
    expect(encontrarFaixa(100000, faixas).parcelasSemJuros).toBe(2);
    expect(encontrarFaixa(250000, faixas).parcelasSemJuros).toBe(3);
    expect(encontrarFaixa(400000, faixas).parcelasSemJuros).toBe(4);
  });

  it('escolhe a última faixa (sem limite superior) para valores altos', () => {
    expect(encontrarFaixa(1000000, faixas).parcelasSemJuros).toBe(4);
  });

  it('lança erro se nenhuma faixa cobrir o valor', () => {
    expect(() => encontrarFaixa(50000, [])).toThrow();
  });
});

describe('calcularEntradaMinima', () => {
  it('calcula 30% do total, arredondado ao centavo', () => {
    expect(calcularEntradaMinima(365000, config)).toBe(109500);
    expect(calcularEntradaMinima(100, config)).toBe(30);
  });
});

describe('dividirEmParcelas', () => {
  it('divide um valor exato igualmente', () => {
    expect(dividirEmParcelas(182500, 2)).toEqual([91250, 91250]);
  });

  it('joga o resto da divisão na última parcela', () => {
    expect(dividirEmParcelas(182500, 3)).toEqual([60833, 60833, 60834]);
  });

  it('a soma das parcelas é sempre igual ao valor original', () => {
    const parcelas = dividirEmParcelas(100001, 7);
    expect(parcelas.reduce((a, b) => a + b, 0)).toBe(100001);
    expect(parcelas).toHaveLength(7);
  });
});
