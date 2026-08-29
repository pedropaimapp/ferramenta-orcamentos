'use client';

import { useState, type FormEvent } from 'react';
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
  const [oficinaId, setOficinaId] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  function iniciarEdicao(consultor: Consultor | null) {
    setEditando(consultor);
    setNome(consultor?.nome ?? '');
    setLogin(consultor?.login ?? '');
    setSenha('');
    setPapel(consultor?.papel ?? 'consultor');
    setOficinaId(consultor?.oficinaId ?? '');
    setErro(null);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      if (editando) {
        await atualizarConsultor(editando.id, { nome, papel, oficinaId: oficinaId || null });
        setConsultores((atuais) => atuais.map((c) => (c.id === editando.id ? { ...c, nome, papel, oficinaId: oficinaId || null } : c)));
      } else {
        const criado = await criarConsultor({ nome, login, senha, papel, oficinaId: oficinaId || null });
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
        <select value={oficinaId} onChange={(e) => setOficinaId(e.target.value)} className="w-full rounded border px-2 py-1">
          <option value="">Sem oficina (admin)</option>
          {oficinas.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
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
