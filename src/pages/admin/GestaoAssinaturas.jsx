import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { 
  Sparkles, 
  Users, 
  Plus, 
  X, 
  Star, 
  Edit2, 
  Clock, 
  CheckCircle2, 
  Calendar,
  CreditCard,
  Crown,
  ChevronRight,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import { EstadoVazio } from '../../components/ui/EstadoVazio';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const GestaoAssinaturas = () => {
  const { tenant_slug } = useParams();
  const { tenant } = useTenant();
  const { showSuccess, showError, confirm } = useNotification();

  const [activeTab, setActiveTab] = useState('plans'); // 'plans' | 'subscribers'
  const [plans, setPlans] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    price: '',
    billing_cycle: 'monthly',
    service_ids: [],
    usage_limit: 4
  });

  useEffect(() => {
    if (!tenant) return;
    fetchData();
  }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Carrega Planos do Salão
      const plansData = await api.memberships.listPlans(tenant.id);
      setPlans(Array.isArray(plansData) ? plansData : []);

      // 2. Carrega Assinantes do Salão
      const subsData = await api.memberships.listSubscriptions();
      setSubscribers(Array.isArray(subsData) ? subsData : []);

      // 3. Carrega Serviços para o Select
      const srvData = await api.services.list(tenant.id);
      const activeServices = srvData ? srvData.filter(s => s.is_active) : [];
      setServices(activeServices);
      
      if (activeServices.length > 0 && (!newPlan.service_ids || newPlan.service_ids.length === 0)) {
        setNewPlan(prev => ({ ...prev, service_ids: [activeServices[0].id] }));
      }
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar dados de assinaturas.');
    } finally {
      setLoading(false);
    }
  };

  // 3 KPIs Canônicos (§9.6 J10 · Mockup G9)
  const activePlansCount = useMemo(() => {
    return plans.filter(p => p.is_active).length;
  }, [plans]);

  const activeSubscribersCount = useMemo(() => {
    return subscribers.filter(s => s.status === 'active').length;
  }, [subscribers]);

  const monthlyRecurringRevenue = useMemo(() => {
    return subscribers
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + Number(s.plan_price || s.price || 0), 0);
  }, [subscribers]);

  // Plano em Destaque para o Preview
  const previewPlan = useMemo(() => {
    return plans.find(p => p.is_active) || plans[0] || null;
  }, [plans]);

  const handleEdit = (plan) => {
    setNewPlan({
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      billing_cycle: plan.billing_cycle || 'monthly',
      service_ids: plan.service_ids || (plan.service_id ? [plan.service_id] : []),
      usage_limit: plan.usage_limit || 4
    });
    setEditingId(plan.id);
    setShowModal(true);
  };

  const handleToggleActive = async (plan) => {
    const newStatus = !plan.is_active;
    const actionLabel = newStatus ? 'reativar as vendas deste plano' : 'pausar as vendas deste plano';
    if (!(await confirm(`Deseja realmente ${actionLabel}? Assinaturas ativas existentes continuarão vigentes.`))) return;

    try {
      await api.memberships.updatePlan(plan.id, { is_active: newStatus });
      showSuccess(`Vendas do plano ${newStatus ? 'reativadas' : 'pausadas'} com sucesso.`);
      fetchData();
    } catch (err) {
      console.error(err);
      showError('Erro ao alterar status do plano.');
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setNewPlan({
      name: '',
      description: '',
      price: '',
      billing_cycle: 'monthly',
      service_ids: services.length > 0 ? [services[0].id] : [],
      usage_limit: 4
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!newPlan.name.trim()) { showError('Nome do plano é obrigatório.'); return; }
    if (!newPlan.price || isNaN(newPlan.price)) { showError('Preço mensal inválido.'); return; }
    if (!newPlan.service_ids || newPlan.service_ids.length === 0) { showError('Selecione pelo menos um procedimento para o plano.'); return; }

    setSaving(true);
    try {
      const payload = {
        ...newPlan,
        name: newPlan.name.trim(),
        description: newPlan.description.trim(),
        price: parseFloat(newPlan.price),
        usage_limit: parseInt(newPlan.usage_limit) || 4,
        is_active: true
      };

      if (editingId) {
        await api.memberships.updatePlan(editingId, payload);
        showSuccess('Plano atualizado com sucesso!');
      } else {
        await api.memberships.createPlan(payload);
        showSuccess('Plano de assinatura criado com sucesso!');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao salvar plano.');
    } finally {
      setSaving(false);
    }
  };

  const handleRenewSubscription = async (sub) => {
    if (await confirm(`Deseja registrar o pagamento e renovar o ciclo da assinatura de ${sub.client_name}?`)) {
      try {
        await api.memberships.renewSubscription(sub.id);
        showSuccess('Assinatura renovada com sucesso!');
        fetchData();
      } catch (err) {
        console.error(err);
        showError(err.message || 'Erro ao renovar assinatura.');
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in text-ink">
      
      {/* 1. Cabeçalho Editorial (§9.6 J10 · Mockup G9) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">Clube de assinaturas</h1>
          <p className="text-sm text-ink-soft mt-1">Planos recorrentes para fidelizar clientes e garantir receita no mês.</p>
        </div>

        <button 
          onClick={openNewModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Criar plano</span>
        </button>
      </div>

      {/* 2. Grade de 3 KPIs Compactos (§9.6 J10 · Mockup G9) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* KPI: PLANOS ATIVOS */}
        <div className="rounded-[22px] border border-line bg-white p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block">
            PLANOS ATIVOS
          </span>
          <span className="font-display text-3xl sm:text-4xl font-bold text-ink tabular-nums block">
            {activePlansCount}
          </span>
          <span className="text-xs text-ink-soft block">No clube</span>
        </div>

        {/* KPI: ASSINANTES */}
        <div className="rounded-[22px] border border-line bg-white p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block">
            ASSINANTES
          </span>
          <span className="font-display text-3xl sm:text-4xl font-bold text-ink tabular-nums block">
            {activeSubscribersCount}
          </span>
          <span className="text-xs text-ink-soft block">Clientes ativas</span>
        </div>

        {/* KPI: RECEITA RECORRENTE (MRR) */}
        <div className="rounded-[22px] border border-line bg-white p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block">
            RECEITA RECORRENTE
          </span>
          <span className="font-display text-3xl sm:text-4xl font-bold text-ink tabular-nums lining-nums block">
            {formatCurrency(monthlyRecurringRevenue)}
          </span>
          <span className="text-xs text-ink-soft block">Por mês</span>
        </div>

      </div>

      {/* 3. Abas Superiores Rosé Editorial */}
      <div className="flex items-center gap-6 border-b border-line pb-1">
        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-2.5 font-semibold text-sm transition-all cursor-pointer relative ${
            activeTab === 'plans'
              ? 'text-brand border-b-2 border-brand'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          Planos do clube
        </button>

        <button
          onClick={() => setActiveTab('subscribers')}
          className={`pb-2.5 font-semibold text-sm transition-all cursor-pointer relative ${
            activeTab === 'subscribers'
              ? 'text-brand border-b-2 border-brand'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          Clientes assinantes ({subscribers.length})
        </button>
      </div>

      {/* 4. Conteúdo: Planos do Clube vs Assinantes */}
      {loading ? (
        <div className="py-20 text-center text-ink-soft flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
          <span className="text-sm">Carregando planos do clube...</span>
        </div>
      ) : activeTab === 'plans' ? (
        
        plans.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-line p-8 shadow-xs">
            <EstadoVazio
              icone={<Sparkles className="w-8 h-8 text-brand" />}
              titulo="Nenhum plano criado ainda"
              descricao="Ofereça planos mensais para ter recorrência garantida e fidelizar clientes."
              textoAcao="+ Criar plano"
              aoClicarAcao={openNewModal}
            />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Coluna Esquerda: Lista de Planos do Clube */}
            <div className="flex-1 w-full space-y-6">
              {plans.map(plan => {
                const planSubscribers = subscribers.filter(s => s.plan_id === plan.id && s.status === 'active').length;

                return (
                  <div 
                    key={plan.id} 
                    className="rounded-[24px] border border-line bg-white p-6 sm:p-8 shadow-xs space-y-5"
                  >
                    {/* Topo do Card do Plano */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h2 className="font-display text-2xl font-bold text-ink">
                            {plan.name}
                          </h2>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            plan.is_active 
                              ? 'bg-[#E8F5E9] text-[#2E7D32]' 
                              : 'bg-stone-200 text-ink-soft'
                          }`}>
                            {plan.is_active ? 'Ativo' : 'Vendas pausadas'}
                          </span>
                        </div>
                        <p className="text-xs text-ink-soft mt-1.5 leading-relaxed">
                          {plan.description || 'Adicione uma descrição para a cliente entender o benefício.'}
                        </p>
                      </div>

                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-stone-100 text-ink-soft shrink-0">
                        {plan.billing_cycle === 'monthly' ? 'Mensal' : 'Anual'}
                      </span>
                    </div>

                    {/* Caixa de Detalhes dos Serviços Inclusos */}
                    <div className="bg-stone-50 rounded-2xl p-4 border border-line/40 space-y-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-ink-soft font-medium">Serviços inclusos</span>
                        <span className="font-semibold text-ink">
                          {plan.service_name || (services.find(s => s.id === (plan.service_ids?.[0] || plan.service_id))?.name) || 'Procedimentos do salão'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-ink-soft font-medium">Uso por ciclo</span>
                        <span className="font-semibold text-ink">
                          {plan.usage_limit === 0 ? 'Ilimitado' : `${plan.usage_limit} sessões`}
                        </span>
                      </div>
                    </div>

                    {/* Preço e Assinantes */}
                    <div className="flex items-baseline justify-between pt-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-display text-3xl font-bold text-ink tabular-nums lining-nums">
                          {formatCurrency(plan.price)}
                        </span>
                        <span className="text-xs text-ink-soft font-medium">/mês</span>
                      </div>

                      <span className="text-xs text-ink-soft font-medium tabular-nums">
                        {planSubscribers} {planSubscribers === 1 ? 'assinante' : 'assinantes'}
                      </span>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-2 pt-2 border-t border-line/60">
                      <button
                        onClick={() => handleEdit(plan)}
                        className="px-5 py-2 rounded-full bg-brand text-white text-xs font-semibold hover:bg-brand-hover shadow-xs transition-all active:scale-98 cursor-pointer"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => handleToggleActive(plan)}
                        className="px-4 py-2 rounded-full border border-line text-xs font-semibold text-ink-soft hover:text-ink hover:bg-stone-50 transition-all cursor-pointer"
                      >
                        {plan.is_active ? 'Pausar vendas' : 'Reativar vendas'}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Coluna Direita: Preview "COMO A CLIENTE VÊ NO APP" (§9.6 J10 · Mockup G9) */}
            <div className="w-full lg:w-[380px] shrink-0 sticky top-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block mb-2">
                COMO A CLIENTE VÊ NO APP
              </span>

              {previewPlan ? (
                <div className="rounded-[22px] border-2 border-amber-200/80 bg-white p-6 shadow-xs space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-tint/60 flex items-center justify-center text-brand shrink-0">
                      <Star className="w-4 h-4 fill-brand/20 text-brand" />
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold tracking-wider text-ink-soft/80">
                        CLUBE STUDIO
                      </span>
                      <h3 className="font-bold text-sm text-ink mt-0.5">
                        {previewPlan.name}
                      </h3>
                      <p className="text-xs text-ink-soft mt-0.5">
                        {previewPlan.usage_limit} sessões de {previewPlan.service_name || 'serviço'} por mês
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full py-3.5 rounded-full bg-brand hover:bg-brand-hover text-white text-sm font-semibold shadow-xs transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Assinar por {formatCurrency(previewPlan.price)}/mês</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-stone-200 bg-stone-50/40 p-6 text-center text-xs text-ink-soft">
                  Crie um plano para visualizar a prévia do aplicativo.
                </div>
              )}
            </div>

          </div>
        )

      ) : (

        /* 5. Aba: Clientes Assinantes */
        subscribers.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-line p-8 shadow-xs">
            <EstadoVazio
              icone={<Users className="w-8 h-8 text-brand" />}
              titulo="Nenhuma cliente assinante ainda"
              descricao="Clientes poderão aderir aos seus planos ativos diretamente pelo aplicativo delas."
            />
          </div>
        ) : (
          <div className="rounded-[22px] border border-line bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line bg-stone-50/50 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                    <th className="px-6 py-4">CLIENTE</th>
                    <th className="px-6 py-4">PLANO</th>
                    <th className="px-6 py-4">CRÉDITOS RESTANTES</th>
                    <th className="px-6 py-4">CICLO</th>
                    <th className="px-6 py-4">PRÓXIMA RENOVAÇÃO</th>
                    <th className="px-6 py-4">SITUAÇÃO</th>
                    <th className="px-6 py-4 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70 text-sm">
                  {subscribers.map((sub) => (
                    <tr key={sub.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-ink block">{sub.client_name}</span>
                        <span className="text-xs text-ink-soft">{sub.client_phone}</span>
                      </td>

                      <td className="px-6 py-4 font-medium text-ink">
                        {sub.plan_name}
                      </td>

                      <td className="px-6 py-4 tabular-nums">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-tint/60 text-brand">
                          {sub.remaining_credits} sessões
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-ink-soft">
                        {sub.billing_cycle === 'monthly' ? 'Mensal' : 'Anual'}
                      </td>

                      <td className="px-6 py-4 text-xs text-ink-soft tabular-nums">
                        {sub.renews_at ? new Date(sub.renews_at).toLocaleDateString('pt-BR') : '—'}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          sub.status === 'active' 
                            ? 'bg-[#E8F5E9] text-[#2E7D32]' 
                            : 'bg-stone-200 text-ink-soft'
                        }`}>
                          {sub.status === 'active' ? 'Ativa' : 'Pausada'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRenewSubscription(sub)}
                          className="px-3.5 py-1 rounded-full border border-line text-xs font-semibold text-brand hover:bg-brand-tint/20 transition-all cursor-pointer"
                        >
                          Renovar ciclo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )

      )}

      {/* 6. Modal: Criar / Editar Plano do Clube */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[24px] border border-line shadow-2xl p-6 md:p-8 relative animate-scale-up my-8">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <h2 className="font-display text-2xl font-bold text-ink">
                {editingId ? 'Editar Plano do Clube' : 'Novo Plano de Assinatura'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:text-ink cursor-pointer hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Nome do Plano *
                </label>
                <input 
                  required 
                  type="text"
                  placeholder="Ex: Pacote Toda Bonita, Clube da Escova"
                  value={newPlan.name} 
                  onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Descrição dos Benefícios
                </label>
                <textarea 
                  rows={2}
                  placeholder="Ex: 4 sessões de escova modelada por mês com hidratação inclusa."
                  value={newPlan.description} 
                  onChange={e => setNewPlan({ ...newPlan, description: e.target.value })}
                  className="w-full border border-line rounded-xl px-4 py-2 bg-white text-sm text-ink focus:border-brand outline-none shadow-2xs resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Preço Mensal (R$) *
                  </label>
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    placeholder="200,00"
                    value={newPlan.price} 
                    onChange={e => setNewPlan({ ...newPlan, price: e.target.value })}
                    className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand outline-none tabular-nums shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Sessões por Mês *
                  </label>
                  <input 
                    required 
                    type="number" 
                    min="1" 
                    placeholder="4"
                    value={newPlan.usage_limit} 
                    onChange={e => setNewPlan({ ...newPlan, usage_limit: e.target.value })}
                    className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand outline-none tabular-nums shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Procedimento Vinculado *
                </label>
                <select
                  required
                  value={newPlan.service_ids[0] || ''}
                  onChange={e => setNewPlan({ ...newPlan, service_ids: [e.target.value] })}
                  className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand outline-none cursor-pointer"
                >
                  <option value="">Selecione o serviço...</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatCurrency(s.price)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-full border border-stone-300 text-ink-soft text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-full bg-brand text-white text-xs font-semibold hover:bg-brand-hover shadow-xs disabled:opacity-50 cursor-pointer transition-all active:scale-98"
                >
                  {saving ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Criar Plano')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default GestaoAssinaturas;
