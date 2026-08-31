import React from 'react';
import { redirect } from 'next/navigation';
import { getConsultorLogado } from '@/lib/auth/session';
import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  // Quem já está logado (ex.: abriu esse link de novo com a sessão ainda
  // válida) não deve ver o formulário de novo — vai direto pro app.
  const consultor = await getConsultorLogado();
  if (consultor && consultor.ativo) {
    redirect('/dashboard');
  }

  return <LoginForm />;
}
