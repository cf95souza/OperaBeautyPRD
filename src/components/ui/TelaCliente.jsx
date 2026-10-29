import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * TelaCliente — Componente Base de Layout com Área Segura (Safe Area)
 * 
 * Centraliza e encapsula o tratamento de notch (safe-area-inset-top) e
 * barra de gestos inferior (safe-area-inset-bottom) para todas as telas do cliente,
 * eliminando a repetição de paddings manuais `pt-[calc(env(safe-area-inset-top)+Npx)]`.
 * 
 * Conforme Plano de Melhorias §2.3 e §4·A3.
 */
export const TelaCliente = ({
  children,
  className,
  containerClassName,
  larguraMaxima = 'max-w-[420px]',
  temNavegacaoInferior = false,
  temBarraFixaInferior = false,
  safeAreaTop = true,
  safeAreaBottom = true,
  fundo = 'bg-bg',
  ...props
}) => {
  return (
    <div
      className={cn(
        'min-h-screen text-ink flex flex-col relative w-full isolate',
        fundo,
        safeAreaTop && 'pt-[env(safe-area-inset-top,0px)]',
        safeAreaBottom && !temBarraFixaInferior && !temNavegacaoInferior && 'pb-[env(safe-area-inset-bottom,0px)]',
        temNavegacaoInferior && 'pb-[calc(env(safe-area-inset-bottom,0px)+80px)]',
        temBarraFixaInferior && 'pb-[calc(env(safe-area-inset-bottom,0px)+96px)]',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'w-full mx-auto flex-1 flex flex-col',
          larguraMaxima,
          containerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
};

TelaCliente.displayName = 'TelaCliente';
export default TelaCliente;
