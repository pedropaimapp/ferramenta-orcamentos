'use client';

import React, { useState, type FormEvent } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { criarFaixa, atualizarFaixa, removerFaixa, atualizarConfiguracao } from '@/lib/pagamento/data';
import { formatarReais, parseReaisParaCentavos } from '@/lib/format';
import type { FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';

export function PagamentoManager({
  faixasIniciais,
  configuracaoInicial,
}: {
  faixasIniciais: FaixaPagamento[];
  configuracaoInicial: ConfiguracaoPagamento;
}) {
  const [faixas, setFaixas] = useState(faixasIniciais);
  const [editandoFaixa, setEditandoFaixa] = useState<FaixaPagamento | null>(null);
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [erroFaixa, setErroFaixa] = useState<string | null>(null);

  const [entradaPercentual, setEntradaPercentual] = useState(String(configuracaoInicial.percentualEntradaMinima * 100));
  const [descontoPercentual, setDescontoPercentual] = useState(String(configuracaoInicial.percentualDescontoAVista * 100));
  const [cartaoPortoMaxParcelas, setCartaoPortoMaxParcelas] = useState(String(configuracaoInicial.cartaoPortoMaxParcelas));
  const [cartaoPortoParcelaMinima, setCartaoPortoParcelaMinima] = useState(
    (configuracaoInicial.cartaoPortoParcelaMinimaCentavos / 100).toFixed(2).replace('.', ',')
  );
  const [erroConfiguracao, setErroConfiguracao] = useState<string | null>(null);

  function iniciarEdicaoFaixa(faixa: FaixaPagamento | null) {
    setEditandoFaixa(faixa);
    setValorMin(faixa ? (faixa.valorMinCentavos / 100).toFixed(2).replace('.', ',') : '');
    setValorMax(faixa && faixa.valorMaxCentavos !== null ? (faixa.valorMaxCentavos / 100).toFixed(2).replace('.', ',') : '');
    setParcelas(faixa ? String(faixa.parcelasSemJuros) : '1');
    setErroFaixa(null);
  }

  async function salvarFaixa(e: FormEvent) {
    e.preventDefault();
    setErroFaixa(null);
    const supabase = createBrowserClient();
    try {
      const input = {
        valorMinCentavos: parseReaisParaCentavos(valorMin),
        valorMaxCentavos: valorMax.trim() === '' ? null : parseReaisParaCentavos(valorMax),
        parcelasSemJuros: Number(parcelas),
      };
      if (editandoFaixa) {
        const atualizada = await atualizarFaixa(supabase, editandoFaixa.id, input);
        setFaixas((atuais) => atuais.map((f) => (f.id === atualizada.id ? atualizada : f)));
      } else {
        const criada = await criarFaixa(supabase, input);
        setFaixas((atuais) => [...atuais, criada].sort((a, b) => a.valorMinCentavos - b.valorMinCentavos));
      }
      iniciarEdicaoFaixa(null);
    } catch (err) {
      setErroFaixa(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  async function removerFaixaSelecionada(id: string) {
    setErroFaixa(null);
    const supabase = createBrowserClient();
    try {
      await removerFaixa(supabase, id);
      setFaixas((atuais) => atuais.filter((f) => f.id !== id));
    } catch (err) {
      setErroFaixa(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  function validarPercentual(valor: string, rotulo: string): number {
    const numero = valor.trim() === '' ? NaN : Number(valor);
    if (!Number.isFinite(numero) || numero < 0 || numero > 100) {
      throw new Error(`${rotulo} deve ser um número entre 0 e 100`);
    }
    return numero;
  }

  async function salvarConfiguracao(e: FormEvent) {
    e.preventDefault();
    setErroConfiguracao(null);
    const supabase = createBrowserClient();
    try {
      const entrada = validarPercentual(entradaPercentual, 'Entrada mínima (%)');
      const desconto = validarPercentual(descontoPercentual, 'Desconto à vista (%)');

      const maxParcelas = Number(cartaoPortoMaxParcelas);
      if (!Number.isFinite(maxParcelas) || !Number.isInteger(maxParcelas) || maxParcelas < 1) {
        throw new Error('Cartão Porto - máximo de parcelas deve ser um número inteiro maior ou igual a 1');
      }

      const parcelaMinimaCentavos = parseReaisParaCentavos(cartaoPortoParcelaMinima);

      await atualizarConfiguracao(supabase, {
        percentualEntradaMinima: entrada / 100,
        percentualDescontoAVista: desconto / 100,
        cartaoPortoMaxParcelas: maxParcelas,
        cartaoPortoParcelaMinimaCentavos: parcelaMinimaCentavos,
      });
    } catch (err) {
      setErroConfiguracao(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-lg font-semibold">Faixas de pagamento</h1>
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>De</th>
              <th>Até</th>
              <th>Parcelas sem juros</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((f) => (
              <tr key={f.id}>
                <td>{formatarReais(f.valorMinCentavos)}</td>
                <td>{f.valorMaxCentavos === null ? 'sem limite' : formatarReais(f.valorMaxCentavos)}</td>
                <td>{f.parcelasSemJuros}x</td>
                <td className="space-x-2">
                  <button type="button" onClick={() => iniciarEdicaoFaixa(f)}>
                    Editar
                  </button>
                  <button type="button" onClick={() => removerFaixaSelecionada(f.id)}>
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form onSubmit={salvarFaixa} className="space-y-2 rounded border p-4">
          <h2 className="font-medium">{editandoFaixa ? 'Editar faixa' : 'Nova faixa'}</h2>
          <input placeholder="Valor mínimo (R$)" value={valorMin} onChange={(e) => setValorMin(e.target.value)} required className="w-full rounded border px-2 py-1" />
          <input placeholder="Valor máximo (R$, vazio = sem limite)" value={valorMax} onChange={(e) => setValorMax(e.target.value)} className="w-full rounded border px-2 py-1" />
          <input placeholder="Parcelas sem juros" type="number" min={1} value={parcelas} onChange={(e) => setParcelas(e.target.value)} required className="w-full rounded border px-2 py-1" />
          {erroFaixa && (
            <p role="alert" className="text-sm text-red-600">
              {erroFaixa}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="rounded bg-black px-3 py-1 text-white">
              Salvar
            </button>
            {editandoFaixa && (
              <button type="button" onClick={() => iniciarEdicaoFaixa(null)}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <h1 className="text-lg font-semibold">Configuração geral</h1>
        <form onSubmit={salvarConfiguracao} className="space-y-2 rounded border p-4">
          <label className="block text-sm">
            Entrada mínima (%)
            <input value={entradaPercentual} onChange={(e) => setEntradaPercentual(e.target.value)} className="mt-1 w-full rounded border px-2 py-1" />
          </label>
          <label className="block text-sm">
            Desconto à vista (%)
            <input value={descontoPercentual} onChange={(e) => setDescontoPercentual(e.target.value)} className="mt-1 w-full rounded border px-2 py-1" />
          </label>
          <label className="block text-sm">
            Cartão Porto - máximo de parcelas
            <input value={cartaoPortoMaxParcelas} onChange={(e) => setCartaoPortoMaxParcelas(e.target.value)} className="mt-1 w-full rounded border px-2 py-1" />
          </label>
          <label className="block text-sm">
            Cartão Porto - parcela mínima (R$)
            <input value={cartaoPortoParcelaMinima} onChange={(e) => setCartaoPortoParcelaMinima(e.target.value)} className="mt-1 w-full rounded border px-2 py-1" />
          </label>
          {erroConfiguracao && (
            <p role="alert" className="text-sm text-red-600">
              {erroConfiguracao}
            </p>
          )}
          <button type="submit" className="rounded bg-black px-3 py-1 text-white">
            Salvar configuração
          </button>
        </form>
      </section>
    </div>
  );
}
