import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Botao } from './Botao.jsx';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const EstadoErro = ({
  titulo = 'Não foi possível carregar as informações',
  mensagem = 'Tivemos um problema de conexão. Por favor, tente novamente.',
  aoTentarNovamente,
  isLoading = false,
  className,
  ...props
}) => {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-10 rounded-[24px] bg-white border border-rose-200/80 shadow-xs max-w-md mx-auto my-4',
        className
      )}
      {...props}
    >
      <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-2xs">
        <AlertCircle className="w-8 h-8 stroke-[1.7]" />
      </div>

      <h3 className="font-serif text-[20px] font-bold text-ink mb-2">
        {titulo}
      </h3>

      <p className="text-[14px] text-ink-soft max-w-xs leading-relaxed font-sans mb-6">
        {mensagem}
      </p>

      {aoTentarNovamente && (
        <Botao
          variante="secundario"
          tamanho="md"
          isLoading={isLoading}
          onClick={aoTentarNovamente}
          iconeInicio={<RefreshCw className="w-4 h-4" />}
          className="px-6 h-11 text-[14px]"
        >
          Tentar novamente
        </Botao>
      )}
    </div>
  );
};

EstadoErro.displayName = 'EstadoErro';
export default EstadoErro;
