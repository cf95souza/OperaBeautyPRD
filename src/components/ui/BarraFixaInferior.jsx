import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Botao } from './Botao.jsx';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const BarraFixaInferior = ({
  textoSecundario,
  valorPrincipal,
  textoBotao = 'Continuar →',
  aoClicar,
  isLoading = false,
  disabled = false,
  iconeFim,
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-line/70 shadow-lg px-4 pt-3.5 pb-[calc(env(safe-area-inset-bottom)+12px)] select-none transition-all duration-200',
        className
      )}
      {...props}
    >
      <div className="max-w-md mx-auto w-full">
        {children ? (
          children
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col text-left min-w-0">
              {textoSecundario && (
                <span className="text-[12px] font-medium text-ink-soft truncate font-sans">
                  {textoSecundario}
                </span>
              )}
              {valorPrincipal && (
                <span className="font-serif text-[22px] font-bold text-ink leading-tight tabular-nums">
                  {valorPrincipal}
                </span>
              )}
            </div>

            <Botao
              variante="primario"
              tamanho="lg"
              isLoading={isLoading}
              disabled={disabled}
              onClick={aoClicar}
              iconeFim={iconeFim}
              className="h-[52px] px-7 text-[16px] shrink-0"
            >
              {textoBotao}
            </Botao>
          </div>
        )}
      </div>
    </div>
  );
};

BarraFixaInferior.displayName = 'BarraFixaInferior';
export default BarraFixaInferior;
