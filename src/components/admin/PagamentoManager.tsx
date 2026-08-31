'use client';

import React, { useState, type FormEvent } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { criarFaixa, atualizarFaixa, removerFaixa, atualizarConfiguracao } from '@/lib/pagamento/data';
import { formatarReais, parseReaisParaCentavos } from '@/lib/format';
import type { FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';
import { Card, CardTitle } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Table, EmptyState } from '@/components/ui/Table';
import { MobileCard, MobileCardHeader, MobileCardRow, MobileCardActions } from '@/components/ui/MobileCard';

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
        <h2 className="font-heading text-lg font-bold text-porto-black">Faixas de pagamento</h2>
        {faixas.length === 0 ? (
          <EmptyState>Nenhuma faixa cadastrada ainda.</EmptyState>
        ) : (
          <>
            {/* Mobile (<640px): um card por faixa. */}
            <div className="space-y-3 sm:hidden" data-testid="faixas-cards">
              {faixas.map((f) => (
                <MobileCard key={f.id}>
                  <MobileCardHeader title={`${formatarReais(f.valorMinCentavos)} – ${f.valorMaxCentavos === null ? 'sem limite' : formatarReais(f.valorMaxCentavos)}`} />
                  <MobileCardRow label="Parcelas sem juros" value={`${f.parcelasSemJuros}x`} />
                  <MobileCardActions>
                    <button type="button" onClick={() => iniciarEdicaoFaixa(f)} className="text-sm font-medium text-porto-blue hover:underline">
                      Editar
                    </button>
                    <button type="button" onClick={() => removerFaixaSelecionada(f.id)} className="text-sm font-medium text-rose-600 hover:underline">
                      Remover
                    </button>
                  </MobileCardActions>
                </MobileCard>
              ))}
            </div>

            {/* Desktop (≥640px): tabela normal. */}
            <div className="hidden sm:block" data-testid="faixas-tabela">
              <Table>
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
                      <td className="font-medium text-porto-black">{formatarReais(f.valorMinCentavos)}</td>
                      <td>{f.valorMaxCentavos === null ? 'sem limite' : formatarReais(f.valorMaxCentavos)}</td>
                      <td>{f.parcelasSemJuros}x</td>
                      <td>
                        <div className="flex items-center gap-4">
                          <button type="button" onClick={() => iniciarEdicaoFaixa(f)} className="text-sm font-medium text-porto-blue hover:underline">
                            Editar
                          </button>
                          <button type="button" onClick={() => removerFaixaSelecionada(f.id)} className="text-sm font-medium text-rose-600 hover:underline">
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        )}

        <Card as="form" onSubmit={salvarFaixa} className="max-w-xl space-y-3">
          <CardTitle>{editandoFaixa ? 'Editar faixa' : 'Nova faixa'}</CardTitle>
          <Input placeholder="Valor mínimo (R$)" value={valorMin} onChange={(e) => setValorMin(e.target.value)} required />
          <Input placeholder="Valor máximo (R$, vazio = sem limite)" value={valorMax} onChange={(e) => setValorMax(e.target.value)} />
          <Input placeholder="Parcelas sem juros" type="number" min={1} value={parcelas} onChange={(e) => setParcelas(e.target.value)} required />
          {erroFaixa && <Alert>{erroFaixa}</Alert>}
          <div className="flex gap-2">
            <Button type="submit">Salvar</Button>
            {editandoFaixa && (
              <Button type="button" variant="outline" onClick={() => iniciarEdicaoFaixa(null)}>
                Cancelar
              </Button>
            )}
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-lg font-bold text-porto-black">Configuração geral</h2>
        <Card as="form" onSubmit={salvarConfiguracao} className="max-w-xl space-y-3">
          <Field label="Entrada mínima (%)" htmlFor="entrada-minima">
            <Input id="entrada-minima" value={entradaPercentual} onChange={(e) => setEntradaPercentual(e.target.value)} />
          </Field>
          <Field label="Desconto à vista (%)" htmlFor="desconto-a-vista">
            <Input id="desconto-a-vista" value={descontoPercentual} onChange={(e) => setDescontoPercentual(e.target.value)} />
          </Field>
          <Field label="Cartão Porto - máximo de parcelas" htmlFor="cartao-porto-max-parcelas">
            <Input id="cartao-porto-max-parcelas" value={cartaoPortoMaxParcelas} onChange={(e) => setCartaoPortoMaxParcelas(e.target.value)} />
          </Field>
          <Field label="Cartão Porto - parcela mínima (R$)" htmlFor="cartao-porto-parcela-minima">
            <Input id="cartao-porto-parcela-minima" value={cartaoPortoParcelaMinima} onChange={(e) => setCartaoPortoParcelaMinima(e.target.value)} />
          </Field>
          {erroConfiguracao && <Alert>{erroConfiguracao}</Alert>}
          <Button type="submit">Salvar configuração</Button>
        </Card>
      </section>
    </div>
  );
}
