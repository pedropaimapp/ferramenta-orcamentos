'use client';

import React, { useState, type FormEvent } from 'react';
import { parseReaisParaCentavos } from '@/lib/format';
import type { CatalogoItem } from '@/lib/types';

export interface NovoItem {
  catalogoItemId: string | null;
  descricao: string;
  tipo: 'peca' | 'servico';
  quantidade: number;
  valorUnitarioCentavos: number;
}

export function ItemForm({ catalogo, onAdicionar }: { catalogo: CatalogoItem[]; onAdicionar: (item: NovoItem) => void }) {
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<'peca' | 'servico'>('peca');
  const [quantidade, setQuantidade] = useState('1');
  const [valor, setValor] = useState('');
  const [catalogoItemId, setCatalogoItemId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function selecionarDoCatalogo(id: string) {
    const item = catalogo.find((i) => i.id === id);
    if (!item) {
      setCatalogoItemId(null);
      return;
    }
    setCatalogoItemId(item.id);
    setDescricao(item.descricao);
    setTipo(item.tipo);
    setValor((item.valorPadraoCentavos / 100).toFixed(2).replace('.', ','));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      if (!descricao.trim()) throw new Error('Descrição é obrigatória');
      const quantidadeNumero = Number(quantidade);
      if (!Number.isFinite(quantidadeNumero) || quantidadeNumero <= 0) throw new Error('Quantidade deve ser maior que zero');
      const valorUnitarioCentavos = parseReaisParaCentavos(valor);

      onAdicionar({ catalogoItemId, descricao, tipo, quantidade: quantidadeNumero, valorUnitarioCentavos });

      setDescricao('');
      setTipo('peca');
      setQuantidade('1');
      setValor('');
      setCatalogoItemId(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded border p-4">
      <h2 className="font-medium">Adicionar item</h2>
      <select onChange={(e) => selecionarDoCatalogo(e.target.value)} value={catalogoItemId ?? ''} className="w-full rounded border px-2 py-1">
        <option value="">Digitar item novo...</option>
        {catalogo.map((item) => (
          <option key={item.id} value={item.id}>
            {item.descricao}
          </option>
        ))}
      </select>
      <input placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} required className="w-full rounded border px-2 py-1" />
      <div className="flex gap-2" role="group" aria-label="Tipo">
        <button
          type="button"
          aria-pressed={tipo === 'peca'}
          onClick={() => setTipo('peca')}
          className={`flex-1 rounded border px-2 py-1 ${tipo === 'peca' ? 'bg-black text-white' : ''}`}
        >
          Peça
        </button>
        <button
          type="button"
          aria-pressed={tipo === 'servico'}
          onClick={() => setTipo('servico')}
          className={`flex-1 rounded border px-2 py-1 ${tipo === 'servico' ? 'bg-black text-white' : ''}`}
        >
          Serviço
        </button>
      </div>
      <input placeholder="Quantidade" type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required className="w-full rounded border px-2 py-1" />
      <input placeholder="Valor unitário (R$)" value={valor} onChange={(e) => setValor(e.target.value)} required className="w-full rounded border px-2 py-1" />
      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}
      <button type="submit" className="rounded bg-black px-3 py-1 text-white">
        Adicionar item
      </button>
    </form>
  );
}
