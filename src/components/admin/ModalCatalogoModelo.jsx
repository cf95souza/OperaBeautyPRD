import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  Clock, 
  DollarSign, 
  AlertCircle,
  Eye,
  Smile,
  Heart,
  Flame,
  Scissors,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { formatCurrency } from '../../utils/formatters';

// Mapeamento de ícones por segmento
const ICON_MAP = {
  Sparkles,
  Eye,
  Smile,
  Heart,
  Flame,
  Scissors
};

export default function ModalCatalogoModelo({ isOpen, onClose, onSuccess }) {
  const { showSuccess, showError } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedSegmentKey, setSelectedSegmentKey] = useState('manicure');
  const [selectedServices, setSelectedServices] = useState({});

  useEffect(() => {
    if (isOpen) {
      carregarTemplates();
    }
  }, [isOpen]);

  const carregarTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.onboarding.getCatalogTemplates();
      const list = res.templates || [];
      setTemplates(list);

      if (list.length > 0) {
        const initialSegment = list[0].key;
        setSelectedSegmentKey(initialSegment);
        inicializarSelecao(list[0].services);
      }
    } catch (err) {
      console.error('Erro ao carregar templates de catálogo:', err);
      showError('Não foi possível carregar os modelos de catálogo.');
    } finally {
      setLoading(false);
    }
  };

  const inicializarSelecao = (services) => {
    const sel = {};
    services.forEach((s, idx) => {
      sel[idx] = {
        selected: true,
        name: s.name,
        short_description: s.short_description || '',
        duration_minutes: s.duration_minutes,
        price: s.price,
        category: s.category || ''
      };
    });
    setSelectedServices(sel);
  };

  const handleTrocarSegmento = (segmentKey) => {
    setSelectedSegmentKey(segmentKey);
    const tmpl = templates.find(t => t.key === segmentKey);
    if (tmpl) {
      inicializarSelecao(tmpl.services);
    }
  };

  const toggleService = (idx) => {
    setSelectedServices(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        selected: !prev[idx]?.selected
      }
    }));
  };

  const toggleTodos = (marcar) => {
    setSelectedServices(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        next[k] = { ...next[k], selected: marcar };
      });
      return next;
    });
  };

  const currentTemplate = templates.find(t => t.key === selectedSegmentKey);
  const currentServicesList = currentTemplate ? currentTemplate.services : [];
  
  const totalSelecionados = Object.values(selectedServices).filter(s => s?.selected).length;

  const handleAplicar = async () => {
    const servicosParaImportar = Object.values(selectedServices)
      .filter(s => s?.selected)
      .map(s => ({
        name: s.name,
        short_description: s.short_description,
        duration_minutes: Number(s.duration_minutes),
        price: Number(s.price),
        category: s.category
      }));

    if (servicosParaImportar.length === 0) {
      showError('Selecione ao menos um serviço para adicionar ao catálogo.');
      return;
    }

    try {
      setSalvando(true);
      const res = await api.onboarding.applyCatalogTemplate(selectedSegmentKey, servicosParaImportar);
      
      showSuccess(`${res.inserted_count} ${res.inserted_count === 1 ? 'serviço adicionado' : 'serviços adicionados'} ao catálogo com sucesso!`);
      
      if (onSuccess) {
        onSuccess(res);
      }
      onClose();
    } catch (err) {
      console.error('Erro ao aplicar catálogo modelo:', err);
      showError(err.message || 'Erro ao importar serviços do modelo.');
    } finally {
      setSalvando(false);
    }
  };

  if (!isOpen) return null;

  const SegmentIcon = currentTemplate && ICON_MAP[currentTemplate.icon] 
    ? ICON_MAP[currentTemplate.icon] 
    : Sparkles;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-[24px] border border-line shadow-2xl flex flex-col overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho Rosé Editorial */}
        <div className="px-6 py-5 border-b border-line/60 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-tint text-brand flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-stone-900 tracking-tight">
                Catálogos-Modelo por Segmento
              </h2>
              <p className="text-xs text-stone-500">
                Selecione sua especialidade e preencha seu catálogo em segundos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-stone-400">
              <div className="w-8 h-8 border-3 border-brand/20 border-t-brand rounded-full animate-spin" />
              <p className="text-sm">Carregando sugestões de catálogo...</p>
            </div>
          ) : (
            <>
              {/* Seletor de Segmentos em Chips com Ícones */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2.5">
                  1. Escolha o segmento do seu espaço
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {templates.map(tmpl => {
                    const ChipIcon = ICON_MAP[tmpl.icon] || Sparkles;
                    const isSelected = tmpl.key === selectedSegmentKey;

                    return (
                      <button
                        key={tmpl.key}
                        type="button"
                        onClick={() => handleTrocarSegmento(tmpl.key)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                          isSelected
                            ? 'bg-brand text-white border-brand shadow-sm font-semibold'
                            : 'bg-white text-stone-700 border-line hover:border-brand/40 hover:bg-stone-50'
                        }`}
                      >
                        <ChipIcon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-brand'}`} />
                        <span className="text-xs truncate">{tmpl.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Banner Informativo do Segmento Selecionado */}
              {currentTemplate && (
                <div className="p-4 rounded-2xl bg-brand-tint/30 border border-brand/20 flex items-start gap-3.5">
                  <SegmentIcon className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-semibold text-stone-900">{currentTemplate.description}</p>
                    <p className="text-stone-500 mt-0.5">
                      Recomendado para: <strong className="text-stone-700 font-medium">{currentTemplate.recommendedFor}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Lista dos Serviços Sugeridos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    2. Selecione os serviços que você realiza ({totalSelecionados} selecionados)
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => toggleTodos(true)}
                      className="text-brand hover:underline font-medium cursor-pointer"
                    >
                      Marcar todos
                    </button>
                    <span className="text-stone-300">•</span>
                    <button
                      type="button"
                      onClick={() => toggleTodos(false)}
                      className="text-stone-500 hover:text-stone-700 font-medium cursor-pointer"
                    >
                      Desmarcar todos
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {currentServicesList.map((srv, idx) => {
                    const itemState = selectedServices[idx] || {};
                    const isChecked = Boolean(itemState.selected);

                    return (
                      <div
                        key={idx}
                        onClick={() => toggleService(idx)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isChecked
                            ? 'bg-white border-brand/40 shadow-2xs ring-1 ring-brand/10'
                            : 'bg-stone-50/60 border-line opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isChecked
                            ? 'bg-brand border-brand text-white'
                            : 'border-stone-300 bg-white'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-bold text-stone-900 truncate">
                              {srv.name}
                            </h4>
                            <span className="text-xs font-bold text-stone-900 tabular-nums lining-nums shrink-0">
                              {formatCurrency(srv.price)}
                            </span>
                          </div>

                          {srv.short_description && (
                            <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
                              {srv.short_description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-stone-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{srv.duration_minutes} min</span>
                            </span>
                            {srv.category && (
                              <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-medium">
                                {srv.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="px-6 py-4 border-t border-line/60 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-stone-500 text-center sm:text-left">
            Os preços e durações poderão ser ajustados livremente depois.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleAplicar}
              disabled={salvando || loading || totalSelecionados === 0}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-full bg-brand text-white hover:brightness-110 disabled:opacity-50 text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              {salvando ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Adicionando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Adicionar {totalSelecionados} {totalSelecionados === 1 ? 'Serviço' : 'Serviços'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
