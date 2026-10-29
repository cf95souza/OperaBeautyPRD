import React, { useState } from 'react';
import { Star, Heart, X, Sparkles, Loader2, AlertCircle, ExternalLink, Check } from 'lucide-react';
import { api } from '../lib/api';

export const ReviewModal = ({ reviewData, onClose, onReviewSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'google_invite' | 'success'
  const [googleUrl, setGoogleUrl] = useState('');

  if (!reviewData) return null;

  // Extração resiliente de dados (seja array ou objeto unitário)
  const item = Array.isArray(reviewData) ? reviewData[0] : reviewData;
  if (!item) return null;

  const appointmentId = item.appointment_id || item.id;
  const professionalName = item.professional_name || 'sua profissional';
  const serviceName = item.service_name || 'seu atendimento';

  const ratingLabels = {
    1: 'Muito insatisfeita',
    2: 'Poderia ser melhor',
    3: 'Regular',
    4: 'Muito bom!',
    5: 'Excelente! Adorei!'
  };

  const handleSubmit = async () => {
    setErrorMessage('');

    if (!appointmentId) {
      setErrorMessage('Identificação do agendamento não localizada.');
      return;
    }

    if (!rating || rating === 0) {
      setErrorMessage('Por favor, toque nas estrelas para avaliar de 1 a 5.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.reviews.create({
        appointment_id: appointmentId,
        rating: Number(rating),
        comment: comment.trim() || undefined
      });

      if (res?.invite_google && res?.google_review_url) {
        setGoogleUrl(res.google_review_url);
        setStep('google_invite');
      } else {
        setStep('success');
        setTimeout(() => {
          if (onReviewSubmitted) onReviewSubmitted();
        }, 1800);
      }
    } catch (err) {
      console.error('Erro ao enviar avaliação:', err);
      setErrorMessage(err.message || 'Não foi possível enviar a avaliação. Tente novamente.');
      setLoading(false);
    }
  };

  const handleOpenGoogle = () => {
    if (googleUrl) {
      window.open(googleUrl, '_blank', 'noopener,noreferrer');
    }
    if (onReviewSubmitted) onReviewSubmitted();
    onClose();
  };

  const currentDisplayRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-line text-ink animate-scale-in">
        
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-ink-soft hover:text-ink hover:bg-stone-100 transition-colors cursor-pointer"
          aria-label="Fechar modal"
        >
          <X size={18} />
        </button>

        {/* 1. Formulário de Avaliação */}
        {step === 'form' && (
          <div className="text-center space-y-4">
            
            {/* Ícone de Destaque */}
            <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-tint border border-brand/20 flex items-center justify-center text-brand shadow-2xs">
              <Sparkles size={24} />
            </div>

            {/* Cabeçalho */}
            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-ink">
                Como foi seu atendimento?
              </h3>
              <p className="font-sans text-xs sm:text-sm text-ink-soft mt-1 leading-relaxed">
                Conta pra gente como foi seu <strong>{serviceName}</strong> com <strong>{professionalName}</strong>.
              </p>
            </div>

            {/* Estrelas Interativas */}
            <div className="py-2">
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= currentDisplayRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-hidden cursor-pointer"
                      aria-label={`${star} estrelas`}
                    >
                      <Star
                        size={32}
                        className={`transition-colors duration-150 ${
                          isFilled 
                            ? 'fill-amber-400 text-amber-400 drop-shadow-xs' 
                            : 'fill-stone-100 text-stone-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Rótulo da Nota Atual */}
              <div className="h-5 mt-2">
                {currentDisplayRating > 0 ? (
                  <span className="font-sans text-xs font-semibold text-brand animate-fade-in">
                    {ratingLabels[currentDisplayRating]}
                  </span>
                ) : (
                  <span className="font-sans text-xs text-ink-soft/70">
                    Toque nas estrelas para avaliar
                  </span>
                )}
              </div>
            </div>

            {/* Campo de Comentário Opcional */}
            <div className="animate-fade-in text-left">
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                Seu depoimento ou recado (opcional)
              </label>
              <textarea
                className="w-full bg-stone-50 border border-line rounded-xl p-3 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/40 transition-all resize-none shadow-2xs"
                rows={3}
                maxLength={500}
                placeholder="Conte um pouco mais sobre o atendimento..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {/* Mensagem de Erro Visual */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left animate-shake">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={rating === 0 || loading}
                className={`w-full py-3 rounded-full font-sans font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                  rating > 0 && !loading
                    ? 'bg-brand hover:bg-brand-soft text-white active:scale-[0.98]' 
                    : 'bg-stone-200 text-ink-soft/60 cursor-not-allowed shadow-none'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <span>Enviar avaliação ✨</span>
                )}
              </button>

              <button 
                type="button"
                onClick={onClose}
                className="w-full py-2 font-sans text-xs text-ink-soft hover:text-ink font-medium transition-colors cursor-pointer"
              >
                Avaliar depois
              </button>
            </div>

          </div>
        )}

        {/* 2. Convite Google Reviews para Avaliações 4 ou 5 estrelas */}
        {step === 'google_invite' && (
          <div className="text-center space-y-4 py-2 animate-scale-in">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shadow-sm animate-bounce">
              <Star className="w-7 h-7 fill-amber-400 text-amber-400" />
            </div>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Check className="w-3.5 h-3.5" />
              Avaliação salva com sucesso!
            </span>

            <h3 className="font-serif text-2xl font-bold text-ink mt-2">
              Você pode nos ajudar no Google?
            </h3>
            <p className="font-sans text-xs sm:text-sm text-ink-soft mt-1 leading-relaxed">
              Ficamos felizes demais que você amou seu atendimento! Copie seu depoimento e compartilhe também no Google para apoiar nosso salão. Leva menos de 1 minuto! ❤️
            </p>

            <div className="space-y-2.5 pt-3">
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
                onClick={() => {
                  if (onReviewSubmitted) onReviewSubmitted();
                  onClose();
                }}
                className="w-full py-2.5 font-sans text-xs text-ink-soft hover:text-ink font-medium transition-colors cursor-pointer"
              >
                Agora não, obrigado
              </button>
            </div>
          </div>
        )}

        {/* 3. Agradecimento Final */}
        {step === 'success' && (
          <div className="text-center py-4 space-y-3 animate-fade-in">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
              <Heart className="w-7 h-7 fill-emerald-600" />
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-ink">
              Muito obrigado pelo carinho!
            </h3>
            <p className="font-sans text-xs sm:text-sm text-ink-soft leading-relaxed max-w-xs mx-auto">
              Sua avaliação ajuda nossa equipe a evoluir e oferecer sempre o melhor atendimento.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReviewModal;
