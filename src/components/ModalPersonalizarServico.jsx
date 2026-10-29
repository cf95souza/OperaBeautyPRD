import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Check, Clock, Plus, Trash2, SlidersHorizontal } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export const ModalPersonalizarServico = ({
  isOpen,
  onClose,
  servico,
  initialSelection = null,
  onConfirm,
  onRemove
}) => {
  if (!isOpen || !servico) return null;

  const variations = servico.variations || [];
  const extras = servico.extras || [];

  // Estado da Variação selecionada (padrão: a primeira variação ativa se houver)
  const [selectedVariationId, setSelectedVariationId] = useState(() => {
    if (initialSelection?.variation_id) return initialSelection.variation_id;
    if (variations.length > 0) return variations[0].id;
    return null;
  });

  // Estado dos Extras selecionados (array de IDs)
  const [selectedExtraIds, setSelectedExtraIds] = useState(() => {
    if (initialSelection?.extras && Array.isArray(initialSelection.extras)) {
      return initialSelection.extras.map(e => typeof e === 'string' ? e : e.id);
    }
    return [];
  });

  // Sincroniza se o serviço mudar
  useEffect(() => {
    if (initialSelection?.variation_id) {
      setSelectedVariationId(initialSelection.variation_id);
    } else if (variations.length > 0) {
      setSelectedVariationId(variations[0].id);
    } else {
      setSelectedVariationId(null);
    }

    if (initialSelection?.extras && Array.isArray(initialSelection.extras)) {
      setSelectedExtraIds(initialSelection.extras.map(e => typeof e === 'string' ? e : e.id));
    } else {
      setSelectedExtraIds([]);
    }
  }, [servico, initialSelection]);

  const selectedVariation = useMemo(() => {
    return variations.find(v => v.id === selectedVariationId) || null;
  }, [variations, selectedVariationId]);

  const selectedExtrasList = useMemo(() => {
    return extras.filter(e => selectedExtraIds.includes(e.id));
  }, [extras, selectedExtraIds]);

  // Cálculos dinâmicos
  const basePrice = selectedVariation ? parseFloat(selectedVariation.price) : parseFloat(servico.price || 0);
  const baseDuration = selectedVariation ? parseInt(selectedVariation.duration_minutes, 10) : parseInt(servico.duration_minutes || servico.duration || 30, 10);

  const extrasTotalPrice = selectedExtrasList.reduce((sum, e) => sum + parseFloat(e.price || 0), 0);
  const extrasTotalDuration = selectedExtrasList.reduce((sum, e) => sum + parseInt(e.duration_minutes || 0, 10), 0);

  const finalTotalPrice = basePrice + extrasTotalPrice;
  const finalTotalDuration = baseDuration + extrasTotalDuration;

  // Formatador de duração
  const formatMinutes = (totalMinutes) => {
    if (!totalMinutes || totalMinutes <= 0) return '0 min';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) {
      return `${hours}h${minutes < 10 ? '0' : ''}${minutes}`;
    } else if (hours > 0) {
      return `${hours}h`;
    }
    return `${minutes} min`;
  };

  const toggleExtra = (extraId) => {
    setSelectedExtraIds(prev => 
      prev.includes(extraId) ? prev.filter(id => id !== extraId) : [...prev, extraId]
    );
  };

  const handleSave = () => {
    const payload = {
      ...servico,
      variation_id: selectedVariation ? selectedVariation.id : null,
      variation_name: selectedVariation ? selectedVariation.name : null,
      extras: selectedExtrasList.map(e => ({
        id: e.id,
        name: e.name,
        price: parseFloat(e.price || 0),
        duration_minutes: parseInt(e.duration_minutes || 0, 10)
      })),
      price: finalTotalPrice,
      duration_minutes: finalTotalDuration,
      duration: finalTotalDuration,
      isCustomized: true
    };
    onConfirm(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-fade-in">
      <div 
        className="bg-surface w-full max-w-lg rounded-t-[28px] sm:rounded-[24px] border border-line shadow-2xl p-5 sm:p-7 relative animate-scale-up max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-personalizar-titulo"
      >
        {/* Topo do Modal */}
        <div className="flex items-start justify-between pb-4 border-b border-line shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-tint text-brand text-[11px] font-semibold mb-1 shadow-2xs">
              <Sparkles size={13} />
              <span>Personalização Rosé</span>
            </div>
            <h2 id="modal-personalizar-titulo" className="font-serif text-2xl font-bold text-ink leading-tight">
              {servico.name}
            </h2>
            {servico.short_description && (
              <p className="text-xs text-ink-soft mt-0.5 line-clamp-2">
                {servico.short_description}
              </p>
            )}
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-ink-soft hover:text-ink hover:bg-stone-100 transition-colors shrink-0 cursor-pointer ml-2"
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo com rolagem */}
        <div className="overflow-y-auto flex-1 py-4 space-y-6 pr-1">
          {/* 1. Escolha da Variação (se houver) */}
          {variations.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
                  <SlidersHorizontal size={14} className="text-brand" />
                  1. Escolha a variação / tamanho *
                </span>
                <span className="text-[11px] text-ink-soft/70">Obrigatório</span>
              </div>

              <div className="space-y-2">
                {variations.map((v) => {
                  const isChecked = selectedVariationId === v.id;
                  return (
                    <div
                      key={v.id}
                      role="radio"
                      aria-checked={isChecked}
                      tabIndex={0}
                      onClick={() => setSelectedVariationId(v.id)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          setSelectedVariationId(v.id);
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                        isChecked
                          ? 'border-brand bg-brand-tint/20 shadow-2xs'
                          : 'border-line hover:border-brand/40 bg-surface'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isChecked ? 'border-brand bg-brand text-white' : 'border-line bg-surface'
                        }`}>
                          {isChecked && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-ink leading-tight">{v.name}</p>
                          <p className="text-xs text-ink-soft flex items-center gap-1 mt-0.5">
                            <Clock size={12} />
                            <span>{v.duration_minutes} min</span>
                          </p>
                        </div>
                      </div>

                      <span className="font-sans font-bold text-sm text-brand tabular-nums lining-nums">
                        {formatCurrency(v.price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Escolha dos Extras (se houver) */}
          {extras.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
                  <Sparkles size={14} className="text-brand" />
                  {variations.length > 0 ? '2. Adicionais opcionais (Extras)' : 'Adicionais opcionais (Extras)'}
                </span>
                <span className="text-[11px] text-ink-soft/70">Múltipla escolha</span>
              </div>

              <div className="space-y-2">
                {extras.map((extra) => {
                  const isChecked = selectedExtraIds.includes(extra.id);
                  return (
                    <div
                      key={extra.id}
                      role="checkbox"
                      aria-checked={isChecked}
                      tabIndex={0}
                      onClick={() => toggleExtra(extra.id)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          toggleExtra(extra.id);
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                        isChecked
                          ? 'border-brand bg-brand-tint/20 shadow-2xs'
                          : 'border-line hover:border-brand/40 bg-surface'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked ? 'border-brand bg-brand text-white' : 'border-line bg-surface'
                        }`}>
                          {isChecked && <Check size={14} strokeWidth={3} />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink leading-tight">{extra.name}</p>
                          {extra.duration_minutes > 0 ? (
                            <p className="text-[11px] text-ink-soft flex items-center gap-1 mt-0.5">
                              <Clock size={11} />
                              <span>+{extra.duration_minutes} min adicionais</span>
                            </p>
                          ) : (
                            <p className="text-[11px] text-ink-soft mt-0.5">Sem acréscimo de tempo</p>
                          )}
                        </div>
                      </div>

                      <span className="font-sans font-bold text-xs text-brand tabular-nums lining-nums">
                        +{formatCurrency(extra.price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Fixo do Modal */}
        <div className="pt-4 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block leading-none">
              Resumo deste procedimento
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-serif text-2xl font-bold text-ink tabular-nums lining-nums">
                {formatCurrency(finalTotalPrice)}
              </span>
              <span className="text-xs text-ink-soft font-medium">
                · {formatMinutes(finalTotalDuration)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {initialSelection && onRemove && (
              <button
                type="button"
                onClick={() => {
                  onRemove(servico);
                  onClose();
                }}
                className="px-3.5 py-2.5 rounded-full border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Remover serviço da seleção"
              >
                <Trash2 size={14} />
                <span>Remover</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-hover shadow-xs active:scale-98 cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <Check size={16} strokeWidth={2.6} />
              <span>{initialSelection ? 'Salvar escolhas' : 'Confirmar e Adicionar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalPersonalizarServico;
