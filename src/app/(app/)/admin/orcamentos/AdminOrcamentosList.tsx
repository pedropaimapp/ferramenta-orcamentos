'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Orcamento, StatusOrcamento } from '@/lib/types';

const STATUS_LABEL: Record<StatusOrcamento, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

export function AdminOrcamentosList({
  orcamentosIniciais,
  consultoresPorId,
  oficinasPorId,
}: {
  orcamentosIniciais: Orcamento[];
  consultoresPorId: Record<string, string>;
  oficinasPorId: Record<string, string>;
}) {
  const [statusFiltro, setStatusFiltro] = useState<StatusOrcamento | 'todos'>('todos');
  const [busca, setBusca] = useState('');

  const orcamentosFiltrados = useMemo(() => {
    return orcamentosIniciais.filter((o) => {
      const passaStatus = statusFiltro === 'todos' || o.status === statusFiltro;
      const buscaNormalizada = busca.trim().toLowerCase();
      const passaBusca =
        buscaNormalizada === '' ||
        o.clienteNome.toLowerCase().includes(buscaNormalizada) ||
        o.veiculoPlaca.toLowerCase().includes(buscaNormalizada);
      return passaStatus && passaBusca;
    });
  }, [orcamentosIniciais, statusFiltro, busca]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <input placeholder="Buscar por cliente ou placa" value={busca} onChange={(e) => setBusca(e.target.value)} className="rounded border px-2 py-1" />
        <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value as StatusOrcamento | 'todos')} className="rounded border px-2 py-1">
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Placa</th>
            <th>Consultor</th>
            <th>Oficina</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orcamentosFiltrados.map((o) => (
            <tr key={o.id}>
              <td>{o.clienteNome}</td>
              <td>{o.veiculoPlaca}</td>
              <td>{consultoresPorId[o.consultorId] ?? '—'}</td>
              <td>{oficinasPorId[o.oficinaId] ?? '—'}</td>
              <td>{STATUS_LABEL[o.status]}</td>
              <td>
                <Link href={`/orcamentos/${o.id}`}>Abrir</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
