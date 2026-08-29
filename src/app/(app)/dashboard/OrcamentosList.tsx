'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { duplicarOrcamento, removerOrcamento } from '@/lib/orcamento/actions';
import type { Orcamento, StatusOrcamento } from '@/lib/types';
import { Input, Select } from '@/components/ui/Input';
import { Table, EmptyState } from '@/components/ui/Table';
import { StatusBadge, STATUS_LABEL } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { buttonClasses } from '@/components/ui/Button';

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
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por cliente ou placa"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value as StatusOrcamento | 'todos')}
          className="max-w-[12rem]"
        >
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </Select>
      </div>
      {erro && <Alert>{erro}</Alert>}
      {orcamentosFiltrados.length === 0 ? (
        <EmptyState>Nenhum orçamento encontrado.</EmptyState>
      ) : (
        <Table>
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
                <td className="font-medium text-porto-black">{o.clienteNome}</td>
                <td className="font-mono uppercase text-porto-gray">{o.veiculoPlaca}</td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
                <td>
                  <div className="flex items-center gap-4">
                    <Link href={`/orcamentos/${o.id}`} className={buttonClasses('link')}>
                      Abrir
                    </Link>
                    <button type="button" onClick={() => duplicar(o.id)} className={buttonClasses('link')}>
                      Duplicar
                    </button>
                    <button
                      type="button"
                      onClick={() => remover(o.id, o.clienteNome)}
                      className="text-sm font-medium text-rose-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
