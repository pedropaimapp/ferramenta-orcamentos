import React from 'react';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'dark' | 'outline' | 'ghost' | 'danger' | 'success' | 'link';
export type ButtonSize = 'sm' | 'md';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-porto-blue';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-porto-blue text-white hover:bg-porto-blueDark active:bg-porto-blueDark',
  dark: 'bg-porto-black text-white hover:bg-black',
  outline: 'border border-slate-300 bg-white text-porto-black hover:border-porto-blue hover:text-porto-blue',
  ghost: 'text-porto-black hover:bg-porto-offwhite',
  danger: 'border border-rose-200 bg-white text-rose-600 hover:border-rose-300 hover:bg-rose-50',
  success: 'border border-emerald-200 bg-white text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50',
  link: 'text-porto-blue hover:underline font-medium p-0 h-auto',
};

// py-2.5 (em vez de py-2) dá uma área de toque mais confortável no mobile,
// mantendo o botão discreto no desktop.
const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className = '') {
  const sizeClasses = variant === 'link' ? '' : sizes[size];
  return `${base} ${variants[variant]} ${sizeClasses} ${className}`.trim();
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className = '', children, disabled, ...props },
  ref
) {
  return (
    <button ref={ref} className={buttonClasses(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
});
