import React from 'react';

const fieldClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-porto-black placeholder:text-porto-gray focus:border-porto-blue focus:outline-none focus:ring-2 focus:ring-porto-blue/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-porto-gray';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...props },
  ref
) {
  return <input ref={ref} className={`${fieldClasses} ${className}`.trim()} {...props} />;
});

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = '', ...props }, ref) {
    return <select ref={ref} className={`${fieldClasses} ${className}`.trim()} {...props} />;
  }
);

export function Label({ className = '', ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`mb-1 block text-xs font-semibold uppercase tracking-wide text-porto-gray ${className}`.trim()}
      {...props}
    />
  );
}

/** Rótulo + campo, para o padrão comum "Label em cima, input embaixo". */
export function Field({
  label,
  htmlFor,
  children,
  className = '',
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
