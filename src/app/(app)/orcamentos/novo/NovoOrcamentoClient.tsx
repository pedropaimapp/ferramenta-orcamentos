'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrcamentoForm, type DadosOrcamentoFormulario } from '@/components/orcamento/OrcamentoForm';
import { salvarNovoOrcamento } from '@/lib/orcamento/actions';
import type { CatalogoItem, FaixaPagamento, ConfiguracaoPagamento, Oficina } from '@/lib/types';

export function NovoOrcamentoClient({
  papel,
  oficinas,
  catalogo,
  faixas,
  config,
}: {
  papel: 'consultor' | 'admin';
  oficinas: Oficina[];
  catalogo: CatalogoItem[];
  faixas: FaixaPagamento[];
  config: ConfiguracaoPagamento;
}) {
  const router = useRouter();
  const [oficinaId, setOficinaId] = useState(oficinas[0]?.id ?? '');

  async function aoSalvar(dados: DadosOrcamentoFormulario) {
    const { id } = await salvarNovoOrcamento(dados, oficinaId);
    router.push(`/orcamentos/${id}`);
  }

  if (oficinas.length === 0) {
    return (
      <p role="alert" className="text-sm text-red-600">
        Você não está vinculado a nenhuma oficina. Peça a um administrador para vincular seu usuário a uma oficina antes de
        criar um orçamento.
      </p>
    );
  }

  // Admin sempre escolhe (mesmo com uma única oficina cadastrada); um consultor só
  // precisa escolher quando está vinculado a mais de uma — com apenas uma, ela já
  // vem selecionada automaticamente e o campo fica oculto.
  const precisaEscolherOficina = papel === 'admin' || oficinas.length > 1;

  return (
    <div className="space-y-4">
      {precisaEscolherOficina && (
        <label className="block text-sm">
          Oficina
          <select value={oficinaId} onChange={(e) => setOficinaId(e.target.value)} className="mt-1 w-full rounded border px-2 py-1">
            {oficinas.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </label>
      )}
      <OrcamentoForm catalogo={catalogo} faixas={faixas} config={config} aoSalvar={aoSalvar} />
    </div>
  );
}
