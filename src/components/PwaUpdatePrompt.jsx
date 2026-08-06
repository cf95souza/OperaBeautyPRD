import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const PwaUpdatePrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-surface-container-high border border-primary/20 shadow-xl rounded-2xl p-4 flex flex-col gap-3 animate-fade-in-up max-w-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-container text-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined">system_update</span>
        </div>
        <div>
          <h4 className="font-title-md text-on-surface font-semibold">Atualização Disponível</h4>
          <p className="font-body-sm text-secondary mt-1">
            Uma nova versão do sistema está disponível. Recarregue para aplicar melhorias e correções.
          </p>
        </div>
      </div>
      <div className="flex gap-2 w-full mt-1">
        <button
          onClick={() => setNeedRefresh(false)}
          className="flex-1 px-4 py-2 rounded-xl text-secondary font-label-md hover:bg-surface-variant transition-colors"
        >
          Agora Não
        </button>
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex-1 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Recarregar
        </button>
      </div>
    </div>
  );
};

export default PwaUpdatePrompt;
