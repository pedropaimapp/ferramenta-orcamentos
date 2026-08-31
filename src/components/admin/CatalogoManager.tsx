'use client';

import React, { useState, type FormEvent } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { criarItemCatalogo, atualizarItemCatalogo, removerItemCatalogo } from '@/lib/catalogo/data';
import { formatarReais, parseReaisParaCentavos } from '@/lib/format';
import type { CatalogoItem } from '@/lib/types';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Table, EmptyState } from '@/components/ui/Table';
import { MobileCard, MobileCardHeader, MobileCardRow, MobileCardActions } from '@/components/ui/MobileCard';

export function CatalogoManager({ itensIniciais }: { itensIniciais: CatalogoItem[] }) {
  const [itens, setItens] = useState(itensIniciais);
  const [editando, setEditando] = useState<CatalogoItem | null>(null);
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<'peca' | 'servico'>('peca');
  const [marcaCodigo, setMarcaCodigo] = useState('');
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  function iniciarEdicao(item: CatalogoItem | null) {
    setEditando(item);
    setDescricao(item?.descricao ?? '');
    setTipo(item?.tipo ?? 'peca');
    setMarcaCodigo(item?.marcaCodigo ?? '');
    setValor(item ? (item.valorPadraoCentavos / 100).toFixed(2).replace('.', ',') : '');
    setErro(null);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const supabase = createBrowserClient();
    try {
      const valorPadraoCentavos = parseReaisParaCentavos(valor);
      const input = { descricao, tipo, marcaCodigo: marcaCodigo || null, valorPadraoCentavos };
      if (editando) {
        const atualizado = await atualizarItemCatalogo(supabase, editando.id, input);
        setItens((atuais) => atuais.map((i) => (i.id === atualizado.id ? atualizado : i)));
      } else {
        const criado = await criarItemCatalogo(supabase, input);
        setItens((atuais) => [...atuais, criado]);
      }
      iniciarEdicao(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  async function remover(id: string) {
    setErro(null);
    const supabase = createBrowserClient();
    try {
      await removerItemCatalogo(supabase, id);
      setItens((atuais) => atuais.filter((i) => i.id !== id));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  return (
    <div className="space-y-6">
      {itens.length === 0 ? (
        <EmptyState>Nenhum item cadastrado ainda.</EmptyState>
      ) : (
        <>
          {/* Mobile (<640px): um card por item. */}
          <div className="space-y-3 sm:hidden" data-testid="catalogo-cards">
            {itens.map((i) => (
              <MobileCard key={i.id}>
                <MobileCardHeader
                  title={i.descricao}
                  badge={<Badge tone={i.tipo === 'peca' ? 'info' : 'neutral'}>{i.tipo === 'peca' ? 'Peça' : 'Serviço'}</Badge>}
                />
                {i.marcaCodigo && <MobileCardRow label="Marca/Código" value={i.marcaCodigo} />}
                <MobileCardRow label="Valor" value={formatarReais(i.valorPadraoCentavos)} />
                <MobileCardActions>
                  <button type="button" onClick={() => iniciarEdicao(i)} className="text-sm font-medium text-porto-blue hover:underline">
                    Editar
                  </button>
                  <button type="button" onClick={() => remover(i.id)} className="text-sm font-medium text-rose-600 hover:underline">
                    Remover
                  </button>
                </MobileCardActions>
              </MobileCard>
            ))}
          </div>

          {/* Desktop (≥640px): tabela normal. */}
          <div className="hidden sm:block" data-testid="catalogo-tabela">
            <Table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>Marca/Código</th>
                  <th>Valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {itens.map((i) => (
                  <tr key={i.id}>
                    <td className="font-medium text-porto-black">{i.descricao}</td>
                    <td>
                      <Badge tone={i.tipo === 'peca' ? 'info' : 'neutral'}>{i.tipo === 'peca' ? 'Peça' : 'Serviço'}</Badge>
                    </td>
                    <td>{i.marcaCodigo}</td>
                    <td>{formatarReais(i.valorPadraoCentavos)}</td>
                    <td>
                      <div className="flex items-center gap-4">
                        <button type="button" onClick={() => iniciarEdicao(i)} className="text-sm font-medium text-porto-blue hover:underline">
                          Editar
                        </button>
                        <button type="button" onClick={() => remover(i.id)} className="text-sm font-medium text-rose-600 hover:underline">
                          Remover
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

      <Card as="form" onSubmit={salvar} className="max-w-xl space-y-3">
        <CardTitle>{editando ? 'Editar item' : 'Novo item'}</CardTitle>
        <Input placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
        <Select value={tipo} onChange={(e) => setTipo(e.target.value as 'peca' | 'servico')}>
          <option value="peca">Peça</option>
          <option value="servico">Serviço</option>
        </Select>
        <Input placeholder="Marca/Código (opcional)" value={marcaCodigo} onChange={(e) => setMarcaCodigo(e.target.value)} />
        <Input placeholder="Valor (R$)" value={valor} onChange={(e) => setValor(e.target.value)} required />
        {erro && <Alert>{erro}</Alert>}
        <div className="flex gap-2">
          <Button type="submit">Salvar</Button>
          {editando && (
            <Button type="button" variant="outline" onClick={() => iniciarEdicao(null)}>
              Cancelar
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
