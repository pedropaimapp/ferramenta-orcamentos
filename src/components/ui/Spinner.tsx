import React from 'react';
import { LogoMark } from './Logo';

/**
 * Indicador de carregamento assinatura da marca: o disco de freio do logo
 * Top Stop girando, no lugar de um spinner genérico.
 */
export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span className={`inline-block animate-spin-slow motion-reduce:animate-none ${className}`}>
      <LogoMark className="drop-shadow-sm" />
    </span>
  );
}
