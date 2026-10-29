import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const CampoTexto = React.forwardRef(
  (
    {
      id,
      label,
      error,
      textoAjuda,
      iconeEsquerda,
      iconeDireita,
      className,
      containerClassName,
      type = 'text',
      required = false,
      disabled = false,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn('w-full flex flex-col text-left', containerClassName)}>
        {label && (
          <label htmlFor={id} className="text-[13px] font-semibold text-ink mb-1.5 flex items-center gap-1">
            {label}
            {required && <span className="text-danger">*</span>}
          </label>
        )}
        <div
          className={cn(
            'relative flex items-center w-full h-[56px] rounded-[18px] bg-white border border-line px-4 transition-all duration-200 shadow-sm',
            'focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15',
            error && 'border-danger focus-within:border-danger focus-within:ring-danger/15',
            disabled && 'bg-bg/50 border-line/60 cursor-not-allowed opacity-75'
          )}
        >
          {iconeEsquerda && (
            <span className="shrink-0 text-brand-accent flex items-center mr-2.5 pointer-events-none">
              {iconeEsquerda}
            </span>
          )}
          <input
            id={id}
            ref={ref}
            type={type}
            disabled={disabled}
            className={cn(
              'w-full h-full bg-transparent text-[16px] text-ink placeholder:text-disabled font-sans focus:outline-none',
              className
            )}
            {...props}
          />
          {iconeDireita && (
            <span className="shrink-0 flex items-center ml-2.5">
              {iconeDireita}
            </span>
          )}
        </div>
        {error ? (
          <p className="text-[12px] text-danger mt-1.5 font-medium leading-snug">
            {error}
          </p>
        ) : textoAjuda ? (
          <p className="text-[12px] text-ink-soft mt-1.5 leading-snug">
            {textoAjuda}
          </p>
        ) : null}
      </div>
    );
  }
);

CampoTexto.displayName = 'CampoTexto';
export default CampoTexto;
