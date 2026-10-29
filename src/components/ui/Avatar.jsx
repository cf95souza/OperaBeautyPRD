import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PlaceholderImagem } from './PlaceholderImagem.jsx';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const tamanhos = {
  sm: 'w-8 h-8 text-[12px]',
  md: 'w-11 h-11 text-[15px]',
  lg: 'w-14 h-14 text-[18px]',
  xl: 'w-[72px] h-[72px] text-[24px]',
};

export const Avatar = ({
  src,
  alt = '',
  nome = '',
  tamanho = 'md',
  anel = false,
  anelCor = 'border-[#E6CA65]',
  status,
  className,
  ...props
}) => {
  const [erroCarregamento, setErroCarregamento] = useState(false);
  const sizeClass = tamanhos[tamanho] || tamanhos.md;

  const getIniciais = (str) => {
    if (!str) return 'OB';
    const partes = str.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  };

  const statusCores = {
    online: 'bg-emerald-500 ring-white',
    ocupado: 'bg-amber-500 ring-white',
    offline: 'bg-slate-400 ring-white',
  };

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center shrink-0 rounded-full select-none',
        sizeClass,
        anel && cn('border-2 p-0.5 shadow-sm', anelCor),
        className
      )}
      {...props}
    >
      <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-brand-tint">
        {src && !erroCarregamento ? (
          <img
            src={src}
            alt={alt || nome || 'Avatar'}
            onError={() => setErroCarregamento(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand/15 to-brand/30 text-brand font-serif font-bold italic">
            {getIniciais(nome || alt)}
          </div>
        )}
      </div>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2',
            statusCores[status] || statusCores.online
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};

Avatar.displayName = 'Avatar';
export default Avatar;
