import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Home, Calendar, Plus, Star, User } from 'lucide-react';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const NavegacaoInferior = ({
  abaAtiva = 'home',
  aoMudarAba,
  aoClicarAgendar,
  temClube = true,
  className,
  ...props
}) => {
  return (
    <nav
      aria-label="Navegação inferior do cliente"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-line shadow-[0_-4px_20px_rgba(142,59,78,0.06)] pb-[env(safe-area-inset-bottom,0px)] select-none',
        className
      )}
      {...props}
    >
      <div className="w-full max-w-[420px] mx-auto h-[74px] px-3 flex items-center justify-around relative">
        {/* 1. Início */}
        <button
          type="button"
          onClick={() => aoMudarAba && aoMudarAba('home')}
          className={cn(
            'flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors select-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-brand/30 rounded-xl',
            abaAtiva === 'home' ? 'text-brand' : 'text-ink-soft hover:text-ink'
          )}
          aria-label="Ir para tela inicial"
        >
          <Home size={22} strokeWidth={abaAtiva === 'home' ? 2.4 : 1.8} />
          <span className="text-[11px] font-sans font-medium mt-1">Início</span>
        </button>

        {/* 2. Agenda */}
        <button
          type="button"
          onClick={() => aoMudarAba && aoMudarAba('agenda')}
          className={cn(
            'flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors select-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-brand/30 rounded-xl',
            abaAtiva === 'agenda' ? 'text-brand' : 'text-ink-soft hover:text-ink'
          )}
          aria-label="Ver meus agendamentos"
        >
          <Calendar size={22} strokeWidth={abaAtiva === 'agenda' ? 2.4 : 1.8} />
          <span className="text-[11px] font-sans font-medium mt-1">Agenda</span>
        </button>

        {/* 3. Botão Central Elevado "Agendar" (+) */}
        <div className="flex-1 flex items-center justify-center relative">
          <button
            type="button"
            onClick={aoClicarAgendar}
            className="w-14 h-14 rounded-full bg-brand hover:bg-brand/90 text-white shadow-[0_8px_20px_rgba(142,59,78,0.35)] flex items-center justify-center -translate-y-4 active:scale-95 transition-transform cursor-pointer select-none ring-4 ring-bg focus:outline-none focus:ring-4 focus:ring-brand/40"
            aria-label="Agendar novo serviço"
          >
            <Plus size={28} strokeWidth={2.4} />
          </button>
        </div>

        {/* 4. Clube (ou atalho alternativo se desabilitado) */}
        {temClube && (
          <button
            type="button"
            onClick={() => aoMudarAba && aoMudarAba('clube')}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors select-none cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-brand/30 rounded-xl',
              abaAtiva === 'clube' ? 'text-brand' : 'text-ink-soft hover:text-ink'
            )}
            aria-label="Acessar Clube de Fidelidade"
          >
            <Star size={22} strokeWidth={abaAtiva === 'clube' ? 2.4 : 1.8} />
            <span className="text-[11px] font-sans font-medium mt-1">Clube</span>
          </button>
        )}

        {/* 5. Perfil */}
        <button
          type="button"
          onClick={() => aoMudarAba && aoMudarAba('perfil')}
          className={cn(
            'flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors select-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-brand/30 rounded-xl',
            abaAtiva === 'perfil' ? 'text-brand' : 'text-ink-soft hover:text-ink'
          )}
          aria-label="Ver meu perfil"
        >
          <User size={22} strokeWidth={abaAtiva === 'perfil' ? 2.4 : 1.8} />
          <span className="text-[11px] font-sans font-medium mt-1">Perfil</span>
        </button>
      </div>
    </nav>
  );
};

NavegacaoInferior.displayName = 'NavegacaoInferior';
export default NavegacaoInferior;
