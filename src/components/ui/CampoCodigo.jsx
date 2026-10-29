import React, { useRef, useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const CampoCodigo = ({
  qtdDigitos = 4,
  valor = '',
  aoMudar,
  aoCompletar,
  error,
  disabled = false,
  autoFocus = false,
  className,
  ...props
}) => {
  const inputsRef = useRef([]);
  const [digitos, setDigitos] = useState(() => {
    const array = new Array(qtdDigitos).fill('');
    if (valor) {
      const chars = valor.split('');
      for (let i = 0; i < qtdDigitos; i++) {
        array[i] = chars[i] || '';
      }
    }
    return array;
  });

  useEffect(() => {
    if (valor !== undefined) {
      const array = new Array(qtdDigitos).fill('');
      const chars = valor.split('');
      for (let i = 0; i < qtdDigitos; i++) {
        array[i] = chars[i] || '';
      }
      setDigitos(array);
    }
  }, [valor, qtdDigitos]);

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus]);

  const atualizarValores = (novoArray) => {
    setDigitos(novoArray);
    const codigoCompleto = novoArray.join('');
    if (aoMudar) aoMudar(codigoCompleto);
    if (codigoCompleto.length === qtdDigitos && !novoArray.includes('')) {
      if (aoCompletar) aoCompletar(codigoCompleto);
    }
  };

  const handleChange = (e, index) => {
    const val = e.target.value;
    const ultimoCaractere = val.slice(-1);

    if (val && !/^\d+$/.test(ultimoCaractere)) {
      return;
    }

    const novos = [...digitos];
    novos[index] = ultimoCaractere || '';
    atualizarValores(novos);

    if (ultimoCaractere && index < qtdDigitos - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!digitos[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < qtdDigitos - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const dadosColados = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, qtdDigitos);
    if (!dadosColados) return;

    const novos = [...digitos];
    for (let i = 0; i < dadosColados.length; i++) {
      novos[i] = dadosColados[i];
    }
    atualizarValores(novos);

    const proximoIndex = Math.min(dadosColados.length, qtdDigitos - 1);
    inputsRef.current[proximoIndex]?.focus();
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)} {...props}>
      <div className="flex items-center gap-2.5 sm:gap-3" onPaste={handlePaste}>
        {digitos.map((digito, index) => (
          <input
            key={index}
            ref={(el) => (inputsRef.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digito}
            disabled={disabled}
            aria-label={`Dígito ${index + 1} de ${qtdDigitos}`}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onFocus={(e) => e.target.select()}
            className={cn(
              'w-12 h-14 sm:w-14 sm:h-16 text-center font-serif text-[24px] font-bold rounded-[16px] bg-white border transition-all duration-200 select-none shadow-xs',
              'focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 text-ink',
              digito ? 'border-brand/70 bg-brand-tint/10' : 'border-line',
              error && 'border-danger focus:border-danger focus:ring-danger/20',
              disabled && 'bg-bg/60 border-line/60 opacity-60 cursor-not-allowed'
            )}
          />
        ))}
      </div>

      {error && (
        <p className="text-[13px] text-danger font-medium mt-1 leading-snug animate-in fade-in duration-200">
          {error}
        </p>
      )}
    </div>
  );
};

CampoCodigo.displayName = 'CampoCodigo';
export default CampoCodigo;
