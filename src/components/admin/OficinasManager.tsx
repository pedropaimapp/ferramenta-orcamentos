'use client';

import React, { useState, type FormEvent } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { criarOficina, atualizarOficina, enviarLogoOficina } from '@/lib/oficinas/data';
import type { Oficina } from '@/lib/types';
import { Card, CardTitle } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Table, EmptyState } from '@/components/ui/Table';
import { MobileCard, MobileCardHeader, MobileCardRow, MobileCardActions } from '@/components/ui/MobileCard';

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
      {oficinas.length === 0 ? (
        <EmptyState>Nenhuma oficina cadastrada ainda.</EmptyState>
      ) : (
        <>
          {/* Mobile (<640px): um card por oficina. */}
          <div className="space-y-3 sm:hidden" data-testid="oficinas-cards">
            {oficinas.map((o) => (
              <MobileCard key={o.id}>
                <MobileCardHeader title={o.nome} />
                <MobileCardRow label="Endereço" value={o.endereco} />
                <MobileCardRow label="Telefone" value={o.telefone} />
                <MobileCardActions>
                  <button type="button" onClick={() => iniciarEdicao(o)} className="text-sm font-medium text-porto-blue hover:underline">
                    Editar
                  </button>
                </MobileCardActions>
              </MobileCard>
            ))}
          </div>

          {/* Desktop (≥640px): tabela normal. */}
          <div className="hidden sm:block" data-testid="oficinas-tabela">
            <Table>
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
                    <td className="font-medium text-porto-black">{o.nome}</td>
                    <td className="text-porto-gray">{o.endereco}</td>
                    <td>{o.telefone}</td>
                    <td>
                      <button type="button" onClick={() => iniciarEdicao(o)} className="text-sm font-medium text-porto-blue hover:underline">
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}

      <Card as="form" onSubmit={salvar} className="max-w-xl space-y-3">
        <CardTitle>{editando ? 'Editar oficina' : 'Nova oficina'}</CardTitle>
        <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <Input placeholder="Endereço" value={endereco} onChange={(e) => setEndereco(e.target.value)} required />
        <Input placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} required />
        <Field label="Logo (opcional)" htmlFor="logo-oficina">
          {editando?.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={editando.logoUrl} alt={`Logo atual de ${editando.nome}`} className="mb-2 h-12 w-12 rounded-lg border border-slate-200 object-contain p-1" />
          )}
          <input
            id="logo-oficina"
            type="file"
            accept="image/*"
            onChange={(e) => setArquivoLogo(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-porto-gray file:mr-3 file:rounded-lg file:border-0 file:bg-porto-offwhite file:px-3 file:py-2 file:text-sm file:font-medium file:text-porto-black hover:file:bg-slate-200"
          />
        </Field>
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
