import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Sun, CloudSun, Moon } from 'lucide-react';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const GradeDeHorarios = ({
  horarios = [],
  horarioSelecionado,
  aoSelecionarHorario,
  bloqueados = [],
  exibirPeriodos = true,
  className,
  ...props
}) => {
  // Separar horários por turnos
  const periodos = {
    manha: {
      titulo: 'MANHÃ',
      icone: <Sun className="w-3.5 h-3.5 text-amber-500" />,
      slots: [],
    },
    tarde: {
      titulo: 'TARDE',
      icone: <CloudSun className="w-3.5 h-3.5 text-orange-500" />,
      slots: [],
    },
    noite: {
      titulo: 'NOITE',
      icone: <Moon className="w-3.5 h-3.5 text-indigo-400" />,
      slots: [],
    },
  };

  horarios.forEach((item) => {
    const horaTexto = typeof item === 'string' ? item : item.hora;
    const horaNum = parseInt(horaTexto.split(':')[0], 10);

    if (horaNum < 12) {
      periodos.manha.slots.push(item);
    } else if (horaNum < 18) {
      periodos.tarde.slots.push(item);
    } else {
      periodos.noite.slots.push(item);
    }
  });

  const renderSlot = (item) => {
    const horaTexto = typeof item === 'string' ? item : item.hora;
    const ocupado =
      typeof item === 'object' && item.disponivel === false
        ? true
        : bloqueados.includes(horaTexto);
    const selecionado = horarioSelecionado === horaTexto;

    return (
      <button
        key={horaTexto}
        type="button"
        role="button"
        aria-pressed={selecionado}
        aria-disabled={ocupado}
        disabled={ocupado}
        onClick={() => !ocupado && aoSelecionarHorario && aoSelecionarHorario(horaTexto)}
        className={cn(
          'h-11 flex items-center justify-center rounded-[14px] text-[15px] font-semibold transition-all duration-150 select-none font-sans',
          'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-1',
          selecionado && 'bg-brand text-white shadow-sm ring-2 ring-brand/20 active:scale-95',
          !selecionado &&
            !ocupado &&
            'bg-white text-ink border border-line/70 hover:border-brand/50 hover:bg-brand-tint/20 active:scale-95 shadow-2xs',
          ocupado &&
            'bg-bg/40 text-disabled border border-line/40 line-through cursor-not-allowed opacity-60'
        )}
      >
        <span className="tabular-nums">{horaTexto}</span>
      </button>
    );
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      {exibirPeriodos ? (
        Object.entries(periodos).map(([chave, periodo]) => {
          if (periodo.slots.length === 0) return null;
          return (
            <div key={chave} className="flex flex-col gap-2.5 text-left">
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-ink-soft uppercase tracking-wider">
                {periodo.icone}
                <span>{periodo.titulo}</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {periodo.slots.map(renderSlot)}
              </div>
            </div>
          );
        })
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {horarios.map(renderSlot)}
        </div>
      )}
    </div>
  );
};

GradeDeHorarios.displayName = 'GradeDeHorarios';
export default GradeDeHorarios;
