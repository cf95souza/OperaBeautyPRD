import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Sparkles } from 'lucide-react';
import { Botao } from './Botao.jsx';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const EstadoVazio = ({
  icone,
  titulo = 'Nada por aqui ainda',
  descricao = 'Reserve um momento especial para cuidar de você hoje mesmo.',
  textoAcao,
  aoClicarAcao,
  iconeAcao,
  textoBotao,
  aoClicar,
  acao,
  className,
  ...props
}) => {
  const finalActionText = textoAcao || textoBotao;
  const finalActionClick = aoClicarAcao || aoClicar;

  const renderIcone = () => {
    if (!icone) {
      return <Sparkles className="w-7 h-7 stroke-[1.7]" />;
    }
    if (React.isValidElement(icone)) {
      return icone;
    }
    if (typeof icone === 'function' || (typeof icone === 'object' && icone !== null && icone.$$typeof)) {
      const IconComponent = icone;
      return <IconComponent className="w-7 h-7 stroke-[1.7]" />;
    }
    return icone;
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-10 rounded-[24px] bg-white border border-line/60 shadow-xs max-w-md mx-auto my-4',
        className
      )}
      {...props}
    >
      <div className="w-16 h-16 rounded-full bg-[#F6E4E4] border border-line/50 flex items-center justify-center text-brand mb-4 shadow-2xs">
        <span className="shrink-0 flex items-center justify-center">
          {renderIcone()}
        </span>
      </div>

      <h3 className="font-serif text-[22px] font-bold text-ink mb-2">
        {titulo}
      </h3>

      <p className="text-[14px] text-ink-soft max-w-xs leading-relaxed font-sans mb-6">
        {descricao}
      </p>

      {acao ? (
        <div className="mt-2">{acao}</div>
      ) : (
        finalActionText && finalActionClick && (
          <Botao
            variante="primario"
            tamanho="md"
            onClick={finalActionClick}
            iconeInicio={iconeAcao}
            className="px-6 h-11 text-[14px]"
          >
            {finalActionText}
          </Botao>
        )
      )}
    </div>
  );
};

EstadoVazio.displayName = 'EstadoVazio';
export default EstadoVazio;
