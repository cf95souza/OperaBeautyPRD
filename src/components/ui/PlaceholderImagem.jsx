import React from 'react';

/**
 * Ícone contextual de acordo com a categoria de serviço
 */
const CATEGORY_ICONS = {
  cabelo: 'content_cut',
  unhas: 'auto_awesome',
  manicure: 'auto_awesome',
  pedicure: 'auto_awesome',
  sobrancelha: 'visibility',
  olhar: 'visibility',
  estetica: 'spa',
  facial: 'face_retouching_natural',
  corporal: 'self_improvement',
  depilacao: 'clean_hands',
  massagem: 'self_improvement',
  barba: 'cut',
  default: 'spa'
};

/**
 * Componente Universal PlaceholderImagem (Item A6)
 * Evita caixas vazias ou imagens quebradas com gradiente editorial e monograma ou ícone contextual
 */
export const PlaceholderImagem = ({
  tipo = 'servico', // 'servico', 'logo', 'banner', 'avatar'
  categoria = 'default',
  nome = '',
  className = '',
  style = {},
  aspectRatio = 'square', // 'square', 'video', 'banner', 'circle'
  iconSize = '24px'
}) => {
  const normalizedCategory = (categoria || 'default').toLowerCase().trim();
  const iconName = CATEGORY_ICONS[normalizedCategory] || CATEGORY_ICONS.default;
  
  const initial = (nome || 'O').trim().charAt(0).toUpperCase();

  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'circle': return 'rounded-full aspect-square';
      case 'video': return 'aspect-video rounded-2xl';
      case 'banner': return 'aspect-[21/9] rounded-2xl';
      case 'square':
      default:
        return 'aspect-square rounded-2xl';
    }
  };

  // Se for logo ou avatar: monograma com gradiente da marca
  if (tipo === 'logo' || tipo === 'avatar') {
    return (
      <div 
        className={`flex items-center justify-center overflow-hidden select-none border border-[#EADFDC]/60 ${getAspectClass()} ${className}`}
        style={{
          background: 'linear-gradient(135deg, var(--color-brand-tint, #F6E4E4) 0%, #FFFFFF 100%)',
          ...style
        }}
        aria-hidden="true"
      >
        <span 
          className="font-serif font-bold text-[#8E3B4E]"
          style={{ 
            color: 'var(--color-brand, #8E3B4E)',
            fontSize: iconSize 
          }}
        >
          {initial}
        </span>
      </div>
    );
  }

  // Se for banner: gradiente editorial suave com formas orgânicas
  if (tipo === 'banner') {
    return (
      <div 
        className={`relative flex items-center justify-center overflow-hidden p-6 text-center select-none ${getAspectClass()} ${className}`}
        style={{
          background: 'linear-gradient(135deg, var(--color-brand, #8E3B4E) 0%, var(--color-brand-accent, #B76E79) 100%)',
          ...style
        }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="relative z-10 text-white">
          <span className="font-serif text-lg font-semibold block truncate">
            {nome || 'OperaBeauty Studio'}
          </span>
          <span className="text-xs opacity-90 block mt-1">
            Reserve momentos únicos de autocuidado
          </span>
        </div>
      </div>
    );
  }

  // Se for serviço: ícone contextual fino sobre fundo rosé pastel
  return (
    <div 
      className={`flex items-center justify-center overflow-hidden select-none ${getAspectClass()} ${className}`}
      style={{
        backgroundColor: 'var(--color-brand-tint, #F6E4E4)',
        color: 'var(--color-brand, #8E3B4E)',
        ...style
      }}
      aria-hidden="true"
    >
      <span 
        className="material-symbols-outlined select-none"
        style={{ fontSize: iconSize }}
      >
        {iconName}
      </span>
    </div>
  );
};

export default PlaceholderImagem;
