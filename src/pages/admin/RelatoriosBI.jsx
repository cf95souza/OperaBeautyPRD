import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Printer, 
  MessageCircle, 
  Calendar, 
  Award, 
  Crown, 
  ArrowUpRight, 
  Wallet, 
  RefreshCw,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart3,
  Flame
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const RelatoriosBI = () => {
  const { tenant } = useTenant();
  const { showSuccess, showError } = useNotification();

  // Estados de navegação e filtros
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(currentTabParam === 'ociosidade' ? 'bi' : 'impacto');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'ociosidade' && activeTab !== 'bi') {
      setActiveTab('bi');
    } else if (tabParam === 'impacto' && activeTab !== 'impacto') {
      setActiveTab('impacto');
    }
  }, [searchParams]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab === 'bi' ? 'ociosidade' : 'impacto' });
  };

  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(null); // { year, month }

  // Dados do Relatório de Impacto (D9 P1)
  const [impactReport, setImpactReport] = useState(null);

  // Dados de BI Legados / Ociosidade
  const [retention, setRetention] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [heatmap, setHeatmap] = useState([]);

  // Estado do Modal de Envio por WhatsApp
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [sendingWa, setSendingWa] = useState(false);

  useEffect(() => {
    if (tenant?.id) {
      loadInitialData();
    }
  }, [tenant]);

  const loadInitialData = async (overridePeriod = null) => {
    setLoading(true);
    try {
      const periodToFetch = overridePeriod || selectedPeriod || {};
      
      const [impactData, retData, rankData, heatData] = await Promise.allSettled([
        api.reports.getMonthlyImpact(periodToFetch),
        api.reports.getRetention(),
        api.reports.getStaffRanking(),
        api.reports.getHeatmap()
      ]);

      if (impactData.status === 'fulfilled' && impactData.value) {
        setImpactReport(impactData.value);
        if (!selectedPeriod && impactData.value.period) {
          setSelectedPeriod({
            year: impactData.value.period.year,
            month: impactData.value.period.month
          });
        }
      }

      if (retData.status === 'fulfilled') setRetention(retData.value);
      if (rankData.status === 'fulfilled') setRanking(rankData.value || []);
      if (heatData.status === 'fulfilled') setHeatmap(heatData.value || []);

    } catch (err) {
      console.error('Erro ao carregar dados dos relatórios:', err);
      showError('Erro ao carregar dados dos relatórios.');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = async (monthItem) => {
    const newPeriod = { year: monthItem.year, month: monthItem.month };
    setSelectedPeriod(newPeriod);
    setLoading(true);
    try {
      const updatedImpact = await api.reports.getMonthlyImpact(newPeriod);
      setImpactReport(updatedImpact);
    } catch (err) {
      console.error(err);
      showError('Erro ao atualizar relatório do mês selecionado.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = async (e) => {
    e.preventDefault();
    if (!waPhone.trim()) {
      showError('Informe um número de telefone com DDD válido.');
      return;
    }

    setSendingWa(true);
    try {
      const res = await api.reports.sendMonthlyImpactWhatsApp({
        year: selectedPeriod?.year,
        month: selectedPeriod?.month,
        phone: waPhone.trim()
      });

      showSuccess(res.message || 'Resumo do relatório enviado com sucesso no WhatsApp!');
      setIsWaModalOpen(false);
      setWaPhone('');
    } catch (err) {
      console.error('Erro ao enviar relatório por WhatsApp:', err);
      showError(err.message || 'Não foi possível enviar o relatório via WhatsApp.');
    } finally {
      setSendingWa(false);
    }
  };

  const getDayName = (dayNumber) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    return days[dayNumber] || '';
  };

  const getHeatmapColor = (count) => {
    if (count === 0) return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60';
    if (count <= 2) return 'bg-amber-50 text-amber-800 border border-amber-200/60';
    if (count <= 5) return 'bg-orange-50 text-orange-800 border border-orange-200/60';
    return 'bg-rose-100 text-rose-800 border border-rose-200';
  };

  const impact = impactReport?.impact || {
    time_saved: { hours_saved: 0, online_appointments_count: 0 },
    no_shows_prevented: { estimated_prevented_no_shows: 0, prevented_loss_revenue: 0 },
    financials: { total_revenue: 0, average_ticket: 0, growth_rate_vs_last_month: 0, completed_count: 0 },
    clients: { total_unique_clients: 0, new_clients_count: 0, returning_clients_count: 0, retention_rate: 0 },
    club: { active_subscriptions_count: 0, recurring_monthly_revenue: 0 },
    cashback: { total_cashback_generated: 0, total_cashback_redeemed: 0, redemption_rate: 0 },
    top_services: [],
    star_staff: null
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto pb-16 px-4 sm:px-6 animate-fade-in print:p-0 print:max-w-none">
      
      {/* Estilos dedicados para impressão limpa (A4) */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #1c1917 !important;
            font-size: 11pt !important;
          }
          nav, aside, header, .no-print {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .shadow-2xs, .shadow-xs, .shadow-sm, .shadow-md, .shadow-lg {
            box-shadow: none !important;
          }
          .rounded-\\[24px\\], .rounded-\\[22px\\] {
            border-radius: 8px !important;
          }
          .bg-stone-900 {
            background-color: #2b1d22 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .bg-brand {
            background-color: #7C3A4D !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Cabeçalho da Página com Ações */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line/60 pb-6 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-tint/60 text-brand">
              <Sparkles className="w-3.5 h-3.5" />
              Retorno & Inteligência Executiva
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            Impacto OperaBeauty & BI
          </h1>
          <p className="text-sm font-medium text-stone-500 mt-1">
            Métricas que comprovam o retorno do investimento, horas poupadas e crescimento do seu salão.
          </p>
        </div>

        {/* Botões de Ação do Topo */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => loadInitialData(selectedPeriod)}
            disabled={loading}
            className="p-2.5 rounded-full border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand' : ''}`} />
          </button>

          <button
            onClick={() => setIsWaModalOpen(true)}
            className="px-4 py-2.5 rounded-full border border-stone-300 text-stone-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50 text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>Enviar no WhatsApp</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-full bg-brand text-white hover:brightness-110 text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Seletor de Abas (no-print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 no-print">
        {/* Alternância de Abas */}
        <div className="inline-flex p-1 bg-stone-100/80 rounded-2xl border border-stone-200/60 shadow-2xs">
          <button
            onClick={() => handleTabChange('impacto')}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'impacto'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${activeTab === 'impacto' ? 'text-brand' : 'text-stone-400'}`} />
            Impacto Mensal do SaaS
          </button>
          <button
            onClick={() => handleTabChange('bi')}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'bi'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <BarChart3 className={`w-4 h-4 ${activeTab === 'bi' ? 'text-brand' : 'text-stone-400'}`} />
            Ociosidade & Equipe BI
          </button>
        </div>

        {/* Pílulas de Seleção de Mês */}
        {impactReport?.available_months?.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
            <span className="text-xs font-semibold text-stone-400 mr-1 hidden sm:inline flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Mês:
            </span>
            {impactReport.available_months.map((m) => {
              const isSelected = selectedPeriod?.year === m.year && selectedPeriod?.month === m.month;
              return (
                <button
                  key={`${m.year}-${m.month}`}
                  onClick={() => handlePeriodChange(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-white border border-stone-200 text-stone-600 hover:border-brand hover:text-brand'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cabeçalho Oficial do Salão exclusivo para Impressão */}
      <div className="hidden print:block mb-6 border-b border-stone-300 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-stone-900">{tenant?.name || 'OperaBeauty Studio'}</h1>
            <p className="text-xs text-stone-600">Relatório Executivo de Retorno & Impacto Operacional</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-brand uppercase tracking-wider">Período de Referência</p>
            <p className="text-sm font-bold text-stone-900">{impactReport?.period?.label || 'Mês Selecionado'}</p>
          </div>
        </div>
      </div>

      {/* ABA 1: IMPACTO OPERABEAUTY */}
      {activeTab === 'impacto' && (
        <div className="space-y-8">
          
          {/* Hero Banner Editorial Comemorativo */}
          <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-stone-900 via-[#311c24] to-[#1e1317] text-white p-7 sm:p-9 shadow-md">
            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-brand-tint mb-4">
                <Sparkles className="w-3.5 h-3.5 text-brand-tint" />
                Balanço de Eficiência — {impactReport?.period?.label || 'Outubro de 2026'}
              </div>

              <h2 className="font-display text-2xl sm:text-4xl font-bold leading-tight tracking-tight">
                Em {impactReport?.period?.label ? impactReport.period.label.toLowerCase() : 'outubro de 2026'}, o OperaBeauty poupou{' '}
                <span className="text-brand-tint underline decoration-brand-tint/40 underline-offset-4">
                  {impact.time_saved?.hours_saved || 0} horas
                </span>{' '}
                da sua equipe e protegeu{' '}
                <span className="text-brand-tint">
                  {formatCurrency(impact.no_shows_prevented.prevented_loss_revenue)}
                </span>{' '}
                em faturamento.
              </h2>

              <p className="text-stone-300 text-sm sm:text-base mt-4 font-normal leading-relaxed">
                Graças ao agendamento online inteligente e aos lembretes automáticos multicanal, seu salão operou com autonomia, garantindo agenda cheia e menos faltas.
              </p>
            </div>

            {/* Ornamento sutil no fundo */}
            <div className="absolute -right-12 -bottom-16 w-72 h-72 rounded-full bg-brand/20 blur-3xl pointer-events-none" />
            <div className="absolute right-10 top-1/2 -translate-y-1/2 hidden lg:block opacity-20 pointer-events-none">
              <Sparkles className="w-56 h-56 text-brand-tint stroke-[0.8]" />
            </div>
          </div>

          {/* Grid dos 4 Pilares Fundamentais de Impacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* Pilar 1: Tempo Economizado */}
            <div className="rounded-[22px] bg-white border border-line p-6 shadow-2xs hover:border-brand/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5 stroke-[2]" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Tempo da Equipe</span>
                <div className="mt-2 mb-1 flex items-baseline gap-1">
                  <h3 className="font-display text-3xl font-bold text-stone-900 tabular-nums">
                    {impact.time_saved.hours_saved}h
                  </h3>
                  <span className="text-xs font-semibold text-stone-500">poupadas</span>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed mt-2">
                  <strong>{impact.time_saved.online_appointments_count}</strong> agendamentos feitos pelos próprios clientes pelo portal, sem interrupções manuais no WhatsApp.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                <span>Média industrial</span>
                <span className="font-semibold text-stone-600">~10 min / agendamento</span>
              </div>
            </div>

            {/* Pilar 2: Faturamento Protegido */}
            <div className="rounded-[22px] bg-white border border-line p-6 shadow-2xs hover:border-brand/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5 stroke-[2]" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Faltas Evitadas</span>
                <div className="mt-2 mb-1">
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-emerald-700 tabular-nums">
                    {formatCurrency(impact.no_shows_prevented.prevented_loss_revenue)}
                  </h3>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed mt-2">
                  Aproximadamente <strong>{impact.no_shows_prevented.estimated_prevented_no_shows}</strong> faltas evitadas com lembretes automáticos de 24h e 2h antes do atendimento.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                <span>Proteção de caixa</span>
                <span className="font-semibold text-emerald-600">Recuperação ativa</span>
              </div>
            </div>

            {/* Pilar 3: Receita & Crescimento */}
            <div className="rounded-[22px] bg-white border border-line p-6 shadow-2xs hover:border-brand/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-brand-tint/60 text-brand flex items-center justify-center mb-4">
                  <TrendingUp className="w-5 h-5 stroke-[2]" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Receita Realizada</span>
                <div className="mt-2 mb-1">
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 tabular-nums">
                    {formatCurrency(impact.financials.total_revenue)}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  {impact.financials.growth_rate_vs_last_month >= 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <TrendingUp className="w-3 h-3" />
                      +{impact.financials.growth_rate_vs_last_month}%
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                      <TrendingDown className="w-3 h-3" />
                      {impact.financials.growth_rate_vs_last_month}%
                    </span>
                  )}
                  <span className="text-xs text-stone-500">vs mês anterior</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                <span>Ticket Médio</span>
                <span className="font-semibold text-stone-800">{formatCurrency(impact.financials.average_ticket)}</span>
              </div>
            </div>

            {/* Pilar 4: Retenção e Clientes */}
            <div className="rounded-[22px] bg-white border border-line p-6 shadow-2xs hover:border-brand/40 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
                  <Users className="w-5 h-5 stroke-[2]" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Fidelização</span>
                <div className="mt-2 mb-1 flex items-baseline gap-1">
                  <h3 className="font-display text-3xl font-bold text-stone-900 tabular-nums">
                    {impact.clients.retention_rate}%
                  </h3>
                  <span className="text-xs font-semibold text-stone-500">recorrentes</span>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed mt-2">
                  <strong>{impact.clients.returning_clients_count}</strong> clientes retornaram no mês e <strong>{impact.clients.new_clients_count}</strong> novos clientes foram cadastrados.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                <span>Total no mês</span>
                <span className="font-semibold text-stone-800">{impact.clients.total_unique_clients} clientes</span>
              </div>
            </div>

          </div>

          {/* Seção 2: Clube de Assinaturas & Cashback */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card Clube de Assinaturas */}
            <div className="bg-white rounded-[24px] border border-line p-6 sm:p-7 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
                      <Award className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-lg text-stone-900">Clube do Salão</h4>
                      <p className="text-xs text-stone-500">Receita Recorrente Previsível (MRR)</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
                    {impact.club.active_subscriptions_count} ativas
                  </span>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed mb-5">
                  Planos de assinatura garantem faturamento previsível antes do mês começar e aumentam a frequência média de visitas em até 3x.
                </p>

                <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider block">Receita Recorrente</span>
                    <span className="text-xs text-purple-700">Membros assinantes</span>
                  </div>
                  <span className="font-display text-2xl font-bold text-purple-900">
                    {formatCurrency(impact.club.recurring_monthly_revenue)}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-line/60 flex items-center justify-between text-xs text-stone-500">
                <span>Retenção de assinantes</span>
                <span className="font-semibold text-stone-800">Alta fidelidade</span>
              </div>
            </div>

            {/* Card Carteira & Cashback */}
            <div className="bg-white rounded-[24px] border border-line p-6 sm:p-7 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Wallet className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-lg text-stone-900">Carteira & Cashback</h4>
                      <p className="text-xs text-stone-500">Créditos de Recompensa</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                    {impact.cashback.redemption_rate}% resgatados
                  </span>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed mb-5">
                  O saldo de cashback incentiva o cliente a retornar exclusivamente ao seu salão para utilizar os créditos acumulados.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/60">
                    <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">Gerado</span>
                    <span className="font-display text-lg font-bold text-stone-800">
                      {formatCurrency(impact.cashback.total_cashback_generated)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                    <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Resgatado</span>
                    <span className="font-display text-lg font-bold text-emerald-800">
                      {formatCurrency(impact.cashback.total_cashback_redeemed)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-line/60 flex items-center justify-between text-xs text-stone-500">
                <span>Engajamento da Carteira</span>
                <span className="font-semibold text-emerald-700">Retorno Garantido</span>
              </div>
            </div>

          </div>

          {/* Seção 3: Profissional Destaque & Top Serviços */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Profissional Destaque do Mês */}
            <div className="lg:col-span-5 bg-gradient-to-br from-white via-white to-brand-tint/20 rounded-[24px] border border-line p-6 sm:p-7 shadow-2xs">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Destaque do Mês
                </span>
              </div>

              {impact.star_staff ? (
                <div>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-brand text-white flex items-center justify-center font-display font-bold text-2xl shadow-xs">
                      {impact.star_staff.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold text-stone-900">
                        {impact.star_staff.name}
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {impact.star_staff.specialty || 'Profissional da Equipe'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-4 bg-white rounded-2xl border border-line/60 mb-4 shadow-2xs">
                    <div>
                      <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">Atendimentos</span>
                      <span className="font-display text-2xl font-bold text-stone-900">
                        {impact.star_staff.completed_count}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">Faturamento</span>
                      <span className="font-display text-xl font-bold text-brand">
                        {formatCurrency(impact.star_staff.revenue)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-500 leading-relaxed">
                    Parabéns pelo excelente desempenho e contribuição com a satisfação dos clientes no mês!
                  </p>
                </div>
              ) : (
                <div className="py-12 text-center text-stone-400 text-xs">
                  Nenhum atendimento concluído no período para calcular o destaque.
                </div>
              )}
            </div>

            {/* Top 5 Serviços Mais Demandados */}
            <div className="lg:col-span-7 bg-white rounded-[24px] border border-line p-6 sm:p-7 shadow-2xs">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-line/60">
                <div>
                  <h3 className="font-display font-bold text-lg text-stone-900">Top Serviços Mais Lucrativos</h3>
                  <p className="text-xs text-stone-500">Serviços que mais geraram faturamento no mês</p>
                </div>
                <Flame className="w-5 h-5 text-brand" />
              </div>

              {impact.top_services?.length > 0 ? (
                <div className="space-y-3">
                  {impact.top_services.map((srv, idx) => {
                    const srvKey = srv.id || srv.service_id || `srv-${srv.name || idx}-${idx}`;
                    return (
                      <div 
                        key={srvKey}
                        className="p-3.5 rounded-2xl bg-stone-50/70 border border-stone-200/50 hover:bg-stone-50 transition-colors flex items-center justify-between"
                      >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                          idx === 0 
                            ? 'bg-amber-100 text-amber-800' 
                            : idx === 1 
                            ? 'bg-stone-200 text-stone-700' 
                            : 'bg-stone-100 text-stone-500'
                        }`}>
                          {idx + 1}º
                        </span>
                        <div>
                          <p className="text-sm font-bold text-stone-900">{srv.name}</p>
                          <span className="text-xs text-stone-500">{srv.count} atendimentos</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-display font-bold text-sm text-stone-900 block">
                          {formatCurrency(srv.total_revenue)}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          méd. {formatCurrency(srv.average_price)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              ) : (
                <div className="py-12 text-center text-stone-400 text-xs">
                  Nenhum serviço registrado no período.
                </div>
              )}
            </div>

          </div>

          {/* Rodapé Editorial com Certificação OperaBeauty */}
          <div className="p-6 rounded-[24px] bg-brand-tint/30 border border-brand/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-serif font-bold text-base shrink-0">
                OB
              </div>
              <div>
                <p className="font-bold text-stone-900">Relatório de Impacto OperaBeauty™</p>
                <p className="text-stone-500">Dados gerados e certificados pelo ecossistema do seu salão.</p>
              </div>
            </div>
            <div className="text-right sm:text-right text-stone-400 text-[11px]">
              Emitido em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

        </div>
      )}

      {/* ABA 2: OCIOSIDADE & EQUIPE BI (Visualização BI) */}
      {activeTab === 'bi' && (
        <div className="space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Widget Retenção Donut */}
            <div className="bg-white rounded-[24px] border border-line p-6 sm:p-7 shadow-2xs flex flex-col">
              <h3 className="font-display font-bold text-lg text-stone-900 mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-brand" /> Taxa de Retenção de Clientes
              </h3>
              
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative w-48 h-48 mb-6">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <path
                      className="text-stone-100"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                    />
                    <path
                      className="text-brand transition-all duration-1000 ease-out"
                      strokeDasharray={`${retention?.retainedPercentage || 0}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-4xl font-bold text-stone-900">{retention?.retainedPercentage || 0}%</span>
                    <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mt-1">Retidos</span>
                  </div>
                </div>
                
                <div className="flex justify-center gap-8 w-full border-t border-stone-100 pt-5">
                  <div className="text-center">
                    <p className="text-xs text-stone-400 mb-1">Novos (1ª Visita)</p>
                    <p className="font-display font-bold text-2xl text-stone-800">{retention?.new || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-stone-400 mb-1">Recorrentes</p>
                    <p className="font-display font-bold text-2xl text-brand">{retention?.retained || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Widget Ranking de Equipe */}
            <div className="bg-white rounded-[24px] border border-line p-6 sm:p-7 shadow-2xs">
              <h3 className="font-display font-bold text-lg text-stone-900 mb-6 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" /> Desempenho da Equipe
              </h3>
              
              <div className="overflow-hidden">
                {ranking.length === 0 ? (
                  <p className="text-stone-400 text-center py-12 text-xs">Nenhum dado de equipe no período.</p>
                ) : (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {ranking.map((staff, idx) => {
                      const staffKey = staff.id || staff.staff_id || `staff-${staff.name || idx}`;
                      const staffName = staff.name || staff.staff_name || 'Profissional';
                      const completed = staff.completed ?? staff.completed_appointments ?? 0;
                      const cancellationRate = staff.cancellation_rate ?? 0;
                      const staffRevenue = Number(staff.revenue ?? staff.total_revenue ?? 0);
                      return (
                        <div key={staffKey} className="flex items-center justify-between bg-stone-50/70 p-4 rounded-2xl border border-stone-200/50">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                              idx === 0 
                                ? 'bg-amber-100 text-amber-800' 
                                : idx === 1 
                                ? 'bg-stone-200 text-stone-700' 
                                : 'bg-stone-100 text-stone-500'
                            }`}>
                              {idx + 1}º
                            </div>
                            <div>
                              <p className="font-bold text-sm text-stone-900">{staffName}</p>
                              <div className="flex items-center gap-3 mt-0.5 text-xs text-stone-500">
                                <span>{completed} atend.</span>
                                <span className={cancellationRate > 15 ? 'text-rose-600 font-bold' : ''}>
                                  {cancellationRate}% cancel.
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] text-stone-400 block">Faturamento</span>
                            <span className="font-display font-bold text-sm text-brand">
                              {formatCurrency(staffRevenue)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Widget Mapa de Calor (Ociosidade da Agenda) */}
          <div className="bg-white rounded-[24px] border border-line p-6 sm:p-7 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-display font-bold text-lg text-stone-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-brand" /> Mapa de Ociosidade da Agenda
                </h3>
                <p className="text-xs text-stone-500 mt-1">Identifique horários com menor procura para criar promoções relâmpago.</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300"></div> Ocioso</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-200 border border-rose-300"></div> Ocupado</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse min-w-[640px]">
                <thead>
                  <tr>
                    <th className="p-2 font-semibold text-stone-400 text-xs border-b border-stone-200/60">Hora</th>
                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                      <th key={`heatmap-th-day-${day}`} className="p-2 font-semibold text-stone-600 text-xs border-b border-stone-200/60">
                        {getDayName(day)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...Array(13)].map((_, i) => {
                    const hour = i + 8;
                    return (
                      <tr key={`heatmap-row-${hour}`}>
                        <td className="p-2 text-xs text-stone-400 font-medium">{hour}:00</td>
                        {[1, 2, 3, 4, 5, 6, 7].map(day => {
                          const dataPoint = heatmap.find(h => h.day === day && h.hour === hour);
                          const count = dataPoint ? dataPoint.count : 0;
                          return (
                            <td key={`heatmap-cell-${day}-${hour}`} className="p-1">
                              <div className={`rounded-xl py-2 text-xs font-bold ${getHeatmapColor(count)} transition-all hover:scale-105 cursor-default`}>
                                {count} agend.
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Modal Rápido de Disparo de WhatsApp */}
      {isWaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in no-print">
          <div className="relative w-full max-w-md bg-white rounded-[24px] border border-line shadow-2xl p-6 sm:p-7 overflow-hidden">
            <button
              onClick={() => setIsWaModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 transition-colors p-1 rounded-full hover:bg-stone-100 cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-stone-900">Enviar Resumo no WhatsApp</h3>
                <p className="text-xs text-stone-500">{impactReport?.period?.label}</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 mb-5 leading-relaxed">
              Você receberá uma mensagem formatada com o balanço de horas poupadas, faltas evitadas e faturamento do período.
            </p>

            <form onSubmit={handleSendWhatsApp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Número do WhatsApp do Gestor (com DDD)
                </label>
                <input
                  type="text"
                  placeholder="(11) 98765-4321"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsWaModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendingWa}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{sendingWa ? 'Enviando...' : 'Enviar Agora'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default RelatoriosBI;
