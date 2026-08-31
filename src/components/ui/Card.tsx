import React from 'react';

const cardClasses = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.02] sm:p-5';

type CardDivProps = { as?: 'div' } & React.HTMLAttributes<HTMLDivElement>;
type CardFormProps = { as: 'form' } & React.FormHTMLAttributes<HTMLFormElement>;

/**
 * O "container" do guia de marca: bloco arredondado que enquadra formulários e
 * blocos de conteúdo. Passe `as="form"` para usá-lo como o próprio elemento
 * <form> (evita aninhar uma <div> e um <form> com o mesmo estilo).
 */
export function Card({ as = 'div', className = '', ...props }: CardDivProps | CardFormProps) {
  const classes = `${cardClasses} ${className}`.trim();
  if (as === 'form') {
    return <form className={classes} {...(props as React.FormHTMLAttributes<HTMLFormElement>)} />;
  }
  return <div className={classes} {...(props as React.HTMLAttributes<HTMLDivElement>)} />;
}

export function CardTitle({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`font-heading text-base font-bold text-porto-black ${className}`.trim()} {...props} />;
}
