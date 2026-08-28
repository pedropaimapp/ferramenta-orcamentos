'use client';

import React, { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email: login, password: senha });
    setCarregando(false);
    if (error) {
      setErro('Login ou senha inválidos.');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow">
        <h1 className="text-xl font-semibold">Entrar</h1>
        <div>
          <label className="block text-sm font-medium" htmlFor="login">Login</label>
          <input
            id="login"
            type="text"
            required
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        {erro && (
          <p className="text-sm text-red-600" role="alert">
            {erro}
          </p>
        )}
        <button type="submit" disabled={carregando} className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-50">
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
