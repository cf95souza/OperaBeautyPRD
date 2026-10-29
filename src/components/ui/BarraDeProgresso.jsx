import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const BarraDeProgresso = ({
  etapaAtual = 1,
  totalEtapas = 4,
  tituloEtapa,
  exibirRotulo = true,
  className,
  ...props
}) => {
  const porcentagem = Math.min(100, Math.max(0, Math.round((etapaAtual / totalEtapas) * 100)));

  return (
    <div
      className={cn('w-full flex flex-col gap-2', className)}
      role="progressbar"
      aria-valuenow={etapaAtual}
      aria-valuemin={1}
      aria-valuemax={totalEtapas}
      aria-label={tituloEtapa ? `Etapa ${etapaAtual} de ${totalEtapas}: ${tituloEtapa}` : `Etapa ${etapaAtual} de ${totalEtapas}`}
      {...props}
    >
      {exibirRotulo && (
        <div className="flex items-center justify-between text-[12px] font-semibold text-ink-soft select-none">
          <span className="font-bold text-brand uppercase tracking-wider">
            {etapaAtual} de {totalEtapas}
          </span>
          {tituloEtapa && (
            <span className="text-ink truncate ml-2 font-medium">
              {tituloEtapa}
            </span>
          )}
          <span className="text-[11px] tabular-nums text-disabled">
            {porcentagem}%
          </span>
        </div>
      )}

      {/* Trilho e Barra de preenchimento */}
      <div className="w-full h-1.5 rounded-full bg-[#F6E4E4] overflow-hidden">
        <div
          className="h-full bg-brand rounded-full transition-all duration-300 ease-out"
          style={{ width: `${porcentagem}%` }}
        />
      </div>
    </div>
  );
};

BarraDeProgresso.displayName = 'BarraDeProgresso';
export default BarraDeProgresso;
