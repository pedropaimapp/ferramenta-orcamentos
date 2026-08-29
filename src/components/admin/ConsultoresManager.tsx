'use client';

import React, { useState, type FormEvent } from 'react';
import { criarConsultor, atualizarConsultor, desativarConsultor } from '@/lib/consultores/actions';
import type { Consultor, Oficina } from '@/lib/types';

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
      <table className="w-full text-left text-sm">
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
              <td>{c.nome}</td>
              <td>{c.login}</td>
              <td>{c.papel}</td>
              <td>{c.oficinaIds.length > 0 ? c.oficinaIds.map((id) => nomeOficinasPorId[id] ?? '—').join(', ') : '—'}</td>
              <td>{c.ativo ? 'Ativo' : 'Inativo'}</td>
              <td className="space-x-2">
                <button type="button" onClick={() => iniciarEdicao(c)}>
                  Editar
                </button>
                {c.ativo && (
                  <button type="button" onClick={() => desativar(c.id)}>
                    Desativar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={salvar} className="space-y-2 rounded border p-4">
        <h2 className="font-medium">{editando ? 'Editar consultor' : 'Novo consultor'}</h2>
        <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full rounded border px-2 py-1" />
        <input
          placeholder="Login (e-mail)"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          required
          disabled={!!editando}
          className="w-full rounded border px-2 py-1"
        />
        {!editando && (
          <input placeholder="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required className="w-full rounded border px-2 py-1" />
        )}
        <select value={papel} onChange={(e) => setPapel(e.target.value as 'consultor' | 'admin')} className="w-full rounded border px-2 py-1">
          <option value="consultor">Consultor</option>
          <option value="admin">Admin</option>
        </select>
        <fieldset className="space-y-1 rounded border p-2">
          <legend className="px-1 text-sm">Oficinas</legend>
          {oficinas.length === 0 && <p className="text-sm text-gray-500">Nenhuma oficina cadastrada ainda.</p>}
          {oficinas.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={oficinaIds.includes(o.id)} onChange={() => alternarOficina(o.id)} />
              {o.nome}
            </label>
          ))}
        </fieldset>
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
