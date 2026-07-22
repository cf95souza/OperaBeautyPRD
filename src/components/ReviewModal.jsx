import React, { useState } from 'react';
import { api } from '../lib/api';

const ReviewModal = ({ reviewData, onClose, onReviewSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!reviewData) return null;

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      await api.request('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          appointment_id: reviewData.appointment_id,
          rating,
          comment
        })
      });
      setSuccess(true);
      setTimeout(() => {
        onReviewSubmitted();
      }, 2000);
    } catch (err) {
      console.error('Erro ao enviar avaliação:', err);
      alert('Não foi possível enviar a avaliação. Tente novamente.');
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
              <span className="material-symbols-outlined text-[32px]">favorite</span>
            </div>
            <h3 className="font-headline-sm text-on-surface mb-2">Muito obrigado!</h3>
            <p className="text-secondary text-sm">Sua avaliação ajuda a manter a qualidade do nosso serviço.</p>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="font-headline-sm text-on-surface mb-1">Avalie seu atendimento</h2>
            <p className="text-secondary text-sm mb-6">
              Como foi sua experiência com <strong>{reviewData.professional_name}</strong> em <strong>{reviewData.service_name}</strong>?
            </p>

            <div className="flex justify-center gap-2 mb-6" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  className="transition-transform active:scale-90"
                >
                  <span 
                    className={`material-symbols-outlined text-[40px] ${(hoverRating || rating) >= star ? 'text-[#F59E0B] filled' : 'text-outline-variant'}`}
                    style={{ fontVariationSettings: (hoverRating || rating) >= star ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>

            {rating > 0 && (
              <div className="mb-6 animate-fade-in-up">
                <textarea
                  className="w-full bg-surface-variant/30 border border-outline-variant/50 rounded-xl p-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                  rows="3"
                  placeholder="Conte um pouco mais sobre sua experiência (opcional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={rating === 0 || loading}
              className={`w-full py-3 rounded-xl font-bold transition-all ${rating > 0 ? 'bg-primary text-on-primary shadow-md hover:shadow-lg active:scale-95' : 'bg-surface-variant text-secondary opacity-50 cursor-not-allowed'}`}
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                'Enviar Avaliação'
              )}
            </button>
            <button 
              onClick={onClose}
              className="w-full mt-3 py-2 text-sm text-secondary font-medium hover:text-on-surface transition-colors"
            >
              Avaliar depois
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewModal;
