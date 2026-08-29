'use client';

import React from 'react';
import { formatarReais } from '@/lib/format';
import { Table, EmptyState } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';

export interface ItemListado {
  id: string;
  descricao: string;
  tipo: 'peca' | 'servico';
  quantidade: number;
  valorUnitarioCentavos: number;
}

export function ItemsTable({ itens, onRemover }: { itens: ItemListado[]; onRemover: (id: string) => void }) {
  if (itens.length === 0) {
    return <EmptyState>Nenhum item adicionado ainda.</EmptyState>;
  }

  return (
    <Table>
      <thead>
        <tr>
          <th>Descrição</th>
          <th>Tipo</th>
          <th>Qtd</th>
          <th>Valor unit.</th>
          <th>Subtotal</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {itens.map((item) => (
          <tr key={item.id}>
            <td className="font-medium text-porto-black">{item.descricao}</td>
            <td>
              <Badge tone={item.tipo === 'peca' ? 'info' : 'neutral'}>{item.tipo === 'peca' ? 'Peça' : 'Serviço'}</Badge>
            </td>
            <td>{item.quantidade}</td>
            <td>{formatarReais(item.valorUnitarioCentavos)}</td>
            <td className="font-semibold text-porto-black">{formatarReais(item.quantidade * item.valorUnitarioCentavos)}</td>
            <td>
              <button type="button" onClick={() => onRemover(item.id)} className="text-sm font-medium text-rose-600 hover:underline">
                Remover
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
