'use client';

import React, { useState, type FormEvent } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { criarItemCatalogo, atualizarItemCatalogo, removerItemCatalogo } from '@/lib/catalogo/data';
import { formatarReais, parseReaisParaCentavos } from '@/lib/format';
import type { CatalogoItem } from '@/lib/types';

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
      <table className="w-full text-left text-sm">
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
              <td>{i.descricao}</td>
              <td>{i.tipo === 'peca' ? 'Peça' : 'Serviço'}</td>
              <td>{i.marcaCodigo}</td>
              <td>{formatarReais(i.valorPadraoCentavos)}</td>
              <td className="space-x-2">
                <button type="button" onClick={() => iniciarEdicao(i)}>
                  Editar
                </button>
                <button type="button" onClick={() => remover(i.id)}>
                  Remover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={salvar} className="space-y-2 rounded border p-4">
        <h2 className="font-medium">{editando ? 'Editar item' : 'Novo item'}</h2>
        <input placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} required className="w-full rounded border px-2 py-1" />
        <select value={tipo} onChange={(e) => setTipo(e.target.value as 'peca' | 'servico')} className="w-full rounded border px-2 py-1">
          <option value="peca">Peça</option>
          <option value="servico">Serviço</option>
        </select>
        <input placeholder="Marca/Código (opcional)" value={marcaCodigo} onChange={(e) => setMarcaCodigo(e.target.value)} className="w-full rounded border px-2 py-1" />
        <input placeholder="Valor (R$)" value={valor} onChange={(e) => setValor(e.target.value)} required className="w-full rounded border px-2 py-1" />
        {erro && (
          <p role="alert" className="text-sm text-red-600">
            {erro}
          </p>
        )}
        <div className="flex gap-2">
          <button type="submit" className="rounded bg-black px-3 py-1 text-white">
            Salvar
          </button>
          {editando && (
            <button type="button" onClick={() => iniciarEdicao(null)}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
