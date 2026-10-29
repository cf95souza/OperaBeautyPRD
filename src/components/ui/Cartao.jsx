import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const variantes = {
  padrao: 'bg-white border border-line/70 shadow-card',
  elevado: 'bg-white border border-line/50 shadow-premium',
  tint: 'bg-brand-tint border border-line/60',
  contorno: 'bg-transparent border border-line',
  suave: 'bg-bg border border-line/50',
};

export const Cartao = React.forwardRef(
  (
    {
      children,
      className,
      variante = 'padrao',
      interativo = false,
      onClick,
      as: Component = 'div',
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick(e);
                }
              }
            : undefined
        }
        className={cn(
          'rounded-[22px] p-5 transition-all duration-300 text-ink relative',
          variantes[variante] || variantes.padrao,
          interativo &&
            'cursor-pointer hover:border-brand/40 hover:shadow-premium active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-brand/30',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Cartao.displayName = 'Cartao';
export default Cartao;
