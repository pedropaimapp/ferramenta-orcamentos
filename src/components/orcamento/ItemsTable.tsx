'use client';

import React, { useState } from 'react';
import { formatarReais, parseReaisParaCentavos } from '@/lib/format';
import { Table, EmptyState } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { MobileCard, MobileCardHeader, MobileCardRow, MobileCardHighlight, MobileCardActions } from '@/components/ui/MobileCard';

export interface ItemListado {
  id: string;
  descricao: string;
  tipo: 'peca' | 'servico';
  quantidade: number;
  valorUnitarioCentavos: number;
}

export interface ItemEditado {
  descricao: string;
  tipo: 'peca' | 'servico';
  quantidade: number;
  valorUnitarioCentavos: number;
}

function paraValorInput(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',');
}

export function ItemsTable({
  itens,
  onRemover,
  onEditar,
}: {
  itens: ItemListado[];
  onRemover: (id: string) => void;
  onEditar: (id: string, dados: ItemEditado) => void;
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<'peca' | 'servico'>('peca');
  const [quantidade, setQuantidade] = useState('');
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  if (itens.length === 0) {
    return <EmptyState>Nenhum item adicionado ainda.</EmptyState>;
  }

  function iniciarEdicao(item: ItemListado) {
    setEditandoId(item.id);
    setDescricao(item.descricao);
    setTipo(item.tipo);
    setQuantidade(String(item.quantidade));
    setValor(paraValorInput(item.valorUnitarioCentavos));
    setErro(null);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setErro(null);
  }

  function salvarEdicao(id: string) {
    setErro(null);
    try {
      if (!descricao.trim()) throw new Error('Descrição é obrigatória');
      const quantidadeNumero = Number(quantidade);
      if (!Number.isFinite(quantidadeNumero) || quantidadeNumero <= 0) throw new Error('Quantidade deve ser maior que zero');
      const valorUnitarioCentavos = parseReaisParaCentavos(valor);

      onEditar(id, { descricao: descricao.trim(), tipo, quantidade: quantidadeNumero, valorUnitarioCentavos });
      setEditandoId(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  return (
    <>
      {/* Mobile (<640px): um card por item, para não precisar rolar a tela para os lados. */}
      <div className="space-y-3 sm:hidden" data-testid="itens-cards">
        {itens.map((item) => {
          if (item.id === editandoId) {
            return (
              <MobileCard key={item.id}>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} aria-label="Descrição do item" />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={tipo} onChange={(e) => setTipo(e.target.value as 'peca' | 'servico')} aria-label="Tipo do item">
                    <option value="peca">Peça</option>
                    <option value="servico">Serviço</option>
                  </Select>
                  <Input
                    type="number"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    aria-label="Quantidade do item"
                    placeholder="Qtd"
                  />
                </div>
                <Input value={valor} onChange={(e) => setValor(e.target.value)} aria-label="Valor unitário do item" placeholder="Valor unitário (R$)" />
                {erro && <p className="text-xs font-medium text-rose-600">{erro}</p>}
                <MobileCardActions>
                  <button type="button" onClick={() => salvarEdicao(item.id)} className="text-sm font-medium text-porto-blue hover:underline">
                    Salvar
                  </button>
                  <button type="button" onClick={cancelarEdicao} className="text-sm font-medium text-porto-gray hover:underline">
                    Cancelar
                  </button>
                </MobileCardActions>
              </MobileCard>
            );
          }

          return (
            <MobileCard key={item.id}>
              <MobileCardHeader
                title={item.descricao}
                badge={<Badge tone={item.tipo === 'peca' ? 'info' : 'neutral'}>{item.tipo === 'peca' ? 'Peça' : 'Serviço'}</Badge>}
              />
              <MobileCardRow label="Qtd" value={item.quantidade} />
              <MobileCardRow label="Valor unit." value={formatarReais(item.valorUnitarioCentavos)} />
              <MobileCardHighlight>Subtotal: {formatarReais(item.quantidade * item.valorUnitarioCentavos)}</MobileCardHighlight>
              <MobileCardActions>
                <button type="button" onClick={() => iniciarEdicao(item)} className="text-sm font-medium text-porto-blue hover:underline">
                  Editar
                </button>
                <button type="button" onClick={() => onRemover(item.id)} className="text-sm font-medium text-rose-600 hover:underline">
                  Remover
                </button>
              </MobileCardActions>
            </MobileCard>
          );
        })}
      </div>

      {/* Desktop (≥640px): tabela normal. */}
      <div className="hidden sm:block" data-testid="itens-tabela">
        <Table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Tipo</th>
              <th>Qtd</th>
              <th>Valor unit.</th>
              <th>Subtotal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => {
              if (item.id === editandoId) {
                return (
                  <tr key={item.id}>
                    <td>
                      <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} aria-label="Descrição do item" />
                      {erro && <p className="mt-1 text-xs font-medium text-rose-600">{erro}</p>}
                    </td>
                    <td>
                      <Select value={tipo} onChange={(e) => setTipo(e.target.value as 'peca' | 'servico')} aria-label="Tipo do item">
                        <option value="peca">Peça</option>
                        <option value="servico">Serviço</option>
                      </Select>
                    </td>
                    <td>
                      <Input
                        type="number"
                        value={quantidade}
                        onChange={(e) => setQuantidade(e.target.value)}
                        aria-label="Quantidade do item"
                        className="w-20"
                      />
                    </td>
                    <td>
                      <Input value={valor} onChange={(e) => setValor(e.target.value)} aria-label="Valor unitário do item" className="w-28" />
                    </td>
                    <td className="font-semibold text-porto-black">—</td>
                    <td className="whitespace-nowrap">
                      <button type="button" onClick={() => salvarEdicao(item.id)} className="text-sm font-medium text-porto-blue hover:underline">
                        Salvar
                      </button>{' '}
                      <button type="button" onClick={cancelarEdicao} className="text-sm font-medium text-porto-gray hover:underline">
                        Cancelar
                      </button>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={item.id}>
                  <td className="font-medium text-porto-black">{item.descricao}</td>
                  <td>
                    <Badge tone={item.tipo === 'peca' ? 'info' : 'neutral'}>{item.tipo === 'peca' ? 'Peça' : 'Serviço'}</Badge>
                  </td>
                  <td>{item.quantidade}</td>
                  <td>{formatarReais(item.valorUnitarioCentavos)}</td>
                  <td className="font-semibold text-porto-black">{formatarReais(item.quantidade * item.valorUnitarioCentavos)}</td>
                  <td className="whitespace-nowrap">
                    <button type="button" onClick={() => iniciarEdicao(item)} className="text-sm font-medium text-porto-blue hover:underline">
                      Editar
                    </button>{' '}
                    <button type="button" onClick={() => onRemover(item.id)} className="text-sm font-medium text-rose-600 hover:underline">
                      Remover
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </>
  );
}
