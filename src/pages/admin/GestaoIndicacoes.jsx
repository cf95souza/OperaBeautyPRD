import React, { useState, useEffect, useCallback } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useNotification } from '../../context/NotificationProvider';
import { api } from '../../lib/api';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';
import {
  Users,
  Gift,
  Share2,
  Settings,
  TrendingUp,
  Award,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Sliders,
  DollarSign,
  AlertCircle
} from 'lucide-react';

export const GestaoIndicacoes = () => {
  const { tenant } = useTenant();
  const { showSuccess, showError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  // Estados do formulário de configurações
  const [settingsForm, setSettingsForm] = useState({
    active: true,
    rewardType: 'wallet',
    referrerReward: 15.0,
    refereeReward: 15.0,
    trigger: 'on_first_completed_appointment',
    customMessage: ''
  });

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await api.referral.getAdminDashboard({
        page,
        limit: 20,
        search: searchTerm
      });
      setDashboardData(data);
      if (data?.settings) {
        setSettingsForm({
          active: data.settings.active !== false,
          rewardType: data.settings.rewardType || 'wallet',
          referrerReward: data.settings.referrerReward || 15.0,
          refereeReward: data.settings.refereeReward || 15.0,
          trigger: data.settings.trigger || 'on_first_completed_appointment',
          customMessage: data.settings.customMessage || ''
        });
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard de indicações:', err);
      showError('Não foi possível carregar as informações do programa de indicação.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [page, searchTerm, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.referral.updateAdminSettings({
        active: settingsForm.active,
        rewardType: settingsForm.rewardType,
        referrerReward: parseFloat(settingsForm.referrerReward) || 0,
        refereeReward: parseFloat(settingsForm.refereeReward) || 0,
        trigger: settingsForm.trigger,
        customMessage: settingsForm.customMessage
      });
      showSuccess('Regras do programa Indique e Ganhe salvas com sucesso!');
      loadData(true);
    } catch (err) {
      console.error('Erro ao salvar regras:', err);
      showError(err.message || 'Erro ao salvar regras.');
    } finally {
      setSavingSettings(false);
    }
  };

  const kpis = dashboardData?.kpis || {
    totalReferrals: 0,
    convertedReferrals: 0,
    pendingReferrals: 0,
    conversionRate: 0,
    totalRewardsDistributed: 0
  };

  const topReferrers = dashboardData?.topReferrers || [];
  const referrals = dashboardData?.referrals || [];
  const pagination = dashboardData?.pagination || { page: 1, pages: 1, total: 0 };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-[26px] font-semibold text-ink tracking-tight">
              Indique e Ganhe
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-tint text-brand border border-brand/20">
              <Sparkles size={11} />
              Crescimento Orgânico
            </span>
          </div>
          <p className="font-sans text-[13px] text-ink-soft mt-1">
            Recompense suas clientes mais fiéis por atrair novas clientes para o salão.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadData(false)}
          disabled={loading}
          className="h-10 px-4 rounded-full border border-line bg-surface hover:bg-brand-tint/20 text-ink font-sans text-[13px] font-medium flex items-center gap-2 transition-all shrink-0 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* 4 KPIs Executivos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-line rounded-card p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Total de Indicações
            </span>
            <div className="w-8 h-8 rounded-full bg-brand-tint text-brand flex items-center justify-center">
              <Share2 size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display text-[26px] font-bold text-ink lining-nums block">
              {kpis.totalReferrals}
            </span>
            <span className="text-[11px] text-ink-soft mt-0.5 block">
              Links compartilhados
            </span>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-card p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Amigas Convertidas
            </span>
            <div className="w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display text-[26px] font-bold text-success lining-nums block">
              {kpis.convertedReferrals}
            </span>
            <span className="text-[11px] text-ink-soft mt-0.5 block">
              1º atendimento concluído
            </span>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-card p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Taxa de Conversão
            </span>
            <div className="w-8 h-8 rounded-full bg-gold/10 text-gold flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display text-[26px] font-bold text-ink lining-nums block">
              {kpis.conversionRate}%
            </span>
            <span className="text-[11px] text-ink-soft mt-0.5 block">
              Indicações que viraram clientes
            </span>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-card p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Créditos Distribuídos
            </span>
            <div className="w-8 h-8 rounded-full bg-brand-tint text-brand flex items-center justify-center">
              <Gift size={16} />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-display text-[26px] font-bold text-brand lining-nums block">
              {formatCurrency(kpis.totalRewardsDistributed)}
            </span>
            <span className="text-[11px] text-ink-soft mt-0.5 block">
              Bônus pagos em carteira
            </span>
          </div>
        </div>
      </div>

      {/* Grid Principal: Configurações & Embaixadoras */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Configurações das Regras (2 Colunas) */}
        <div className="lg:col-span-2 bg-surface border border-line rounded-card p-5 shadow-card">
          <div className="flex items-center gap-2.5 pb-4 border-b border-line/60">
            <div className="w-9 h-9 rounded-full bg-brand-tint text-brand flex items-center justify-center">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="font-display text-[18px] font-semibold text-ink">
                Regras e Recompensas do Programa
              </h2>
              <p className="text-[12px] text-ink-soft">
                Defina como as amigas são recompensadas e quando o benefício é liberado.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="pt-4 space-y-4">
            {/* Switch Ativar/Pausar */}
            <div className="flex items-center justify-between p-3.5 bg-surface-soft border border-line rounded-[16px]">
              <div>
                <span className="font-sans text-[14px] font-semibold text-ink block">
                  Programa Ativo
                </span>
                <span className="text-[12px] text-ink-soft block">
                  Quando ativo, o chip "Indicar uma amiga" fica disponível na Home das clientes.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.active}
                  onChange={(e) => setSettingsForm({ ...settingsForm, active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-line after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand" />
              </label>
            </div>

            {/* Grid dos Valores de Recompensa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Bônus para quem Indica (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft text-[14px]">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={settingsForm.referrerReward}
                    onChange={(e) => setSettingsForm({ ...settingsForm, referrerReward: e.target.value })}
                    className="w-full h-11 pl-10 pr-3 rounded-[14px] border border-line bg-surface text-ink font-sans text-[14px] focus:outline-none focus:border-brand"
                  />
                </div>
                <span className="text-[11px] text-ink-soft mt-1 block">
                  Creditado na carteira da cliente que indicou.
                </span>
              </div>

              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Presente de Boas-Vindas para a Amiga (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft text-[14px]">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={settingsForm.refereeReward}
                    onChange={(e) => setSettingsForm({ ...settingsForm, refereeReward: e.target.value })}
                    className="w-full h-11 pl-10 pr-3 rounded-[14px] border border-line bg-surface text-ink font-sans text-[14px] focus:outline-none focus:border-brand"
                  />
                </div>
                <span className="text-[11px] text-ink-soft mt-1 block">
                  Benefício para a nova cliente usar no salão.
                </span>
              </div>
            </div>

            {/* Gatilho de Liberação do Benefício */}
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                Momento da Liberação da Recompensa
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`p-3.5 rounded-[16px] border cursor-pointer flex items-start gap-3 transition-colors ${
                    settingsForm.trigger === 'on_first_completed_appointment'
                      ? 'border-brand bg-brand-tint/30 text-ink'
                      : 'border-line bg-surface hover:bg-surface-soft'
                  }`}
                >
                  <input
                    type="radio"
                    name="referral_trigger"
                    value="on_first_completed_appointment"
                    checked={settingsForm.trigger === 'on_first_completed_appointment'}
                    onChange={(e) => setSettingsForm({ ...settingsForm, trigger: e.target.value })}
                    className="mt-0.5 text-brand"
                  />
                  <div>
                    <span className="font-sans text-[13px] font-bold block">
                      Após o 1º Atendimento Concluído
                    </span>
                    <span className="text-[11px] text-ink-soft block mt-0.5 leading-snug">
                      Recomendado. Evita fraudes de criação de contas e só paga quando a nova cliente comparece.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3.5 rounded-[16px] border cursor-pointer flex items-start gap-3 transition-colors ${
                    settingsForm.trigger === 'on_signup'
                      ? 'border-brand bg-brand-tint/30 text-ink'
                      : 'border-line bg-surface hover:bg-surface-soft'
                  }`}
                >
                  <input
                    type="radio"
                    name="referral_trigger"
                    value="on_signup"
                    checked={settingsForm.trigger === 'on_signup'}
                    onChange={(e) => setSettingsForm({ ...settingsForm, trigger: e.target.value })}
                    className="mt-0.5 text-brand"
                  />
                  <div>
                    <span className="font-sans text-[13px] font-bold block">
                      Imediatamente no Cadastro
                    </span>
                    <span className="text-[11px] text-ink-soft block mt-0.5 leading-snug">
                      Libera o crédito assim que a amiga se cadastra no aplicativo.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Mensagem Padrão do WhatsApp */}
            <div>
              <label className="block text-[12px] font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                Mensagem Padrão do WhatsApp (Opcional)
              </label>
              <textarea
                rows={2}
                value={settingsForm.customMessage}
                onChange={(e) => setSettingsForm({ ...settingsForm, customMessage: e.target.value })}
                placeholder="Ex: Olá! Acesse pelo meu link do {salao} e ganhe {bonus} de presente no seu primeiro atendimento: {link}"
                className="w-full p-3 rounded-[14px] border border-line bg-surface text-ink font-sans text-[13px] focus:outline-none focus:border-brand"
              />
              <span className="text-[11px] text-ink-soft mt-1 block">
                Variáveis suportadas: <code className="bg-surface-soft px-1 rounded">{'{salao}'}</code>, <code className="bg-surface-soft px-1 rounded">{'{bonus}'}</code>, <code className="bg-surface-soft px-1 rounded">{'{link}'}</code>.
              </span>
            </div>

            {/* Botão Salvar */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="h-11 px-6 rounded-full bg-brand hover:bg-brand-dark text-white font-sans text-[13px] font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                {savingSettings ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Salvar Configurações</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Vitrine de Top Embaixadoras (1 Coluna) */}
        <div className="bg-surface border border-line rounded-card p-5 shadow-card flex flex-col">
          <div className="flex items-center gap-2.5 pb-4 border-b border-line/60">
            <div className="w-9 h-9 rounded-full bg-gold/15 text-gold flex items-center justify-center">
              <Award size={18} />
            </div>
            <div>
              <h2 className="font-display text-[18px] font-semibold text-ink">
                Top Embaixadoras
              </h2>
              <p className="text-[12px] text-ink-soft">
                Clientes que mais trazem novas clientes para você.
              </p>
            </div>
          </div>

          <div className="pt-4 flex-grow space-y-3">
            {topReferrers.length === 0 ? (
              <div className="py-12 text-center text-ink-soft space-y-2">
                <Users size={32} className="mx-auto text-line" />
                <p className="text-[13px]">Nenhuma indicação registrada ainda.</p>
              </div>
            ) : (
              topReferrers.map((emb, idx) => (
                <div
                  key={emb.id}
                  className="flex items-center justify-between p-3 rounded-[16px] bg-surface-soft border border-line/60 hover:border-line transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-tint text-brand font-display font-bold text-[13px] flex items-center justify-center shrink-0">
                      {idx + 1}º
                    </div>
                    <div>
                      <span className="font-sans text-[14px] font-semibold text-ink block leading-tight">
                        {emb.name}
                      </span>
                      <span className="text-[11px] text-ink-soft block mt-0.5">
                        {emb.phone || 'Sem telefone'} · Cód: {emb.referralCode}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-sans text-[13px] font-bold text-success block">
                      {emb.totalConverted} {emb.totalConverted === 1 ? 'amiga' : 'amigas'}
                    </span>
                    <span className="text-[11px] text-brand block mt-0.5">
                      {formatCurrency(emb.totalEarned)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Histórico de Indicações */}
      <div className="bg-surface border border-line rounded-card shadow-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-[18px] font-semibold text-ink">
              Histórico de Indicações
            </h3>
            <p className="text-[12px] text-ink-soft">
              Acompanhe cada nova cliente indicada e o status da recompensa.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nome ou código..."
              className="w-full h-9 pl-9 pr-3 rounded-full border border-line bg-surface text-ink font-sans text-[13px] focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface-soft/60">
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  Data
                </th>
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  Quem Indicou
                </th>
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  Amiga Indicada
                </th>
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  Código
                </th>
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  Status
                </th>
                <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-ink-soft text-right">
                  Bônus
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-soft">
                    <Users size={28} className="mx-auto text-line mb-2" />
                    <p className="text-[13px]">Nenhuma indicação encontrada para os filtros aplicados.</p>
                  </td>
                </tr>
              ) : (
                referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-surface-soft/40 transition-colors">
                    <td className="py-3.5 px-4 font-sans text-[13px] text-ink-soft whitespace-nowrap">
                      {formatDate(ref.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-sans text-[13px] font-semibold text-ink block">
                        {ref.referrer?.name}
                      </span>
                      <span className="text-[11px] text-ink-soft block">
                        {ref.referrer?.phone}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-sans text-[13px] font-semibold text-ink block">
                        {ref.referee?.name}
                      </span>
                      <span className="text-[11px] text-ink-soft block">
                        {ref.referee?.phone}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[13px] font-bold text-ink whitespace-nowrap">
                      {ref.referralCode}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {ref.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-success/10 text-success border border-success/20">
                          <CheckCircle2 size={12} />
                          Concluído (1º Atendimento)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
                          <Clock size={12} />
                          Aguardando Visita
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-sans text-[13px] font-bold text-ink text-right whitespace-nowrap">
                      {formatCurrency(ref.referrerReward)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-line flex items-center justify-between">
            <span className="text-[12px] text-ink-soft">
              Página {pagination.page} de {pagination.pages} ({pagination.total} registros)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 px-3 rounded-full border border-line bg-surface text-ink text-[12px] disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                className="h-8 px-3 rounded-full border border-line bg-surface text-ink text-[12px] disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestaoIndicacoes;
