import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Clock, User, Scissors, ChevronRight } from 'lucide-react';
import { Botao } from './Botao.jsx';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const CartaoProximoHorario = ({
  diaSemana = 'HOJE',
  diaMes = '20',
  mesAbreviado = 'OUT',
  horario = '14:30',
  servicoNome = 'Corte & Escova',
  profissionalNome = 'Juliana Costa',
  duracao = '45 min',
  status = 'scheduled',
  aoRemarcar,
  aoVerDetalhes,
  className,
  ...props
}) => {
  const statusLabels = {
    scheduled: { texto: 'Confirmado', cor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    'in-progress': { texto: 'Em Atendimento', cor: 'bg-brand-tint text-brand border-brand/20 animate-pulse' },
    completed: { texto: 'Concluído', cor: 'bg-slate-50 text-slate-700 border-slate-200' },
    cancelled: { texto: 'Cancelado', cor: 'bg-rose-50 text-rose-700 border-rose-200' },
  };

  const statusBadge = statusLabels[status] || statusLabels.scheduled;

  return (
    <div
      className={cn(
        'relative flex flex-col p-5 rounded-[22px] bg-white border border-line/70 shadow-card transition-all duration-200',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-line/60">
        <span className="text-[12px] font-bold tracking-wider uppercase text-brand font-sans">
          Seu Próximo Horário
        </span>
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
            statusBadge.cor
          )}
        >
          {statusBadge.texto}
        </span>
      </div>

      <div className="flex items-start gap-4">
        {/* Badge de Data Estilizado */}
        <div className="flex flex-col items-center justify-center shrink-0 w-[58px] h-[66px] rounded-[18px] bg-brand-tint border border-line/60 shadow-xs text-brand">
          <span className="text-[10px] font-extrabold tracking-wider uppercase font-sans leading-none pt-1">
            {diaSemana}
          </span>
          <span className="font-serif text-[26px] font-bold leading-tight tabular-nums">
            {diaMes}
          </span>
          {mesAbreviado && (
            <span className="text-[9px] font-bold uppercase tracking-wider font-sans leading-none pb-1 opacity-80">
              {mesAbreviado}
            </span>
          )}
        </div>

        {/* Detalhes do Procedimento */}
        <div className="flex flex-col min-w-0 flex-1 text-left">
          <h4 className="text-[17px] font-bold text-ink truncate font-sans">
            {servicoNome}
          </h4>

          <div className="flex items-center gap-1.5 text-[13px] text-ink-soft mt-1">
            <User className="w-3.5 h-3.5 text-brand shrink-0" />
            <span className="truncate">com {profissionalNome}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[13px] text-ink-soft mt-0.5">
            <Clock className="w-3.5 h-3.5 text-brand shrink-0" />
            <span className="font-semibold text-ink">{horario}</span>
            {duracao && <span className="text-ink-soft/70">({duracao})</span>}
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      {(aoRemarcar || aoVerDetalhes) && (
        <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-line/40">
          {aoRemarcar && (
            <Botao
              variante="contorno"
              tamanho="sm"
              onClick={aoRemarcar}
              className="flex-1 text-[13px] h-9"
            >
              Remarcar
            </Botao>
          )}

          {aoVerDetalhes && (
            <Botao
              variante="secundario"
              tamanho="sm"
              onClick={aoVerDetalhes}
              className="flex-1 text-[13px] h-9"
            >
              Detalhes
            </Botao>
          )}
        </div>
      )}
    </div>
  );
};

CartaoProximoHorario.displayName = 'CartaoProximoHorario';
export default CartaoProximoHorario;
