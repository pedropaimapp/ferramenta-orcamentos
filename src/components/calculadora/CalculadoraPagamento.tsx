'use client';

import React, { useState } from 'react';
import { formatarReais, parseReaisParaCentavos } from '@/lib/format';
import { encontrarFaixa, calcularEntradaMinima, dividirEmParcelas } from '@/lib/payment/faixas';
import { calcularDescontoAVista, calcularCartaoPorto } from '@/lib/payment/alternativas';
import type { FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';

export function CalculadoraPagamento({ faixas, config }: { faixas: FaixaPagamento[]; config: ConfiguracaoPagamento }) {
  const [valorServicoTexto, setValorServicoTexto] = useState('');
  const [percentualEntrada, setPercentualEntrada] = useState(config.percentualEntradaMinima * 100);

  let totalCentavos = 0;
  try {
    totalCentavos = valorServicoTexto.trim() === '' ? 0 : parseReaisParaCentavos(valorServicoTexto);
  } catch {
    totalCentavos = 0;
  }

  const percentualMinimo = config.percentualEntradaMinima * 100;
  const percentualClamped = Math.min(100, Math.max(percentualMinimo, percentualEntrada));
  const entradaCentavos = Math.round((totalCentavos * percentualClamped) / 100);
  const saldoCentavos = totalCentavos - entradaCentavos;
  const cemPorCento = percentualClamped >= 100;

  let faixaAtual: FaixaPagamento | null = null;
  if (totalCentavos > 0 && faixas.length > 0) {
    try {
      faixaAtual = encontrarFaixa(totalCentavos, faixas);
    } catch {
      faixaAtual = null;
    }
  }

  function handleValorEntradaTexto(texto: string) {
    try {
      const novaEntradaCentavos = parseReaisParaCentavos(texto);
      if (totalCentavos > 0) {
        setPercentualEntrada((novaEntradaCentavos / totalCentavos) * 100);
      }
    } catch {
      // ignora entradas parciais/inválidas enquanto o usuário digita
    }
  }

  const opcoesParcelamento =
    faixaAtual && !cemPorCento
      ? Array.from({ length: faixaAtual.parcelasSemJuros }, (_, i) => {
          const n = i + 1;
          return { n, valorParcela: dividirEmParcelas(saldoCentavos, n)[0] };
        })
      : [];

  const cartaoPorto = totalCentavos > 0 ? calcularCartaoPorto(totalCentavos, config) : null;
  const desconto = totalCentavos > 0 ? calcularDescontoAVista(totalCentavos, config) : null;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <label className="block text-sm font-medium" htmlFor="valor-servico">
          Valor do serviço
        </label>
        <input
          id="valor-servico"
          placeholder="R$ 0,00"
          value={valorServicoTexto}
          onChange={(e) => setValorServicoTexto(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </div>

      {totalCentavos > 0 && faixaAtual && (
        <>
          <div>
            <label className="block text-sm font-medium" htmlFor="valor-entrada">
              Valor de entrada
            </label>
            <input
              id="valor-entrada"
              placeholder="R$ 0,00"
              value={(entradaCentavos / 100).toFixed(2).replace('.', ',')}
              onChange={(e) => handleValorEntradaTexto(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-1"
            />
            <input
              type="range"
              aria-label="Percentual de entrada"
              min={percentualMinimo}
              max={100}
              value={percentualClamped}
              onChange={(e) => setPercentualEntrada(Number(e.target.value))}
              className="mt-2 w-full"
            />
            <p className="text-xs text-gray-500">Mínimo de {percentualMinimo}% do valor do serviço.</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded bg-black p-3 text-white">
              <p className="text-xs uppercase">Entrada</p>
              <p className="text-lg font-semibold">{formatarReais(entradaCentavos)}</p>
              <p className="text-xs">{Math.round(percentualClamped)}% do total</p>
            </div>
            <div className="rounded border p-3">
              <p className="text-xs uppercase">Saldo restante</p>
              <p className="text-lg font-semibold">{formatarReais(saldoCentavos)}</p>
            </div>
            <div className="rounded border p-3">
              <p className="text-xs uppercase">Máx. parcelas</p>
              <p className="text-lg font-semibold">até {faixaAtual.parcelasSemJuros}x</p>
            </div>
          </div>

          {cemPorCento && desconto ? (
            <p className="rounded border p-3 text-sm">
              Pagamento total via Pix/Débito: <strong>{formatarReais(desconto.valorComDescontoCentavos)}</strong> (
              {Math.round(config.percentualDescontoAVista * 100)}% de desconto)
            </p>
          ) : (
            <div className="space-y-1 text-sm">
              <p className="font-medium">Opções de pagamento do saldo</p>
              {opcoesParcelamento.map(({ n, valorParcela }) => (
                <p key={n}>
                  {n === 1 ? `À vista ${formatarReais(valorParcela)}` : `${n}x de ${formatarReais(valorParcela)}`}
                </p>
              ))}
              {cartaoPorto && (
                <p>
                  Alternativa: Cartão Porto em até {cartaoPorto.parcelas}x de {formatarReais(cartaoPorto.valorParcelaCentavos)} sem juros
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
