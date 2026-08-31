'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '@/components/auth/LogoutButton';

const LINKS = [
  { href: '/dashboard', label: 'Meus orçamentos' },
  { href: '/orcamentos/novo', label: 'Novo orçamento' },
  { href: '/calculadora', label: 'Calculadora' },
];

export function NavLinks({ papel, nome }: { papel: 'consultor' | 'admin'; nome: string }) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const links = papel === 'admin' ? [...LINKS, { href: '/admin/oficinas', label: 'Admin' }] : LINKS;

  function isAtivo(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname?.startsWith(href));
  }

  return (
    <>
      {/* Desktop (≥768px): links lado a lado no cabeçalho. */}
      <nav className="hidden flex-1 items-center gap-1 md:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            // Desligado porque estes links ficam sempre visíveis no
            // cabeçalho: o pré-carregamento do Next.js dispararia pedidos
            // de fundo o tempo todo, que podem competir com a renovação do
            // login feita pelo middleware.
            prefetch={false}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isAtivo(link.href) ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Mobile (<768px): botão hambúrguer que abre uma gaveta lateral. */}
      <button
        type="button"
        onClick={() => setMenuAberto(true)}
        aria-label="Abrir menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white md:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {menuAberto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuAberto(false)} aria-hidden />
          <div role="dialog" aria-label="Menu" className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-porto-black">
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-sm font-semibold text-white">Menu</span>
              <button
                type="button"
                onClick={() => setMenuAberto(false)}
                aria-label="Fechar menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 px-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  onClick={() => setMenuAberto(false)}
                  className={`rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                    isAtivo(link.href) ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center justify-between border-t border-white/15 px-4 py-4 text-sm text-white/70">
              <span>{nome}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
