import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Sparkles,
  Crown,
  CheckCircle,
  Calendar,
  CreditCard,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationProvider';
import ClienteBottomNavBar from '../components/ClienteBottomNavBar';
import { TelaCliente } from '../components/ui/TelaCliente';

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
      // 1. Minhas assinaturas ativas
      const mySubs = await api.memberships.getMySubscriptions();
      setMySubscriptions(Array.isArray(mySubs) ? mySubs : []);

      // 2. Planos disponíveis do salão
      const plans = await api.memberships.listPlans(tenant.id);
      setAvailablePlans(Array.isArray(plans) ? plans : []);
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar dados do Clube.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan) => {
    const confirmed = await confirm(
      `Confirmar adesão ao plano "${plan.name}" por R$ ${Number(plan.price)
        .toFixed(2)
        .replace('.', ',')} / mês?`
    );
    if (!confirmed) return;

    setSubscribingId(plan.id);
    try {
      await api.memberships.subscribe(plan.id);
      showSuccess(`Assinatura do "${plan.name}" confirmada! Seus créditos já estão disponíveis.`);
      fetchData();
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao processar assinatura.');
    } finally {
      setSubscribingId(null);
    }
  };

  return (
    <TelaCliente temNavegacaoInferior className="selection:bg-brand-tint selection:text-brand">
      {/* 1. Cabeçalho Sticky Rosé Editorial */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-line/60 pt-3 pb-3 px-5">
        <div className="max-w-[420px] mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(`/${tenant_slug}/home`)}
            className="w-10 h-10 rounded-full border border-line bg-surface text-ink flex items-center justify-center hover:bg-brand-tint/30 transition-all active:scale-95 shadow-xs cursor-pointer shrink-0"
            aria-label="Voltar para a página inicial"
          >
            <ChevronLeft size={20} strokeWidth={2.4} />
          </button>

          <h1 className="font-serif text-lg font-bold text-ink tracking-tight flex-1 text-center pr-10 truncate">
            Clube de Assinaturas
          </h1>
        </div>
      </header>

      {/* 2. Conteúdo Principal */}
      <main className="w-full max-w-[420px] mx-auto px-5 pt-5 flex-1 flex flex-col space-y-6">
        {/* Banner de Apresentação do Clube */}
        <div className="rounded-[24px] bg-gradient-to-br from-brand-tint/60 via-surface to-brand-tint/30 border border-brand/20 p-6 shadow-xs relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/80 text-brand border border-gold/30 shadow-xs">
              <Crown size={13} className="text-gold" />
              <span>Clube Exclusivo</span>
            </span>

            <h2 className="font-serif text-2xl font-bold text-ink leading-tight">
              Autocuidado contínuo com economia especial
            </h2>

            <p className="text-xs text-ink-soft leading-relaxed max-w-[320px]">
              Assine um pacote mensal do seu procedimento favorito e garanta sessões garantidas com desconto exclusivo.
            </p>
          </div>
        </div>

        {/* Seção: Minhas Inscrições */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-brand" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Minhas Inscrições
            </h3>
          </div>

          {loading ? (
            <div className="h-32 bg-surface rounded-2xl border border-line/60 animate-pulse" />
          ) : mySubscriptions.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-line/70 p-6 text-center shadow-xs">
              <p className="font-serif text-base font-bold text-ink mb-1">
                Você não possui planos ativos
              </p>
              <p className="text-xs text-ink-soft max-w-[280px] mx-auto">
                Conheça os planos disponíveis abaixo e comece a economizar nos seus atendimentos recorrentes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {mySubscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-surface rounded-2xl border border-gold/40 p-5 shadow-xs space-y-3.5 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-brand-tint text-brand">
                        Plano Ativo
                      </span>
                      <h4 className="font-serif text-xl font-bold text-ink mt-1.5">
                        {sub.membership_name}
                      </h4>
                    </div>

                    <span className="text-xs font-semibold text-ink-soft capitalize">
                      {sub.billing_cycle === 'monthly' ? 'Ciclo Mensal' : 'Ciclo Anual'}
                    </span>
                  </div>

                  {/* Saldo de Sessões */}
                  <div className="bg-brand-tint/30 rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-ink-soft block">
                        Créditos de {sub.service_name}
                      </span>
                      <span className="font-serif text-lg font-bold text-brand">
                        {sub.remaining_sessions} {sub.remaining_sessions === 1 ? 'sessão disponível' : 'sessões disponíveis'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        sub.remaining_sessions > 0 &&
                        navigate(`/${tenant_slug}/agendar/servicos`)
                      }
                      disabled={sub.remaining_sessions === 0}
                      className="px-4 py-2 rounded-full bg-brand text-white text-xs font-semibold hover:opacity-95 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                    >
                      {sub.remaining_sessions === 0 ? 'Esgotado' : 'Agendar'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-ink-soft pt-1 border-t border-line/60">
                    <span>
                      R$ {Number(sub.price).toFixed(2).replace('.', ',')} / mês
                    </span>
                    <span>
                      Renovação: {new Date(sub.current_period_end).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Seção: Planos do Clube Disponíveis */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-brand" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Planos do Clube
            </h3>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-44 bg-surface rounded-2xl border border-line/60 animate-pulse"
                />
              ))}
            </div>
          ) : availablePlans.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-line/70 p-6 text-center text-xs text-ink-soft">
              Nenhum plano disponível para adesão no momento.
            </div>
          ) : (
            <div className="space-y-4">
              {availablePlans.map((plan) => {
                const isSubscribed = mySubscriptions.some(
                  (sub) => sub.membership_id === plan.id
                );

                return (
                  <div
                    key={plan.id}
                    className="bg-surface rounded-[24px] border border-line/70 p-6 shadow-xs hover:border-brand/40 transition-all space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-brand">
                          Assinatura Mensal
                        </span>
                        {isSubscribed && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success">
                            <CheckCircle size={13} />
                            <span>Já inscrito</span>
                          </span>
                        )}
                      </div>

                      <h4 className="font-serif text-2xl font-bold text-ink mt-1">
                        {plan.name}
                      </h4>
                      {plan.description && (
                        <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                          {plan.description}
                        </p>
                      )}
                    </div>

                    {/* Detalhes de Inclusão */}
                    <div className="bg-bg rounded-2xl p-4 border border-line/60 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-ink-soft">Serviço incluso:</span>
                        <span className="font-bold text-ink">{plan.service_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-ink-soft">Sessões por ciclo:</span>
                        <span className="font-bold text-brand">
                          {plan.usage_limit === 0
                            ? 'Ilimitado'
                            : `${plan.usage_limit} sessões`}
                        </span>
                      </div>
                    </div>

                    {/* Preço e Botão */}
                    <div className="flex justify-between items-center pt-2 border-t border-line/60">
                      <div>
                        <span className="text-[11px] uppercase font-semibold text-ink-soft block">
                          Mensalidade
                        </span>
                        <span className="font-serif text-2xl font-bold text-brand tabular-nums">
                          R$ {Number(plan.price).toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={isSubscribed || subscribingId === plan.id}
                        onClick={() => handleSubscribe(plan)}
                        className={`h-11 px-6 rounded-full font-medium text-xs shadow-xs transition-all cursor-pointer ${
                          isSubscribed
                            ? 'bg-line text-ink-soft cursor-default'
                            : 'bg-brand text-white hover:opacity-95 active:scale-95'
                        }`}
                      >
                        {isSubscribed
                          ? 'Inscrito ✓'
                          : subscribingId === plan.id
                          ? 'Aderindo...'
                          : 'Assinar Agora'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* 3. Navegação Inferior (Ativa em 'clube') */}
      <ClienteBottomNavBar activeTab="clube" tenantSlug={tenant_slug} />
    </TelaCliente>
  );
};

export default ClubeFidelidade;
