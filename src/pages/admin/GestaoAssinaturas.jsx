import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';

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
    service_id: '',
    usage_limit: 4
  });

  useEffect(() => {
    if (!tenant) return;
    fetchData();
  }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Carrega Planos do Salão
      const plansData = await api.memberships.listPlans(tenant.id);
      setPlans(plansData);

      // Carrega Assinantes do Salão
      const subsData = await api.memberships.listSubscriptions();
      setSubscribers(subsData);

      // Carrega Serviços para o Select
      const srvData = await api.services.list(tenant.id);
      const activeServices = srvData ? srvData.filter(s => s.is_active) : [];
      setServices(activeServices);
      
      if (activeServices.length > 0 && !newPlan.service_id) {
        setNewPlan(prev => ({ ...prev, service_id: activeServices[0].id }));
      }
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar dados de assinaturas.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (plan) => {
    setNewPlan({
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      billing_cycle: plan.billing_cycle,
      service_id: plan.service_id,
      usage_limit: plan.usage_limit
    });
    setEditingId(plan.id);
    setShowModal(true);
  };

  const handleToggleActive = async (plan) => {
    const newStatus = !plan.is_active;
    if (!(await confirm(`Deseja realmente ${newStatus ? 'ativar' : 'desativar'} este plano de fidelidade?`))) return;

    try {
      await api.memberships.updatePlan(plan.id, { is_active: newStatus });
      showSuccess(`Plano ${newStatus ? 'ativado' : 'desativado'} com sucesso.`);
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
      service_id: services[0]?.id || '',
      usage_limit: 4
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!newPlan.name.trim()) { showError('Nome é obrigatório.'); return; }
    if (!newPlan.price || isNaN(newPlan.price)) { showError('Preço inválido.'); return; }
    if (!newPlan.service_id) { showError('Selecione um serviço para vincular ao plano.'); return; }

    setSaving(true);
    try {
      const payload = {
        ...newPlan,
        price: parseFloat(newPlan.price),
        usage_limit: parseInt(newPlan.usage_limit)
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

  return (
    <div className="p-gutter md:p-xl flex-1 flex flex-col gap-lg max-w-[1200px] mx-auto w-full animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>card_membership</span> Clube de Assinaturas (Fidelidade)
          </h2>
          <p className="font-body-md text-body-md text-secondary mt-1">Crie clubes de serviços recorrentes e monitore o engajamento das clientes.</p>
        </div>
        
        {activeTab === 'plans' && (
          <button 
            onClick={openNewModal}
            className="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 rounded-full hover:opacity-90 flex items-center gap-2 shadow-sm transition-all active:scale-95 duration-150"
          >
            <span className="material-symbols-outlined text-[20px]">add</span> Criar Novo Plano
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/30">
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-6 py-3 font-label-md text-label-md transition-colors relative ${
            activeTab === 'plans' ? 'text-primary border-b-2 border-primary font-semibold' : 'text-secondary hover:text-on-surface'
          }`}
        >
          Planos do Clube
        </button>
        <button
          onClick={() => setActiveTab('subscribers')}
          className={`px-6 py-3 font-label-md text-label-md transition-colors relative ${
            activeTab === 'subscribers' ? 'text-primary border-b-2 border-primary font-semibold' : 'text-secondary hover:text-on-surface'
          }`}
        >
          Clientes Assinantes ({subscribers.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center p-xl"><span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span></div>
      ) : activeTab === 'plans' ? (
        plans.length === 0 ? (
          <div className="text-center p-xl text-secondary bg-surface-container-lowest rounded-2xl border border-outline-variant/30 flex flex-col items-center">
            <span className="material-symbols-outlined text-5xl mb-3 opacity-40">card_membership</span>
            <p className="font-headline-sm text-headline-sm-mobile mb-2">Nenhum plano criado ainda</p>
            <p className="font-body-sm text-secondary mb-6">Ofereça planos mensais para ter recorrência garantida no seu faturamento.</p>
            <button onClick={openNewModal} className="bg-primary/10 text-primary px-5 py-2.5 rounded-full font-label-md hover:bg-primary/20 transition-colors">Criar Primeiro Plano</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {plans.map(plan => (
              <div key={plan.id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-md">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${plan.is_active ? 'bg-primary-container text-on-primary-container' : 'bg-surface-variant text-on-surface-variant'}`}>
                      {plan.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                    <span className="font-label-sm text-secondary uppercase tracking-widest">{plan.billing_cycle === 'monthly' ? 'Mensal' : 'Anual'}</span>
                  </div>

                  <h3 className="font-headline-sm text-on-surface mb-2">{plan.name}</h3>
                  <p className="font-body-sm text-secondary line-clamp-2 mb-4" title={plan.description}>{plan.description || 'Sem descrição cadastrada.'}</p>
                  
                  <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/50 space-y-2 mb-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary font-label-sm">Serviço incluso:</span>
                      <span className="font-semibold text-on-surface">{plan.service_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-secondary font-label-sm">Uso por ciclo:</span>
                      <span className="font-semibold text-on-surface">{plan.usage_limit === 0 ? 'Ilimitado' : `${plan.usage_limit} sessões`}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-outline-variant/20 pt-md mt-md">
                  <div>
                    <span className="font-label-sm text-secondary block">Valor</span>
                    <span className="font-headline-sm text-primary font-bold">R$ {Number(plan.price).toFixed(2).replace('.', ',')}</span>
                  </div>
                  
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleToggleActive(plan)}
                      title={plan.is_active ? 'Desativar Plano' : 'Ativar Plano'}
                      className="p-2 rounded-full hover:bg-surface-variant text-secondary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">{plan.is_active ? 'visibility_off' : 'visibility'}</span>
                    </button>
                    <button 
                      onClick={() => handleEdit(plan)}
                      title="Editar Plano"
                      className="p-2 rounded-full hover:bg-surface-variant text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        subscribers.length === 0 ? (
          <div className="text-center p-xl text-secondary bg-surface-container-lowest rounded-2xl border border-outline-variant/30 flex flex-col items-center">
            <span className="material-symbols-outlined text-5xl mb-3 opacity-40">groups</span>
            <p className="font-headline-sm text-headline-sm-mobile mb-2">Nenhuma cliente assinante ainda</p>
            <p className="font-body-sm text-secondary">Clientes poderão aderir aos seus planos ativos diretamente pelo aplicativo delas.</p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 bg-surface-container-low">
                    <th className="py-md px-lg font-label-md text-secondary">Cliente</th>
                    <th className="py-md px-lg font-label-md text-secondary">Plano Contratado</th>
                    <th className="py-md px-lg font-label-md text-secondary">Créditos Restantes</th>
                    <th className="py-md px-lg font-label-md text-secondary">Ciclo Faturamento</th>
                    <th className="py-md px-lg font-label-md text-secondary">Próxima Renovação</th>
                    <th className="py-md px-lg font-label-md text-secondary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map(sub => (
                    <tr key={sub.id} className="border-b border-outline-variant/20 hover:bg-surface-variant/20 transition-colors">
                      <td className="py-md px-lg">
                        <div className="font-label-md text-on-surface">{sub.client_name}</div>
                        <div className="text-xs text-secondary">{sub.client_phone}</div>
                      </td>
                      <td className="py-md px-lg font-label-md text-on-surface">
                        {sub.membership_name}
                        <div className="text-xs text-secondary">R$ {Number(sub.price).toFixed(2).replace('.', ',')}</div>
                      </td>
                      <td className="py-md px-lg">
                        <span className="font-semibold text-primary">{sub.remaining_sessions}</span> / <span className="text-secondary text-xs">{sub.usage_limit === 0 ? '∞' : sub.usage_limit}</span>
                      </td>
                      <td className="py-md px-lg text-sm text-on-surface uppercase">{sub.billing_cycle === 'monthly' ? 'Mensal' : 'Anual'}</td>
                      <td className="py-md px-lg text-sm text-on-surface">
                        {new Date(sub.current_period_end).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-md px-lg">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${sub.status === 'active' ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FEF2F2] text-[#B91C1C]'}`}>
                          {sub.status === 'active' ? 'Ativo' : 'Atrasado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface w-full max-w-[500px] rounded-2xl shadow-xl p-lg relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowModal(false)} 
              className="absolute top-4 right-4 text-secondary hover:text-error transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <h3 className="font-headline-md text-on-surface mb-2">{editingId ? 'Editar Plano de Assinatura' : 'Criar Plano de Assinatura'}</h3>
            <p className="font-body-sm text-secondary mb-6">Ofereça vantagens exclusivas com cobranças recorrentes periódicas.</p>
            
            <form onSubmit={handleSave} className="space-y-md">
              <div>
                <label className="block font-label-sm text-secondary mb-1">Nome do Plano</label>
                <input 
                  required
                  type="text" 
                  placeholder="Ex: Clube do Cabelo Semanal"
                  className="w-full border border-outline rounded-xl px-3 py-2 bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
                  value={newPlan.name}
                  onChange={e => setNewPlan(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block font-label-sm text-secondary mb-1">Descrição</label>
                <textarea 
                  rows="2"
                  placeholder="Ex: Escova e hidratação livre 4 vezes no mês..."
                  className="w-full border border-outline rounded-xl px-3 py-2 bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm resize-none"
                  value={newPlan.description}
                  onChange={e => setNewPlan(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block font-label-sm text-secondary mb-1">Preço Mensal (R$)</label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    placeholder="150,00"
                    className="w-full border border-outline rounded-xl px-3 py-2 bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
                    value={newPlan.price}
                    onChange={e => setNewPlan(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block font-label-sm text-secondary mb-1">Ciclo Cobrança</label>
                  <select
                    className="w-full border border-outline rounded-xl px-3 py-2 bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
                    value={newPlan.billing_cycle}
                    onChange={e => setNewPlan(prev => ({ ...prev, billing_cycle: e.target.value }))}
                  >
                    <option value="monthly">Mensal</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block font-label-sm text-secondary mb-1">Serviço Atrelado</label>
                  <select
                    className="w-full border border-outline rounded-xl px-3 py-2 bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
                    value={newPlan.service_id}
                    onChange={e => setNewPlan(prev => ({ ...prev, service_id: e.target.value }))}
                  >
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-label-sm text-secondary mb-1">Limite de Sessões / Ciclo</label>
                  <input 
                    required
                    type="number" 
                    min="0"
                    className="w-full border border-outline rounded-xl px-3 py-2 bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
                    value={newPlan.usage_limit}
                    onChange={e => setNewPlan(prev => ({ ...prev, usage_limit: e.target.value }))}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={saving}
                className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold hover:opacity-95 transition-all disabled:opacity-50 mt-4 shadow-sm"
              >
                {saving ? 'Salvando...' : 'Salvar Plano de Assinatura'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestaoAssinaturas;
