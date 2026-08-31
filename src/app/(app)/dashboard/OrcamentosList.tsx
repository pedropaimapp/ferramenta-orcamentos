'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { duplicarOrcamento, removerOrcamento } from '@/lib/orcamento/actions';
import type { Orcamento, StatusOrcamento, Oficina, Consultor } from '@/lib/types';
import { Input, Select } from '@/components/ui/Input';
import { Table, EmptyState } from '@/components/ui/Table';
import { StatusBadge, STATUS_LABEL } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { buttonClasses } from '@/components/ui/Button';
import { MobileCard, MobileCardHeader, MobileCardRow, MobileCardActions } from '@/components/ui/MobileCard';

export function OrcamentosList({
  orcamentosIniciais,
  oficinas,
  consultores,
}: {
  orcamentosIniciais: Orcamento[];
  /** Só passados para quem pode ver orçamentos de todo mundo (admin) — habilita as colunas e filtros extras. */
  oficinas?: Oficina[];
  consultores?: Consultor[];
}) {
  const router = useRouter();
  const [orcamentos, setOrcamentos] = useState(orcamentosIniciais);
  const [statusFiltro, setStatusFiltro] = useState<StatusOrcamento | 'todos'>('todos');
  const [oficinaFiltro, setOficinaFiltro] = useState('todas');
  const [consultorFiltro, setConsultorFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const mostrarColunasAdmin = Boolean(oficinas && consultores);
  const nomeOficinaPorId = useMemo(() => Object.fromEntries((oficinas ?? []).map((o) => [o.id, o.nome])), [oficinas]);
  const nomeConsultorPorId = useMemo(() => Object.fromEntries((consultores ?? []).map((c) => [c.id, c.nome])), [consultores]);

  const orcamentosFiltrados = useMemo(() => {
    return orcamentos.filter((o) => {
      const passaStatus = statusFiltro === 'todos' || o.status === statusFiltro;
      const passaOficina = oficinaFiltro === 'todas' || o.oficinaId === oficinaFiltro;
      const passaConsultor = consultorFiltro === 'todos' || o.consultorId === consultorFiltro;
      const buscaNormalizada = busca.trim().toLowerCase();
      const passaBusca =
        buscaNormalizada === '' ||
        o.clienteNome.toLowerCase().includes(buscaNormalizada) ||
        o.veiculoPlaca.toLowerCase().includes(buscaNormalizada);
      return passaStatus && passaOficina && passaConsultor && passaBusca;
    });
  }, [orcamentos, statusFiltro, oficinaFiltro, consultorFiltro, busca]);

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
        {mostrarColunasAdmin && (
          <>
            <Select value={oficinaFiltro} onChange={(e) => setOficinaFiltro(e.target.value)} className="max-w-[12rem]">
              <option value="todas">Todas as oficinas</option>
              {oficinas!.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </Select>
            <Select value={consultorFiltro} onChange={(e) => setConsultorFiltro(e.target.value)} className="max-w-[12rem]">
              <option value="todos">Todos os consultores</option>
              {consultores!.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </>
        )}
      </div>
      {erro && <Alert>{erro}</Alert>}
      {orcamentosFiltrados.length === 0 ? (
        <EmptyState>Nenhum orçamento encontrado.</EmptyState>
      ) : (
        <>
          {/* Mobile (<640px): um card por orçamento. */}
          <div className="space-y-3 sm:hidden" data-testid="orcamentos-cards">
            {orcamentosFiltrados.map((o) => (
              <MobileCard key={o.id}>
                <MobileCardHeader title={o.clienteNome} badge={<StatusBadge status={o.status} />} />
                <MobileCardRow label="Placa" value={<span className="font-mono uppercase">{o.veiculoPlaca}</span>} />
                {mostrarColunasAdmin && (
                  <>
                    <MobileCardRow label="Oficina" value={nomeOficinaPorId[o.oficinaId] ?? '—'} />
                    <MobileCardRow label="Consultor" value={nomeConsultorPorId[o.consultorId] ?? '—'} />
                  </>
                )}
                <MobileCardActions>
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
                </MobileCardActions>
              </MobileCard>
            ))}
          </div>

          {/* Desktop (≥640px): tabela normal. */}
          <div className="hidden sm:block" data-testid="orcamentos-tabela">
            <Table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Placa</th>
                  {mostrarColunasAdmin && (
                    <>
                      <th>Oficina</th>
                      <th>Consultor</th>
                    </>
                  )}
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orcamentosFiltrados.map((o) => (
                  <tr key={o.id}>
                    <td className="font-medium text-porto-black">{o.clienteNome}</td>
                    <td className="font-mono uppercase text-porto-gray">{o.veiculoPlaca}</td>
                    {mostrarColunasAdmin && (
                      <>
                        <td>{nomeOficinaPorId[o.oficinaId] ?? '—'}</td>
                        <td>{nomeConsultorPorId[o.consultorId] ?? '—'}</td>
                      </>
                    )}
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
          </div>
        </>
      )}
    </div>
  );
}
