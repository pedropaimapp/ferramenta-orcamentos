'use client';

import React, { useState } from 'react';
import { OrcamentoForm, type DadosOrcamentoFormulario } from '@/components/orcamento/OrcamentoForm';
import { salvarEdicaoOrcamento, mudarStatusOrcamento } from '@/lib/orcamento/actions';
import type { CatalogoItem, FaixaPagamento, ConfiguracaoPagamento, Orcamento, OrcamentoItem, StatusOrcamento } from '@/lib/types';

const STATUS_LABEL: Record<StatusOrcamento, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

export function OrcamentoDetalheClient({
  orcamento,
  itens,
  catalogo,
  faixas,
  config,
}: {
  orcamento: Orcamento;
  itens: OrcamentoItem[];
  catalogo: CatalogoItem[];
  faixas: FaixaPagamento[];
  config: ConfiguracaoPagamento;
}) {
  const [status, setStatus] = useState(orcamento.status);
  const [erroStatus, setErroStatus] = useState<string | null>(null);

  async function aoSalvar(dados: DadosOrcamentoFormulario) {
    await salvarEdicaoOrcamento(orcamento.id, dados);
  }

  async function alterarStatus(novoStatus: StatusOrcamento) {
    setErroStatus(null);
    try {
      await mudarStatusOrcamento(orcamento.id, novoStatus);
      setStatus(novoStatus);
    } catch (err) {
      setErroStatus(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  const valoresIniciais: DadosOrcamentoFormulario = {
    clienteNome: orcamento.clienteNome,
    clienteTelefone: orcamento.clienteTelefone,
    veiculoPlaca: orcamento.veiculoPlaca,
    veiculoModelo: orcamento.veiculoModelo,
    itens: itens.map((item) => ({
      id: item.id,
      catalogoItemId: item.catalogoItemId,
      descricao: item.descricao,
      tipo: item.tipo,
      quantidade: item.quantidade,
      valorUnitarioCentavos: item.valorUnitarioCentavos,
    })),
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm" htmlFor="status">
        Status
        <select id="status" value={status} onChange={(e) => alterarStatus(e.target.value as StatusOrcamento)} className="mt-1 block rounded border px-2 py-1">
          {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </label>
      {erroStatus && (
        <p role="alert" className="text-sm text-red-600">
          {erroStatus}
        </p>
      )}
      <OrcamentoForm catalogo={catalogo} faixas={faixas} config={config} valoresIniciais={valoresIniciais} aoSalvar={aoSalvar} />
    </div>
  );
}
