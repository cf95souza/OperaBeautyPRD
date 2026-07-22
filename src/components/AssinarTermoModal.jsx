import React, { useState } from 'react';
import { api } from '../lib/api';

const AssinarTermoModal = ({ consent, onClose, onSigned }) => {
  const [accepted, setAccepted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  const [successHash, setSuccessHash] = useState('');

  const handleSign = async () => {
    if (!accepted) {
      setError('Você deve confirmar que leu e concorda com o termo.');
      return;
    }

    setSigning(true);
    setError('');
    
    try {
      const response = await api.request(`/consents/${consent.id}/sign`, {
        method: 'PUT'
      });
      setSuccessHash(response.hash);
      setTimeout(() => {
        onSigned();
        onClose();
      }, 4000);
    } catch (err) {
      console.error('Erro ao assinar:', err);
      setError('Ocorreu um erro ao assinar o documento. Tente novamente.');
      setSigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface w-full max-w-lg h-[90vh] rounded-2xl shadow-xl flex flex-col animate-fade-in-up relative overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-surface-variant bg-surface flex justify-between items-center shrink-0">
          <h2 className="font-headline-sm text-on-surface">Assinatura de Termo</h2>
          {!successHash && (
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-variant/50 text-on-surface hover:bg-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface-container-lowest">
          {successHash ? (
            <div className="text-center py-10 animate-fade-in">
              <div className="w-20 h-20 bg-primary-container text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-[40px]">verified</span>
              </div>
              <h3 className="font-headline-md text-on-surface mb-2">Termo Assinado!</h3>
              <p className="text-secondary text-sm mb-6">Sua assinatura digital foi registrada com sucesso e possui validade legal.</p>
              
              <div className="bg-surface-variant/30 p-4 rounded-xl text-left border border-outline-variant/30">
                <p className="text-[10px] text-tertiary uppercase tracking-wider mb-1 font-bold">Autenticador Criptográfico (Hash)</p>
                <p className="text-xs font-mono text-on-surface break-all">{successHash}</p>
                <p className="text-[10px] text-tertiary mt-2">Data: {new Date().toLocaleString('pt-BR')}</p>
              </div>
            </div>
          ) : (
            <>
              <h3 className="font-headline-sm text-on-surface mb-6 text-center">{consent.title}</h3>
              
              <div className="bg-white border border-outline-variant p-4 rounded-xl shadow-inner mb-6 text-sm text-on-surface-variant whitespace-pre-wrap font-serif leading-relaxed min-h-[50vh]">
                {consent.content_snapshot}
              </div>

              {error && (
                <div className="bg-error-container text-on-error-container text-sm p-3 rounded-lg mb-4 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                  <p>{error}</p>
                </div>
              )}

              <label className="flex items-start gap-3 cursor-pointer group mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
                <div className="relative flex items-start mt-1">
                  <input 
                    type="checkbox" 
                    className="peer appearance-none w-5 h-5 border-2 border-primary rounded cursor-pointer checked:bg-primary checked:border-primary transition-all"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                  />
                  <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-[16px] opacity-0 peer-checked:opacity-100 pointer-events-none">check</span>
                </div>
                <span className="font-label-md text-on-surface group-hover:text-primary transition-colors">
                  Li, compreendi e concordo com todos os termos descritos acima para a realização do procedimento.
                </span>
              </label>

              <button
                onClick={handleSign}
                disabled={signing || !accepted}
                className={`w-full py-4 rounded-xl font-bold shadow-md flex justify-center items-center gap-2 transition-all ${
                  accepted 
                    ? 'bg-primary text-on-primary hover:shadow-lg active:scale-95' 
                    : 'bg-surface-variant text-secondary cursor-not-allowed'
                }`}
              >
                {signing ? (
                  <span className="material-symbols-outlined animate-spin">sync</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined">draw</span>
                    Assinar Digitalmente
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssinarTermoModal;
