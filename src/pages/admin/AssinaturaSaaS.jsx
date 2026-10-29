import React, { useState, useEffect, useCallback } from 'react';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  QrCode, 
  Receipt, 
  Calendar,
  Sparkles,
  ShieldCheck,
  Clock,
  AlertTriangle,
  RefreshCw,
  Lock,
  Globe,
  MessageSquare,
  FileText,
  Plus,
  Trash2,
  Settings
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationProvider';
import ModalPagamentoPixSaaS from '../../components/admin/ModalPagamentoPixSaaS';
import ModalConfigurarAddon from '../../components/admin/ModalConfigurarAddon';

const AssinaturaSaaS = () => {
  const { tenant, refreshTenant } = useTenant();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [billingStatus, setBillingStatus] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [checkingOverdue, setCheckingOverdue] = useState(false);
  
  // Complementos e Add-ons (E3 P2)
  const [availableAddons, setAvailableAddons] = useState([]);
  const [tenantAddonsData, setTenantAddonsData] = useState(null);
  const [addonToConfig, setAddonToConfig] = useState(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [processingAddon, setProcessingAddon] = useState(false);

  const fetchBillingData = useCallback(async () => {
    try {
      setLoading(true);
      const [statusData, listData, plansData, addonsList, tenantAddons] = await Promise.all([
        api.invoices.getBillingStatus(),
        api.invoices.list(tenant?.id),
        api.plans.list(true),
        api.addons.listAvailable().catch(() => ({ addons: [] })),
        api.addons.getTenantAddons(tenant?.id).catch(() => null)
      ]);
      if (statusData) setBillingStatus(statusData);
      if (listData) setInvoices(listData);
      if (plansData) {
        const sorted = (Array.isArray(plansData) ? plansData : [])
          .filter(p => p.is_active)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        setAvailablePlans(sorted);
      }
      if (addonsList?.addons) setAvailableAddons(addonsList.addons);
      if (tenantAddons) setTenantAddonsData(tenantAddons);
    } catch (err) {
      console.error('Erro ao buscar dados de faturamento e complementos', err);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  const handleSubscribeAddon = async (addonSlug) => {
    setProcessingAddon(true);
    try {
      await api.addons.subscribe({
        tenant_id: tenant?.id,
        addon_slug: addonSlug
      });
      showSuccess('Complemento contratado com sucesso!');
      await fetchBillingData();
      if (refreshTenant) await refreshTenant();
    } catch (err) {
      showError(err.message || 'Falha ao contratar complemento.');
    } finally {
      setProcessingAddon(false);
    }
  };

  const handleCancelAddon = async (addonSlug, addonName) => {
    if (!window.confirm(`Deseja realmente cancelar o complemento "${addonName}"?`)) return;
    setProcessingAddon(true);
    try {
      await api.addons.cancel({
        tenant_id: tenant?.id,
        addon_slug: addonSlug
      });
      showSuccess(`Complemento "${addonName}" cancelado.`);
      await fetchBillingData();
      if (refreshTenant) await refreshTenant();
    } catch (err) {
      showError(err.message || 'Falha ao cancelar complemento.');
    } finally {
      setProcessingAddon(false);
    }
  };

  const handleOpenConfigModal = (addon) => {
    setAddonToConfig(addon);
    setIsConfigModalOpen(true);
  };

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const handleOpenPixModal = (inv) => {
    setSelectedInvoice(inv);
    setIsPixModalOpen(true);
  };

  const handlePaymentSuccess = async () => {
    await fetchBillingData();
    if (refreshTenant) await refreshTenant();
  };

  const handleCheckOverdue = async () => {
    setCheckingOverdue(true);
    try {
      const res = await api.invoices.checkOverdue();
      showSuccess('Varredura de faturas concluída com sucesso.');
      await fetchBillingData();
      if (refreshTenant) await refreshTenant();
    } catch (err) {
      showError(err.message || 'Erro ao checar inadimplência.');
    } finally {
      setCheckingOverdue(false);
    }
  };

  if (!tenant) return null;

  // Priorizar faturas ativas retornadas pelo billingStatus ou lista
  const activeInvoices = billingStatus?.active_invoices || [];
  const primaryPendingInvoice = activeInvoices.length > 0 
    ? activeInvoices[0] 
    : invoices.find(inv => inv.status === 'pending' || inv.status === 'overdue');

  const paidInvoices = billingStatus?.history || invoices.filter(inv => inv.status === 'paid');

  const isGracePeriod = billingStatus?.is_grace_period;
  const isBlocked = billingStatus?.is_blocked;
  const remainingGrace = billingStatus?.remaining_grace_days ?? 5;
  const daysOverdue = billingStatus?.days_overdue ?? 0;

  return (
    <div className="space-y-8 animate-fade-in pb-16 max-w-5xl mx-auto">
      {/* Cabeçalho Editorial Rosé */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink tracking-tight">
            Minha assinatura
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Acompanhe seu plano atual, carência, faturas com baixa automática e gere o QR Code PIX.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCheckOverdue}
            disabled={checkingOverdue}
            className="px-4 py-2 rounded-full border border-line bg-white hover:bg-stone-50 text-xs font-semibold text-ink-soft hover:text-ink transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Verificar faturas em atraso e atualizar tolerância"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingOverdue ? 'animate-spin text-brand' : ''}`} />
            <span>Atualizar Status</span>
          </button>
        </div>
      </div>

      {/* Banners Informativos de Carência e Bloqueio */}
      {isBlocked ? (
        <div className="p-5 rounded-[22px] bg-rose-50 border border-rose-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-rose-950">
                Assinatura com bloqueio gradual (Apenas Leitura)
              </h3>
              <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                O período de carência de 5 dias expirou ({daysOverdue} dias de atraso). Novos agendamentos online estão temporariamente suspensos. Suas clientes e dados continuam seguros. Realize a quitação via PIX para <strong>reativação imediata</strong>.
              </p>
            </div>
          </div>
          {primaryPendingInvoice && (
            <button
              type="button"
              onClick={() => handleOpenPixModal(primaryPendingInvoice)}
              className="px-5 py-2.5 rounded-full bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              <span>Desbloquear Agora via PIX</span>
            </button>
          )}
        </div>
      ) : isGracePeriod ? (
        <div className="p-5 rounded-[22px] bg-amber-50 border border-amber-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-amber-950">
                Fatura em atraso — Período de tolerância ativo
              </h3>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Você possui uma fatura vencida há {daysOverdue} {daysOverdue === 1 ? 'dia' : 'dias'}. Restam <strong>{remainingGrace} {remainingGrace === 1 ? 'dia' : 'dias'}</strong> de carência sem qualquer interrupção de operações.
              </p>
            </div>
          </div>
          {primaryPendingInvoice && (
            <button
              type="button"
              onClick={() => handleOpenPixModal(primaryPendingInvoice)}
              className="px-5 py-2.5 rounded-full bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              <span>Pagar Fatura com PIX</span>
            </button>
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status do Plano */}
        <div className="rounded-[22px] border border-line bg-white shadow-xs p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase font-semibold text-ink-soft tracking-wider">
                Plano Atual
              </span>
              {isBlocked ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                  <Lock className="w-3.5 h-3.5" />
                  Bloqueado por Inadimplência
                </span>
              ) : isGracePeriod ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  <Clock className="w-3.5 h-3.5" />
                  Carência ({remainingGrace}d restantes)
                </span>
              ) : tenant.status === 'active' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ativo e Regular
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDE8E8] text-[#C62828]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Pagamento Pendente
                </span>
              )}
            </div>

            {billingStatus?.tenant?.is_founder && (
              <div className="mb-4 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 shadow-2xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-xs font-bold shrink-0">
                    ★
                  </span>
                  <span className="text-xs font-extrabold uppercase tracking-wide">
                    {billingStatus.tenant.founder_badge_label || 'Salão Fundador'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200/80 text-amber-950 uppercase ml-auto">
                    Preço Congelado
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Seu plano possui preço especial congelado em <strong>{formatCurrency(billingStatus.tenant.frozen_price || 99.9)}/mês</strong> até{' '}
                  <strong>{formatDate(billingStatus.tenant.price_frozen_until)}</strong> (12 meses de garantia). Todos os recursos do plano <strong>Signature</strong> estão 100% liberados!
                </p>
              </div>
            )}

            <div className="flex items-baseline gap-2 mb-1">
              <h3 className="font-display font-bold text-2xl text-ink capitalize">
                Plano {billingStatus?.tenant?.plan_name || tenant.plan_name || tenant.plan || 'Signature'}
              </h3>
              {billingStatus?.tenant?.plan_slug === 'signature' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-tint text-brand border border-brand/20 uppercase tracking-wide">
                  Alta Performance
                </span>
              )}
            </div>
            <p className="text-xs text-ink-soft mb-6">
              Acesso completo a gestão de clientes, agendamentos online, financeiro, automações e inteligência operacional.
            </p>
          </div>

          <div className="pt-4 border-t border-line/60 flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase text-ink-soft tracking-wider">
              {billingStatus?.tenant?.is_price_frozen ? 'Mensalidade Congelada' : 'Mensalidade'}
            </span>
            <div className="flex items-baseline gap-1.5">
              {billingStatus?.tenant?.is_price_frozen && billingStatus?.tenant?.catalog_price > billingStatus?.tenant?.monthly_price && (
                <span className="text-xs text-ink-soft/70 line-through tabular-nums">
                  {formatCurrency(billingStatus.tenant.catalog_price)}
                </span>
              )}
              <span className="font-display font-bold text-2xl sm:text-3xl text-brand tabular-nums">
                {formatCurrency(billingStatus?.tenant?.monthly_price || tenant.plan_price || 99.9)}
              </span>
              <span className="text-xs text-ink-soft font-medium">/mês</span>
            </div>
          </div>
        </div>

        {/* Fatura Aberta / Situação */}
        <div className="rounded-[22px] border border-line bg-white shadow-xs p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-brand-tint flex items-center justify-center text-brand">
                <Receipt className="w-4 h-4" />
              </div>
              <h3 className="font-display font-bold text-xl text-ink">Fatura da plataforma</h3>
            </div>

            {primaryPendingInvoice ? (
              <p className="text-xs sm:text-sm text-ink-soft leading-relaxed mb-6">
                Você possui fatura pendente de <strong className="text-ink">{primaryPendingInvoice.reference_month}</strong> no valor de{' '}
                <strong className="text-ink font-semibold">{formatCurrency(primaryPendingInvoice.amount)}</strong> com vencimento em{' '}
                <strong className="text-ink font-semibold">{formatDate(primaryPendingInvoice.due_date)}</strong>.
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-ink-soft leading-relaxed mb-6">
                Sua assinatura do OperaBeauty está 100% em dia. Nenhuma pendência financeira no momento.
              </p>
            )}
          </div>

          <div>
            {loading ? (
              <div className="text-xs text-ink-soft">Carregando dados de faturamento...</div>
            ) : primaryPendingInvoice ? (
              <button
                type="button"
                onClick={() => handleOpenPixModal(primaryPendingInvoice)}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Pagar fatura com PIX (Reativação Imediata)</span>
              </button>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#E8F5E9] border border-[#2E7D32]/20 text-[#2E7D32] flex items-center justify-center gap-2 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Todas as faturas estão quitadas</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seção Oficial de Planos e Preços E1 */}
      {availablePlans.length > 0 && (
        <div className="rounded-[22px] border border-line bg-white shadow-xs p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-tint flex items-center justify-center text-brand">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-xl text-ink">Catálogo de Planos OperaBeauty</h3>
              </div>
              <p className="text-xs text-ink-soft mt-1">
                Planos dimensionados para salões independentes até grandes operações e redes.
              </p>
            </div>

            {/* Toggle Mensal / Anual */}
            <div className="inline-flex items-center p-1 rounded-full bg-stone-100 border border-line self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-ink shadow-2xs'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === 'yearly'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                <span>Anual</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                  billingCycle === 'yearly' ? 'bg-white/20 text-white' : 'bg-brand-tint text-brand'
                }`}>
                  2 meses grátis
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {availablePlans.map((plan) => {
              const isCurrent = (billingStatus?.tenant?.plan_slug === plan.slug) || 
                                (billingStatus?.tenant?.plan_name?.toLowerCase() === plan.name?.toLowerCase());
              
              const isFeatured = plan.is_featured;
              const monthlyDisplay = billingCycle === 'yearly' && plan.yearly_price
                ? (parseFloat(plan.yearly_price) / 12)
                : parseFloat(plan.price);

              const marketingList = Array.isArray(plan.marketing_features) && plan.marketing_features.length > 0
                ? plan.marketing_features
                : (Array.isArray(plan.features) ? plan.features : []);

              return (
                <div
                  key={plan.id}
                  className={`rounded-[20px] p-5 flex flex-col justify-between transition-all relative ${
                    isCurrent
                      ? 'border-2 border-brand bg-brand-tint/15 shadow-sm'
                      : isFeatured
                        ? 'border-2 border-brand/50 bg-stone-50/50 shadow-2xs'
                        : 'border border-line bg-white hover:border-line-strong'
                  }`}
                >
                  {/* Badges de Destaque */}
                  <div className="flex items-center gap-1.5 mb-2">
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand text-white tracking-wide uppercase">
                        Seu Plano Atual
                      </span>
                    )}
                    {!isCurrent && isFeatured && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 tracking-wide uppercase">
                        ★ {plan.badge_label || 'Mais Escolhido'}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-display font-bold text-xl text-ink">
                      {plan.name}
                    </h4>
                    <p className="text-[11px] text-ink-soft mt-1 leading-relaxed min-h-[32px]">
                      {plan.description || 'Plano completo para a gestão inteligente do seu salão.'}
                    </p>

                    <div className="my-4 pt-3 border-t border-line/60">
                      <div className="flex items-baseline gap-1">
                        <span className="font-display font-bold text-2xl text-ink tabular-nums">
                          {formatCurrency(monthlyDisplay)}
                        </span>
                        <span className="text-[11px] text-ink-soft">/mês</span>
                      </div>
                      {billingCycle === 'yearly' && plan.yearly_price && (
                        <p className="text-[10px] text-brand font-semibold mt-0.5">
                          Faturado anualmente ({formatCurrency(plan.yearly_price)})
                        </p>
                      )}
                    </div>

                    {/* Especificações essenciais */}
                    <div className="space-y-1.5 pb-4 mb-4 border-b border-line/60 text-xs text-ink-soft">
                      <div className="flex items-center justify-between">
                        <span>Profissionais:</span>
                        <strong className="text-ink font-semibold">
                          {plan.max_professionals === 1 ? '1 profissional' : `Até ${plan.max_professionals || 'ilimitados'}`}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Banners no App:</span>
                        <strong className="text-ink font-semibold">
                          {plan.max_banners || 1} {plan.max_banners === 1 ? 'banner' : 'banners'}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>WhatsApp Mensal:</span>
                        <strong className="text-ink font-semibold">
                          {plan.max_whatsapp_messages > 0 ? `${plan.max_whatsapp_messages} disparos` : 'Opcional / Gateway'}
                        </strong>
                      </div>
                    </div>

                    {/* Lista de Features */}
                    <div className="space-y-2 mb-6">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block">
                        Principais Recursos
                      </span>
                      {marketingList.slice(0, 6).map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-xs text-ink-soft leading-tight">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    {isCurrent ? (
                      <div className="w-full py-2.5 rounded-full bg-brand/10 text-brand text-xs font-bold text-center border border-brand/20">
                        Plano Contratado ✓
                      </div>
                    ) : (
                      <a
                        href={`https://wa.me/5511999999999?text=Ol%C3%A1%2C%20gostaria%20de%20fazer%20upgrade%20para%20o%20plano%20${plan.name}%20no%20OperaBeauty!`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 rounded-full bg-ink hover:bg-ink-strong text-white text-xs font-bold text-center block transition-all shadow-2xs"
                      >
                        Contratar {plan.name}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Seção Oficial de Complementos e Add-ons E3 P2 */}
      <div className="rounded-[22px] border border-line bg-white shadow-xs p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-tint flex items-center justify-center text-brand">
                <Plus className="w-4 h-4" />
              </div>
              <h3 className="font-display font-bold text-xl text-ink">Complementos & Add-ons para o seu Salão</h3>
            </div>
            <p className="text-xs text-ink-soft mt-1">
              Adicione recursos sob demanda ao seu salão: pacotes de WhatsApp, domínio próprio com SSL e emissão fiscal.
            </p>
          </div>

          {/* Resumo Consolidado de Custos */}
          <div className="p-3 rounded-2xl bg-stone-50 border border-line flex items-center gap-4 text-xs">
            <div>
              <span className="text-ink-soft block text-[10px] uppercase font-semibold">Total Complementos</span>
              <strong className="text-ink font-bold tabular-nums">
                {formatCurrency(tenantAddonsData?.total_addons_price || 0)}/mês
              </strong>
            </div>
            <div className="h-6 w-px bg-line" />
            <div>
              <span className="text-ink-soft block text-[10px] uppercase font-semibold">Mensalidade Total</span>
              <strong className="text-brand font-bold tabular-nums">
                {formatCurrency((billingStatus?.tenant?.monthly_price || tenant.plan_price || 99.9) + (tenantAddonsData?.total_addons_price || 0))}/mês
              </strong>
            </div>
          </div>
        </div>

        {/* Grade de 3 Cards de Add-ons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Mensagens Extras de WhatsApp */}
          {(() => {
            const hasWaAddon = tenantAddonsData?.whatsapp?.has_addon;
            const waActive = tenantAddonsData?.whatsapp?.active_addon;
            const extraCount = tenantAddonsData?.whatsapp?.extra_messages || 0;

            return (
              <div className={`rounded-[20px] p-5 flex flex-col justify-between border transition-all ${
                hasWaAddon ? 'border-brand/50 bg-brand-tint/10 shadow-2xs' : 'border-line bg-white hover:border-line-strong'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    {hasWaAddon ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                        <CheckCircle2 className="w-3 h-3" />
                        Ativo (+{extraCount} msgs)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-ink-soft uppercase tracking-wide">
                        Opcional
                      </span>
                    )}
                  </div>

                  <h4 className="font-display font-bold text-base text-ink">
                    Pacote Extra de WhatsApp
                  </h4>
                  <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                    Aumente sua cota mensal de mensagens para lembretes automáticos e campanhas de retorno.
                  </p>

                  <div className="mt-4 pt-3 border-t border-line/60 space-y-1 text-xs">
                    <div className="flex justify-between text-ink-soft">
                      <span>Cota adicional ativa:</span>
                      <strong className="text-ink font-semibold">+{extraCount} msgs/mês</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-line/60">
                  {hasWaAddon ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-soft">Valor contratado:</span>
                        <strong className="text-brand font-bold tabular-nums">
                          {formatCurrency(waActive?.price || 29.9)}/mês
                        </strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCancelAddon(waActive?.slug || 'whatsapp_500', waActive?.name || 'WhatsApp Extra')}
                        disabled={processingAddon}
                        className="w-full py-2 rounded-full border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Cancelar Pacote</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleSubscribeAddon('whatsapp_500')}
                        disabled={processingAddon}
                        className="w-full py-2 rounded-full bg-stone-100 hover:bg-stone-200 text-ink text-xs font-bold transition-colors cursor-pointer flex items-center justify-between px-3"
                      >
                        <span>+500 msgs</span>
                        <strong className="text-brand tabular-nums">R$ 29,90/mês</strong>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubscribeAddon('whatsapp_1000')}
                        disabled={processingAddon}
                        className="w-full py-2 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center justify-between px-3"
                      >
                        <span>+1.000 msgs (Top)</span>
                        <strong className="tabular-nums">R$ 49,90/mês</strong>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 2. Domínio Próprio Personalizado */}
          {(() => {
            const domainInfo = tenantAddonsData?.custom_domain;
            const hasDomain = domainInfo?.has_addon;
            const isVerified = domainInfo?.is_verified;
            const domainName = domainInfo?.custom_domain;

            return (
              <div className={`rounded-[20px] p-5 flex flex-col justify-between border transition-all ${
                hasDomain ? 'border-brand/50 bg-brand-tint/10 shadow-2xs' : 'border-line bg-white hover:border-line-strong'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-800">
                      <Globe className="w-4 h-4" />
                    </div>
                    {hasDomain ? (
                      isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                          <CheckCircle2 className="w-3 h-3" />
                          DNS Verificado ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 uppercase tracking-wide">
                          <Clock className="w-3 h-3" />
                          Pendente DNS
                        </span>
                      )
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-ink-soft uppercase tracking-wide">
                        R$ 39,90/mês
                      </span>
                    )}
                  </div>

                  <h4 className="font-display font-bold text-base text-ink">
                    Domínio Próprio
                  </h4>
                  <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                    Utilize a sua própria URL (ex: agendamento.seusalao.com.br) com emissão de certificado SSL inclusa.
                  </p>

                  <div className="mt-4 pt-3 border-t border-line/60 space-y-1 text-xs">
                    <div className="flex justify-between text-ink-soft">
                      <span>URL configurada:</span>
                      <strong className="text-ink font-mono font-medium truncate max-w-[150px]">
                        {domainName || 'Não definida'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-line/60">
                  {hasDomain ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleOpenConfigModal(domainInfo?.active_addon)}
                        className="w-full py-2 rounded-full bg-ink hover:bg-ink-strong text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Configurar / Verificar DNS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelAddon('custom_domain', 'Domínio Próprio')}
                        disabled={processingAddon}
                        className="w-full py-1.5 text-center text-xs text-ink-soft hover:text-rose-700 transition-colors cursor-pointer"
                      >
                        Cancelar complemento
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSubscribeAddon('custom_domain')}
                      disabled={processingAddon}
                      className="w-full py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Contratar (R$ 39,90/mês)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 3. Módulo Fiscal NFS-e */}
          {(() => {
            const nfseInfo = tenantAddonsData?.nfse;
            const hasNfse = nfseInfo?.has_addon;

            return (
              <div className={`rounded-[20px] p-5 flex flex-col justify-between border transition-all ${
                hasNfse ? 'border-brand/50 bg-brand-tint/10 shadow-2xs' : 'border-line bg-white hover:border-line-strong'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-800">
                      <FileText className="w-4 h-4" />
                    </div>
                    {hasNfse ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 uppercase tracking-wide">
                        <CheckCircle2 className="w-3 h-3" />
                        Módulo Ativo
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-ink-soft uppercase tracking-wide">
                        R$ 49,90/mês
                      </span>
                    )}
                  </div>

                  <h4 className="font-display font-bold text-base text-ink">
                    Emissão Fiscal NFS-e
                  </h4>
                  <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                    Emissão automatizada de notas fiscais de serviço para procedimentos concluídos no salão.
                  </p>

                  <div className="mt-4 pt-3 border-t border-line/60 space-y-1 text-xs">
                    <div className="flex justify-between text-ink-soft">
                      <span>Status do módulo:</span>
                      <strong className="text-ink font-semibold">
                        {hasNfse ? 'Liberado e Operante' : 'Não Contratado'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-line/60">
                  {hasNfse ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => handleOpenConfigModal(nfseInfo?.active_addon)}
                        className="w-full py-2 rounded-full bg-ink hover:bg-ink-strong text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Configurar Dados Fiscais</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelAddon('nfse_module', 'Módulo Fiscal NFS-e')}
                        disabled={processingAddon}
                        className="w-full py-1.5 text-center text-xs text-ink-soft hover:text-rose-700 transition-colors cursor-pointer"
                      >
                        Cancelar complemento
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSubscribeAddon('nfse_module')}
                      disabled={processingAddon}
                      className="w-full py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Contratar (R$ 49,90/mês)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Histórico Real de Pagamentos */}
      <div className="rounded-[22px] border border-line bg-white shadow-xs p-6 sm:p-7">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-tint flex items-center justify-center text-brand">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-xl text-ink">Histórico de mensalidades</h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-ink-soft tabular-nums">
            {paidInvoices.length} faturas quitadas
          </span>
        </div>

        <div className="divide-y divide-line/60">
          {paidInvoices.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-soft italic">
              Nenhum pagamento registrado até o momento.
            </div>
          ) : (
            paidInvoices.map(inv => (
              <div key={inv.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{inv.reference_month}</p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {formatCurrency(inv.amount)} • {inv.payment_method === 'manual' ? 'Baixa Manual' : 'PIX'} • Pago em {formatDate(inv.paid_at || Date.now())}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32] shrink-0">
                  Pago ✓
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal PIX com QR Code e Simulação Sandbox */}
      {selectedInvoice && (
        <ModalPagamentoPixSaaS
          isOpen={isPixModalOpen}
          onClose={() => setIsPixModalOpen(false)}
          invoice={selectedInvoice}
          billingStatus={billingStatus}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Modal de Configuração de Complementos (Domínio Próprio e NFS-e) */}
      {addonToConfig && (
        <ModalConfigurarAddon
          isOpen={isConfigModalOpen}
          onClose={() => {
            setIsConfigModalOpen(false);
            setAddonToConfig(null);
          }}
          addon={addonToConfig}
          tenantId={tenant?.id}
          onSaveSuccess={async () => {
            await fetchBillingData();
            if (refreshTenant) await refreshTenant();
          }}
        />
      )}
    </div>
  );
};

export default AssinaturaSaaS;

