'use client';

import React, { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Logo } from '@/components/ui/Logo';
import { StripeAccent } from '@/components/ui/StripeAccent';
import { Field, Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export function LoginForm() {
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
    <main className="flex min-h-screen items-center justify-center bg-porto-black px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo variant="white" className="h-12" priority />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-8 shadow-xl shadow-black/30">
          <div>
            <h1 className="font-heading text-xl font-bold text-porto-black">Entrar</h1>
            <p className="text-sm text-porto-gray">Acesse sua conta para montar orçamentos.</p>
          </div>
          <Field label="Login" htmlFor="login">
            <Input id="login" type="text" required value={login} onChange={(e) => setLogin(e.target.value)} />
          </Field>
          <Field label="Senha" htmlFor="senha">
            <Input id="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          </Field>
          {erro && <Alert>{erro}</Alert>}
          <Button type="submit" loading={carregando} className="w-full">
            {carregando ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        <StripeAccent className="mt-8" />
      </div>
    </main>
  );
}
