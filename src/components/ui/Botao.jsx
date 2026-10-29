import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const variantes = {
  primario: 'bg-brand text-white hover:opacity-95 shadow-sm active:scale-[0.99]',
  secundario: 'bg-brand-tint text-brand hover:opacity-90 active:scale-[0.99] border border-line/60',
  contorno: 'bg-surface border border-line text-ink hover:bg-brand-tint/30 active:scale-[0.99]',
  texto: 'bg-transparent text-brand hover:underline p-0 active:opacity-75',
  danger: 'bg-danger text-white hover:opacity-95 shadow-sm active:scale-[0.99]',
};

const tamanhos = {
  sm: 'h-9 px-4 text-[13px] font-medium rounded-full',
  md: 'h-11 px-5 text-[14px] font-semibold rounded-full',
  lg: 'h-[52px] px-6 text-[16px] font-semibold rounded-full',
  icon: 'w-10 h-10 p-0 rounded-full flex items-center justify-center shrink-0',
};

export const Botao = React.forwardRef(
  (
    {
      children,
      className,
      variante = 'primario',
      tamanho = 'lg',
      isLoading = false,
      disabled = false,
      iconeInicio,
      iconeFim,
      tipo = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={tipo}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 select-none transition-all duration-200 font-sans focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2',
          variantes[variante] || variantes.primario,
          tamanhos[tamanho] || tamanhos.lg,
          (disabled || isLoading) && 'opacity-65 cursor-not-allowed active:scale-100 hover:opacity-65',
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-5 w-5 text-current shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && iconeInicio && <span className="shrink-0 flex items-center">{iconeInicio}</span>}
        <span>{children}</span>
        {!isLoading && iconeFim && <span className="shrink-0 flex items-center">{iconeFim}</span>}
      </button>
    );
  }
);

Botao.displayName = 'Botao';
export default Botao;
