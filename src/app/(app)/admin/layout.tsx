import Link from 'next/link';
import { exigirAdmin } from '@/lib/auth/guards';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  return (
    <div className="space-y-6">
      <nav className="flex gap-4 border-b pb-4 text-sm">
        <Link href="/admin/oficinas">Oficinas</Link>
        <Link href="/admin/consultores">Consultores</Link>
        <Link href="/admin/catalogo">Catálogo</Link>
        <Link href="/admin/pagamento">Pagamento</Link>
        <Link href="/admin/orcamentos">Orçamentos</Link>
      </nav>
      {children}
    </div>
  );
}
