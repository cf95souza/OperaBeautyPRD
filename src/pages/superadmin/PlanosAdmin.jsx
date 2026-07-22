import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';

const PlanosAdmin = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { showSuccess, showError } = useNotification();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  
  // Form State
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formInterval, setFormInterval] = useState('month');
  const [formMaxProf, setFormMaxProf] = useState('');
  const [formMaxBanners, setFormMaxBanners] = useState('1');
  const [formFeatures, setFormFeatures] = useState([]);
  const [newFeature, setNewFeature] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    api.auth.logout();
    navigate('/superadmin/login');
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await api.plans.list();
      const sortedPlans = (data || []).sort((a, b) => Number(a.price) - Number(b.price));
      setPlans(sortedPlans);
    } catch (err) {
      console.error('Error fetching plans:', err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const openNewPlanModal = () => {
    setEditingPlan(null);
    setFormName('');
    setFormPrice('');
    setFormInterval('month');
    setFormMaxProf('');
    setFormMaxBanners('1');
    setFormFeatures([]);
    setFormIsActive(true);
    setNewFeature('');
    setIsModalOpen(true);
  };

  const openEditPlanModal = (plan) => {
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormPrice(plan.price);
    setFormInterval(plan.interval || 'month');
    setFormMaxProf(plan.max_professionals || '');
    setFormMaxBanners(plan.max_banners || '1');
    setFormFeatures(plan.features || []);
    setFormIsActive(plan.is_active);
    setNewFeature('');
    setIsModalOpen(true);
  };

  const handleAddFeature = () => {
    if (newFeature.trim() !== '') {
      setFormFeatures([...formFeatures, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index) => {
    setFormFeatures(formFeatures.filter((_, i) => i !== index));
  };

  const handleSavePlan = async () => {
    if (!formName || !formPrice) {
      showError('Nome e Preço são obrigatórios.');
      return;
    }

    setIsSaving(true);
    const planData = {
      name: formName,
      price: parseFloat(formPrice),
      interval: formInterval,
      max_professionals: formMaxProf ? parseInt(formMaxProf, 10) : null,
      max_banners: formMaxBanners ? parseInt(formMaxBanners, 10) : 1,
      features: formFeatures,
      is_active: formIsActive
    };

    try {
      if (editingPlan) {
        await api.plans.update(editingPlan.id, planData);
        showSuccess('Plano atualizado com sucesso!');
      } else {
        await api.plans.create(planData);
        showSuccess('Plano criado com sucesso!');
      }
      setIsModalOpen(false);
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      showError('Erro ao salvar plano: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  const togglePlanStatus = async (plan) => {
    try {
      await api.plans.update(plan.id, { is_active: !plan.is_active });
      fetchPlans();
    } catch (error) {
      console.error('Error toggling plan status:', error);
    }
  };

  return (
    <div className="font-body-md text-body-md antialiased overflow-x-hidden min-h-screen flex bg-surface text-on-surface animate-fade-in-up">
      
      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        ></div>
      )}

      {/* Navigation Drawer */}
      <aside className={`flex flex-col h-screen w-80 fixed top-0 bg-surface-container-lowest border-r border-outline-variant/30 z-50 transition-all duration-300 ${isDrawerOpen ? 'left-0' : '-left-80'} md:left-0`}>
        <div className="p-xl border-b border-outline-variant/30 bg-surface-container-lowest flex flex-col gap-4">
          <h1 className="font-serif text-[28px] text-primary font-bold">OperaBeauty</h1>
          <div className="flex items-center gap-md">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
            </div>
            <div>
              <h2 className="font-title-md text-title-md font-semibold text-on-surface tracking-tight">Super Admin</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Gestão da Plataforma</p>
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-xs flex-1">
          <Link to="/superadmin" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>dashboard</span>
            Painel Geral
          </Link>
          <Link to="/superadmin/tenants" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>storefront</span>
            Salões e Clientes
          </Link>
          <Link to="/superadmin/planos" className="flex items-center gap-md py-3 px-4 bg-primary-container text-on-primary-container rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>subscriptions</span>
            Gestão de Planos
          </Link>
          <Link to="/superadmin/equipe" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>admin_panel_settings</span>
            Equipe SaaS
          </Link>
          <Link to="/superadmin/features" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>toggle_on</span>
            Feature Flags
          </Link>
          <Link to="/superadmin/avisos" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>campaign</span>
            Mural de Avisos
          </Link>
          <Link to="/superadmin/auditoria" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>security</span>
            Auditoria e Saúde
          </Link>
          <Link to="/superadmin/configuracoes" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>settings</span>
            Configurações
          </Link>
        </nav>
        <div className="px-md mt-auto flex flex-col gap-2">
          <button onClick={handleLogout} className="flex items-center gap-md py-3 px-4 text-error hover:bg-error-container rounded-lg font-label-md text-label-md transition-colors w-full text-left">
            <span className="material-symbols-outlined">logout</span>
            Sair do Sistema
          </button>
          <div className="flex items-center gap-sm p-4 bg-surface-container-low rounded-xl">
            <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden">
              <span className="material-symbols-outlined text-secondary">person</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface">Super Admin</span>
              <span className="font-label-sm text-label-sm text-secondary">Administrador do Sistema</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 flex flex-col min-h-screen bg-background">
        
        {/* Top App Bar (Mobile) */}
        <header className="md:hidden flex justify-between items-center px-gutter py-3 w-full max-w-full bg-surface shadow-sm sticky top-0 z-30 pt-[max(env(safe-area-inset-top),_0.75rem)] min-h-[4rem]">
          <div className="flex items-center gap-sm">
            <button onClick={() => setIsDrawerOpen(true)} className="material-symbols-outlined text-primary p-2">menu</button>
            <div className="flex items-center gap-xs cursor-pointer active:opacity-80">
              <span className="material-symbols-outlined text-primary font-headline-md text-headline-md">spa</span>
              <span className="font-headline-md text-[20px] text-primary tracking-tight">Admin Mestre</span>
            </div>
          </div>
          <div className="w-8 h-8"></div>
        </header>

        <div className="p-container-margin md:p-xl flex-1 flex flex-col gap-xl">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-lg">
            <div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">Gestão de Planos SaaS</h1>
              <p className="font-body-md text-body-md text-secondary">Crie e edite os planos de assinatura que serão exibidos na página de vendas.</p>
            </div>
            <button onClick={openNewPlanModal} className="bg-primary text-on-primary font-label-md text-label-md py-3 px-6 rounded-full flex items-center gap-sm hover:opacity-90 transition-opacity shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <span className="material-symbols-outlined">add</span>
              Criar Novo Plano
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-secondary">Buscando planos...</div>
          ) : plans.length === 0 ? (
            <div className="w-full" style={{ minWidth: '100%' }}>
              <div className="bg-surface-container-lowest p-xl rounded-2xl border border-surface-variant text-center flex flex-col items-center justify-center min-h-[300px]">
                <span className="material-symbols-outlined text-[64px] text-secondary mb-4">subscriptions</span>
                <h3 className="font-headline-sm text-headline-sm mb-2">Nenhum plano cadastrado</h3>
                <p className="text-secondary mb-6 mx-auto" style={{ maxWidth: '500px' }}>Parece que você ainda não configurou nenhum pacote. Crie seu primeiro plano para que os salões possam assinar o sistema.</p>
                <button onClick={openNewPlanModal} className="bg-primary text-on-primary px-6 py-3 rounded-full font-label-md">Criar Meu Primeiro Plano</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
              {plans.map(plan => (
                <div key={plan.id} className={`bg-surface border rounded-2xl flex flex-col shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all ${!plan.is_active ? 'opacity-60 grayscale-[50%] border-surface-variant' : 'border-primary/20 hover:border-primary/50 hover:-translate-y-1'}`}>
                  {/* Card Header */}
                  <div className="p-lg border-b border-surface-variant flex flex-col items-center text-center">
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="font-label-md text-secondary">R$</span>
                      <span className="font-display-md text-primary">{Number(plan.price).toFixed(2).replace('.', ',')}</span>
                      <span className="font-label-md text-secondary">/{plan.interval === 'month' ? 'mês' : 'ano'}</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-[12px] font-label-md ${plan.is_active ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-error-container text-error'}`}>
                        {plan.is_active ? 'Público / Ativo' : 'Oculto / Inativo'}
                      </span>
                    </div>
                  </div>

                  {/* Card Body (Features) */}
                  <div className="p-lg flex-1 flex flex-col gap-4">
                    <div className="bg-surface-container-low px-4 py-3 rounded-lg flex items-center justify-between">
                      <span className="font-label-sm text-secondary">Limite de Equipe:</span>
                      <span className="font-label-md text-on-surface">{plan.max_professionals ? `${plan.max_professionals} profissionais` : 'Ilimitado'}</span>
                    </div>

                    <div className="bg-surface-container-low px-4 py-3 rounded-lg flex items-center justify-between">
                      <span className="font-label-sm text-secondary">Limite de Banners:</span>
                      <span className="font-label-md text-on-surface">{plan.max_banners ? `${plan.max_banners} banner(s)` : '1 banner'}</span>
                    </div>

                    <div className="flex flex-col gap-3 flex-1">
                      {plan.features && plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-[18px] text-[#10b981] shrink-0 mt-0.5">check_circle</span>
                          <span className="text-sm text-on-surface-variant leading-tight">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-lg border-t border-surface-variant grid grid-cols-2 gap-3">
                    <button onClick={() => togglePlanStatus(plan)} className="py-2.5 rounded-full font-label-md border border-surface-variant text-secondary hover:bg-surface-container-low transition-colors">
                      {plan.is_active ? 'Ocultar' : 'Publicar'}
                    </button>
                    <button onClick={() => openEditPlanModal(plan)} className="py-2.5 rounded-full font-label-md bg-primary-container text-on-primary-container hover:brightness-95 transition-colors">
                      Editar Plano
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* PLAN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-surface rounded-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto flex flex-col p-lg shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline-sm text-headline-sm">{editingPlan ? 'Editar Plano' : 'Criar Novo Plano'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-secondary hover:text-error transition-colors p-1 rounded-full hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-sm text-secondary mb-1">Nome do Plano</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Básico"
                    className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg p-3 outline-none focus:border-primary"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-secondary mb-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="Ex: 59.90"
                    className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg p-3 outline-none focus:border-primary"
                    value={formPrice}
                    onChange={e => setFormPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-label-sm text-secondary mb-1">Faturamento</label>
                  <select 
                    className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg p-3 outline-none focus:border-primary"
                    value={formInterval}
                    onChange={e => setFormInterval(e.target.value)}
                  >
                    <option value="month">Mensal</option>
                    <option value="year">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="block font-label-sm text-secondary mb-1">Limite de Equipe</label>
                  <input 
                    type="number" 
                    placeholder="Vazio p/ ilimitado"
                    className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg p-3 outline-none focus:border-primary"
                    value={formMaxProf}
                    onChange={e => setFormMaxProf(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-secondary mb-1">Limite de Banners</label>
                  <input 
                    type="number" 
                    placeholder="Mínimo 1"
                    className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg p-3 outline-none focus:border-primary"
                    value={formMaxBanners}
                    onChange={e => setFormMaxBanners(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-2 border-t border-surface-variant pt-4">
                <label className="block font-label-md text-on-surface mb-2">Benefícios (Página de Vendas)</label>
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    placeholder="Ex: Agendamentos ilimitados"
                    className="flex-1 bg-surface-container-lowest border border-surface-variant rounded-lg p-3 outline-none focus:border-primary"
                    value={newFeature}
                    onChange={e => setNewFeature(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFeature()}
                  />
                  <button onClick={handleAddFeature} className="bg-primary-container text-on-primary-container px-4 rounded-lg font-label-md hover:brightness-95">Adicionar</button>
                </div>

                <div className="flex flex-col gap-2">
                  {formFeatures.length === 0 && <span className="text-secondary text-sm italic">Nenhum benefício adicionado.</span>}
                  {formFeatures.map((feature, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-surface-container-low px-3 py-2 rounded-lg">
                      <span className="text-sm text-on-surface-variant">{feature}</span>
                      <button onClick={() => handleRemoveFeature(idx)} className="text-secondary hover:text-error"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="mt-8 pt-4 border-t border-surface-variant flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded text-primary focus:ring-primary border-surface-variant"
                  checked={formIsActive}
                  onChange={e => setFormIsActive(e.target.checked)}
                />
                <span className="font-label-md text-on-surface">Plano Visível/Ativo</span>
              </label>

              <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-full font-label-md border border-surface-variant text-secondary hover:bg-surface-container-low">Cancelar</button>
                <button onClick={handleSavePlan} disabled={isSaving} className="px-6 py-2.5 rounded-full font-label-md bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 shadow-sm">
                  {isSaving ? 'Salvando...' : 'Salvar Plano'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default PlanosAdmin;
