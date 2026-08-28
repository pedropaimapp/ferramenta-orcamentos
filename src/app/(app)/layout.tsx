import Link from 'next/link';
import { exigirConsultor } from '@/lib/auth/guards';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const consultor = await exigirConsultor();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <nav className="flex gap-4 text-sm">
          <Link href="/dashboard">Meus orçamentos</Link>
          <Link href="/orcamentos/novo">Novo orçamento</Link>
          <Link href="/calculadora">Calculadora</Link>
          {consultor.papel === 'admin' && <Link href="/admin/orcamentos">Admin</Link>}
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <span>{consultor.nome}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
