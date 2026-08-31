'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin/oficinas', label: 'Oficinas' },
  { href: '/admin/consultores', label: 'Consultores' },
  { href: '/admin/catalogo', label: 'Catálogo' },
  { href: '/admin/pagamento', label: 'Pagamento' },
];

export function AdminNavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-slate-200 pb-4">
      {LINKS.map((link) => {
        const active = pathname?.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? 'bg-porto-blue/10 text-porto-blueDark' : 'text-porto-gray hover:bg-porto-offwhite hover:text-porto-black'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
