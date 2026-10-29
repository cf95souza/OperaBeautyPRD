import React, { useState } from 'react';
import { Star, X, Check, Heart, ExternalLink, MessageSquare } from 'lucide-react';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';

const RATING_LABELS = {
  1: 'Muito insatisfeita 😞',
  2: 'Poderia ter sido melhor 😐',
  3: 'Atendimento regular 🙂',
  4: 'Muito bom! Recomendo 😊',
  5: 'Excelente! Simplesmente amei! ⭐'
};

const ModalAvaliacao = ({ appointment, isOpen, onClose, onSuccess }) => {
  const { showSuccess, showError } = useNotification();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'google_invite' | 'success'
  const [googleUrl, setGoogleUrl] = useState('');

  if (!isOpen || !appointment) return null;

  const activeRating = hoverRating || rating;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || rating < 1) {
      showError('Por favor, selecione uma nota de 1 a 5 estrelas.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.reviews.create({
        appointment_id: appointment.appointment_id || appointment.id,
        rating,
        comment: comment.trim() || null
      });

      showSuccess('Avaliação registrada com carinho! Muito obrigado.');

      // Se a nota for alta (4 ou 5) e houver URL do Google cadastrada, exibe convite especial
      if (res.invite_google && res.google_review_url) {
        setGoogleUrl(res.google_review_url);
        setStep('google_invite');
      } else {
        setStep('success');
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao enviar avaliação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenGoogle = () => {
    if (googleUrl) {
      window.open(googleUrl, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-line text-ink animate-scale-in">
        
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-ink-soft hover:text-ink hover:bg-surface-variant transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ETAPA 1: Formulário de Avaliação */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="flex flex-col items-center text-center">
            
            <div className="w-14 h-14 rounded-2xl bg-brand-tint flex items-center justify-center text-brand mb-4 shadow-2xs">
              <Heart className="w-7 h-7 fill-brand/20 text-brand" />
            </div>

            <h3 className="font-serif text-2xl font-bold text-ink">
              Como foi sua experiência?
            </h3>
            <p className="text-xs sm:text-sm text-ink-soft mt-1 max-w-xs">
              {appointment.service_name 
                ? `${appointment.service_name} com ${appointment.professional_name || 'nossa equipe'}`
                : 'Sua opinião é fundamental para mantermos a excelência do salão.'}
            </p>

            {/* Estrelas Interativas */}
            <div className="flex items-center gap-2 my-6">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= activeRating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 sm:p-1.5 transition-transform hover:scale-125 focus:outline-hidden cursor-pointer"
                    aria-label={`${star} estrelas`}
                  >
                    <Star
                      className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                        isFilled
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                          : 'fill-transparent text-stone-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Rótulo Dinâmico da Nota */}
            <div className="h-6 flex items-center justify-center mb-5">
              <span className="text-xs sm:text-sm font-semibold text-brand transition-all animate-fade-in">
                {RATING_LABELS[activeRating]}
              </span>
            </div>

            {/* Campo de Comentário Opcional */}
            <div className="w-full text-left mb-6">
              <label className="text-xs font-semibold text-ink-soft mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-brand" />
                <span>Deixe um recado carinhoso ou sugestão (opcional):</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ex: Amei o atendimento e o café! A profissional foi super atenciosa..."
                rows={3}
                maxLength={600}
                className="w-full p-3.5 rounded-2xl bg-bg border border-line text-sm text-ink focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand resize-none placeholder:text-stone-400 transition-all"
              />
              <span className="text-[10px] text-ink-soft float-right mt-1">
                {comment.length}/600
              </span>
            </div>

            {/* Botão de Envio */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-full bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Enviando avaliação...' : 'Enviar minha avaliação ✨'}
            </button>
          </form>
        )}

        {/* ETAPA 2: Convite Especial Google Reviews (quando nota for 4 ou 5) */}
        {step === 'google_invite' && (
          <div className="flex flex-col items-center text-center py-2 animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 mb-4 shadow-sm animate-bounce">
              <Star className="w-8 h-8 fill-amber-400 text-amber-400" />
            </div>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
              <Check className="w-3 h-3" />
              Avaliação salva com sucesso!
            </span>

            <h3 className="font-serif text-2xl font-bold text-ink mt-2">
              Você pode nos ajudar no Google?
            </h3>
            <p className="text-xs sm:text-sm text-ink-soft mt-2 leading-relaxed max-w-sm">
              Ficamos imensamente felizes que você adorou seu procedimento! Copie seu elogio e compartilhe também no Google para apoiar nosso trabalho. Leva menos de 1 minuto! ❤️
            </p>

            <div className="w-full flex flex-col gap-3 mt-6">
              <button
                type="button"
                onClick={handleOpenGoogle}
                className="w-full py-3.5 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Avaliar 5 estrelas no Google</span>
                <ExternalLink className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-6 rounded-full border border-line text-ink-soft hover:text-ink text-xs font-medium transition-colors cursor-pointer"
              >
                Agora não, obrigado
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 3: Agradecimento Final Simples */}
        {step === 'success' && (
          <div className="flex flex-col items-center text-center py-6 animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
              <Check className="w-8 h-8" />
            </div>

            <h3 className="font-serif text-2xl font-bold text-ink">
              Muito obrigado!
            </h3>
            <p className="text-xs sm:text-sm text-ink-soft mt-2 leading-relaxed max-w-xs">
              Sua avaliação foi registrada e ajuda a nossa equipe a evoluir a cada atendimento.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="w-full mt-6 py-3 px-6 rounded-full bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-all cursor-pointer"
            >
              Concluir
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ModalAvaliacao;
