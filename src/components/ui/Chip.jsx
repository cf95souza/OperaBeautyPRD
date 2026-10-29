import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const Chip = ({
  children,
  className,
  selecionado = false,
  onClick,
  icone,
  as: Component = 'button',
  ...props
}) => {
  return (
    <Component
      type={Component === 'button' ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-semibold transition-all duration-200 select-none cursor-pointer',
        selecionado
          ? 'bg-brand text-white shadow-sm'
          : 'bg-[#F6E4E4] text-[#8E3B4E] hover:bg-[#ebd4d4] active:scale-95 border border-line/60 shadow-xs',
        className
      )}
      {...props}
    >
      {icone && <span className="shrink-0 flex items-center">{icone}</span>}
      <span>{children}</span>
    </Component>
  );
};

export default Chip;
