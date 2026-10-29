import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { 
  Users, DollarSign, Wallet, ShieldCheck, AlertCircle, 
  CheckCircle2, XCircle, Clock, Copy, Check, MessageCircle, 
  ExternalLink, Sparkles, Filter, Plus, Edit, ToggleLeft, ToggleRight, X
} from 'lucide-react';
import { EstadoVazio } from '../../components/ui/EstadoVazio';

export default function ParceirosAdmin() {
  const { showSuccess, showError, confirm } = useNotification();

  // Estados Globais de Configuração do Programa
  const [settings, setSettings] = useState({ enabled: false, default_commission: 20 });
  const [savingSettings, setSavingSettings] = useState(false);

  // Estados de Dados
  const [resellers, setResellers] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payouts'); // 'payouts' | 'resellers'
  const [payoutFilter, setPayoutFilter] = useState('all'); // 'all' | 'pending' | 'paid' | 'rejected'

  // Modais
  const [payoutModal, setPayoutModal] = useState({ open: false, payout: null, action: 'paid', receipt_url: '', notes: '' });
  const [processingPayout, setProcessingPayout] = useState(false);
  const [newPartnerModal, setNewPartnerModal] = useState(false);
  const [newPartnerForm, setNewPartnerForm] = useState({ name: '', email: '', phone: '', referral_code: '', pix_key_type: 'cpf', pix_key: '', commission_rate: 20 });
  const [savingPartner, setSavingPartner] = useState(false);

  // Cópia
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    loadData();
  }, [payoutFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsRes, resellersRes, payoutsRes] = await Promise.all([
        api.superadmin.getResellerSettings(),
        api.superadmin.listResellers(),
        api.superadmin.listResellerPayouts(payoutFilter)
      ]);

      if (settingsRes) setSettings(settingsRes);
      if (resellersRes) setResellers(resellersRes);
      if (payoutsRes) setPayouts(payoutsRes);
    } catch (err) {
      console.error('Erro ao carregar dados do programa de parceiros:', err);
      showError('Falha ao carregar dados de parceiros.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e?.preventDefault?.();
    setSavingSettings(true);
    try {
      const res = await api.superadmin.updateResellerSettings(settings);
      setSettings(res.settings);
      showSuccess('Configurações do Programa de Parceiros salvas com sucesso!');
    } catch (err) {
      showError('Erro ao salvar configurações.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleStatus = async (reseller) => {
    const newStatus = reseller.status === 'active' ? 'suspended' : 'active';
    const confirmed = await confirm(
      newStatus === 'suspended' ? 'Suspender Parceiro?' : 'Reativar Parceiro?',
      `Deseja realmente ${newStatus === 'suspended' ? 'suspender' : 'reativar'} o parceiro ${reseller.name}?`
    );
    if (!confirmed) return;

    try {
      await api.superadmin.updateResellerStatus(reseller.id, newStatus);
      showSuccess(`Parceiro ${newStatus === 'suspended' ? 'suspenso' : 'reativado'} com sucesso!`);
      loadData();
    } catch (err) {
      showError('Falha ao alterar status do parceiro.');
    }
  };

  const handleProcessPayout = async (e) => {
    e.preventDefault();
    setProcessingPayout(true);
    try {
      await api.superadmin.processResellerPayout(payoutModal.payout.id, {
        action: payoutModal.action,
        receipt_url: payoutModal.receipt_url,
        notes: payoutModal.notes
      });
      showSuccess(payoutModal.action === 'paid' ? 'Saque marcado como PAGO!' : 'Saque RECUSADO com estorno de saldo.');
      setPayoutModal({ open: false, payout: null, action: 'paid', receipt_url: '', notes: '' });
      loadData();
    } catch (err) {
      showError(err.message || 'Erro ao processar saque.');
    } finally {
      setProcessingPayout(false);
    }
  };

  const handleCreatePartner = async (e) => {
    e.preventDefault();
    setSavingPartner(true);
    try {
      await api.superadmin.createReseller(newPartnerForm);
      showSuccess('Novo parceiro cadastrado com sucesso!');
      setNewPartnerModal(false);
      setNewPartnerForm({ name: '', email: '', phone: '', referral_code: '', pix_key_type: 'cpf', pix_key: '', commission_rate: settings.default_commission || 20 });
      loadData();
    } catch (err) {
      showError(err.message || 'Erro ao cadastrar parceiro.');
    } finally {
      setSavingPartner(false);
    }
  };

  const copyPixKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // KPIs
  const totalPartners = resellers.length;
  const totalSalonsBrought = resellers.reduce((sum, r) => sum + (r.total_referrals || 0), 0);
  const totalCommissionsEarned = resellers.reduce((sum, r) => sum + (r.total_commissions_earned || 0), 0);
  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const pendingPayoutAmount = pendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink flex items-center gap-2.5">
            <span className="material-symbols-outlined text-brand text-3xl">handshake</span>
            Parceiros & Programa de Revenda
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Controle de ativação global, acompanhamento de chaves PIX e autorização de saques de comissões.
          </p>
        </div>

        <button
          onClick={() => setNewPartnerModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Convidar Parceiro Manualmente
        </button>
      </div>

      {/* Card de Controle Global e Sustentabilidade Financeira */}
      <div className="p-6 rounded-2xl bg-surface border border-line shadow-xs">
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-line">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                settings.enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
              }`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-ink text-base">
                    Programa de Indicação e Revenda Público
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    settings.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {settings.enabled ? 'ATIVADO' : 'DESATIVADO (Recomendado na Fase Inicial)'}
                  </span>
                </div>
                <p className="text-xs text-ink-muted mt-1 max-w-3xl">
                  {settings.enabled 
                    ? 'O programa está aberto publicamente. Visitantes veem o link "Parceiros" na Landing Page e podem se cadastrar livremente.'
                    : 'O programa está fechado para o público geral. Protege seu fluxo de caixa contra custos de 1 mês grátis mútuo. Apenas parceiros cadastrados manualmente por você no painel podem indicar novos salões.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                className="cursor-pointer transition hover:opacity-80"
                title={settings.enabled ? 'Desativar programa' : 'Ativar programa'}
              >
                {settings.enabled ? (
                  <ToggleRight className="w-10 h-10 text-brand" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-ink-muted" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-semibold text-ink whitespace-nowrap">
                Taxa de Comissão Padrão:
              </label>
              <div className="relative w-28">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.default_commission}
                  onChange={(e) => setSettings(prev => ({ ...prev, default_commission: Number(e.target.value) }))}
                  className="w-full px-3 py-1.5 rounded-lg border border-line bg-bg text-sm font-semibold text-ink text-right pr-7"
                />
                <span className="absolute right-2.5 top-1.5 text-xs text-ink-muted font-bold">%</span>
              </div>
              <span className="text-xs text-ink-muted">recorrente todo mês sobre mensalidades ativas</span>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-ink hover:bg-black text-white text-xs font-bold transition disabled:opacity-50"
            >
              {savingSettings ? 'Salvando...' : 'Salvar Preferências'}
            </button>
          </div>
        </form>
      </div>

      {/* Grid de 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface border border-line shadow-xs">
          <div className="flex items-center justify-between text-xs text-ink-muted font-semibold uppercase tracking-wider mb-2">
            <span>Parceiros Ativos</span>
            <Users className="w-4 h-4 text-brand" />
          </div>
          <div className="text-2xl font-display font-bold text-ink">
            {totalPartners}
          </div>
          <div className="text-[11px] text-ink-muted mt-1">
            Consultores e parceiros cadastrados
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-line shadow-xs">
          <div className="flex items-center justify-between text-xs text-ink-muted font-semibold uppercase tracking-wider mb-2">
            <span>Salões Conquistados</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-display font-bold text-ink">
            {totalSalonsBrought}
          </div>
          <div className="text-[11px] text-ink-muted mt-1">
            Indicações convertidas
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-line shadow-xs">
          <div className="flex items-center justify-between text-xs text-ink-muted font-semibold uppercase tracking-wider mb-2">
            <span>Comissões Geradas</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-display font-bold text-ink">
            R$ {totalCommissionsEarned.toFixed(2)}
          </div>
          <div className="text-[11px] text-ink-muted mt-1">
            Total histórico de comissões
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-xs transition ${
          pendingPayouts.length > 0 
            ? 'bg-amber-50/60 border-amber-300' 
            : 'bg-surface border-line'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-2">
            <span className={pendingPayouts.length > 0 ? 'text-amber-800' : 'text-ink-muted'}>
              Saques Pendentes PIX
            </span>
            <Wallet className={`w-4 h-4 ${pendingPayouts.length > 0 ? 'text-amber-600' : 'text-ink-muted'}`} />
          </div>
          <div className={`text-2xl font-display font-bold ${pendingPayouts.length > 0 ? 'text-amber-900' : 'text-ink'}`}>
            R$ {pendingPayoutAmount.toFixed(2)}
          </div>
          <div className="text-[11px] text-ink-muted mt-1">
            {pendingPayouts.length} solicitação(ões) aguardando repasse
          </div>
        </div>
      </div>

      {/* Abas de Navegação */}
      <div className="flex border-b border-line gap-6">
        <button
          onClick={() => setActiveTab('payouts')}
          className={`pb-3 font-semibold text-sm transition relative ${
            activeTab === 'payouts'
              ? 'text-brand border-b-2 border-brand -mb-px'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          Solicitações de Saque PIX
          {pendingPayouts.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              {pendingPayouts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('resellers')}
          className={`pb-3 font-semibold text-sm transition relative ${
            activeTab === 'resellers'
              ? 'text-brand border-b-2 border-brand -mb-px'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          Parceiros & Chaves PIX ({resellers.length})
        </button>
      </div>

      {/* Conteúdo da Aba 1: Saques PIX */}
      {activeTab === 'payouts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-muted">Filtrar status:</span>
              <select
                value={payoutFilter}
                onChange={(e) => setPayoutFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-line bg-surface text-xs font-semibold text-ink"
              >
                <option value="all">Todos os Saques</option>
                <option value="pending">Apenas Pendentes</option>
                <option value="paid">Apenas Pagos</option>
                <option value="rejected">Recusados</option>
              </select>
            </div>
          </div>

          <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-xs">
            {payouts.length === 0 ? (
              <div className="p-8 text-center">
                <EstadoVazio
                  icone={Wallet}
                  titulo="Nenhum saque encontrado"
                  descricao="Nenhuma solicitação de saque PIX registrada com o filtro selecionado."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-ink">
                  <thead className="text-xs uppercase bg-bg text-ink-muted border-b border-line">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Parceiro</th>
                      <th className="py-3 px-4 font-semibold">Valor</th>
                      <th className="py-3 px-4 font-semibold">Chave PIX</th>
                      <th className="py-3 px-4 font-semibold">Data Pedido</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-bg/50 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-ink">{p.reseller_name}</div>
                          <div className="text-xs text-ink-muted">{p.reseller_email} • {p.referral_code}</div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-ink text-base">
                          R$ {p.amount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-bg px-2 py-1 rounded border border-line select-all">
                              {p.pix_key}
                            </span>
                            <button
                              onClick={() => copyPixKey(p.pix_key)}
                              className="text-ink-muted hover:text-brand transition"
                              title="Copiar Chave PIX"
                            >
                              {copiedKey === p.pix_key ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <span className="text-[10px] text-ink-muted uppercase">Tipo: {p.pix_key_type}</span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-ink-muted">
                          {new Date(p.requested_at).toLocaleDateString('pt-BR')} às {new Date(p.requested_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            p.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {p.status === 'paid' ? 'Pago ✓' : p.status === 'pending' ? 'Pendente' : 'Recusado'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {p.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setPayoutModal({ open: true, payout: p, action: 'paid', receipt_url: '', notes: '' })}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                              >
                                Pagar PIX
                              </button>
                              <button
                                onClick={() => setPayoutModal({ open: true, payout: p, action: 'rejected', receipt_url: '', notes: '' })}
                                className="px-2.5 py-1.5 rounded-lg bg-surface border border-line hover:border-rose-300 text-rose-600 text-xs font-semibold transition"
                              >
                                Recusar
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-ink-muted">Concluído</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 2: Lista Completa de Parceiros e Chaves PIX */}
      {activeTab === 'resellers' && (
        <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-xs">
          {resellers.length === 0 ? (
            <div className="p-8 text-center">
              <EstadoVazio
                icone={Users}
                titulo="Nenhum parceiro cadastrado"
                descricao="Cadastre parceiros manualmente ou ative o programa para permitir novos cadastros."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-ink">
                <thead className="text-xs uppercase bg-bg text-ink-muted border-b border-line">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Parceiro</th>
                    <th className="py-3 px-4 font-semibold">Código Ref</th>
                    <th className="py-3 px-4 font-semibold">Chave PIX Cadastrada</th>
                    <th className="py-3 px-4 font-semibold">Comissão</th>
                    <th className="py-3 px-4 font-semibold">Salões (Ativos/Total)</th>
                    <th className="py-3 px-4 font-semibold">Saldo a Pagar</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {resellers.map((r) => (
                    <tr key={r.id} className="hover:bg-bg/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-ink">{r.name}</div>
                        <div className="text-xs text-ink-muted flex items-center gap-2">
                          <span>{r.email}</span>
                          {r.phone && (
                            <a
                              href={`https://wa.me/55${r.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:underline inline-flex items-center gap-0.5"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                              {r.phone}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs bg-bg px-2 py-1 rounded font-bold text-brand border border-line">
                          {r.referral_code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {r.pix_key ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs bg-bg px-2 py-1 rounded border border-line select-all">
                              {r.pix_key}
                            </span>
                            <button
                              onClick={() => copyPixKey(r.pix_key)}
                              className="text-ink-muted hover:text-brand transition"
                              title="Copiar PIX"
                            >
                              {copiedKey === r.pix_key ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-muted italic">Não informada</span>
                        )}
                        <span className="text-[10px] text-ink-muted uppercase block">Tipo: {r.pix_key_type || 'cpf'}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-ink">
                        {r.commission_rate}%
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="font-bold text-emerald-600">{r.active_salons} ativos</span> / {r.total_referrals} total
                      </td>
                      <td className="py-3.5 px-4 font-bold text-ink">
                        R$ {r.balance_available.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          r.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {r.status === 'active' ? 'Ativo' : 'Suspenso'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleStatus(r)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            r.status === 'active'
                              ? 'bg-bg hover:bg-rose-50 text-rose-600 border border-line'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {r.status === 'active' ? 'Suspender' : 'Reativar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de Processamento de Saque */}
      {payoutModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl w-full max-w-md p-6 border border-line shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="font-bold text-ink text-base">
                {payoutModal.action === 'paid' ? 'Confirmar Repasse PIX' : 'Recusar Solicitação de Saque'}
              </h3>
              <button
                onClick={() => setPayoutModal({ open: false, payout: null, action: 'paid', receipt_url: '', notes: '' })}
                className="text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-bg rounded-xl border border-line text-xs space-y-1">
              <div>Parceiro: <strong>{payoutModal.payout?.reseller_name}</strong></div>
              <div>Valor: <strong className="text-emerald-700 text-sm">R$ {payoutModal.payout?.amount.toFixed(2)}</strong></div>
              <div>Chave PIX: <span className="font-mono select-all font-semibold">{payoutModal.payout?.pix_key}</span> ({payoutModal.payout?.pix_key_type})</div>
            </div>

            <form onSubmit={handleProcessPayout} className="space-y-3">
              {payoutModal.action === 'paid' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Link ou Código do Comprovante PIX (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: https://comprovante... ou ID do banco"
                      value={payoutModal.receipt_url}
                      onChange={(e) => setPayoutModal(prev => ({ ...prev, receipt_url: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-sm text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Observações internas
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Anotações de auditoria..."
                      value={payoutModal.notes}
                      onChange={(e) => setPayoutModal(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-sm text-ink"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Motivo da Recusa (obrigatório)
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Informe o motivo para registro e estorno..."
                    value={payoutModal.notes}
                    onChange={(e) => setPayoutModal(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-sm text-ink"
                  />
                  <p className="text-[11px] text-ink-muted mt-1">
                    Ao recusar, o saldo de R$ {payoutModal.payout?.amount.toFixed(2)} será revertido automaticamente para a conta do parceiro.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayoutModal({ open: false, payout: null, action: 'paid', receipt_url: '', notes: '' })}
                  className="flex-1 py-2.5 rounded-xl border border-line bg-surface text-xs font-semibold text-ink"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingPayout}
                  className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-xs ${
                    payoutModal.action === 'paid'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {processingPayout ? 'Processando...' : payoutModal.action === 'paid' ? 'Confirmar Pagamento' : 'Confirmar Recusa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cadastro Manual de Parceiro */}
      {newPartnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl w-full max-w-md p-6 border border-line shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="font-bold text-ink text-base">
                Cadastrar Parceiro Convidado
              </h3>
              <button onClick={() => setNewPartnerModal(false)} className="text-ink-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePartner} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do parceiro"
                  value={newPartnerForm.name}
                  onChange={(e) => setNewPartnerForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-sm text-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">E-mail *</label>
                  <input
                    type="email"
                    required
                    placeholder="email@parceiro.com"
                    value={newPartnerForm.email}
                    onChange={(e) => setNewPartnerForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-sm text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Telefone/WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 98888-7777"
                    value={newPartnerForm.phone}
                    onChange={(e) => setNewPartnerForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-sm text-ink"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Código de Indicação Exclusivo</label>
                <input
                  type="text"
                  placeholder="Ex: CONSULTORVIP"
                  value={newPartnerForm.referral_code}
                  onChange={(e) => setNewPartnerForm(prev => ({ ...prev, referral_code: e.target.value.toUpperCase().replace(/\s+/g, '') }))}
                  className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-sm text-ink uppercase font-mono"
                />
                <span className="text-[11px] text-ink-muted mt-0.5 block">Se deixar em branco, geraremos automaticamente.</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Tipo PIX</label>
                  <select
                    value={newPartnerForm.pix_key_type}
                    onChange={(e) => setNewPartnerForm(prev => ({ ...prev, pix_key_type: e.target.value }))}
                    className="w-full px-2 py-2 rounded-xl border border-line bg-surface text-xs text-ink"
                  >
                    <option value="cpf">CPF</option>
                    <option value="cnpj">CNPJ</option>
                    <option value="email">E-mail</option>
                    <option value="phone">Telefone</option>
                    <option value="random">Aleatória</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-ink mb-1">Chave PIX</label>
                  <input
                    type="text"
                    placeholder="Chave para receber repasse"
                    value={newPartnerForm.pix_key}
                    onChange={(e) => setNewPartnerForm(prev => ({ ...prev, pix_key: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-sm text-ink"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Taxa de Comissão (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newPartnerForm.commission_rate}
                  onChange={(e) => setNewPartnerForm(prev => ({ ...prev, commission_rate: Number(e.target.value) }))}
                  className="w-24 px-3 py-2 rounded-xl border border-line bg-surface text-sm text-ink"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setNewPartnerModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-line bg-surface text-xs font-semibold text-ink"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPartner}
                  className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {savingPartner ? 'Cadastrando...' : 'Cadastrar Parceiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
