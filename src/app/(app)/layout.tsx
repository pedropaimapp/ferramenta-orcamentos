import Link from 'next/link';
import { exigirConsultor } from '@/lib/auth/guards';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { Logo } from '@/components/ui/Logo';
import { StripeAccent } from '@/components/ui/StripeAccent';
import { NavLinks } from './NavLinks';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const consultor = await exigirConsultor();

  return (
    <div className="min-h-screen bg-porto-offwhite">
      <header className="bg-porto-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:gap-6 sm:px-6">
          <Link href="/dashboard" className="h-8 shrink-0">
            <Logo variant="white" className="h-8" priority />
          </Link>
          <NavLinks papel={consultor.papel} nome={consultor.nome} />
          <div className="flex items-center gap-4 text-sm text-white/80">
            <span className="hidden sm:inline">{consultor.nome}</span>
            <LogoutButton />
          </div>
        </div>
        <StripeAccent />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
