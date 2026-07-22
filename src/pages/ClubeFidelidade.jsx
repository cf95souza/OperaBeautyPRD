import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationProvider';
import ClienteBottomNavBar from '../components/ClienteBottomNavBar';

const ClubeFidelidade = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, session, loading: loadingTenant } = useTenant();
  const { showSuccess, showError, confirm } = useNotification();

  const [mySubscriptions, setMySubscriptions] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState(null);

  useEffect(() => {
    if (loadingTenant) return;
    if (!session || session.role !== 'client') {
      navigate(`/${tenant_slug}/login`);
      return;
    }
    fetchData();
  }, [session, loadingTenant, navigate, tenant_slug]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Minhas assinaturas
      const mySubs = await api.memberships.getMySubscriptions();
      setMySubscriptions(mySubs);

      // 2. Planos disponíveis
      const plans = await api.memberships.listPlans(tenant.id);
      setAvailablePlans(plans);
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar dados do Clube.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan) => {
    if (!(await confirm(`Confirmar assinatura no plano "${plan.name}" por R$ ${Number(plan.price).toFixed(2).replace('.', ',')} / mês?`))) return;
    
    setSubscribingId(plan.id);
    try {
      await api.memberships.subscribe(plan.id);
      showSuccess(`Assinatura do "${plan.name}" confirmada! Créditos ativos.`);
      fetchData();
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao processar assinatura.');
    } finally {
      setSubscribingId(null);
    }
  };

  if (loadingTenant || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen pb-[90px] md:pb-6 font-body-md text-body-md antialiased">
      {/* Header */}
      <header className="w-full top-0 sticky z-40 bg-surface shadow-sm pt-[calc(env(safe-area-inset-top,0px)+28px)] pb-2 md:pt-4">
        <div className="flex justify-between items-center px-gutter py-sm w-full max-w-7xl mx-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-full hover:bg-surface-variant text-on-surface transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md-mobile md:text-headline-md text-primary tracking-tight flex-1 text-center pr-10">
            Clube de Assinaturas
          </h1>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-lg mx-auto px-container-margin py-lg space-y-xl animate-fade-in-up">
        
        {/* Minhas Assinaturas Ativas */}
        <section className="space-y-md">
          <h2 className="font-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span> Minhas Inscrições
          </h2>
          
          {mySubscriptions.length === 0 ? (
            <div className="bg-surface-container-lowest p-lg rounded-2xl border border-outline-variant/30 text-center text-secondary shadow-sm">
              <p className="font-label-lg mb-1">Você não possui planos ativos</p>
              <p className="text-xs">Veja os planos disponíveis abaixo para garantir descontos exclusivos.</p>
            </div>
          ) : (
            <div className="space-y-sm">
              {mySubscriptions.map(sub => (
                <div key={sub.id} className="bg-surface-container-lowest border border-primary/20 rounded-2xl p-lg shadow-sm flex flex-col gap-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -z-10"></div>
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-headline-sm text-on-surface">{sub.membership_name}</h3>
                      <span className="font-label-sm text-secondary uppercase tracking-wider text-[10px]">{sub.billing_cycle === 'monthly' ? 'Mensal' : 'Anual'}</span>
                    </div>
                    <span className="bg-primary-container text-on-primary-container font-semibold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">Ativo</span>
                  </div>

                  <div className="flex justify-between items-center bg-surface-container-low p-md rounded-xl border border-outline-variant/40 mt-1">
                    <div className="text-left">
                      <span className="font-label-sm text-secondary text-[11px] block">Créditos de {sub.service_name}</span>
                      <span className="font-headline-sm text-primary font-bold">{sub.remaining_sessions} sessões</span>
                    </div>
                    <button 
                      onClick={() => navigate(`/${tenant_slug}/agendar/profissionais`)}
                      className="bg-primary text-on-primary text-xs font-semibold px-4 py-2.5 rounded-full hover:opacity-90 shadow-sm transition-all"
                    >
                      Agendar
                    </button>
                  </div>

                  <div className="text-[11px] text-secondary flex items-center justify-between border-t border-outline-variant/20 pt-md mt-md">
                    <span>Assinatura contratada por R$ {Number(sub.price).toFixed(2).replace('.', ',')} / mês</span>
                    <span>Renova em: {new Date(sub.current_period_end).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Planos Disponíveis */}
        <section className="space-y-md">
          <h2 className="font-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">shopping_bag</span> Planos do Clube
          </h2>
          
          {availablePlans.length === 0 ? (
            <div className="text-center py-8 text-secondary">Nenhum plano disponível para contratação no momento.</div>
          ) : (
            <div className="space-y-md">
              {availablePlans.map(plan => {
                const isSubscribed = mySubscriptions.some(sub => sub.membership_id === plan.id);
                
                return (
                  <div key={plan.id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-lg shadow-sm flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
                    <div>
                      <h3 className="font-headline-sm text-on-surface mb-2">{plan.name}</h3>
                      <p className="font-body-sm text-secondary line-clamp-3 mb-md">{plan.description}</p>
                      
                      <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/40 space-y-1.5 mb-lg text-sm">
                        <div className="flex justify-between">
                          <span className="text-secondary">Serviço incluso:</span>
                          <span className="font-semibold text-on-surface">{plan.service_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-secondary">Uso por ciclo:</span>
                          <span className="font-semibold text-on-surface">{plan.usage_limit === 0 ? 'Ilimitado' : `${plan.usage_limit} sessões`}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t border-outline-variant/10 pt-md mt-md">
                      <div>
                        <span className="font-label-sm text-secondary text-[11px] block">Mensalidade</span>
                        <span className="font-headline-sm text-primary font-bold">R$ {Number(plan.price).toFixed(2).replace('.', ',')}</span>
                      </div>

                      <button
                        disabled={isSubscribed || subscribingId === plan.id}
                        onClick={() => handleSubscribe(plan)}
                        className={`font-semibold text-xs px-5 py-3 rounded-full shadow-sm transition-all ${
                          isSubscribed 
                            ? 'bg-surface-variant text-secondary cursor-default' 
                            : 'bg-primary text-on-primary hover:opacity-90 active:scale-95'
                        }`}
                      >
                        {isSubscribed ? 'Já Inscrito' : subscribingId === plan.id ? 'Aderindo...' : 'Assinar Agora'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Nav Bar do Cliente */}
      <ClienteBottomNavBar activeTab="home" tenantSlug={tenant_slug} />
    </div>
  );
};

export default ClubeFidelidade;
