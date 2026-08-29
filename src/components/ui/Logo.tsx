import React from 'react';
import Image from 'next/image';

/**
 * Logo da Top Stop. Use `variant="white"` sobre fundos escuros (header, PDV,
 * telas de login) e `variant="color"` (padrão) sobre fundos claros.
 */
export function Logo({
  variant = 'color',
  className,
  priority,
}: {
  variant?: 'color' | 'white';
  className?: string;
  priority?: boolean;
}) {
  const src = variant === 'white' ? '/brand/logo-white.png' : '/brand/logo.png';
  return (
    <Image
      src={src}
      alt="Top Stop Centro Automotivo"
      width={1600}
      height={592}
      priority={priority}
      unoptimized
      className={className}
      style={{ width: 'auto', height: '100%' }}
    />
  );
}

/** Ícone do disco de freio isolado — usado em favicons, spinners e marcas d'água. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/mark.png"
      alt=""
      aria-hidden
      width={700}
      height={697}
      unoptimized
      className={className}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
