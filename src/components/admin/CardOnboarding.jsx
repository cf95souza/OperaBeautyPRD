import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  Sparkles, 
  X, 
  QrCode, 
  Scissors, 
  Users, 
  Clock, 
  Palette, 
  CalendarCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  PartyPopper
} from 'lucide-react';
import { api } from '../../lib/api';

const ICONS_BY_STEP = {
  services: Scissors,
  staff: Users,
  business_hours: Clock,
  branding: Palette,
  qr_code: QrCode,
  first_appointment: CalendarCheck
};

export default function CardOnboarding({ 
  statusData, 
  onRefresh, 
  onOpenCatalogModal, 
  onOpenQrModal 
}) {
  const navigate = useNavigate();
  const [expandido, setExpandido] = useState(true);
  const [ocultando, setOcultando] = useState(false);

  if (!statusData) return null;

  const { tenant, summary, steps } = statusData;
  const isCompleted = summary?.is_all_completed;
  const progressPercent = summary?.progress_percent || 0;
  const completedSteps = summary?.completed_steps || 0;
  const totalSteps = summary?.total_steps || 6;

  const handleDismiss = async () => {
    try {
      setOcultando(true);
      await api.onboarding.dismiss(true);
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Erro ao dispensar checklist de onboarding:', err);
    } finally {
      setOcultando(false);
    }
  };

  const handleAction = (step) => {
    if (step.id === 'services' && !step.completed && onOpenCatalogModal) {
      onOpenCatalogModal();
      return;
    }

    if (step.id === 'qr_code' && onOpenQrModal) {
      onOpenQrModal();
      return;
    }

    if (step.actionType === 'external_booking_link' && step.actionUrl) {
      window.open(step.actionUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (step.actionUrl) {
      navigate(step.actionUrl);
    }
  };

  return (
    <div className="rounded-[24px] bg-gradient-to-b from-white via-white to-stone-50/50 border border-brand/25 shadow-sm p-6 sm:p-7 relative overflow-hidden transition-all animate-fade-in">
      {/* Detalhe de Borda Superior Rosé */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand via-[#b5586d] to-brand" />

      {/* Topo do Card de Onboarding */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-line/60">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-brand-tint text-brand flex items-center justify-center shrink-0 shadow-2xs">
            {isCompleted ? (
              <PartyPopper className="w-5 h-5 text-brand" />
            ) : (
              <Sparkles className="w-5 h-5 text-brand" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                Guia de Ativação do Salão
              </span>
              <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-[10px] font-bold tabular-nums lining-nums">
                {progressPercent}%
              </span>
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-stone-900 tracking-tight mt-0.5">
              {isCompleted 
                ? 'Parabéns! Seu salão está 100% pronto para atender ✨' 
                : 'Configure seu espaço e comece a agendar em minutos'}
            </h3>
          </div>
        </div>

        {/* Controles de Minimização e Fechamento */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setExpandido(prev => !prev)}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            title={expandido ? 'Minimizar checklist' : 'Expandir checklist'}
            aria-label={expandido ? 'Minimizar' : 'Expandir'}
          >
            {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            disabled={ocultando}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Ocultar do painel"
            aria-label="Ocultar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Barra de Progresso Visual */}
      <div className="my-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-stone-700">
            {completedSteps} de {totalSteps} {completedSteps === 1 ? 'etapa concluída' : 'etapas concluídas'}
          </span>
          <span className="text-stone-500 font-medium">
            {isCompleted ? 'Tudo pronto!' : 'Etapas recomendadas'}
          </span>
        </div>
        <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden p-0.5 border border-line/60">
          <div 
            className="h-full bg-gradient-to-r from-brand to-[#a84a60] rounded-full transition-all duration-700 ease-out shadow-xs"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Lista Interativa das 6 Etapas do Checklist */}
      {expandido && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
          {steps.map((step, idx) => {
            const StepIcon = ICONS_BY_STEP[step.id] || Sparkles;
            const isDone = Boolean(step.completed);

            return (
              <div 
                key={step.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isDone 
                    ? 'bg-white/80 border-stone-200/80 shadow-2xs' 
                    : 'bg-white border-brand/30 shadow-xs ring-1 ring-brand/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isDone 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'bg-brand-tint/60 text-brand'
                      }`}>
                        <StepIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                        Passo {idx + 1}
                      </span>
                    </div>

                    {isDone ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Pronto</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                        <Circle className="w-2.5 h-2.5 text-amber-600" />
                        <span>Pendente</span>
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                    {step.title}
                  </h4>

                  <p className="text-[11px] text-stone-500 mt-1 leading-relaxed line-clamp-2">
                    {step.description}
                  </p>
                </div>

                <div className="pt-3.5 mt-2 border-t border-line/40 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleAction(step)}
                    className={`text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      isDone
                        ? 'text-stone-600 hover:text-stone-900'
                        : 'text-brand hover:brightness-110'
                    }`}
                  >
                    <span>{step.actionLabel}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {step.id === 'services' && !isDone && onOpenCatalogModal && (
                    <button
                      type="button"
                      onClick={onOpenCatalogModal}
                      className="px-2 py-1 rounded-full bg-brand-tint/70 text-brand text-[10px] font-bold hover:bg-brand-tint transition-colors cursor-pointer"
                    >
                      Catálogo Modelo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rodapé Informativo */}
      <div className="mt-4 pt-3 border-t border-line/40 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2">
        <p>
          💡 <strong>Dica OperaBeauty:</strong> Um catálogo claro e um display na recepção aumentam os agendamentos online em até 60%.
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-stone-400 hover:text-stone-700 text-xs font-medium cursor-pointer transition-colors"
        >
          Dispensar este guia
        </button>
      </div>
    </div>
  );
}
