import { redirect } from 'next/navigation';
import { getConsultorLogado } from './session';
import type { Consultor } from '../types';

export async function exigirConsultor(): Promise<Consultor> {
  const consultor = await getConsultorLogado();
  if (!consultor || !consultor.ativo) {
    redirect('/login');
  }
  return consultor;
}

export async function exigirAdmin(): Promise<Consultor> {
  const consultor = await exigirConsultor();
  if (consultor.papel !== 'admin') {
    redirect('/dashboard');
  }
  return consultor;
}
