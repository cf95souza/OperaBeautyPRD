import React, { useState } from 'react';
import { X, Clock, CheckCircle2, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

const WaitlistModal = ({ tenantSlug, desiredDate, serviceId, professionalId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [preferredTimeRange, setPreferredTimeRange] = useState('any');

  const formattedDate = desiredDate
    ? (() => {
        try {
          const [y, m, d] = desiredDate.split('-').map(Number);
          const date = new Date(y, m - 1, d, 12, 0, 0);
          return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
        } catch (e) {
          return desiredDate;
        }
      })()
    : 'data selecionada';

  const handleJoinWaitlist = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.waitlist.join({
        desired_date: desiredDate,
        service_id: serviceId && serviceId !== 'any' ? serviceId : null,
        professional_id: professionalId && professionalId !== 'any' ? professionalId : null,
        preferred_time_range: preferredTimeRange
      });
      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao entrar na lista de espera. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface w-full max-w-[380px] rounded-3xl p-6 border border-line shadow-2xl relative animate-scale-up text-left">
        {!success && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-line/40 text-ink-soft hover:text-ink hover:bg-line/70 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        )}

        {success ? (
          <div className="text-center py-5 space-y-3">
            <div className="w-14 h-14 bg-brand-tint text-brand rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 size={32} strokeWidth={2.2} className="animate-bounce" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-ink">
              Você está na fila!
            </h3>
            <p className="text-sm text-ink-soft leading-relaxed px-2">
              Assim que surgir uma desistência ou vaga para <strong>{formattedDate}</strong>, avisaremos você imediatamente para garantir o seu horário.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-brand-tint/70 text-brand rounded-2xl flex items-center justify-center shrink-0 shadow-2xs">
                <Clock size={22} strokeWidth={2.2} />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-brand block">
                  Lista de Espera Inteligente
                </span>
                <h2 className="font-serif text-xl font-bold text-ink leading-snug">
                  Garantir Prioridade
                </h2>
              </div>
            </div>

            <p className="text-xs text-ink-soft leading-relaxed">
              Não encontrou vaga para <strong>{formattedDate}</strong>? Entre na lista de espera. Se alguém cancelar ou remarcar, a vaga é oferecida automaticamente em ordem de chegada.
            </p>

            {/* Preferência de Turno */}
            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block">
                Turno de sua preferência:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'any', label: 'Qualquer horário' },
                  { id: 'morning', label: 'Manhã' },
                  { id: 'afternoon', label: 'Tarde' },
                  { id: 'night', label: 'Noite' }
                ].map((range) => {
                  const isSelected = preferredTimeRange === range.id;
                  return (
                    <button
                      key={range.id}
                      type="button"
                      onClick={() => setPreferredTimeRange(range.id)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'border-brand bg-brand-tint/60 text-brand shadow-xs'
                          : 'border-line bg-surface hover:bg-stone-50 text-ink-soft'
                      }`}
                    >
                      {range.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleJoinWaitlist}
                disabled={loading}
                className="w-full h-12 rounded-full bg-brand text-white font-semibold text-sm hover:bg-brand-hover active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Entrar na Lista de Espera</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-xs font-semibold text-ink-soft hover:text-ink transition-colors cursor-pointer text-center"
              >
                Voltar aos horários
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitlistModal;
