'use client';

import React from 'react';
import { formatarReais } from '@/lib/format';

export interface ItemListado {
  id: string;
  descricao: string;
  tipo: 'peca' | 'servico';
  quantidade: number;
  valorUnitarioCentavos: number;
}

export function ItemsTable({ itens, onRemover }: { itens: ItemListado[]; onRemover: (id: string) => void }) {
  if (itens.length === 0) {
    return <p className="text-sm text-gray-500">Nenhum item adicionado ainda.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
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
            <td>{item.descricao}</td>
            <td>{item.tipo === 'peca' ? 'Peça' : 'Serviço'}</td>
            <td>{item.quantidade}</td>
            <td>{formatarReais(item.valorUnitarioCentavos)}</td>
            <td>{formatarReais(item.quantidade * item.valorUnitarioCentavos)}</td>
            <td>
              <button type="button" onClick={() => onRemover(item.id)}>
                Remover
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
