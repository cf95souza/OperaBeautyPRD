import React, { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X } from 'lucide-react';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const BottomSheet = ({
  aberto = false,
  aoFechar,
  titulo,
  subtitulo,
  children,
  alturaMaxima = 'max-h-[85vh]',
  className,
  ...props
}) => {
  const sheetRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && aberto) {
        aoFechar && aoFechar();
      }
    };

    if (aberto) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end isolate select-none"
      role="dialog"
      aria-modal="true"
      aria-label={titulo || 'Janela modal inferior'}
      {...props}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={aoFechar}
        aria-hidden="true"
      />

      {/* Conteúdo da Gaveta */}
      <div
        ref={sheetRef}
        className={cn(
          'relative z-10 w-full max-w-lg mx-auto bg-white rounded-t-[28px] border-t border-line/60 shadow-2xl flex flex-col overflow-hidden',
          'animate-in slide-in-from-bottom duration-300 ease-out pb-[calc(env(safe-area-inset-bottom)+16px)]',
          alturaMaxima,
          className
        )}
      >
        {/* Puxador (Handle) */}
        <div className="w-full flex items-center justify-center pt-3 pb-1 cursor-grab">
          <div className="w-10 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* Topo / Cabeçalho */}
        {(titulo || aoFechar) && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-line/40">
            <div className="flex flex-col text-left min-w-0 pr-4">
              {titulo && (
                <h3 className="font-serif text-[20px] font-bold text-ink truncate">
                  {titulo}
                </h3>
              )}
              {subtitulo && (
                <p className="text-[13px] text-ink-soft truncate font-sans">
                  {subtitulo}
                </p>
              )}
            </div>

            {aoFechar && (
              <button
                type="button"
                onClick={aoFechar}
                aria-label="Fechar"
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:text-ink hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand/30 shrink-0"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        )}

        {/* Corpo rolável */}
        <div className="flex-1 overflow-y-auto p-6 text-ink font-sans">
          {children}
        </div>
      </div>
    </div>
  );
};

BottomSheet.displayName = 'BottomSheet';
export default BottomSheet;
