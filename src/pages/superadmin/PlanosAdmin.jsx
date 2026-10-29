import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { formatCurrency } from '../../utils/formatters';

const DEFAULT_FEATURE_SUGGESTIONS = [
  'Agendamentos ilimitados',
  'Serviços ilimitados',
  'Controle de estoque',
  'Controle de caixa',
  'Suporte por WhatsApp',
  'Clube de fidelidade',
  'PDV (ponto de venda)',
  'Vales-presente',
  'App do cliente white-label',
  'Relatórios avançados com IA'
];

const PlanosAdmin = () => {
  const { showSuccess, showError } = useNotification();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // 'monthly' | 'yearly'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formYearlyPrice, setFormYearlyPrice] = useState('');
  const [formMaxProf, setFormMaxProf] = useState('');
  const [formMaxBanners, setFormMaxBanners] = useState('1');
  const [formFeatures, setFormFeatures] = useState([]);
  const [newFeature, setNewFeature] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await api.plans.list();
      setPlans(data || []);
    } catch (err) {
      console.error('Erro ao buscar planos:', err);
      showError('Não foi possível carregar os planos.');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const openNewPlanModal = () => {
    setEditingPlan(null);
    setFormName('');
    setFormPrice('');
    setFormYearlyPrice('');
    setFormMaxProf('');
    setFormMaxBanners('1');
    setFormFeatures([
      'Agendamentos ilimitados',
      'Serviços ilimitados',
      'Controle de estoque',
      'Controle de caixa',
      'Suporte por WhatsApp'
    ]);
    setFormIsActive(true);
    setNewFeature('');
    setIsModalOpen(true);
  };

  const openEditPlanModal = (plan) => {
    setEditingPlan(plan);
    setFormName(plan.name === 'Interprise' ? 'Enterprise' : plan.name);
    setFormPrice(plan.price != null ? String(plan.price) : '');
    setFormYearlyPrice(plan.yearly_price != null ? String(plan.yearly_price) : '');
    setFormMaxProf(plan.max_professionals != null ? String(plan.max_professionals) : '');
    setFormMaxBanners(plan.max_banners != null ? String(plan.max_banners) : '1');

    // Sanitizar features: remover duplicações e corrigir textos como "Suporte 24/7" para "Suporte por WhatsApp em horário comercial"
    const cleanedFeatures = (Array.isArray(plan.features) ? plan.features : []).map((feat) => {
      if (typeof feat !== 'string') return String(feat);
      if (feat.toLowerCase().includes('suporte 24/7')) return 'Suporte por WhatsApp em horário comercial';
      return feat;
    });

    setFormFeatures(cleanedFeatures);
    setFormIsActive(plan.is_active);
    setNewFeature('');
    setIsModalOpen(true);
  };

  const handleAddFeature = (textToAdd) => {
    const text = (textToAdd || newFeature).trim();
    if (text && !formFeatures.includes(text)) {
      setFormFeatures([...formFeatures, text]);
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (indexToRemove) => {
    setFormFeatures(formFeatures.filter((_, i) => i !== indexToRemove));
  };

  const handleSavePlan = async (e) => {
    if (e) e.preventDefault();
    if (!formName.trim() || !formPrice) {
      showError('Nome e Preço mensal são obrigatórios.');
      return;
    }

    setIsSaving(true);
    const planPayload = {
      name: formName.trim() === 'Interprise' ? 'Enterprise' : formName.trim(),
      price: parseFloat(formPrice),
      yearly_price: formYearlyPrice ? parseFloat(formYearlyPrice) : null,
      max_professionals: formMaxProf ? parseInt(formMaxProf, 10) : null,
      max_banners: formMaxBanners ? parseInt(formMaxBanners, 10) : 1,
      features: formFeatures,
      is_active: formIsActive
    };

    try {
      if (editingPlan) {
        await api.plans.update(editingPlan.id, planPayload);
        showSuccess('Plano atualizado com sucesso!');
      } else {
        await api.plans.create(planPayload);
        showSuccess('Plano criado com sucesso!');
      }
      setIsModalOpen(false);
      fetchPlans();
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      showError('Erro ao salvar plano: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePlanStatus = async (plan) => {
    try {
      await api.plans.update(plan.id, { is_active: !plan.is_active });
      showSuccess(plan.is_active ? `Plano "${plan.name}" agora está oculto.` : `Plano "${plan.name}" publicado com sucesso!`);
      fetchPlans();
    } catch (error) {
      console.error('Erro ao alterar visibilidade do plano:', error);
      showError('Não foi possível alterar a visibilidade do plano.');
    }
  };

  // Reordenação de Planos (H5: ordenar planos)
  const handleMovePlan = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= plans.length) return;

    const newPlans = [...plans];
    const [moved] = newPlans.splice(index, 1);
    newPlans.splice(targetIndex, 0, moved);

    setPlans(newPlans);
    try {
      const orderedIds = newPlans.map((p) => p.id);
      await api.plans.reorder(orderedIds);
      showSuccess('Ordem dos planos salva com sucesso!');
    } catch (error) {
      console.error('Erro ao reordenar planos:', error);
      showError('Não foi possível salvar a nova ordem.');
      fetchPlans();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-7xl mx-auto pb-12">
      
      {/* 1. CABEÇALHO EDITORIAL (Fidelidade 1:1 com Mockup S2) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl md:text-[36px] text-stone-900 leading-tight">
            Planos e preços
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Planos exibidos na página de vendas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Seletor de Periodicidade: Mensal / Anual */}
          <div className="bg-stone-100 p-1 rounded-full flex items-center text-xs font-medium">
            <button
              type="button"
              onClick={() => setBillingPeriod('monthly')}
              className={`px-3.5 py-1.5 rounded-full transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod('yearly')}
              className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1 ${
                billingPeriod === 'yearly'
                  ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <span>Anual</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                Desconto
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={openNewPlanModal}
            className="bg-[#7C3A4D] hover:bg-[#682F40] text-white font-medium text-xs md:text-sm px-5 py-2.5 rounded-full flex items-center gap-1.5 shadow-sm hover:shadow transition-all shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Criar plano</span>
          </button>
        </div>
      </div>

      {/* 2. GRID DE CARDS DE PLANOS (Fidelidade S2) */}
      {loading ? (
        <div className="bg-white rounded-[26px] p-16 text-center border border-stone-200/80 shadow-2xs">
          <p className="text-stone-400 text-sm">Carregando planos de assinatura...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-[26px] p-16 text-center border border-stone-200/80 shadow-2xs flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">loyalty</span>
          </div>
          <h3 className="font-display font-bold text-lg text-stone-800 mb-1">Nenhum plano cadastrado</h3>
          <p className="text-stone-500 text-xs max-w-sm mb-6">
            Cadastre seu primeiro pacote de assinatura para que os salões possam assinar a plataforma.
          </p>
          <button
            type="button"
            onClick={openNewPlanModal}
            className="bg-[#7C3A4D] hover:bg-[#682F40] text-white text-xs px-5 py-2.5 rounded-full font-medium"
          >
            Criar primeiro plano
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan, index) => {
            const displayName = plan.name === 'Interprise' ? 'Enterprise' : plan.name;
            const priceToDisplay = billingPeriod === 'yearly' && plan.yearly_price
              ? plan.yearly_price
              : plan.price;
            const intervalLabel = billingPeriod === 'yearly' && plan.yearly_price
              ? '/ano'
              : '/mês';
            const subscribers = plan.subscribers_count || 0;
            const mrr = plan.total_mrr || 0;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-[26px] p-7 border transition-all flex flex-col justify-between shadow-2xs ${
                  plan.is_active
                    ? 'border-stone-200/90 hover:border-[#7C3A4D]/30 hover:shadow-md'
                    : 'border-stone-200/50 bg-stone-50/50 opacity-80'
                }`}
              >
                <div>
                  {/* Cabeçalho do Card: Nome e Badge de Status */}
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-2xl text-stone-900">
                        {displayName}
                      </h3>
                      {/* Botões de Reordenação Suave */}
                      <div className="flex items-center gap-0.5 opacity-30 hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMovePlan(index, -1)}
                          title="Mover para esquerda/cima"
                          className="p-1 text-stone-500 hover:text-stone-800 disabled:opacity-20 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">arrow_upward</span>
                        </button>
                        <button
                          type="button"
                          disabled={index === plans.length - 1}
                          onClick={() => handleMovePlan(index, 1)}
                          title="Mover para direita/baixo"
                          className="p-1 text-stone-500 hover:text-stone-800 disabled:opacity-20 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">arrow_downward</span>
                        </button>
                      </div>
                    </div>

                    {plan.is_active ? (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs px-3 py-1 rounded-full font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Público
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-600 text-xs px-3 py-1 rounded-full font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                        Oculto
                      </span>
                    )}
                  </div>

                  {/* Preço em Destaque Tabular */}
                  <div className="mb-2">
                    <div className="flex items-baseline gap-1">
                      <span className="font-display font-bold text-3xl md:text-[34px] text-stone-900 tabular-nums lining-nums">
                        {formatCurrency(priceToDisplay)}
                      </span>
                      <span className="text-stone-500 text-xs font-normal">
                        {intervalLabel}
                      </span>
                    </div>
                    {/* Contagem de Assinantes e MRR */}
                    <p className="text-xs text-stone-500 mt-1">
                      <strong className="text-stone-800 tabular-nums">{subscribers}</strong> {subscribers === 1 ? 'assinante' : 'assinantes'} · MRR <strong className="text-stone-800 tabular-nums">{formatCurrency(mrr)}</strong>
                    </p>
                  </div>

                  {/* Limites em Pílulas */}
                  <div className="flex flex-wrap gap-2 my-5">
                    <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-600 rounded-full px-3 py-1 text-xs font-medium">
                      <span className="material-symbols-outlined text-sm text-stone-400">group</span>
                      {plan.max_professionals ? `${plan.max_professionals} profissionais` : 'Profissionais ilimitados'}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-600 rounded-full px-3 py-1 text-xs font-medium">
                      <span className="material-symbols-outlined text-sm text-stone-400">image</span>
                      {plan.max_banners ? `${plan.max_banners} banner(s)` : '1 banner'}
                    </span>
                  </div>

                  {/* Lista de Recursos (Features) com Apenas UM Ícone de Check (§9.5·H5) */}
                  <div className="border-t border-stone-100 pt-4 flex flex-col gap-2.5 mb-6">
                    {Array.isArray(plan.features) && plan.features.length > 0 ? (
                      plan.features.map((feature, fIdx) => {
                        const featText = typeof feature === 'string' ? feature : String(feature);
                        const cleanText = featText.toLowerCase().includes('suporte 24/7')
                          ? 'Suporte por WhatsApp'
                          : featText;

                        return (
                          <div key={fIdx} className="flex items-start gap-2.5">
                            {/* Apenas 1 ícone de check elegante na cor brand */}
                            <span className="material-symbols-outlined text-[17px] text-[#7C3A4D] shrink-0 mt-0.5">
                              check
                            </span>
                            <span className="text-xs text-stone-700 leading-tight">
                              {cleanText}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-stone-400 italic">Nenhum recurso discriminado.</p>
                    )}
                  </div>
                </div>

                {/* Rodapé do Card: Ações Claras e Legíveis (Fidelidade S2: Editar à esquerda, Ocultar à direita) */}
                <div className="border-t border-stone-100 pt-5 grid grid-cols-2 gap-3 mt-auto">
                  <button
                    type="button"
                    onClick={() => openEditPlanModal(plan)}
                    className="py-2.5 px-3 rounded-full text-xs font-semibold bg-[#7C3A4D] hover:bg-[#682F40] text-white transition-all text-center shadow-2xs hover:shadow cursor-pointer"
                  >
                    Editar plano
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePlanStatus(plan)}
                    className="py-2.5 px-3 rounded-full text-xs font-semibold border border-[#7C3A4D] text-[#7C3A4D] hover:bg-rose-50/60 transition-colors text-center cursor-pointer"
                  >
                    {plan.is_active ? 'Ocultar' : 'Publicar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. MODAL DE EDIÇÃO / CRIAÇÃO DE PLANO */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          onClick={() => !isSaving && setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-[28px] border border-stone-200/90 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-7 flex flex-col gap-5 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Topo do Modal */}
            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-display font-bold text-xl text-stone-900">
                  {editingPlan ? 'Editar plano SaaS' : 'Novo plano de assinatura'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Configure preços, periodicidades, limites operacionais e recursos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="flex flex-col gap-4">
              
              {/* Linha 1: Nome do Plano e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Nome do plano <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Enterprise, Premium, Básico"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-stone-50/80 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-800 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3A4D]/20 focus:border-[#7C3A4D] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Visibilidade
                  </label>
                  <select
                    value={formIsActive ? 'active' : 'inactive'}
                    onChange={(e) => setFormIsActive(e.target.value === 'active')}
                    className="w-full bg-stone-50/80 border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3A4D]/20 focus:border-[#7C3A4D] transition-all cursor-pointer font-medium"
                  >
                    <option value="active">Público</option>
                    <option value="inactive">Oculto</option>
                  </select>
                </div>
              </div>

              {/* Linha 2: Preço Mensal e Preço Anual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Preço mensal (R$) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Ex: 99.90"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full bg-stone-50/80 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-800 tabular-nums placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3A4D]/20 focus:border-[#7C3A4D] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Preço anual (R$) <span className="text-stone-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 999.00"
                    value={formYearlyPrice}
                    onChange={(e) => setFormYearlyPrice(e.target.value)}
                    className="w-full bg-stone-50/80 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-800 tabular-nums placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3A4D]/20 focus:border-[#7C3A4D] transition-all"
                  />
                </div>
              </div>

              {/* Linha 3: Limites de Profissionais e Banners */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Limite de profissionais <span className="text-stone-400 font-normal">(vazio = ilimitado)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 5 ou vazio para ilimitado"
                    value={formMaxProf}
                    onChange={(e) => setFormMaxProf(e.target.value)}
                    className="w-full bg-stone-50/80 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-800 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3A4D]/20 focus:border-[#7C3A4D] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Limite de banners na Home
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 2"
                    value={formMaxBanners}
                    onChange={(e) => setFormMaxBanners(e.target.value)}
                    className="w-full bg-stone-50/80 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-800 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3A4D]/20 focus:border-[#7C3A4D] transition-all"
                  />
                </div>
              </div>

              {/* Linha 4: Recursos do Plano (Features) */}
              <div className="border-t border-stone-100 pt-3">
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Recursos inclusos no plano ({formFeatures.length})
                </label>

                {/* Campo para Adicionar Novo Recurso */}
                <div className="flex gap-2 mb-2.5">
                  <input
                    type="text"
                    placeholder="Adicionar novo recurso (pressione Enter)..."
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    className="flex-1 bg-stone-50/80 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-800 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3A4D]/20 focus:border-[#7C3A4D] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddFeature()}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Sugestões Rápidas em 1 Clique */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="text-[11px] text-stone-400 self-center mr-1">Sugestões:</span>
                  {DEFAULT_FEATURE_SUGGESTIONS.filter((s) => !formFeatures.includes(s)).slice(0, 4).map((sugg, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => handleAddFeature(sugg)}
                      className="bg-stone-100/70 hover:bg-stone-200/80 text-stone-600 text-[11px] px-2.5 py-0.5 rounded-full transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>+ {sugg}</span>
                    </button>
                  ))}
                </div>

                {/* Lista de Recursos Cadastrados com Remoção */}
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto bg-stone-50/50 p-2.5 rounded-xl border border-stone-200/60">
                  {formFeatures.length === 0 ? (
                    <p className="text-xs text-stone-400 text-center py-2">
                      Nenhum recurso cadastrado ainda.
                    </p>
                  ) : (
                    formFeatures.map((feat, fIdx) => (
                      <div
                        key={fIdx}
                        className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-lg border border-stone-100 shadow-2xs text-xs text-stone-700"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[15px] text-[#7C3A4D]">
                            check
                          </span>
                          <span>{feat}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(fIdx)}
                          className="text-stone-400 hover:text-rose-600 transition-colors p-0.5"
                          title="Remover"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Botões do Rodapé do Modal */}
              <div className="flex justify-end items-center gap-2.5 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#7C3A4D] hover:bg-[#682F40] text-white px-6 py-2.5 rounded-full text-xs font-medium transition-all shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{editingPlan ? 'Salvar alterações' : 'Criar plano'}</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PlanosAdmin;
