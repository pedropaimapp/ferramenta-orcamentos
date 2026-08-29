import React from 'react';

/**
 * Envolve uma <table> nativa (thead/tbody/tr/th/td continuam comuns nos
 * componentes que a usam) aplicando o estilo padrão do app: container
 * arredondado, cabeçalho discreto, zebra e rolagem horizontal em telas
 * estreitas.
 */
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
      <table
        className="w-full text-left text-sm
          [&_thead]:border-b [&_thead]:border-slate-200 [&_thead]:bg-porto-offwhite/70
          [&_th]:whitespace-nowrap [&_th]:px-4 [&_th]:py-3 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-porto-gray
          [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle
          [&_tbody_tr:not(:last-child)]:border-b [&_tbody_tr:not(:last-child)]:border-slate-100
          [&_tbody_tr:hover]:bg-porto-blue/[0.03]"
      >
        {children}
      </table>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-porto-gray">{children}</p>;
}
