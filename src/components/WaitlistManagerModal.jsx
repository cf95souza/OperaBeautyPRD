import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

const WaitlistManagerModal = ({ onClose, selectedDate }) => {
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWaitlist();
  }, [selectedDate]);

  const fetchWaitlist = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await api.request('/waitlist', { params: { date: dateStr } });
      setWaitlist(data || []);
    } catch (err) {
      console.error('Erro ao buscar fila de espera:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkFulfilled = async (id) => {
    try {
      await api.request(`/waitlist/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'fulfilled' })
      });
      fetchWaitlist();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert('Não foi possível atualizar.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface w-full max-w-md h-full shadow-2xl flex flex-col animate-fade-in-right">
        <div className="p-4 border-b border-surface-variant flex justify-between items-center bg-surface-container-low">
          <div>
            <h2 className="font-headline-sm text-on-surface">Lista de Espera</h2>
            <p className="text-secondary text-sm">Dia {selectedDate.toLocaleDateString('pt-BR')}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-surface-container-lowest">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="material-symbols-outlined animate-spin text-primary text-[32px]">progress_activity</span>
            </div>
          ) : waitlist.length === 0 ? (
            <div className="text-center py-8 text-secondary">
              <span className="material-symbols-outlined text-[48px] opacity-50 mb-2">event_available</span>
              <p>Não há ninguém aguardando vaga para este dia.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {waitlist.map((item) => (
                <div key={item.id} className="bg-white border border-surface-variant rounded-xl p-4 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-label-lg text-on-surface">{item.client_name}</h4>
                      <p className="text-sm text-secondary font-mono">{item.client_phone}</p>
                    </div>
                    <a 
                      href={`https://wa.me/55${item.client_phone.replace(/\D/g, '')}`} 
                      target="_blank" rel="noreferrer"
                      className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                      title="Chamar no WhatsApp"
                    >
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                    </a>
                  </div>
                  <div className="text-sm text-on-surface-variant bg-surface-variant/30 p-2 rounded-lg mb-3">
                    <p><strong>Serviço:</strong> {item.service_name || 'Qualquer'}</p>
                    <p><strong>Profissional:</strong> {item.professional_name || 'Qualquer'}</p>
                  </div>
                  <button 
                    onClick={() => handleMarkFulfilled(item.id)}
                    className="w-full py-2 bg-surface-container-high hover:bg-primary hover:text-white text-on-surface-variant text-sm font-semibold rounded-lg transition-colors border border-outline-variant hover:border-primary"
                  >
                    Marcar como Atendido
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WaitlistManagerModal;
