import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';

const AssinaturaSaaS = () => {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [gatewayConfig, setGatewayConfig] = useState(null);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    // Busca a configuração global de pagamento para saber se o sistema aceita pagamento
    const fetchPlatformSettings = async () => {
      try {
        const data = await api.settings.getPaymentGateway();
        if (data) {
          setGatewayConfig(data);
        }
      } catch (err) {
        console.error('Erro ao buscar gateway', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchInvoices = async () => {
      if (!tenant) return;
      try {
        const data = await api.invoices.list(tenant.id);
        if (data) setInvoices(data);
      } catch (err) {
        console.error('Erro ao buscar faturas', err);
      }
    };
    
    fetchPlatformSettings();
    fetchInvoices();
  }, [tenant]);

  if (!tenant) return null;

  const pendingInvoice = invoices.find(inv => inv.status === 'pending');
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');

  return (
    <div className="flex flex-col gap-xl max-w-[800px] animate-fade-in-up">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Minha Assinatura</h1>
        <p className="font-body-md text-secondary">Acompanhe seu plano atual e gerencie os pagamentos do sistema.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        {/* Status do Plano */}
        <div className="bg-surface rounded-2xl p-lg border border-surface-variant shadow-[0_4px_20px_rgba(0,0,0,0.04)] relative overflow-hidden">
          {/* Decoração Lateral */}
          <div className={`absolute left-0 top-0 bottom-0 w-2 ${tenant.status === 'active' ? 'bg-[#10b981]' : 'bg-error'}`}></div>
          
          <h3 className="font-headline-sm text-headline-sm mb-4">Plano Atual</h3>
          <div className="flex flex-col gap-2 mb-6">
            <span className="text-[12px] uppercase tracking-wider text-secondary font-label-md">Status</span>
            {tenant.status === 'active' ? (
              <span className="flex items-center gap-2 text-[#10b981] font-label-md">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Ativo e Regular
              </span>
            ) : (
              <span className="flex items-center gap-2 text-error font-label-md">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                Pagamento Pendente
              </span>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            <span className="text-[12px] uppercase tracking-wider text-secondary font-label-md">Valor Mensal</span>
            <div className="flex items-baseline gap-1">
              <span className="font-label-md text-secondary">R$</span>
              <span className="font-display-md text-primary">{Number(tenant.plan_price || 0).toFixed(2).replace('.', ',')}</span>
              <span className="font-label-md text-secondary">/mês</span>
            </div>
          </div>
        </div>

        {/* Módulo de Pagamento */}
        <div className="bg-surface rounded-2xl p-lg border border-surface-variant shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <h3 className="font-headline-sm text-headline-sm mb-2">Fatura Aberta</h3>
            {pendingInvoice ? (
              <p className="text-body-md text-secondary mb-6">Você tem uma fatura pendente ({pendingInvoice.reference_month}) no valor de R$ {Number(pendingInvoice.amount).toFixed(2).replace('.', ',')} com vencimento em {new Date(pendingInvoice.due_date).toLocaleDateString('pt-BR')}.</p>
            ) : (
              <p className="text-body-md text-secondary mb-6">Sua assinatura está em dia. Nenhuma fatura pendente no momento.</p>
            )}
          </div>
          
          {loading ? (
            <div className="text-secondary text-sm">Carregando dados de pagamento...</div>
          ) : pendingInvoice ? (
            gatewayConfig ? (
              <button className="w-full bg-primary text-on-primary py-3 rounded-full font-label-md flex justify-center items-center gap-2 hover:opacity-90 transition-opacity">
                <span className="material-symbols-outlined">qr_code_scanner</span>
                Pagar Fatura com Pix
              </button>
            ) : (
              <div className="p-3 bg-surface-container-low rounded-lg border border-surface-variant text-center">
                <p className="text-sm text-secondary">A plataforma está processando os meios de pagamento. Em breve você poderá pagar.</p>
              </div>
            )
          ) : (
            <div className="p-3 bg-[#10b981]/10 text-[#10b981] rounded-lg border border-[#10b981]/20 flex items-center justify-center gap-2 font-label-md">
              <span className="material-symbols-outlined">sentiment_very_satisfied</span>
              Tudo Pago!
            </div>
          )}
        </div>
      </div>

      {/* Histórico Real */}
      <div>
        <h3 className="font-headline-sm text-headline-sm mb-4 mt-6">Histórico de Pagamentos</h3>
        <div className="bg-surface border border-surface-variant rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-surface-variant bg-surface-container-lowest flex justify-between items-center text-secondary font-label-sm">
            <span>Período / Referência</span>
            <span>Status</span>
          </div>
          {paidInvoices.length === 0 ? (
            <div className="p-6 text-center text-secondary text-sm">Nenhum pagamento registrado.</div>
          ) : (
            paidInvoices.map(inv => (
              <div key={inv.id} className="p-4 border-b border-surface-variant flex justify-between items-center hover:bg-surface-container-lowest transition-colors cursor-default">
                <div className="flex flex-col">
                  <span className="font-label-md text-on-surface">{inv.reference_month}</span>
                  <span className="text-[12px] text-secondary">R$ {Number(inv.amount).toFixed(2).replace('.', ',')} • {inv.payment_method === 'manual' ? 'Baixa Manual' : 'Gateway'} • {new Date(inv.paid_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <span className="px-3 py-1 bg-[#10b981]/10 text-[#10b981] rounded-full text-[12px] font-label-md">Pago</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};

export default AssinaturaSaaS;
