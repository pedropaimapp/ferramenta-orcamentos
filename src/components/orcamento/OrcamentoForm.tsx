'use client';

import React, { useState } from 'react';
import { ItemForm, type NovoItem } from './ItemForm';
import { ItemsTable, type ItemEditado } from './ItemsTable';
import { CondicaoPagamentoResumo } from './CondicaoPagamentoResumo';
import { calcularTotalItens } from '@/lib/orcamento/totals';
import { telefoneValido, formatarTelefoneInput } from '@/lib/orcamento/telefone';
import { formatarPlacaInput, placaValida } from '@/lib/orcamento/placa';
import { garantirItemNoCatalogo } from '@/lib/catalogo/actions';
import type { CatalogoItem, FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';
import { Card, CardTitle } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

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
  const [catalogoAtual, setCatalogoAtual] = useState<CatalogoItem[]>(catalogo);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const total = calcularTotalItens(itens);

  async function adicionarItem(item: NovoItem) {
    const id = crypto.randomUUID();
    setItens((atuais) => [...atuais, { ...item, id }]);

    // Item digitado manualmente (não veio de uma sugestão do catálogo): salva
    // em segundo plano para ficar disponível em orçamentos futuros. Falha aqui
    // não deve impedir o item de entrar no orçamento.
    if (!item.catalogoItemId) {
      try {
        const itemCatalogo = await garantirItemNoCatalogo({
          descricao: item.descricao,
          tipo: item.tipo,
          valorPadraoCentavos: item.valorUnitarioCentavos,
        });
        setCatalogoAtual((atuais) => (atuais.some((i) => i.id === itemCatalogo.id) ? atuais : [...atuais, itemCatalogo]));
        setItens((atuais) => atuais.map((i) => (i.id === id ? { ...i, catalogoItemId: itemCatalogo.id } : i)));
      } catch (err) {
        console.error('Não foi possível salvar o item no catálogo:', err);
      }
    }
  }

  function removerItem(id: string) {
    setItens((atuais) => atuais.filter((i) => i.id !== id));
  }

  function editarItem(id: string, dados: ItemEditado) {
    setItens((atuais) => atuais.map((i) => (i.id === id ? { ...i, ...dados, catalogoItemId: null } : i)));
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
    if (!placaValida(veiculoPlaca)) {
      setErro('Placa inválida. Use o formato AAA1234 ou o formato Mercosul AAA1A23.');
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
      <Card className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Cliente">
          <Input placeholder="Nome do cliente" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} required />
        </Field>
        <Field label="Telefone">
          <Input
            placeholder="Telefone (WhatsApp)"
            value={clienteTelefone}
            onChange={(e) => setClienteTelefone(formatarTelefoneInput(e.target.value))}
            inputMode="numeric"
            maxLength={15}
            required
          />
        </Field>
        <Field label="Placa">
          <Input
            placeholder="Placa"
            value={veiculoPlaca}
            onChange={(e) => setVeiculoPlaca(formatarPlacaInput(e.target.value))}
            maxLength={7}
            required
          />
        </Field>
        <Field label="Veículo">
          <Input placeholder="Modelo/marca" value={veiculoModelo} onChange={(e) => setVeiculoModelo(e.target.value)} required />
        </Field>
      </Card>

      <div>
        <CardTitle className="mb-3">Itens do orçamento</CardTitle>
        <div className="space-y-4">
          <ItemForm catalogo={catalogoAtual} onAdicionar={adicionarItem} />
          <ItemsTable itens={itens} onRemover={removerItem} onEditar={editarItem} />
        </div>
      </div>

      <CondicaoPagamentoResumo totalCentavos={total} faixas={faixas} config={config} />

      {erro && <Alert>{erro}</Alert>}
      <Button type="button" onClick={salvar} loading={salvando} size="md">
        {salvando ? 'Salvando...' : 'Salvar orçamento'}
      </Button>
    </div>
  );
}
