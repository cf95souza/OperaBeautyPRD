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
  RefreshCw
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationProvider';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';

/**
 * Modal de Pagamento PIX e Regularização do SaaS (Fase 44 - D18 P1)
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
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [checking, setChecking] = useState(false);

  const isSuperAdmin = session?.role === 'superadmin';
  const isSandbox = Boolean(billingStatus?.is_sandbox);
  // O botão de simulação só aparece se estiver em ambiente Sandbox ou para o SuperAdmin da plataforma
  const canSimulate = isSandbox || isSuperAdmin;

  // Polling automático enquanto o modal estiver aberto para detectar baixa imediata
  useEffect(() => {
    if (!isOpen || !invoice || !invoice.id) return;

    const interval = setInterval(async () => {
      try {
        const status = await api.invoices.getBillingStatus();
        const currentInv = status?.active_invoices?.find(inv => inv.id === invoice.id);
        
        // Se a fatura não estiver mais ativa ou não tiver faturas pendentes, foi paga!
        if (!currentInv || currentInv.status === 'paid' || status?.active_invoices?.length === 0) {
          showSuccess('Pagamento confirmado com sucesso! Sua assinatura foi regularizada.');
          if (onPaymentSuccess) onPaymentSuccess();
          onClose();
        }
      } catch (err) {
        // Silencioso no polling
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, invoice, onClose, onPaymentSuccess, showSuccess]);

  if (!isOpen || !invoice) return null;

  const handleCopy = async () => {
    if (!invoice.pix_copy_paste) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(invoice.pix_copy_paste);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = invoice.pix_copy_paste;
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

  const handleSimulatePayment = async () => {
    setSimulating(true);
    try {
      const res = await api.invoices.simulatePayment(invoice.id);
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
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand">
                  Fatura SaaS • {invoice.reference_month}
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
                Pagar com PIX
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
                Baixa automática e compensação em segundos pelo Banco Central.
              </span>
            </div>
          )}

          {/* Destaque do Valor e Vencimento */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-line flex items-baseline justify-between">
            <div>
              <span className="text-xs text-ink-soft font-medium uppercase tracking-wider">Valor da mensalidade</span>
              <p className="text-xs text-ink-soft mt-0.5">
                Vencimento: <strong className="text-ink">{formatDate(invoice.due_date)}</strong>
              </p>
            </div>
            <div className="text-right">
              <span className="font-display font-bold text-2xl sm:text-3xl text-brand tabular-nums">
                {formatCurrency(invoice.amount)}
              </span>
            </div>
          </div>

          {/* QR Code PIX Central */}
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-line shadow-2xs">
            <div className="p-2.5 rounded-xl bg-white border border-stone-200 shadow-xs mb-3">
              {invoice.pix_qr_code ? (
                <img 
                  src={invoice.pix_qr_code} 
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
                value={invoice.pix_copy_paste || ''}
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

        {/* Rodapé com botão de simulação Sandbox para homologação */}
        <div className="p-5 bg-stone-50 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-ink-soft flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 text-brand animate-spin" />
            <span>Aguardando confirmação bancária...</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
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
