import React from 'react';

/**
 * Listras diagonais na extremidade da peça — elemento estrutural do guia de
 * marca (simboliza a faixa de pedestre). Usado como acabamento de barras
 * escuras (header, telas de login).
 */
export function StripeAccent({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`h-2 w-full ${className}`}
      style={{
        backgroundImage: 'repeating-linear-gradient(115deg, #00A1FC 0 6px, transparent 6px 16px)',
        maskImage: 'linear-gradient(to right, transparent 0%, transparent 55%, black 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 55%, black 100%)',
      }}
    />
  );
}
