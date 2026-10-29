import React from 'react';
import { Scissors, Sparkles, Eye, Heart, Plus, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Mapeador de ícones contextuais por nome do serviço
export const getServiceIcon = (name = '') => {
  const lower = name.toLowerCase();
  if (
    lower.includes('corte') ||
    lower.includes('escova') ||
    lower.includes('cabelo') ||
    lower.includes('mechas') ||
    lower.includes('luzes') ||
    lower.includes('barba') ||
    lower.includes('hidratação') ||
    lower.includes('hidratacao') ||
    lower.includes('cronograma')
  ) {
    return <Scissors size={22} strokeWidth={1.8} />;
  }
  if (lower.includes('sobrancelha') || lower.includes('cilios') || lower.includes('lash') || lower.includes('olhar')) {
    return <Eye size={22} strokeWidth={1.8} />;
  }
  if (lower.includes('unha') || lower.includes('manicure') || lower.includes('pedicure') || lower.includes('gel') || lower.includes('fibra')) {
    return <Sparkles size={22} strokeWidth={1.8} />;
  }
  if (lower.includes('massagem') || lower.includes('drenagem') || lower.includes('limpeza') || lower.includes('facial') || lower.includes('estética') || lower.includes('corpo')) {
    return <Heart size={22} strokeWidth={1.8} />;
  }
  return <Sparkles size={22} strokeWidth={1.8} />;
};

export const CartaoServico = ({
  servico,
  selecionado = false,
  onToggle,
  className
}) => {
  if (!servico) return null;

  const effectivePrice = servico.starting_price !== undefined ? servico.starting_price : servico.price;
  const precoFormatado = parseFloat((selecionado ? servico.price : effectivePrice) || 0)
    .toFixed(2)
    .replace('.', ',')
    .replace(',00', '');

  const hasCustomizations = (servico.variations && servico.variations.length > 0) || (servico.extras && servico.extras.length > 0);
  const isStartingPrice = servico.is_starting_price || (servico.variations && servico.variations.length > 0);

  return (
    <div
      role="checkbox"
      aria-checked={selecionado}
      tabIndex={0}
      onClick={() => onToggle && onToggle(servico)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onToggle && onToggle(servico);
        }
      }}
      className={cn(
        'w-full bg-surface rounded-[22px] py-3 px-4 min-h-[72px] transition-all duration-200 cursor-pointer select-none flex items-center justify-between gap-3.5 focus:outline-none focus:ring-2 focus:ring-brand/40',
        selecionado
          ? 'border-[1.5px] border-brand shadow-card bg-surface'
          : 'border border-line/70 hover:border-brand/40 shadow-xs hover:shadow-sm',
        className
      )}
    >
      {/* Ícone Contextual ou Foto com Fallback Placeholder (Item A6) */}
      <div className="w-12 h-12 rounded-[18px] bg-[#F6E4E4] text-brand flex items-center justify-center shrink-0 shadow-xs border border-line/40 overflow-hidden relative">
        {servico.image_url ? (
          <img 
            src={servico.image_url} 
            alt={servico.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div 
          style={{ display: servico.image_url ? 'none' : 'flex' }}
          className="w-full h-full items-center justify-center text-brand"
        >
          {getServiceIcon(servico.name)}
        </div>
      </div>

      {/* Informações Centrais do Serviço */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <h3 className="font-sans text-[16px] font-bold text-ink truncate leading-tight">
            {servico.name}
          </h3>
          {hasCustomizations && !selecionado && (
            <span className="text-[10px] font-semibold text-brand bg-brand-tint/70 px-1.5 py-0.2 rounded-md shrink-0">
              Personalizável
            </span>
          )}
        </div>

        {servico.short_description && (
          <p className="font-sans text-[12px] text-ink-soft line-clamp-1 mt-0.5">
            {servico.short_description}
          </p>
        )}

        {/* Detalhes da personalização selecionada */}
        {selecionado && (servico.variation_name || (servico.extras && servico.extras.length > 0)) && (
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            {servico.variation_name && (
              <span className="text-[11px] font-semibold text-brand bg-brand-tint/70 px-1.5 py-0.2 rounded-md">
                {servico.variation_name}
              </span>
            )}
            {servico.extras && servico.extras.length > 0 && (
              <span className="text-[11px] text-ink-soft bg-stone-100 px-1.5 py-0.2 rounded-md font-medium">
                +{servico.extras.length} {servico.extras.length === 1 ? 'extra' : 'extras'}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 mt-1 text-[13px]">
          <span className="font-sans text-ink-soft font-medium">
            {servico.duration_minutes || servico.duration || 30} min
          </span>
          <span className="text-ink-soft/60">·</span>
          <span className="font-sans font-bold text-brand tabular-nums">
            {!selecionado && isStartingPrice && 'A partir de '}
            R$ {precoFormatado}
          </span>
        </div>
      </div>

      {/* Botão Circular de Seleção (36px com + ou ✓) */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={selecionado ? `Remover ${servico.name}` : `Selecionar ${servico.name}`}
        aria-pressed={selecionado}
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 select-none cursor-pointer',
          selecionado
            ? 'bg-brand text-white shadow-xs border-transparent'
            : 'border-[1.5px] border-line/90 text-ink/70 hover:text-brand hover:border-brand/60 bg-surface'
        )}
      >
        {selecionado ? (
          <Check size={18} strokeWidth={2.8} />
        ) : (
          <Plus size={18} strokeWidth={2.2} />
        )}
      </button>
    </div>
  );
};

export default CartaoServico;
