import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const DIAS_SEMANA_ABREV = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const FaixaDeDias = ({
  selectedDate,
  onSelectDate,
  isDateClosed,
  daysCount = 14,
  className
}) => {
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Gera os próximos N dias a partir de hoje
  const daysList = useMemo(() => {
    const list = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayOfWeek = d.getDay(); // 0 a 6

      const closed = isDateClosed ? isDateClosed(dateStr, dayOfWeek) : false;

      list.push({
        dateStr,
        dayOfWeekAbbr: DIAS_SEMANA_ABREV[dayOfWeek],
        dayNumber: d.getDate(),
        isToday: i === 0,
        isClosed: closed
      });
    }
    return list;
  }, [daysCount, isDateClosed]);

  // Calendário expandido (mês)
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const todayStr = new Date().toISOString().split('T')[0];

    const grid = [];
    // Espaços vazios antes do 1º dia
    for (let i = 0; i < firstDayIndex; i++) {
      grid.push(null);
    }
    // Dias do mês
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dObj = new Date(year, month, dayNum);
      const isPast = dateStr < todayStr;
      const closed = isDateClosed ? isDateClosed(dateStr, dObj.getDay()) : false;

      grid.push({
        dayNum,
        dateStr,
        isPast,
        isClosed: closed
      });
    }
    return grid;
  }, [calendarMonth, isDateClosed]);

  const handlePrevMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className={cn('w-full select-none', className)}>
      {/* Faixa Horizontal com Dias e Botão de Calendário */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 hide-scrollbar">
        {daysList.map((day) => {
          const isSelected = selectedDate === day.dateStr;
          const disabled = day.isClosed;

          return (
            <button
              key={day.dateStr}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(day.dateStr)}
              className={cn(
                'w-[48px] h-[66px] rounded-[18px] flex flex-col items-center justify-center shrink-0 transition-all duration-200 cursor-pointer select-none',
                isSelected
                  ? 'bg-brand text-white shadow-md border-transparent scale-[1.02]'
                  : disabled
                  ? 'bg-surface/50 text-ink-soft/40 border border-line/50 cursor-not-allowed opacity-50'
                  : 'bg-surface text-ink border border-line hover:border-brand/60 shadow-xs'
              )}
            >
              <span
                className={cn(
                  'text-[11px] font-sans font-semibold tracking-wider',
                  isSelected ? 'text-white/90' : disabled ? 'text-ink-soft/40' : 'text-ink-soft'
                )}
              >
                {day.dayOfWeekAbbr}
              </span>
              <span
                className={cn(
                  'font-display text-[20px] font-bold leading-tight mt-0.5 tabular-nums [font-feature-settings:"lnum"]',
                  isSelected ? 'text-white' : disabled ? 'text-ink-soft/40' : 'text-ink'
                )}
              >
                {day.dayNumber}
              </span>
            </button>
          );
        })}

        {/* Botão de Calendário Completo */}
        <button
          type="button"
          onClick={() => setShowFullCalendar(true)}
          title="Ver mais datas no calendário"
          className="w-[48px] h-[66px] rounded-[18px] bg-surface text-brand border border-line hover:border-brand flex flex-col items-center justify-center shrink-0 transition-all shadow-xs cursor-pointer active:scale-95"
        >
          <CalendarIcon size={20} strokeWidth={2} />
          <span className="text-[10px] font-sans font-semibold mt-1 text-ink-soft">Mais</span>
        </button>
      </div>

      {/* Modal / BottomSheet de Calendário Completo */}
      {showFullCalendar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[400px] bg-surface rounded-t-[28px] sm:rounded-[24px] p-5 shadow-2xl border border-line/80 space-y-4 animate-in slide-in-from-bottom duration-200">
            {/* Topo do Modal */}
            <div className="flex items-center justify-between pb-2 border-b border-line/60">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-8 h-8 rounded-full border border-line flex items-center justify-center hover:bg-brand-tint/30 text-ink"
                >
                  <ChevronLeft size={16} />
                </button>
                <h3 className="font-display text-[17px] font-bold text-ink">
                  {MESES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                </h3>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-8 h-8 rounded-full border border-line flex items-center justify-center hover:bg-brand-tint/30 text-ink"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowFullCalendar(false)}
                className="w-8 h-8 rounded-full text-ink-soft hover:text-ink flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dias da Semana (D, S, T, Q, Q, S, S) */}
            <div className="grid grid-cols-7 text-center gap-1">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((letra, idx) => (
                <span key={idx} className="text-[11px] font-bold text-ink-soft py-1">
                  {letra}
                </span>
              ))}
            </div>

            {/* Grade de Dias do Mês */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarDays.map((item, idx) => {
                if (!item) {
                  return <div key={`empty-${idx}`} className="h-10" />;
                }

                const isSelected = selectedDate === item.dateStr;
                const disabled = item.isPast || item.isClosed;

                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onSelectDate(item.dateStr);
                      setShowFullCalendar(false);
                    }}
                    className={cn(
                      'h-10 rounded-full text-[14px] font-medium transition-all flex items-center justify-center cursor-pointer',
                      isSelected
                        ? 'bg-brand text-white font-bold shadow-xs'
                        : disabled
                        ? 'text-ink-soft/30 cursor-not-allowed'
                        : 'text-ink hover:bg-brand-tint/40'
                    )}
                  >
                    {item.dayNum}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaixaDeDias;
