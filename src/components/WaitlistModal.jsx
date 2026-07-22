import React, { useState } from 'react';
import { api } from '../lib/api';

const WaitlistModal = ({ tenantSlug, desiredDate, serviceId, professionalId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleJoinWaitlist = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.request('/waitlist', {
        method: 'POST',
        body: JSON.stringify({
          desired_date: desiredDate,
          service_id: serviceId,
          professional_id: professionalId
        })
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao entrar na lista de espera. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface w-full max-w-sm rounded-2xl p-6 shadow-xl relative animate-fade-in-up">
        {!success && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-surface-variant/50 text-on-surface hover:bg-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-primary-container text-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <span className="material-symbols-outlined text-[32px]">check_circle</span>
            </div>
            <h3 className="font-headline-sm text-on-surface mb-2">Tudo certo!</h3>
            <p className="text-secondary text-sm">Você está na lista de espera para o dia {new Date(desiredDate).toLocaleDateString('pt-BR')}. Se vagar algum horário, avisaremos!</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-surface-variant text-on-surface-variant rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[32px]">hourglass_empty</span>
            </div>
            <h2 className="font-headline-sm text-on-surface mb-1">Lista de Espera</h2>
            <p className="text-secondary text-sm mb-6">
              Não encontrou um horário ideal? Entre na fila para o dia <strong>{new Date(desiredDate).toLocaleDateString('pt-BR')}</strong> e seja avisado caso surja uma desistência.
            </p>

            {error && (
              <div className="bg-error-container text-on-error-container text-sm p-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handleJoinWaitlist}
              disabled={loading}
              className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold shadow-md hover:shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                'Entrar na Fila'
              )}
            </button>
            <button 
              onClick={onClose}
              className="w-full mt-3 py-2 text-sm text-secondary font-medium hover:text-on-surface transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitlistModal;
