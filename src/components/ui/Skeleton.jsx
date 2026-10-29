import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const Skeleton = ({
  variante = 'retangulo',
  className,
  ...props
}) => {
  const variantes = {
    texto: 'h-4 w-full rounded-md',
    circulo: 'rounded-full shrink-0',
    retangulo: 'rounded-[18px] w-full',
    botao: 'h-[52px] w-full rounded-full',
  };

  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-[#F3E8E8] relative overflow-hidden',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.8s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/35 after:to-transparent',
        variantes[variante] || variantes.retangulo,
        className
      )}
      {...props}
    />
  );
};

Skeleton.displayName = 'Skeleton';
export default Skeleton;
