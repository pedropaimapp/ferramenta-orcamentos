'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'Meus orçamentos' },
  { href: '/orcamentos/novo', label: 'Novo orçamento' },
  { href: '/calculadora', label: 'Calculadora' },
];

export function NavLinks({ papel }: { papel: 'consultor' | 'admin' }) {
  const pathname = usePathname();
  const links = papel === 'admin' ? [...LINKS, { href: '/admin/orcamentos', label: 'Admin' }] : LINKS;

  return (
    <nav className="hidden flex-1 items-center gap-1 md:flex">
      {links.map((link) => {
        const active = pathname === link.href || (link.href !== '/dashboard' && pathname?.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
