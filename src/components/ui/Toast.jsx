import React, { createContext, useContext, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const ToastContext = createContext(null);

export const Toast = ({
  mensagem,
  titulo,
  tipo = 'sucesso',
  aoFechar,
  className,
  ...props
}) => {
  const configs = {
    sucesso: {
      icone: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      borda: 'border-emerald-200',
      fundo: 'bg-emerald-50/95',
      titulo: 'text-emerald-950',
    },
    erro: {
      icone: <AlertCircle className="w-5 h-5 text-rose-600" />,
      borda: 'border-rose-200',
      fundo: 'bg-rose-50/95',
      titulo: 'text-rose-950',
    },
    alerta: {
      icone: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      borda: 'border-amber-200',
      fundo: 'bg-amber-50/95',
      titulo: 'text-amber-950',
    },
    info: {
      icone: <Info className="w-5 h-5 text-brand" />,
      borda: 'border-line/80',
      fundo: 'bg-white/95',
      titulo: 'text-ink',
    },
  };

  const estilo = configs[tipo] || configs.sucesso;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 p-4 rounded-[18px] border shadow-premium backdrop-blur-md transition-all duration-300 pointer-events-auto',
        estilo.fundo,
        estilo.borda,
        className
      )}
      {...props}
    >
      <div className="shrink-0 mt-0.5">{estilo.icone}</div>

      <div className="flex-1 min-w-0 text-left">
        {titulo && (
          <h5 className={cn('text-[14px] font-bold font-sans', estilo.titulo)}>
            {titulo}
          </h5>
        )}
        <p className="text-[13px] text-ink-soft leading-snug font-sans">
          {mensagem}
        </p>
      </div>

      {aoFechar && (
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar notificação"
          className="shrink-0 -mr-1 -mt-1 p-1 rounded-full text-ink-soft hover:text-ink hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export const ProvedorToast = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dispararToast = useCallback(({ mensagem, titulo, tipo = 'sucesso', duracao = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    const novoToast = { id, mensagem, titulo, tipo };

    setToasts((anteriores) => [...anteriores, novoToast]);

    if (duracao > 0) {
      setTimeout(() => {
        removerToast(id);
      }, duracao);
    }

    return id;
  }, []);

  const removerToast = useCallback((id) => {
    setToasts((anteriores) => anteriores.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ dispararToast, removerToast }}>
      {children}
      {/* Container fixo de Toasts */}
      <div
        className="fixed top-4 right-4 left-4 sm:left-auto sm:w-[380px] z-50 flex flex-col gap-2.5 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            titulo={toast.titulo}
            mensagem={toast.mensagem}
            tipo={toast.tipo}
            aoFechar={() => removerToast(toast.id)}
            className="animate-in slide-in-from-top-3 duration-250"
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback silencioso caso usado fora do provider
    return {
      dispararToast: ({ mensagem }) => console.log('Toast:', mensagem),
      removerToast: () => {},
    };
  }
  return context;
};

export default Toast;
