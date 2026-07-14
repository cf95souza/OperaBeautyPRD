import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../lib/api';

const CreateTenantModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Tenant State
  const [tenantName, setTenantName] = useState('');
  const [slug, setSlug] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#7c5357');
  const [secondaryColor, setSecondaryColor] = useState('#eeb9bd');

  // Manager State
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');

  // Auto-generate slug from name
  const handleNameChange = (e) => {
    const val = e.target.value;
    setTenantName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]/g, ''));
  };

  // Plan State
  const [plans, setPlans] = useState([]);
  const [selectedPlanPrice, setSelectedPlanPrice] = useState(59.90);

  React.useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const data = await api.plans.list();
      if (data) {
        const activePlans = data.filter(p => p.is_active);
        setPlans(activePlans);
        if (activePlans.length > 0) {
          setSelectedPlanPrice(activePlans[0].price);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar planos:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Achar o plano correspondente para obter o plan_id se houver
      const plan = plans.find(p => Number(p.price) === Number(selectedPlanPrice));

      // 1. Criar o Tenant via API Express
      const tenantData = await api.superadmin.createTenant({ 
        name: tenantName, 
        slug, 
        plan_price: Number(selectedPlanPrice),
        plan_id: plan ? plan.id : null,
        primary_color: primaryColor,
        secondary_color: secondaryColor
      });

      if (!tenantData || !tenantData.id) {
        throw new Error('Erro ao criar Salão. Verifique os dados ou o link único (slug).');
      }

      // 2. Criar o Gestor via API Express
      await api.superadmin.createStaff({
        tenant_id: tenantData.id,
        name: managerName,
        phone: managerPhone.replace(/\D/g, ''),
        email: managerEmail,
        password: managerPassword,
        role: 'manager'
      });

      onSuccess(tenantData);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao criar o salão.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" style={{ display: 'flex' }}>
      <div className="bg-surface rounded-2xl w-[90vw] sm:w-[448px] max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-secondary hover:text-on-surface bg-surface-container-low rounded-full w-8 h-8 flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <div className="p-6">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2">Novo Salão</h2>
          <p className="text-secondary text-sm mb-6">Cadastre o espaço e crie o usuário do gestor principal.</p>

          {error && (
            <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-sm border border-error/30">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h3 className="font-label-md text-primary border-b border-surface-variant pb-2">1. Dados do Espaço</h3>
            
            <div>
              <label className="block text-sm text-secondary mb-1">Nome do Salão</label>
              <input 
                type="text" 
                required
                className="w-full bg-surface-container-low border-none rounded-lg px-3 py-3 text-body-md focus:ring-2 focus:ring-primary outline-none"
                placeholder="Ex: Studio Maria"
                value={tenantName}
                onChange={handleNameChange}
              />
            </div>
            
            <div>
              <label className="block text-sm text-secondary mb-1">URL (Slug)</label>
              <div className="flex items-center">
                <span className="bg-surface-container-high px-3 py-3 rounded-l-lg text-secondary text-sm">/</span>
                <input 
                  type="text" 
                  required
                  className="w-full bg-surface-container-low border-none rounded-r-lg px-3 py-3 text-body-md focus:ring-2 focus:ring-primary outline-none"
                  placeholder="studiomaria"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-secondary mb-1">Plano de Assinatura (SaaS)</label>
              <select
                required
                className="w-full bg-surface-container-low border-none rounded-lg px-3 py-3 text-body-md focus:ring-2 focus:ring-primary outline-none"
                value={selectedPlanPrice}
                onChange={(e) => setSelectedPlanPrice(e.target.value)}
              >
                {plans.length === 0 ? (
                  <option value={59.90}>Plano Padrão - R$ 59,90/mês</option>
                ) : (
                  plans.map(plan => (
                    <option key={plan.id} value={plan.price}>
                      {plan.name} - R$ {Number(plan.price).toFixed(2)}/{plan.interval === 'year' ? 'ano' : 'mês'}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-secondary mb-1">Cor Primária</label>
                <input 
                  type="color"
                  className="w-full h-12 rounded-lg cursor-pointer bg-surface-container-low border-none p-1"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-secondary mb-1">Cor Secundária</label>
                <input 
                  type="color"
                  className="w-full h-12 rounded-lg cursor-pointer bg-surface-container-low border-none p-1"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                />
              </div>
            </div>

            <h3 className="font-label-md text-primary border-b border-surface-variant pb-2 mt-4">2. Conta do Gestor</h3>

            <div>
              <label className="block text-sm text-secondary mb-1">Nome do Gestor</label>
              <input 
                type="text" 
                required
                className="w-full bg-surface-container-low border-none rounded-lg px-3 py-3 text-body-md focus:ring-2 focus:ring-primary outline-none"
                placeholder="Ex: Maria Joaquina"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-secondary mb-1">Telefone (Contato)</label>
              <input 
                type="text" 
                required
                className="w-full bg-surface-container-low border-none rounded-lg px-3 py-3 text-body-md focus:ring-2 focus:ring-primary outline-none mb-3"
                placeholder="(11) 99999-9999"
                value={managerPhone}
                onChange={(e) => setManagerPhone(e.target.value)}
              />

              <label className="block text-sm text-secondary mb-1">E-mail de Acesso (Login)</label>
              <input 
                type="email" 
                required
                className="w-full bg-surface-container-low border-none rounded-lg px-3 py-3 text-body-md focus:ring-2 focus:ring-primary outline-none"
                placeholder="gestor@salao.com.br"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-secondary mb-1">Senha Provisória</label>
              <input 
                type="password" 
                required
                className="w-full bg-surface-container-low border-none rounded-lg px-3 py-3 text-body-md focus:ring-2 focus:ring-primary outline-none"
                placeholder="••••••••"
                value={managerPassword}
                onChange={(e) => setManagerPassword(e.target.value)}
              />
            </div>

            <div className="pt-4 mt-2 border-t border-surface-variant flex justify-end gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="px-6 py-3 rounded-full text-secondary font-label-md hover:bg-surface-container-high transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="bg-primary text-on-primary px-6 py-3 rounded-full font-label-md hover:opacity-90 disabled:opacity-50 transition-colors shadow-sm"
              >
                {loading ? 'Criando...' : 'Criar Salão'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateTenantModal;
