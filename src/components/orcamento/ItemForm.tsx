'use client';

import React, { useState, type FormEvent } from 'react';
import { parseReaisParaCentavos } from '@/lib/format';
import type { CatalogoItem } from '@/lib/types';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

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
    <Card as="form" onSubmit={handleSubmit} className="space-y-3">
      <CardTitle>Adicionar item</CardTitle>
      <Select onChange={(e) => selecionarDoCatalogo(e.target.value)} value={catalogoItemId ?? ''}>
        <option value="">Digitar item novo...</option>
        {catalogo.map((item) => (
          <option key={item.id} value={item.id}>
            {item.descricao}
          </option>
        ))}
      </Select>
      <Input placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
      <div className="flex gap-2" role="group" aria-label="Tipo">
        <button
          type="button"
          aria-pressed={tipo === 'peca'}
          onClick={() => setTipo('peca')}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            tipo === 'peca' ? 'border-porto-black bg-porto-black text-white' : 'border-slate-300 text-porto-black hover:border-porto-blue'
          }`}
        >
          Peça
        </button>
        <button
          type="button"
          aria-pressed={tipo === 'servico'}
          onClick={() => setTipo('servico')}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            tipo === 'servico' ? 'border-porto-black bg-porto-black text-white' : 'border-slate-300 text-porto-black hover:border-porto-blue'
          }`}
        >
          Serviço
        </button>
      </div>
      <Input placeholder="Quantidade" type="number" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required />
      <Input placeholder="Valor unitário (R$)" value={valor} onChange={(e) => setValor(e.target.value)} required />
      {erro && <Alert>{erro}</Alert>}
      <Button type="submit">Adicionar item</Button>
    </Card>
  );
}
