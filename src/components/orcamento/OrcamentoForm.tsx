'use client';

import React, { useState } from 'react';
import { ItemForm, type NovoItem } from './ItemForm';
import { ItemsTable } from './ItemsTable';
import { CondicaoPagamentoResumo } from './CondicaoPagamentoResumo';
import { calcularTotalItens } from '@/lib/orcamento/totals';
import { telefoneValido } from '@/lib/orcamento/telefone';
import type { CatalogoItem, FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';

export interface ItemDoFormulario extends NovoItem {
  id: string;
}

export interface DadosOrcamentoFormulario {
  clienteNome: string;
  clienteTelefone: string;
  veiculoPlaca: string;
  veiculoModelo: string;
  itens: ItemDoFormulario[];
}

export function OrcamentoForm({
  catalogo,
  faixas,
  config,
  valoresIniciais,
  aoSalvar,
}: {
  catalogo: CatalogoItem[];
  faixas: FaixaPagamento[];
  config: ConfiguracaoPagamento;
  valoresIniciais?: DadosOrcamentoFormulario;
  aoSalvar: (dados: DadosOrcamentoFormulario) => Promise<void>;
}) {
  const [clienteNome, setClienteNome] = useState(valoresIniciais?.clienteNome ?? '');
  const [clienteTelefone, setClienteTelefone] = useState(valoresIniciais?.clienteTelefone ?? '');
  const [veiculoPlaca, setVeiculoPlaca] = useState(valoresIniciais?.veiculoPlaca ?? '');
  const [veiculoModelo, setVeiculoModelo] = useState(valoresIniciais?.veiculoModelo ?? '');
  const [itens, setItens] = useState<ItemDoFormulario[]>(valoresIniciais?.itens ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const total = calcularTotalItens(itens);

  function adicionarItem(item: NovoItem) {
    setItens((atuais) => [...atuais, { ...item, id: crypto.randomUUID() }]);
  }

  function removerItem(id: string) {
    setItens((atuais) => atuais.filter((i) => i.id !== id));
  }

  async function salvar() {
    setErro(null);
    if (itens.length === 0) {
      setErro('Adicione ao menos um item antes de salvar.');
      return;
    }
    if (!telefoneValido(clienteTelefone)) {
      setErro('Telefone do cliente inválido.');
      return;
    }
    setSalvando(true);
    try {
      await aoSalvar({ clienteNome, clienteTelefone, veiculoPlaca, veiculoModelo, itens });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <input placeholder="Nome do cliente" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} required className="rounded border px-2 py-1" />
        <input placeholder="Telefone (WhatsApp)" value={clienteTelefone} onChange={(e) => setClienteTelefone(e.target.value)} required className="rounded border px-2 py-1" />
        <input placeholder="Placa" value={veiculoPlaca} onChange={(e) => setVeiculoPlaca(e.target.value)} required className="rounded border px-2 py-1" />
        <input placeholder="Modelo/marca" value={veiculoModelo} onChange={(e) => setVeiculoModelo(e.target.value)} required className="rounded border px-2 py-1" />
      </div>

      <ItemForm catalogo={catalogo} onAdicionar={adicionarItem} />
      <ItemsTable itens={itens} onRemover={removerItem} />
      <CondicaoPagamentoResumo totalCentavos={total} faixas={faixas} config={config} />

      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}
      <button type="button" onClick={salvar} disabled={salvando} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {salvando ? 'Salvando...' : 'Salvar orçamento'}
      </button>
    </div>
  );
}
