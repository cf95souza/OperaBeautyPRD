import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Check } from 'lucide-react';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const ChipSelecionavel = React.forwardRef(
  (
    {
      children,
      className,
      selecionado = false,
      aoAlternar,
      disabled = false,
      exibirCheck = true,
      icone,
      contador,
      role = 'checkbox',
      ...props
    },
    ref
  ) => {
    const handleClick = (e) => {
      if (disabled) return;
      if (aoAlternar) {
        aoAlternar(!selecionado, e);
      }
    };

    const handleKeyDown = (e) => {
      if (disabled) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleClick(e);
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        role={role}
        aria-checked={selecionado}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-semibold transition-all duration-200 select-none cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-1',
          selecionado
            ? 'bg-brand text-white shadow-sm active:scale-95'
            : 'bg-[#F6E4E4] text-[#8E3B4E] hover:bg-[#ebd4d4] active:scale-95 border border-line/60 shadow-xs',
          disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent active:scale-100 shadow-none',
          className
        )}
        {...props}
      >
        {selecionado && exibirCheck ? (
          <Check className="w-3.5 h-3.5 stroke-[2.5] shrink-0 animate-in zoom-in-50 duration-150" />
        ) : icone ? (
          <span className="shrink-0 flex items-center">{icone}</span>
        ) : null}

        <span>{children}</span>

        {contador !== undefined && (
          <span
            className={cn(
              'ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-bold',
              selecionado ? 'bg-white/20 text-white' : 'bg-brand/10 text-brand'
            )}
          >
            {contador}
          </span>
        )}
      </button>
    );
  }
);

ChipSelecionavel.displayName = 'ChipSelecionavel';
export default ChipSelecionavel;
