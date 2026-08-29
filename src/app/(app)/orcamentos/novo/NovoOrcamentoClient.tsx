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
    const { id } = await salvarNovoOrcamento(dados, papel === 'admin' ? oficinaId : undefined);
    router.push(`/orcamentos/${id}`);
  }

  return (
    <div className="space-y-4">
      {papel === 'admin' && (
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
