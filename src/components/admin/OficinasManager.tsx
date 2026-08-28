'use client';

import React, { useState, type FormEvent } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { criarOficina, atualizarOficina, enviarLogoOficina } from '@/lib/oficinas/data';
import type { Oficina } from '@/lib/types';

export function OficinasManager({ oficinasIniciais }: { oficinasIniciais: Oficina[] }) {
  const [oficinas, setOficinas] = useState(oficinasIniciais);
  const [editando, setEditando] = useState<Oficina | null>(null);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [arquivoLogo, setArquivoLogo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function iniciarEdicao(oficina: Oficina | null) {
    setEditando(oficina);
    setNome(oficina?.nome ?? '');
    setEndereco(oficina?.endereco ?? '');
    setTelefone(oficina?.telefone ?? '');
    setArquivoLogo(null);
    setErro(null);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const supabase = createBrowserClient();
    try {
      let oficinaSalva: Oficina;
      if (editando) {
        oficinaSalva = await atualizarOficina(supabase, editando.id, { nome, endereco, telefone });
      } else {
        oficinaSalva = await criarOficina(supabase, { nome, endereco, telefone });
      }

      if (arquivoLogo) {
        const logoUrl = await enviarLogoOficina(supabase, oficinaSalva.id, arquivoLogo);
        oficinaSalva = await atualizarOficina(supabase, oficinaSalva.id, { nome, endereco, telefone, logoUrl });
      }

      setOficinas((atuais) =>
        editando ? atuais.map((o) => (o.id === oficinaSalva.id ? oficinaSalva : o)) : [...atuais, oficinaSalva]
      );
      iniciarEdicao(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  return (
    <div className="space-y-6">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Endereço</th>
            <th>Telefone</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {oficinas.map((o) => (
            <tr key={o.id}>
              <td>{o.nome}</td>
              <td>{o.endereco}</td>
              <td>{o.telefone}</td>
              <td>
                <button type="button" onClick={() => iniciarEdicao(o)}>
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={salvar} className="space-y-2 rounded border p-4">
        <h2 className="font-medium">{editando ? 'Editar oficina' : 'Nova oficina'}</h2>
        <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full rounded border px-2 py-1" />
        <input placeholder="Endereço" value={endereco} onChange={(e) => setEndereco(e.target.value)} required className="w-full rounded border px-2 py-1" />
        <input placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} required className="w-full rounded border px-2 py-1" />
        <div>
          <label className="block text-sm" htmlFor="logo-oficina">
            Logo (opcional)
          </label>
          {editando?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={editando.logoUrl} alt={`Logo atual de ${editando.nome}`} className="mb-1 h-12 w-12 object-contain" />
          )}
          <input
            id="logo-oficina"
            type="file"
            accept="image/*"
            onChange={(e) => setArquivoLogo(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </div>
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
