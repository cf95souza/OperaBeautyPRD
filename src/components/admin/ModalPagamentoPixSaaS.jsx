import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Smartphone, 
  ArrowRight,
  RefreshCw,
  CreditCard,
  ExternalLink,
  Lock
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationProvider';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';

/**
 * Modal de Pagamento Híbrido SaaS (PIX + Cartão Seguro Mercado Pago - Fase 51 - G40)
 */
const ModalPagamentoPixSaaS = ({ 
  isOpen, 
  onClose, 
  invoice, 
  billingStatus,
  onPaymentSuccess 
}) => {
  const { showSuccess, showError } = useNotification();
  const { session } = useTenant();
  const [currentInvoice, setCurrentInvoice] = useState(invoice);
  const [activeTab, setActiveTab] = useState('pix'); // 'pix' | 'card'
  const [installments, setInstallments] = useState(12);
  const [generatingCard, setGeneratingCard] = useState(false);
  const [subscribingCard, setSubscribingCard] = useState(false);
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    setCurrentInvoice(invoice);
  }, [invoice]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim() || !currentInvoice?.id) return;
    setApplyingCoupon(true);
    try {
      const res = await api.invoices.applyCoupon(currentInvoice.id, couponInput.trim());
      if (res?.invoice) {
        setCurrentInvoice(res.invoice);
        showSuccess(res.message || 'Cupom aplicado com sucesso!');
        setCouponInput('');
      }
    } catch (err) {
      showError(err.message || 'Falha ao aplicar cupom.');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!currentInvoice?.id) return;
    setVerifying(true);
    try {
      const res = await api.invoices.verifyPayment(currentInvoice.id);
      if (res?.paid) {
        showSuccess(res.message || 'Pagamento confirmado com sucesso!');
        if (onPaymentSuccess) onPaymentSuccess();
        onClose();
      } else {
        showError(res.message || 'Pagamento ainda não detectado. Aguarde alguns instantes e tente novamente.');
      }
    } catch (err) {
      showError(err.message || 'Erro ao consultar status no gateway.');
    } finally {
      setVerifying(false);
    }
  };

  const handlePayWithCard = async () => {
    if (!currentInvoice?.id) return;
    setGeneratingCard(true);
    try {
      const res = await api.invoices.createCardPreference(currentInvoice.id, installments);
      if (res?.init_point) {
        showSuccess('Redirecionando para o ambiente seguro do Mercado Pago...');
        window.open(res.init_point, '_blank');
      } else {
        showError('Não foi possível obter o link de checkout do Mercado Pago.');
      }
    } catch (err) {
      showError(err.message || 'Falha ao iniciar pagamento com cartão no Mercado Pago.');
    } finally {
      setGeneratingCard(false);
    }
  };

  const handleSubscribeCard = async () => {
    setSubscribingCard(true);
    try {
      const res = await api.invoices.subscribeCard({
        plan_slug: billingStatus?.tenant?.plan_slug,
        coupon_code: currentInvoice?.applied_coupon_code
      });
      if (res?.init_point) {
        showSuccess('Abrindo tela oficial do Mercado Pago para autorizar o débito automático...');
        window.open(res.init_point, '_blank');
      } else {
        showError('Não foi possível iniciar a assinatura no Mercado Pago.');
      }
    } catch (err) {
      showError(err.message || 'Erro ao iniciar débito automático no cartão.');
    } finally {
      setSubscribingCard(false);
    }
  };

  const isSuperAdmin = session?.role === 'superadmin';
  const isSandbox = Boolean(billingStatus?.is_sandbox);
  // O botão de simulação só aparece se estiver em ambiente Sandbox ou para o SuperAdmin da plataforma
  const canSimulate = isSandbox || isSuperAdmin;

  // Polling automático enquanto o modal estiver aberto para detectar baixa imediata
  useEffect(() => {
    if (!isOpen || !currentInvoice || !currentInvoice.id) return;

    const interval = setInterval(async () => {
      try {
        const status = await api.invoices.getBillingStatus();
        const found = status?.active_invoices?.find(inv => inv.id === currentInvoice.id);
        
        // Se a fatura não estiver mais ativa ou não tiver faturas pendentes, foi paga!
        if (!found || found.status === 'paid' || status?.active_invoices?.length === 0) {
          showSuccess('Pagamento confirmado com sucesso! Sua assinatura foi regularizada.');
          if (onPaymentSuccess) onPaymentSuccess();
          onClose();
        }
      } catch (err) {
        // Silencioso no polling
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, currentInvoice, onClose, onPaymentSuccess, showSuccess]);

  if (!isOpen || !currentInvoice) return null;

  const handleCopy = async () => {
    if (!currentInvoice.pix_copy_paste) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentInvoice.pix_copy_paste);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = currentInvoice.pix_copy_paste;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      showSuccess('Código PIX Copia e Cola copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      showError('Não foi possível copiar automaticamente. Selecione e copie o código manualmente.');
    }
  };

  const handleRefreshPix = async () => {
    if (!currentInvoice?.id) return;
    setRefreshing(true);
    try {
      const res = await api.invoices.refreshPix(currentInvoice.id);
      if (res?.invoice) {
        setCurrentInvoice(res.invoice);
        showSuccess('QR Code PIX atualizado com sucesso!');
      }
    } catch (err) {
      showError(err.message || 'Falha ao atualizar QR Code.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSimulatePayment = async () => {
    setSimulating(true);
    try {
      const res = await api.invoices.simulatePayment(currentInvoice.id);
      showSuccess(res.message || 'Pagamento compensado com sucesso! Salão reativado.');
      if (onPaymentSuccess) onPaymentSuccess();
      onClose();
    } catch (err) {
      showError(err.message || 'Falha ao simular pagamento.');
    } finally {
      setSimulating(false);
    }
  };

  const isGracePeriod = billingStatus?.is_grace_period;
  const isBlocked = billingStatus?.is_blocked;
  const remainingGrace = billingStatus?.remaining_grace_days ?? 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-white rounded-[26px] shadow-2xl border border-line overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo Editorial Rosé */}
        <div className="bg-[#FAF7F5] px-6 py-5 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-tint flex items-center justify-center text-brand">
              {activeTab === 'pix' ? <QrCode className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand">
                  Assinatura SaaS • {currentInvoice.reference_month}
                </span>
                {isBlocked ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    Bloqueio Ativo
                  </span>
                ) : isGracePeriod ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    Carência: {remainingGrace}d
                  </span>
                ) : null}
              </div>
              <h2 className="font-display font-bold text-xl text-ink leading-tight">
                {activeTab === 'pix' ? 'Pagar com PIX' : 'Pagar com Cartão de Crédito'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-ink-soft hover:text-ink hover:bg-stone-100 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com rolagem se necessário */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Alertas de Carência e Reativação Automática */}
          {isBlocked ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 leading-relaxed">
                <strong>Bloqueio gradual em vigor:</strong> Novos agendamentos online estão pausados. Assim que o pagamento for detectado, o sistema é <strong>reativado instantaneamente</strong>.
              </div>
            </div>
          ) : isGracePeriod ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong>Período de tolerância (Carência):</strong> Restam <strong>{remainingGrace} {remainingGrace === 1 ? 'dia' : 'dias'}</strong> de tolerância sem interrupção de operações antes do bloqueio gradual de novos agendamentos online.
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="text-xs text-emerald-800">
                Baixa automática e compensação instantânea via Mercado Pago.
              </span>
            </div>
          )}

          {/* Destaque do Valor e Vencimento */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-line flex items-baseline justify-between">
            <div>
              <span className="text-xs text-ink-soft font-medium uppercase tracking-wider">Valor da Assinatura</span>
              <p className="text-xs text-ink-soft mt-0.5">
                Vencimento: <strong className="text-ink">{formatDate(currentInvoice.due_date)}</strong>
              </p>
              {Number(currentInvoice.discount_amount || 0) > 0 && (
                <span className="inline-block mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Cupom {currentInvoice.applied_coupon_code} aplicado (-{formatCurrency(currentInvoice.discount_amount)})
                </span>
              )}
            </div>
            <div className="text-right">
              {Number(currentInvoice.discount_amount || 0) > 0 && currentInvoice.original_amount && (
                <span className="block text-xs text-stone-400 line-through">
                  {formatCurrency(currentInvoice.original_amount)}
                </span>
              )}
              <span className="font-display font-bold text-2xl sm:text-3xl text-brand tabular-nums">
                {formatCurrency(currentInvoice.amount)}
              </span>
            </div>
          </div>

          {/* Campo de Cupom Promocional SaaS (Fase 50/51) */}
          {Number(currentInvoice.discount_amount || 0) === 0 && (
            <div className="p-3.5 rounded-2xl bg-[#FBF7F5] border border-line/70 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand" /> Possui cupom promocional?
                </span>
                <span className="text-[11px] text-ink-soft">Ex: ESSENCIAL30, PREMIUM40</span>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  placeholder="DIGITE O CUPOM AQUI"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  disabled={applyingCoupon}
                  className="flex-1 text-xs font-mono uppercase bg-white px-3 py-2 rounded-xl border border-line focus:outline-none focus:border-brand"
                />
                <button
                  type="button"
                  disabled={!couponInput.trim() || applyingCoupon}
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {applyingCoupon ? 'Aplicando...' : 'Aplicar'}
                </button>
              </div>
            </div>
          )}

          {/* Seletor de Método de Pagamento (Fase 51 - Híbrido PIX vs Cartão) */}
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-stone-100 border border-line/80">
            <button
              type="button"
              onClick={() => setActiveTab('pix')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'pix'
                  ? 'bg-white text-ink shadow-xs border border-line/60'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>Pagar com PIX</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('card')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'card'
                  ? 'bg-white text-ink shadow-xs border border-line/60'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              <CreditCard className="w-4 h-4 text-[#009EE3]" />
              <span>Cartão de Crédito</span>
            </button>
          </div>

          {/* ABA 1: CONTEÚDO PIX */}
          {activeTab === 'pix' && (
            <div className="space-y-4 animate-fade-in">
              {/* QR Code PIX Central */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-line shadow-2xs">
                <div className="p-2.5 rounded-xl bg-white border border-stone-200 shadow-xs mb-2">
                  {currentInvoice.pix_qr_code ? (
                    <img 
                      src={currentInvoice.pix_qr_code} 
                      alt="QR Code PIX para pagamento da fatura SaaS" 
                      className="w-44 h-44 object-contain"
                    />
                  ) : (
                    <div className="w-44 h-44 flex flex-col items-center justify-center text-ink-soft text-xs text-center p-2">
                      <QrCode className="w-12 h-12 text-brand mb-2" />
                      <span>Utilize o código Copia e Cola abaixo</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-ink-soft text-center flex items-center gap-1.5 font-medium">
                  <Smartphone className="w-3.5 h-3.5 text-brand" />
                  Aponte a câmera do aplicativo do seu banco para escanear
                </p>

                <button
                  type="button"
                  disabled={refreshing}
                  onClick={handleRefreshPix}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-line bg-stone-50 hover:bg-stone-100 text-[11px] font-semibold text-ink-soft hover:text-ink transition-colors cursor-pointer disabled:opacity-50"
                  title="Gera um novo QR Code válido caso o anterior tenha expirado no seu banco"
                >
                  <RefreshCw className={`w-3 h-3 text-brand ${refreshing ? 'animate-spin' : ''}`} />
                  <span>{refreshing ? 'Atualizando cobrança...' : 'Código expirado? Gerar Novo QR Code'}</span>
                </button>
              </div>

              {/* Código Copia e Cola */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-ink">Código Pix Copia e Cola</label>
                  <span className="text-ink-soft">Válido para qualquer banco</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={currentInvoice.pix_copy_paste || ''}
                    className="w-full text-xs font-mono bg-stone-50 text-ink-soft px-3.5 py-3 pr-28 rounded-xl border border-line focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      copied 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-brand hover:bg-brand-hover text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Passo a Passo Ilustrado */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2.5 rounded-xl bg-stone-50 border border-line/60">
                  <span className="text-[10px] font-bold text-brand uppercase tracking-wider block mb-1">Passo 1</span>
                  <p className="text-[11px] text-ink leading-tight font-medium">Abra o app do seu banco</p>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-50 border border-line/60">
                  <span className="text-[10px] font-bold text-brand uppercase tracking-wider block mb-1">Passo 2</span>
                  <p className="text-[11px] text-ink leading-tight font-medium">Escolha Pix Copia e Cola</p>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-50 border border-line/60">
                  <span className="text-[10px] font-bold text-brand uppercase tracking-wider block mb-1">Passo 3</span>
                  <p className="text-[11px] text-ink leading-tight font-medium">Confirme e ative na hora</p>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: CONTEÚDO CARTÃO DE CRÉDITO (MERCADO PAGO) */}
          {activeTab === 'card' && (
            <div className="space-y-4 animate-fade-in">
              {/* Box de Segurança Máxima PCI-DSS */}
              <div className="p-4 rounded-2xl bg-[#F0F8FF] border border-[#009EE3]/30 flex items-start gap-3">
                <Lock className="w-5 h-5 text-[#009EE3] shrink-0 mt-0.5" />
                <div className="text-xs text-[#003B5C] leading-relaxed">
                  <strong className="font-semibold block mb-0.5">Segurança Bancária Certificada:</strong>
                  O pagamento é processado <strong>100% no ambiente criptografado do Mercado Pago</strong> (PCI-DSS Nível 1). Nenhum dado do seu cartão é salvo ou trafega em nosso servidor.
                </div>
              </div>

              {/* Seletor de Parcelamento (Até 12x) */}
              <div className="p-4 rounded-2xl bg-white border border-line space-y-3">
                <label className="text-xs font-semibold text-ink block">
                  Escolha o número de parcelas no cartão:
                </label>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="w-full text-xs font-medium bg-stone-50 px-3.5 py-2.5 rounded-xl border border-line focus:outline-none focus:border-[#009EE3]"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => {
                    const totalVal = parseFloat(currentInvoice.amount) || 0;
                    const installmentVal = totalVal / n;
                    return (
                      <option key={n} value={n}>
                        {n}x de {formatCurrency(installmentVal)} {n === 1 ? '(à vista)' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-ink-soft">
                  Aceita Visa, Mastercard, Elo, Hipercard, American Express e saldo Mercado Pago.
                </p>
              </div>

              {/* Botão de Checkout Oficial Mercado Pago */}
              <button
                type="button"
                disabled={generatingCard}
                onClick={handlePayWithCard}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#009EE3] hover:bg-[#0081B9] text-white text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                <span>{generatingCard ? 'Iniciando Checkout Seguro...' : 'Pagar com Cartão no Mercado Pago'}</span>
                <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
              </button>

              {/* Opção Adicional: Débito Automático Mensal */}
              <div className="pt-3 border-t border-line/60">
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-line/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-ink">
                    <RefreshCw className="w-3.5 h-3.5 text-brand" />
                    <span>Débito Automático Mensal</span>
                  </div>
                  <p className="text-[11px] text-ink-soft leading-relaxed">
                    Deseja cadastrar seu cartão uma única vez para não se preocupar em pagar todo mês? O Mercado Pago cuida da renovação automática.
                  </p>
                  <button
                    type="button"
                    disabled={subscribingCard}
                    onClick={handleSubscribeCard}
                    className="w-full py-2 px-3 rounded-xl border border-line hover:border-brand bg-white text-xs font-semibold text-ink hover:text-brand flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-brand" />
                    <span>{subscribingCard ? 'Conectando ao Mercado Pago...' : 'Ativar Débito Automático no Cartão'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com botão de simulação Sandbox para homologação */}
        <div className="p-5 bg-stone-50 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-ink-soft flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 text-brand animate-spin" />
            <span>Aguardando confirmação bancária...</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Botão de Verificação Proativa Imediata */}
            <button
              type="button"
              disabled={verifying}
              onClick={handleVerifyPayment}
              className="w-full sm:w-auto px-4 py-2.5 rounded-full border border-brand bg-brand-tint/60 hover:bg-brand-tint text-brand text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              title="Consulta imediatamente o status no Mercado Pago caso o webhook tenha demorado"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
              <span>{verifying ? 'Consultando...' : 'Já fiz o PIX, verificar agora'}</span>
            </button>

            {/* Botão de teste Sandbox / Homologação (Oculto em produção para clientes do salão) */}
            {canSimulate && (
              <button
                type="button"
                disabled={simulating}
                onClick={handleSimulatePayment}
                className="w-full sm:w-auto px-4 py-2.5 rounded-full border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                title="Dispara a compensação imediata para fins de homologação e demonstração"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{simulating ? 'Compensando...' : 'Simular Baixa (Sandbox)'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalPagamentoPixSaaS;
