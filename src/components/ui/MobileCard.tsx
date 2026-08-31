import React from 'react';

/**
 * "Card por linha" usado como alternativa às tabelas (`Table`) em telas
 * estreitas (abaixo de `sm`, 640px) — cada linha de uma lista vira um card
 * com campos rotulados, em vez de colunas apertadas que exigem rolagem
 * horizontal. Cada tela que usa `Table` renderiza os dois: um `<div
 * className="sm:hidden">` com `MobileCard`s e outro `<div className="hidden
 * sm:block">` com a `Table`, para o mesmo conjunto de itens.
 */
export function MobileCard({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.02]">{children}</div>;
}

/** Título em destaque (ex.: descrição/nome) com um selo opcional ao lado. */
export function MobileCardHeader({ title, badge }: { title: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[15px] font-semibold text-porto-black">{title}</span>
      {badge}
    </div>
  );
}

/** Um campo rotulado (rótulo à esquerda, valor à direita). */
export function MobileCardRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-porto-gray">
      <span>{label}</span>
      <span className="font-medium text-porto-black">{value}</span>
    </div>
  );
}

/** Linha de destaque (ex.: subtotal) — mais peso visual que `MobileCardRow`. */
export function MobileCardHighlight({ children }: { children: React.ReactNode }) {
  return <div className="text-[15px] font-bold text-porto-black">{children}</div>;
}

/** Rodapé com as ações do card (Editar/Remover etc.), separado por um traço. */
export function MobileCardActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 flex flex-wrap gap-4 border-t border-slate-100 pt-3">{children}</div>;
}
