import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Star, Check } from 'lucide-react';
import { Avatar } from './Avatar.jsx';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const CartaoProfissional = ({
  id,
  nome,
  especialidade,
  foto,
  nota = 5.0,
  avaliacoesQtd,
  selecionado = false,
  aoSelecionar,
  proximoHorario,
  className,
  ...props
}) => {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selecionado}
      onClick={() => aoSelecionar && aoSelecionar(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          aoSelecionar && aoSelecionar(id);
        }
      }}
      className={cn(
        'group relative flex items-center justify-between p-4 rounded-[22px] bg-white border transition-all duration-200 select-none cursor-pointer',
        selecionado
          ? 'border-brand ring-2 ring-brand/15 shadow-premium bg-brand-tint/10'
          : 'border-line/70 hover:border-brand/40 hover:shadow-card shadow-xs active:scale-[0.99]',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <Avatar
          src={foto}
          nome={nome}
          tamanho="lg"
          anel={selecionado}
          anelCor="border-brand"
        />

        <div className="flex flex-col min-w-0 text-left">
          <h4 className="text-[16px] font-bold text-ink truncate group-hover:text-brand transition-colors">
            {nome}
          </h4>

          {especialidade && (
            <p className="text-[13px] text-ink-soft truncate font-sans">
              {especialidade}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span>{typeof nota === 'number' ? nota.toFixed(1) : nota}</span>
              {avaliacoesQtd ? (
                <span className="text-amber-600/80 font-normal">({avaliacoesQtd})</span>
              ) : null}
            </span>

            {proximoHorario && (
              <span className="text-[11px] text-ink-soft font-medium">
                Próx: <strong className="text-ink">{proximoHorario}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 ml-3">
        <div
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200',
            selecionado
              ? 'bg-brand text-white shadow-sm ring-2 ring-brand/20'
              : 'border border-line/80 text-ink-soft group-hover:border-brand/40 group-hover:text-brand'
          )}
        >
          {selecionado ? (
            <Check className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <span className="text-[13px] font-medium">+</span>
          )}
        </div>
      </div>
    </div>
  );
};

CartaoProfissional.displayName = 'CartaoProfissional';
export default CartaoProfissional;
