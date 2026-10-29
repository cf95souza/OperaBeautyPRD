import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import {
  Sparkles,
  Send,
  Cake,
  Clock,
  HeartHandshake,
  MessageCircle,
  Tag,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Save,
  HelpCircle,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Percent
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const GestaoCampanhas = () => {
  const { tenant_slug } = useParams();
  const { tenant } = useTenant();
  const { showSuccess, showError, showWarning } = useNotification();

  const [loading, setLoading] = useState(true);
  const [runningScan, setRunningScan] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({
    total_sent_month: 0,
    birthday_sent: 0,
    maintenance_sent: 0,
    reactivation_sent: 0,
    coupons_generated: 0,
    opt_out_count: 0
  });
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('campaigns'); // 'campaigns' | 'history'

  useEffect(() => {
    if (tenant?.id) {
      fetchData();
    }
  }, [tenant]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await api.campaigns.list();
      setCampaigns(data.campaigns || []);
      setStats(data.stats || {});

      const logs = await api.campaigns.getHistory({ limit: 50 });
      setHistory(Array.isArray(logs) ? logs : []);
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar dados das campanhas automáticas.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCampaignField = (type, field, value) => {
    setCampaigns(prev =>
      prev.map(c => (c.type === type ? { ...c, [field]: value } : c))
    );
  };

  const handleSaveCampaign = async (campaign) => {
    try {
      setSavingCampaign(campaign.type);
      const updated = await api.campaigns.update(campaign.type, {
        name: campaign.name,
        message_template: campaign.message_template,
        discount_type: campaign.discount_type,
        discount_value: parseFloat(campaign.discount_value) || 0,
        coupon_validity_days: parseInt(campaign.coupon_validity_days, 10) || 15,
        min_days_inactive: parseInt(campaign.min_days_inactive, 10) || 60,
        send_channel: campaign.send_channel || 'whatsapp',
        cooldown_days: parseInt(campaign.cooldown_days, 10) || 60,
        is_active: campaign.is_active
      });

      setCampaigns(prev =>
        prev.map(c => (c.type === campaign.type ? updated : c))
      );
      showSuccess(`Campanha "${campaign.name}" salva com sucesso!`);
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao salvar configurações da campanha.');
    } finally {
      setSavingCampaign(null);
    }
  };

  const handleRunScanNow = async () => {
    if (!window.confirm('Deseja iniciar a varredura e disparo de mensagens das campanhas ativas para todas as clientes elegíveis agora?')) {
      return;
    }

    try {
      setRunningScan(true);
      const res = await api.campaigns.run();
      const r = res.results || {};
      const totalSent = (r.birthday_sent || 0) + (r.maintenance_sent || 0) + (r.reactivation_sent || 0);

      showSuccess(`Varredura concluída! ${totalSent} mensagem(ns) disparada(s) com sucesso.`);
      fetchData();
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao executar varredura de campanhas.');
    } finally {
      setRunningScan(false);
    }
  };

  const campaignIcons = {
    birthday: <Cake className="w-5 h-5 text-pink-600" />,
    maintenance: <Clock className="w-5 h-5 text-brand" />,
    reactivation_60d: <HeartHandshake className="w-5 h-5 text-amber-600" />
  };

  const campaignBadges = {
    birthday: 'Aniversariantes do Dia',
    maintenance: 'Retoque / Manutenção',
    reactivation_60d: 'Clientes Inativas'
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 border-3 border-brand/20 border-t-brand rounded-full animate-spin" />
        <p className="text-xs text-secondary font-medium tracking-wide">Carregando campanhas automáticas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 animate-fade-in-up space-y-8">
      {/* Cabeçalho Rosé Editorial */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-brand/10 text-brand">
              Retenção & Fidelização (D15)
            </span>
            <span className="text-xs text-secondary flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand" />
              Deduplicação & Opt-Out Ativos
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-on-surface">
            Campanhas Automáticas de Retenção
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            Fidelize clientes automaticamente no aniversário, lembretes de retoque e reativação com cupons promocionais.
          </p>
        </div>

        <button
          onClick={handleRunScanNow}
          disabled={runningScan}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand text-white text-xs sm:text-sm font-semibold hover:bg-brand-hover active:scale-95 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{runningScan ? 'Executando varredura...' : 'Disparar Varredura Agora'}</span>
        </button>
      </div>

      {/* 4 KPIs Executivos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-line rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Disparos no Mês</span>
            <Send className="w-4 h-4 text-brand" />
          </div>
          <p className="font-serif text-2xl font-bold text-on-surface tabular-nums">
            {stats.total_sent_month}
          </p>
          <p className="text-[11px] text-secondary">Mensagens entregues</p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Aniversários</span>
            <Cake className="w-4 h-4 text-pink-600" />
          </div>
          <p className="font-serif text-2xl font-bold text-pink-600 tabular-nums">
            {stats.birthday_sent}
          </p>
          <p className="text-[11px] text-secondary">Impactados no mês</p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Retornos / Manutenção</span>
            <Clock className="w-4 h-4 text-brand" />
          </div>
          <p className="font-serif text-2xl font-bold text-brand tabular-nums">
            {stats.maintenance_sent}
          </p>
          <p className="text-[11px] text-secondary">Avisos de retoque</p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-secondary">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Reativações</span>
            <Tag className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-serif text-2xl font-bold text-amber-600 tabular-nums">
            {stats.reactivation_sent}
          </p>
          <p className="text-[11px] text-secondary">{stats.coupons_generated} cupons gerados</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line gap-4">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`flex items-center gap-2 pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'campaigns'
              ? 'border-brand text-brand'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Configuração das Campanhas ({campaigns.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'history'
              ? 'border-brand text-brand'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Histórico de Disparos & Consumo ({history.length})</span>
        </button>
      </div>

      {/* ABA 1: CONFIGURAÇÃO DE CAMPANHAS */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className={`bg-white border rounded-[22px] p-6 shadow-2xs space-y-6 transition-all ${
                camp.is_active ? 'border-line' : 'border-line/60 bg-stone-50/40 opacity-80'
              }`}
            >
              {/* Cabeçalho do Card da Campanha */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center shrink-0">
                    {campaignIcons[camp.type] || <Sparkles className="w-5 h-5 text-brand" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-serif text-lg font-bold text-on-surface">{camp.name}</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-secondary">
                        {campaignBadges[camp.type]}
                      </span>
                    </div>
                    <p className="text-xs text-secondary mt-0.5">
                      {camp.type === 'birthday' && 'Dispara automaticamente no dia do aniversário da cliente.'}
                      {camp.type === 'maintenance' && 'Dispara quando atinge o intervalo de retorno (maintenance_days) do procedimento.'}
                      {camp.type === 'reactivation_60d' && `Dispara quando a cliente está inativa há mais de ${camp.min_days_inactive} dias.`}
                    </p>
                  </div>
                </div>

                {/* Switch de Ativação e Botão Salvar */}
                <div className="flex items-center gap-4 self-end sm:self-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-semibold text-secondary">
                      {camp.is_active ? 'Campanha Ativa' : 'Pausada'}
                    </span>
                    <input
                      type="checkbox"
                      checked={camp.is_active}
                      onChange={(e) => handleUpdateCampaignField(camp.type, 'is_active', e.target.checked)}
                      className="w-5 h-5 rounded text-brand focus:ring-brand accent-brand cursor-pointer"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => handleSaveCampaign(camp)}
                    disabled={savingCampaign === camp.type}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingCampaign === camp.type ? 'Salvando...' : 'Salvar'}</span>
                  </button>
                </div>
              </div>

              {/* Grid de Parâmetros da Campanha */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                {/* Parâmetros do Cupom e Regras */}
                <div className="sm:col-span-5 space-y-4">
                  {camp.type === 'reactivation_60d' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1">
                        Régua de Inatividade (Dias)
                      </label>
                      <input
                        type="number"
                        min="15"
                        max="365"
                        value={camp.min_days_inactive}
                        onChange={(e) => handleUpdateCampaignField(camp.type, 'min_days_inactive', e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-line rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand"
                      />
                      <span className="text-[10px] text-secondary">Considera clientes sem visitas há mais de X dias.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1">
                        Desconto do Cupom
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={camp.discount_value}
                          onChange={(e) => handleUpdateCampaignField(camp.type, 'discount_value', e.target.value)}
                          className="w-full px-3 py-2 bg-stone-50 border border-line rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-secondary font-bold">
                          {camp.discount_type === 'percentage' ? '%' : 'R$'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1">
                        Tipo de Desconto
                      </label>
                      <select
                        value={camp.discount_type}
                        onChange={(e) => handleUpdateCampaignField(camp.type, 'discount_type', e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-line rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand"
                      >
                        <option value="percentage">Porcentagem (%)</option>
                        <option value="fixed">Valor Fixo (R$)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1">
                        Validade do Cupom
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={camp.coupon_validity_days}
                        onChange={(e) => handleUpdateCampaignField(camp.type, 'coupon_validity_days', e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-line rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand"
                      />
                      <span className="text-[10px] text-secondary">Dias corridos para uso.</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider mb-1">
                        Carência (Cooldown)
                      </label>
                      <input
                        type="number"
                        min="7"
                        max="365"
                        value={camp.cooldown_days}
                        onChange={(e) => handleUpdateCampaignField(camp.type, 'cooldown_days', e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border border-line rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand"
                      />
                      <span className="text-[10px] text-secondary">Evita disparos repetidos.</span>
                    </div>
                  </div>
                </div>

                {/* Editor do Texto da Mensagem e Preview */}
                <div className="sm:col-span-7 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-secondary uppercase tracking-wider">
                      Texto da Mensagem
                    </label>
                    <span className="text-[10px] text-secondary font-mono">
                      Tags: {'{{cliente}}, {{salao}}, {{cupom}}, {{desconto}}, {{link}}'}
                    </span>
                  </div>

                  <textarea
                    rows={4}
                    value={camp.message_template}
                    onChange={(e) => handleUpdateCampaignField(camp.type, 'message_template', e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-line rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:border-brand transition-colors font-sans resize-none leading-relaxed"
                  />

                  {/* Prévia do Balão de Mensagem */}
                  <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-900">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Prévia do WhatsApp</span>
                    </div>
                    <p className="text-xs text-emerald-950/90 leading-relaxed font-sans bg-white p-3 rounded-xl border border-emerald-200/80 shadow-2xs whitespace-pre-wrap">
                      {camp.message_template
                        .replaceAll('{{cliente}}', 'Maria')
                        .replaceAll('{{salao}}', tenant?.name || 'Studio da Tha')
                        .replaceAll('{{servico}}', 'Design de Sobrancelhas')
                        .replaceAll('{{cupom}}', camp.type === 'birthday' ? 'NIVER15-A1B2' : 'VOLTA10-X9Y8')
                        .replaceAll('{{desconto}}', camp.discount_type === 'percentage' ? `${camp.discount_value}%` : `R$ ${camp.discount_value}`)
                        .replaceAll('{{link}}', `${window.location.origin}/${tenant_slug}/agendamento`)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ABA 2: HISTÓRICO DE DISPAROS & AUDITORIA */}
      {activeTab === 'history' && (
        <div className="bg-white border border-line rounded-[22px] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <h2 className="font-serif text-lg font-bold text-on-surface">Histórico de Disparos de Marketing</h2>
              <p className="text-xs text-secondary">Registro completo de mensagens enviadas, cupons gerados e deduplicações.</p>
            </div>
            <span className="text-xs text-secondary tabular-nums">
              Total: {history.length} registro(s)
            </span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-12 text-secondary">
              <MessageCircle className="w-10 h-10 text-secondary/40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-on-surface">Nenhum disparo registrado ainda</p>
              <p className="text-xs text-secondary mt-1">As campanhas disparadas automaticamente aparecerão registradas aqui com carimbo de data e hora.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[11px] font-semibold text-secondary uppercase tracking-wider">
                    <th className="py-2.5 px-3">Data / Hora</th>
                    <th className="py-2.5 px-3">Campanha</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Telefone</th>
                    <th className="py-2.5 px-3">Cupom</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {history.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-3 text-secondary whitespace-nowrap">
                        {format(new Date(log.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-on-surface">
                          {campaignBadges[log.campaign_type] || log.campaign_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-on-surface">
                        {log.client_name || 'Cliente'}
                      </td>
                      <td className="py-3 px-3 text-secondary tabular-nums">
                        {log.phone || '—'}
                      </td>
                      <td className="py-3 px-3">
                        {log.coupon_code ? (
                          <span className="px-2 py-0.5 rounded-md bg-brand/10 text-brand font-mono font-semibold text-[10px]">
                            {log.coupon_code}
                          </span>
                        ) : (
                          <span className="text-secondary/60 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {log.status === 'sent' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            Enviado
                          </span>
                        )}
                        {log.status === 'opt_out' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                            Opt-Out
                          </span>
                        )}
                        {log.status === 'skipped_cooldown' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Carência
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GestaoCampanhas;
