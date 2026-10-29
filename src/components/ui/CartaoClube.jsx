import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Crown, Sparkles, ChevronRight } from 'lucide-react';
import { Botao } from './Botao.jsx';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const CartaoClube = ({
  titulo = 'Clube de Assinaturas',
  sessoesDisponiveis = 2,
  beneficioPrincipal = 'Escova & Hidratação inclusas todo mês',
  isAssinante = false,
  aoClicarAcao,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden p-5 rounded-[24px] bg-gradient-to-br from-[#FFF9F6] via-white to-[#FDF4F4] border border-[#E6CA65]/60 shadow-card transition-all duration-300',
        className
      )}
      {...props}
    >
      {/* Detalhe de fundo dourado suave */}
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br from-[#E6CA65]/15 to-transparent blur-xl pointer-events-none" />

      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-[#E6CA65]/70 text-[#8B6E1F] text-[12px] font-bold tracking-wide">
          <Crown className="w-3.5 h-3.5 fill-[#E6CA65] text-[#8B6E1F]" />
          <span>{titulo}</span>
        </div>

        {isAssinante ? (
          <span className="text-[12px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Assinante Ativa
          </span>
        ) : (
          <span className="text-[11px] font-bold text-brand uppercase tracking-wider">
            Vantagens VIP
          </span>
        )}
      </div>

      <div className="relative z-10 text-left my-2">
        {isAssinante ? (
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-[28px] font-bold text-ink tabular-nums">
                {sessoesDisponiveis}
              </span>
              <span className="text-[14px] font-medium text-ink-soft">
                sessões disponíveis este mês
              </span>
            </div>
            <p className="text-[13px] text-ink-soft mt-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E6CA65] shrink-0" />
              <span>{beneficioPrincipal}</span>
            </p>
          </div>
        ) : (
          <div>
            <h4 className="font-serif text-[18px] font-bold text-ink">
              Cuide de você com economia todo mês
            </h4>
            <p className="text-[13px] text-ink-soft mt-1 leading-relaxed">
              {beneficioPrincipal || 'Planos com sessões fixas, descontos exclusivos e agendamento prioritário.'}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-line/40 flex items-center justify-between relative z-10">
        <span className="text-[12px] font-medium text-ink-soft">
          {isAssinante ? 'Renovação automática mensal' : 'A partir de R$ 89,90/mês'}
        </span>

        <Botao
          variante="secundario"
          tamanho="sm"
          onClick={aoClicarAcao}
          className="text-[13px] h-9 border-[#E6CA65]/60 hover:bg-[#FFF9F6]"
          iconeFim={<ChevronRight className="w-3.5 h-3.5" />}
        >
          {isAssinante ? 'Usar Sessão' : 'Conhecer Planos'}
        </Botao>
      </div>
    </div>
  );
};

CartaoClube.displayName = 'CartaoClube';
export default CartaoClube;
