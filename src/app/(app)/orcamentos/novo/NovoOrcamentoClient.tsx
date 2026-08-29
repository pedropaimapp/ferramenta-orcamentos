'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrcamentoForm, type DadosOrcamentoFormulario } from '@/components/orcamento/OrcamentoForm';
import { salvarNovoOrcamento } from '@/lib/orcamento/actions';
import type { CatalogoItem, FaixaPagamento, ConfiguracaoPagamento, Oficina } from '@/lib/types';
import { Field, Select } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

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
      <Alert>
        Você não está vinculado a nenhuma oficina. Peça a um administrador para vincular seu usuário a uma oficina antes de
        criar um orçamento.
      </Alert>
    );
  }

  // Admin sempre escolhe (mesmo com uma única oficina cadastrada); um consultor só
  // precisa escolher quando está vinculado a mais de uma — com apenas uma, ela já
  // vem selecionada automaticamente e o campo fica oculto.
  const precisaEscolherOficina = papel === 'admin' || oficinas.length > 1;

  return (
    <div className="space-y-4">
      {precisaEscolherOficina && (
        <Field label="Oficina" className="max-w-sm">
          <Select value={oficinaId} onChange={(e) => setOficinaId(e.target.value)}>
            {oficinas.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <OrcamentoForm catalogo={catalogo} faixas={faixas} config={config} aoSalvar={aoSalvar} />
    </div>
  );
}
