'use client';

import React, { useState } from 'react';
import { formatarReais, parseReaisParaCentavos } from '@/lib/format';
import { encontrarFaixa, calcularEntradaMinima, dividirEmParcelas } from '@/lib/payment/faixas';
import { calcularDescontoAVista, calcularCartaoPorto } from '@/lib/payment/alternativas';
import type { FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Input';

export function CalculadoraPagamento({ faixas, config }: { faixas: FaixaPagamento[]; config: ConfiguracaoPagamento }) {
  const [valorServicoTexto, setValorServicoTexto] = useState('');
  const [percentualEntrada, setPercentualEntrada] = useState(config.percentualEntradaMinima * 100);
  // Texto bruto que o usuário está digitando no campo "Valor de entrada". Enquanto não for
  // null, o campo exibe exatamente o que foi digitado (sem reformatar a cada tecla); volta a
  // null (e passa a refletir o valor calculado) ao perder o foco ou ao mexer no slider.
  const [valorEntradaTexto, setValorEntradaTexto] = useState<string | null>(null);

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

  const entradaFormatada = (entradaCentavos / 100).toFixed(2).replace('.', ',');
  const valorEntradaExibido = valorEntradaTexto ?? entradaFormatada;

  function handleValorEntradaTexto(texto: string) {
    setValorEntradaTexto(texto);
    try {
      const novaEntradaCentavos = parseReaisParaCentavos(texto);
      if (totalCentavos > 0) {
        setPercentualEntrada((novaEntradaCentavos / totalCentavos) * 100);
      }
    } catch {
      // ignora entradas parciais/inválidas enquanto o usuário digita
    }
  }

  function handleValorEntradaBlur() {
    // Ao sair do campo, volta a exibir o valor canônico calculado (ex.: "1500" -> "1.500,00").
    setValorEntradaTexto(null);
  }

  function handlePercentualEntradaSlider(valor: number) {
    setPercentualEntrada(valor);
    // O slider é a fonte da verdade nesse momento: descarta qualquer texto em edição no
    // campo para que ele volte a refletir o valor calculado, mantendo a sincronia bidirecional.
    setValorEntradaTexto(null);
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
      <Field label="Valor do serviço" htmlFor="valor-servico">
        <Input
          id="valor-servico"
          placeholder="R$ 0,00"
          value={valorServicoTexto}
          onChange={(e) => setValorServicoTexto(e.target.value)}
        />
      </Field>

      {totalCentavos > 0 && faixaAtual && (
        <>
          <Card className="space-y-3">
            <Field label="Valor de entrada" htmlFor="valor-entrada">
              <Input
                id="valor-entrada"
                placeholder="R$ 0,00"
                value={valorEntradaExibido}
                onChange={(e) => handleValorEntradaTexto(e.target.value)}
                onBlur={handleValorEntradaBlur}
              />
            </Field>
            <input
              type="range"
              aria-label="Percentual de entrada"
              min={percentualMinimo}
              max={100}
              value={percentualClamped}
              onChange={(e) => handlePercentualEntradaSlider(Number(e.target.value))}
              className="w-full accent-porto-blue"
            />
            <p className="text-xs text-porto-gray">Mínimo de {percentualMinimo}% do valor do serviço.</p>
          </Card>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl bg-porto-black p-4 text-white">
              <p className="text-xs uppercase tracking-wide text-white/60">Entrada</p>
              <p className="mt-1 text-lg font-bold">{formatarReais(entradaCentavos)}</p>
              <p className="text-xs text-white/60">{Math.round(percentualClamped)}% do total</p>
            </div>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-porto-gray">Saldo restante</p>
              <p className="mt-1 text-lg font-bold text-porto-black">{formatarReais(saldoCentavos)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-porto-gray">Máx. parcelas</p>
              <p className="mt-1 text-lg font-bold text-porto-black">até {faixaAtual.parcelasSemJuros}x</p>
            </Card>
          </div>

          {cemPorCento && desconto ? (
            <Card className="border-porto-blue/20 bg-porto-blue/[0.04] text-sm">
              Pagamento total via Pix/Débito: <strong>{formatarReais(desconto.valorComDescontoCentavos)}</strong> (
              {Math.round(config.percentualDescontoAVista * 100)}% de desconto)
            </Card>
          ) : (
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-porto-black">Opções de pagamento do saldo</p>
              {opcoesParcelamento.map(({ n, valorParcela }) => (
                <p key={n} className="text-porto-black/80">
                  {n === 1 ? `À vista ${formatarReais(valorParcela)}` : `${n}x de ${formatarReais(valorParcela)}`}
                </p>
              ))}
              {cartaoPorto && (
                <p className="text-porto-black/80">
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
