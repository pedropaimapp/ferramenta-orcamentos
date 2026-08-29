'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { duplicarOrcamento, removerOrcamento } from '@/lib/orcamento/actions';
import type { Orcamento, StatusOrcamento } from '@/lib/types';

const STATUS_LABEL: Record<StatusOrcamento, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

export function OrcamentosList({ orcamentosIniciais }: { orcamentosIniciais: Orcamento[] }) {
  const router = useRouter();
  const [orcamentos, setOrcamentos] = useState(orcamentosIniciais);
  const [statusFiltro, setStatusFiltro] = useState<StatusOrcamento | 'todos'>('todos');
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const orcamentosFiltrados = useMemo(() => {
    return orcamentos.filter((o) => {
      const passaStatus = statusFiltro === 'todos' || o.status === statusFiltro;
      const buscaNormalizada = busca.trim().toLowerCase();
      const passaBusca =
        buscaNormalizada === '' ||
        o.clienteNome.toLowerCase().includes(buscaNormalizada) ||
        o.veiculoPlaca.toLowerCase().includes(buscaNormalizada);
      return passaStatus && passaBusca;
    });
  }, [orcamentos, statusFiltro, busca]);

  async function duplicar(id: string) {
    setErro(null);
    try {
      const { id: novoId } = await duplicarOrcamento(id);
      router.push(`/orcamentos/${novoId}`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  async function remover(id: string, clienteNome: string) {
    setErro(null);
    if (!window.confirm(`Excluir o orçamento de ${clienteNome}? Essa ação não pode ser desfeita.`)) return;
    try {
      await removerOrcamento(id);
      setOrcamentos((atuais) => atuais.filter((o) => o.id !== id));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

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
      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Placa</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orcamentosFiltrados.map((o) => (
            <tr key={o.id}>
              <td>{o.clienteNome}</td>
              <td>{o.veiculoPlaca}</td>
              <td>{STATUS_LABEL[o.status]}</td>
              <td className="space-x-2">
                <Link href={`/orcamentos/${o.id}`}>Abrir</Link>
                <button type="button" onClick={() => duplicar(o.id)}>
                  Duplicar
                </button>
                <button type="button" onClick={() => remover(o.id, o.clienteNome)}>
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
