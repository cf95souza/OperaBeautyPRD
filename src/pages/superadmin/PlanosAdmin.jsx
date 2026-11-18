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

  // Aba ativa: 'plans' | 'coupons' | 'gateway'
  const [activeTab, setActiveTab] = useState('plans');
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    applies_to: 'first_month',
    plan_slug: 'all',
    max_uses: ''
  });
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [testingGateway, setTestingGateway] = useState(false);
  const [gatewayResult, setGatewayResult] = useState(null);

  useEffect(() => {
    fetchPlans();
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const data = await api.saasCoupons.list();
      setCoupons(data || []);
    } catch (err) {
      console.error('Erro ao buscar cupons SaaS:', err);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setSavingCoupon(true);
    try {
      const payload = {
        code: couponForm.code,
        description: couponForm.description,
        discount_type: couponForm.discount_type,
        discount_value: Number(couponForm.discount_value),
        applies_to: couponForm.applies_to,
        plan_slugs: couponForm.plan_slug === 'all' ? [] : [couponForm.plan_slug],
        max_uses: couponForm.max_uses ? parseInt(couponForm.max_uses, 10) : null
      };
      await api.saasCoupons.create(payload);
      showSuccess('Cupom SaaS criado com sucesso!');
      setIsCouponModalOpen(false);
      setCouponForm({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        applies_to: 'first_month',
        plan_slug: 'all',
        max_uses: ''
      });
      fetchCoupons();
    } catch (err) {
      showError(err.message || 'Erro ao criar cupom.');
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleToggleCoupon = async (id, currentStatus) => {
    try {
      await api.saasCoupons.toggleStatus(id, !currentStatus);
      showSuccess(`Cupom ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
      fetchCoupons();
    } catch (err) {
      showError(err.message || 'Erro ao atualizar status.');
    }
  };

  const handleDeleteCoupon = async (id, code) => {
    if (!window.confirm(`Excluir permanentemente o cupom ${code}?`)) return;
    try {
      await api.saasCoupons.delete(id);
      showSuccess('Cupom removido.');
      fetchCoupons();
    } catch (err) {
      showError(err.message || 'Erro ao excluir cupom.');
    }
  };

  const handleTestGateway = async () => {
    setTestingGateway(true);
    setGatewayResult(null);
    try {
      const res = await api.invoices.testGateway();
      setGatewayResult(res);
      showSuccess('Gateway Mercado Pago conectado e validado!');
    } catch (err) {
      setGatewayResult({ success: false, error: err.message || 'Falha na conexão.' });
      showError(err.message || 'Falha ao testar conexão com Mercado Pago.');
    } finally {
      setTestingGateway(false);
    }
  };

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
      
      {/* 1. CABEÇALHO EDITORIAL & NAVEGAÇÃO DE ABAS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl md:text-[36px] text-stone-900 leading-tight">
            Planos, Cupons & Cobrança SaaS
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Gestão da grade comercial de 3 planos, cupons promocionais e gateway de pagamento.
          </p>
        </div>

        {activeTab === 'plans' && (
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
                  2 Meses Grátis
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
        )}

        {activeTab === 'coupons' && (
          <button
            type="button"
            onClick={() => setIsCouponModalOpen(true)}
            className="bg-[#7C3A4D] hover:bg-[#682F40] text-white font-medium text-xs md:text-sm px-5 py-2.5 rounded-full flex items-center gap-1.5 shadow-sm hover:shadow transition-all shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">local_offer</span>
            <span>Novo Cupom Promocional</span>
          </button>
        )}
      </div>

      {/* Navegação entre Abas */}
      <div className="flex items-center gap-2 border-b border-stone-200">
        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'plans'
              ? 'border-[#7C3A4D] text-[#7C3A4D]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">loyalty</span>
          <span>Catálogo de Planos ({plans.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('coupons')}
          className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'coupons'
              ? 'border-[#7C3A4D] text-[#7C3A4D]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">percent</span>
          <span>Cupons & Campanhas SaaS ({coupons.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gateway')}
          className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'gateway'
              ? 'border-[#7C3A4D] text-[#7C3A4D]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">verified_user</span>
          <span>Diagnóstico Gateway (Mercado Pago)</span>
        </button>
      </div>

      {/* ABA 1: PLANOS */}
      {activeTab === 'plans' && (
        loading ? (
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
        )
      )}

      {/* ABA 2: GESTÃO DE CUPONS SAAS */}
      {activeTab === 'coupons' && (
        <div className="bg-white rounded-[26px] border border-stone-200/80 shadow-2xs overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-bold text-lg text-stone-900">
                Cupons de Desconto e Campanhas de Aquisição
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Crie cupons para captação de salões (ex: 30% no 1º mês do plano Essencial, 40% no Premium).
              </p>
            </div>
          </div>

          {loadingCoupons ? (
            <div className="p-12 text-center text-xs text-stone-400">Carregando cupons...</div>
          ) : coupons.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-500">Nenhum cupom SaaS cadastrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Descrição / Campanha</th>
                    <th className="py-3 px-4">Desconto</th>
                    <th className="py-3 px-4">Aplicação</th>
                    <th className="py-3 px-4">Planos Elegíveis</th>
                    <th className="py-3 px-4">Usos / Limite</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {coupons.map((c) => {
                    let plansList = c.plan_slugs;
                    if (typeof plansList === 'string') {
                      try { plansList = JSON.parse(plansList); } catch { plansList = []; }
                    }
                    const plansText = !Array.isArray(plansList) || plansList.length === 0 
                      ? 'Todos os planos' 
                      : plansList.join(', ');

                    return (
                      <tr key={c.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#7C3A4D]">{c.code}</td>
                        <td className="py-3 px-4 text-stone-700 max-w-xs">{c.description || '—'}</td>
                        <td className="py-3 px-4 font-bold text-stone-900">
                          {c.discount_type === 'percentage' ? `${c.discount_value}%` : `R$ ${Number(c.discount_value).toFixed(2)}`}
                        </td>
                        <td className="py-3 px-4 text-stone-600">
                          {c.applies_to === 'first_month' ? '1º Mês' : c.applies_to === 'yearly' ? 'Anual' : 'Todas'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-medium">
                            {plansText}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-700">
                          <strong>{c.current_uses}</strong> {c.max_uses ? `/ ${c.max_uses}` : '(ilimitado)'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                          }`}>
                            {c.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleCoupon(c.id, c.is_active)}
                              className="text-stone-600 hover:text-stone-900 font-medium hover:underline cursor-pointer"
                            >
                              {c.is_active ? 'Pausar' : 'Ativar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCoupon(c.id, c.code)}
                              className="text-rose-600 hover:text-rose-800 font-medium hover:underline cursor-pointer"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA 3: DIAGNÓSTICO DO GATEWAY (MERCADO PAGO) */}
      {activeTab === 'gateway' && (
        <div className="bg-white rounded-[26px] border border-stone-200/80 shadow-2xs p-7 flex flex-col gap-6">
          <div className="flex items-start justify-between border-b border-stone-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#7C3A4D] text-2xl">verified_user</span>
                <h2 className="font-display font-bold text-xl text-stone-900">
                  Saúde do Gateway de Pagamento (Mercado Pago PIX)
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
                Valide se o seu Access Token de Produção está ativo, se a integração com o Banco Central e a API do Mercado Pago estão respondendo e monitore a baixa automática de mensalidades.
              </p>
            </div>

            <button
              type="button"
              disabled={testingGateway}
              onClick={handleTestGateway}
              className="bg-[#7C3A4D] hover:bg-[#682F40] text-white px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-base ${testingGateway ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>{testingGateway ? 'Testando Conexão...' : 'Testar Conexão com Mercado Pago'}</span>
            </button>
          </div>

          {/* Resultado do Teste */}
          {gatewayResult && (
            <div className={`p-5 rounded-2xl border ${
              gatewayResult.success 
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                : 'bg-rose-50/80 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm mb-2">
                <span className="material-symbols-outlined">
                  {gatewayResult.success ? 'check_circle' : 'error'}
                </span>
                <span>{gatewayResult.message || gatewayResult.error}</span>
              </div>

              {gatewayResult.account && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white/70 p-3 rounded-xl border border-emerald-200/60">
                  <div>
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">Conta Conectada:</span>
                    <strong>{gatewayResult.account.nickname || gatewayResult.account.email}</strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">ID do Vendedor:</span>
                    <strong className="font-mono">{gatewayResult.account.id}</strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">Ambiente:</span>
                    <strong className="uppercase">{gatewayResult.account.environment}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dicas e Instruções do Gateway */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-stone-600">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1.5">
              <strong className="text-stone-900 block font-semibold">1. Webhook Automático Ativo</strong>
              <p className="leading-relaxed text-[11px]">
                O webhook de produção do OperaBeauty está configurado para receber notificações em tempo real. Assim que o pagamento cai no Mercado Pago, a fatura é baixada instantaneamente sem delay.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1.5">
              <strong className="text-stone-900 block font-semibold">2. Botão de Verificação Manual</strong>
              <p className="leading-relaxed text-[11px]">
                Caso haja oscilação temporária em webhooks externos, o modal de pagamento do salão agora possui o botão <em>"Já fiz o PIX, verificar agora"</em>, que consulta a API do Mercado Pago na mesma hora e dá baixa imediata.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação de Novo Cupom Promocional SaaS */}
      {isCouponModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          onClick={() => !savingCoupon && setIsCouponModalOpen(false)}
        >
          <div 
            className="bg-white rounded-[28px] border border-stone-200 shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
              <h3 className="font-display font-bold text-lg text-stone-900">Novo Cupom SaaS</h3>
              <button
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Código do Cupom *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ESSENCIAL30, PREMIUM40"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  className="w-full font-mono uppercase bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Descrição / Finalidade</label>
                <input
                  type="text"
                  placeholder="Ex: 30% no 1º mês para novas adesões do plano Essencial"
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Tipo de Desconto</label>
                  <select
                    value={couponForm.discount_type}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_type: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none"
                  >
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="fixed">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Valor do Desconto *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder={couponForm.discount_type === 'percentage' ? 'Ex: 30' : 'Ex: 20.00'}
                    value={couponForm.discount_value}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_value: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Plano Elegível</label>
                  <select
                    value={couponForm.plan_slug}
                    onChange={(e) => setCouponForm({ ...couponForm, plan_slug: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none"
                  >
                    <option value="all">Todos os Planos</option>
                    <option value="basico">Plano Básico</option>
                    <option value="essencial">Plano Essencial</option>
                    <option value="premium">Plano Premium</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Limite Máximo de Usos</label>
                  <input
                    type="number"
                    placeholder="Deixe vazio para ilimitado"
                    value={couponForm.max_uses}
                    onChange={(e) => setCouponForm({ ...couponForm, max_uses: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-4 py-2 rounded-full text-stone-600 hover:bg-stone-100 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCoupon}
                  className="bg-[#7C3A4D] hover:bg-[#682F40] text-white px-5 py-2 rounded-full font-semibold cursor-pointer disabled:opacity-50"
                >
                  {savingCoupon ? 'Salvando...' : 'Criar Cupom'}
                </button>
              </div>
            </form>
          </div>
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
