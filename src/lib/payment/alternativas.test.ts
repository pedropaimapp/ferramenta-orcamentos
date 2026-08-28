import { describe, it, expect } from 'vitest';
import { calcularDescontoAVista, calcularCartaoPorto } from './alternativas';
import type { ConfiguracaoPagamento } from '../types';

const config: ConfiguracaoPagamento = {
  percentualEntradaMinima: 0.3,
  percentualDescontoAVista: 0.05,
  cartaoPortoMaxParcelas: 6,
  cartaoPortoParcelaMinimaCentavos: 10000,
};

describe('calcularDescontoAVista', () => {
  it('aplica 5% de desconto sobre o total', () => {
    expect(calcularDescontoAVista(100000, config)).toEqual({
      descontoCentavos: 5000,
      valorComDescontoCentavos: 95000,
    });
  });
});

describe('calcularCartaoPorto', () => {
  it('usa o máximo de 6x quando a parcela mínima é respeitada', () => {
    expect(calcularCartaoPorto(600000, config)).toEqual({ parcelas: 6, valorParcelaCentavos: 100000 });
  });

  it('reduz o número de parcelas quando 6x ficaria abaixo da mínima', () => {
    // 300 reais / 6 = 50 reais, abaixo do mínimo de 100 -> cai para 3x de 100
    expect(calcularCartaoPorto(30000, config)).toEqual({ parcelas: 3, valorParcelaCentavos: 10000 });
  });

  it('usa 1x quando o total é menor que a parcela mínima', () => {
    expect(calcularCartaoPorto(5000, config)).toEqual({ parcelas: 1, valorParcelaCentavos: 5000 });
  });
});
