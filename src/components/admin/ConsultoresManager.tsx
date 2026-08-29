'use client';

import React, { useState, type FormEvent } from 'react';
import { criarConsultor, atualizarConsultor, desativarConsultor } from '@/lib/consultores/actions';
import type { Consultor, Oficina } from '@/lib/types';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Table, EmptyState } from '@/components/ui/Table';

export function ConsultoresManager({
  consultoresIniciais,
  oficinas,
}: {
  consultoresIniciais: Consultor[];
  oficinas: Oficina[];
}) {
  const [consultores, setConsultores] = useState(consultoresIniciais);
  const [editando, setEditando] = useState<Consultor | null>(null);
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [papel, setPapel] = useState<'consultor' | 'admin'>('consultor');
  const [oficinaIds, setOficinaIds] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const nomeOficinasPorId = Object.fromEntries(oficinas.map((o) => [o.id, o.nome]));

  function iniciarEdicao(consultor: Consultor | null) {
    setEditando(consultor);
    setNome(consultor?.nome ?? '');
    setLogin(consultor?.login ?? '');
    setSenha('');
    setPapel(consultor?.papel ?? 'consultor');
    setOficinaIds(consultor?.oficinaIds ?? []);
    setErro(null);
  }

  function alternarOficina(id: string) {
    setOficinaIds((atuais) => (atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id]));
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      if (editando) {
        await atualizarConsultor(editando.id, { nome, papel, oficinaIds });
        setConsultores((atuais) => atuais.map((c) => (c.id === editando.id ? { ...c, nome, papel, oficinaIds } : c)));
      } else {
        const criado = await criarConsultor({ nome, login, senha, papel, oficinaIds });
        setConsultores((atuais) => [...atuais, criado]);
      }
      iniciarEdicao(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  async function desativar(id: string) {
    setErro(null);
    try {
      await desativarConsultor(id);
      setConsultores((atuais) => atuais.map((c) => (c.id === id ? { ...c, ativo: false } : c)));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  return (
    <div className="space-y-6">
      {consultores.length === 0 ? (
        <EmptyState>Nenhum consultor cadastrado ainda.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Login</th>
              <th>Papel</th>
              <th>Oficinas</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {consultores.map((c) => (
              <tr key={c.id}>
                <td className="font-medium text-porto-black">{c.nome}</td>
                <td className="text-porto-gray">{c.login}</td>
                <td className="capitalize">{c.papel}</td>
                <td>{c.oficinaIds.length > 0 ? c.oficinaIds.map((id) => nomeOficinasPorId[id] ?? '—').join(', ') : '—'}</td>
                <td>
                  <Badge tone={c.ativo ? 'success' : 'neutral'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
                </td>
                <td>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => iniciarEdicao(c)} className="text-sm font-medium text-porto-blue hover:underline">
                      Editar
                    </button>
                    {c.ativo && (
                      <button type="button" onClick={() => desativar(c.id)} className="text-sm font-medium text-rose-600 hover:underline">
                        Desativar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Card as="form" onSubmit={salvar} className="max-w-xl space-y-3">
        <CardTitle>{editando ? 'Editar consultor' : 'Novo consultor'}</CardTitle>
        <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <Input
          placeholder="Login (e-mail)"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          required
          disabled={!!editando}
        />
        {!editando && (
          <Input placeholder="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        )}
        <Select value={papel} onChange={(e) => setPapel(e.target.value as 'consultor' | 'admin')}>
          <option value="consultor">Consultor</option>
          <option value="admin">Admin</option>
        </Select>
        <fieldset className="space-y-2 rounded-lg border border-slate-300 p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-porto-gray">Oficinas</legend>
          {oficinas.length === 0 && <p className="text-sm text-porto-gray">Nenhuma oficina cadastrada ainda.</p>}
          {oficinas.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-sm text-porto-black">
              <input
                type="checkbox"
                checked={oficinaIds.includes(o.id)}
                onChange={() => alternarOficina(o.id)}
                className="h-4 w-4 rounded border-slate-300 text-porto-blue focus:ring-porto-blue/30"
              />
              {o.nome}
            </label>
          ))}
        </fieldset>
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
