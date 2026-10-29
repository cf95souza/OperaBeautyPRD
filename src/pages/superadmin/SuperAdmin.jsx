import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import CreateTenantModal from '../../components/superadmin/CreateTenantModal';
import { formatCurrency } from '../../utils/formatters';

const SuperAdmin = () => {
  const navigate = useNavigate();

  // Estados principais
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState('month'); // 'month' | '3months' | 'year'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Métricas do SaaS
  const [metrics, setMetrics] = useState({
    total_tenants: 0,
    active_tenants: 0,
    suspended_tenants: 0,
    unique_clients: 0,
    earnings_paid: 0,
    earnings_pending: 0,
    mrr: 0,
    churn_rate: '0%',
    revenue_by_plan: [],
    attention_items: []
  });

  // Carregar dados na montagem e ao trocar período
  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [metricsData, tenantsData] = await Promise.all([
        api.superadmin.getDashboardMetrics(period),
        api.superadmin.listTenants()
      ]);

      if (metricsData) {
        setMetrics(metricsData);
      }

      if (tenantsData) {
        setTenants(tenantsData);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do painel do Super Admin:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtragem em tempo real pelo campo de busca
  const filteredTenants = useMemo(() => {
    if (!searchQuery.trim()) return tenants;
    const q = searchQuery.toLowerCase().trim();
    return tenants.filter(
      (t) =>
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.slug && t.slug.toLowerCase().includes(q)) ||
        (t.plan_name && t.plan_name.toLowerCase().includes(q))
    );
  }, [tenants, searchQuery]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-7xl mx-auto pb-10">
      
      {/* 1. TOPO: TÍTULO, SUBTÍTULO, SELETOR DE PERÍODO E NOVO SALÃO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl md:text-[34px] text-stone-900 leading-tight">
            Visão geral
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Desempenho e faturamento de todos os salões.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Seletor de Período em Pílula */}
          <div className="bg-white border border-stone-200/90 rounded-full p-1 flex items-center shadow-2xs">
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                period === 'month'
                  ? 'bg-[#7C3A4D] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => setPeriod('3months')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                period === '3months'
                  ? 'bg-[#7C3A4D] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              3 meses
            </button>
            <button
              type="button"
              onClick={() => setPeriod('year')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                period === 'year'
                  ? 'bg-[#7C3A4D] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Ano
            </button>
          </div>

          {/* Botão Primário: + Novo salão */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#7C3A4D] hover:bg-[#682F40] text-white font-medium text-xs md:text-sm px-5 py-2.5 rounded-full flex items-center gap-1.5 shadow-sm hover:shadow transition-all"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Novo salão</span>
          </button>
        </div>
      </div>

      {/* 2. GRADE DE 5 KPIS COMPACTOS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI 1: RECEITA RECORRENTE (MRR) */}
        <div className="bg-white rounded-[22px] border border-stone-200/80 p-5 shadow-2xs flex flex-col justify-between min-h-[136px]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            RECEITA RECORRENTE (MRR)
          </span>
          <div className="my-1">
            <div className="font-display font-bold text-2xl lg:text-[28px] text-stone-900 tabular-nums lining-nums leading-none">
              {formatCurrency(metrics.mrr || 0)}
            </div>
          </div>
          <div className="text-xs text-stone-500">
            {metrics.active_tenants || 0} {metrics.active_tenants === 1 ? 'salão pagante' : 'salões pagantes'}
          </div>
        </div>

        {/* KPI 2: SALÕES ATIVOS */}
        <div className="bg-white rounded-[22px] border border-stone-200/80 p-5 shadow-2xs flex flex-col justify-between min-h-[136px]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            SALÕES ATIVOS
          </span>
          <div className="my-1">
            <div className="font-display font-bold text-2xl lg:text-[28px] text-stone-900 tabular-nums leading-none">
              {metrics.active_tenants || 0}
            </div>
          </div>
          <div className="text-xs text-stone-500">
            Na plataforma
          </div>
        </div>

        {/* KPI 3: FATURAS PENDENTES (Regra 9.1.4: Neutro quando zero) */}
        <div className="bg-white rounded-[22px] border border-stone-200/80 p-5 shadow-2xs flex flex-col justify-between min-h-[136px]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            FATURAS PENDENTES
          </span>
          <div className="my-1">
            <div className={`font-display font-bold text-2xl lg:text-[28px] tabular-nums lining-nums leading-none ${
              (metrics.earnings_pending || 0) > 0 ? 'text-amber-800' : 'text-stone-900'
            }`}>
              {formatCurrency(metrics.earnings_pending || 0)}
            </div>
          </div>
          <div>
            {(metrics.earnings_pending || 0) === 0 ? (
              <span className="inline-block bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
                Tudo em dia
              </span>
            ) : (
              <span className="inline-block bg-amber-50 text-amber-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
                A regularizar
              </span>
            )}
          </div>
        </div>

        {/* KPI 4: CHURN DO MÊS */}
        <div className="bg-white rounded-[22px] border border-stone-200/80 p-5 shadow-2xs flex flex-col justify-between min-h-[136px]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            CHURN DO MÊS
          </span>
          <div className="my-1">
            <div className="font-display font-bold text-2xl lg:text-[28px] text-stone-900 tabular-nums leading-none">
              {metrics.churn_rate || '0%'}
            </div>
          </div>
          <div className="text-xs text-stone-500">
            {parseInt(metrics.churn_rate) > 0 
              ? (metrics.suspended_tenants === 1 ? '1 cancelamento' : `${metrics.suspended_tenants} cancelamentos`) 
              : 'Nenhum cancelamento'}
          </div>
        </div>

        {/* KPI 5: CLIENTES ÚNICOS */}
        <div className="bg-white rounded-[22px] border border-stone-200/80 p-5 shadow-2xs flex flex-col justify-between min-h-[136px]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            CLIENTES ÚNICOS
          </span>
          <div className="my-1">
            <div className="font-display font-bold text-2xl lg:text-[28px] text-stone-900 tabular-nums leading-none">
              {metrics.unique_clients || 0}
            </div>
          </div>
          <div className="text-xs text-stone-500">
            Sem duplicidade
          </div>
        </div>

      </section>

      {/* 3. CORPO PRINCIPAL (2 COLUNAS: SALÕES + CARDS LATERAIS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUNA ESQUERDA (TABELA DE SALÕES) */}
        <div className="lg:col-span-8 bg-white rounded-[24px] border border-stone-200/80 p-6 shadow-2xs">
          
          {/* Topo do Card de Salões: Título e Busca */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="font-display font-bold text-2xl text-stone-900">
              Salões
            </h2>
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-lg pointer-events-none">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar salão..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-50/80 border border-stone-200/80 rounded-full py-2 pl-10 pr-4 text-xs text-stone-800 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3A4D]/20 focus:border-[#7C3A4D] transition-all"
              />
            </div>
          </div>

          {/* Tabela de Salões */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-100 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                  <th className="pb-3 px-3">SALÃO</th>
                  <th className="pb-3 px-3">PLANO</th>
                  <th className="pb-3 px-3">MRR</th>
                  <th className="pb-3 px-3">FATURA</th>
                  <th className="pb-3 px-3">STATUS</th>
                  <th className="pb-3 px-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100/80">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-xs text-stone-400">
                      Carregando salões...
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-xs text-stone-400">
                      Nenhum salão encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => {
                    const initial = (t.name || 'S').trim().charAt(0).toUpperCase();
                    const isOverdue = Number(t.overdue_invoices_count) > 0;
                    const isSuspended = t.status === 'suspended' || t.status === 'inactive';

                    return (
                      <tr
                        key={t.id}
                        onClick={() => navigate(`/superadmin/tenants/${t.id}`)}
                        className="hover:bg-stone-50/70 cursor-pointer transition-colors group"
                      >
                        {/* Nome do Salão e Slug */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#F6E4E4] text-[#7C3A4D] flex items-center justify-center font-bold text-sm shrink-0 border border-rose-100">
                              {initial}
                            </div>
                            <div>
                              <div className="font-semibold text-sm text-stone-900 group-hover:text-[#7C3A4D] transition-colors">
                                {t.name}
                              </div>
                              <div className="text-xs text-stone-400 font-normal">
                                /{t.slug}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Plano */}
                        <td className="py-3.5 px-3">
                          <span className="inline-block bg-rose-50/70 border border-rose-200/50 text-rose-800 text-xs px-3 py-0.5 rounded-full font-medium">
                            {t.plan_name || 'Enterprise'}
                          </span>
                        </td>

                        {/* MRR */}
                        <td className="py-3.5 px-3 font-semibold text-stone-800 text-sm tabular-nums lining-nums">
                          {formatCurrency(t.plan_price || 99.90)}
                        </td>

                        {/* Fatura */}
                        <td className="py-3.5 px-3">
                          {isOverdue ? (
                            <span className="inline-block bg-rose-50 text-rose-700 text-xs px-3 py-0.5 rounded-full font-medium">
                              Vencida
                            </span>
                          ) : (
                            <span className="inline-block bg-emerald-50 text-emerald-700 text-xs px-3 py-0.5 rounded-full font-medium">
                              Em dia
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          {isSuspended ? (
                            <span className="inline-block bg-rose-50 text-rose-700 text-xs px-3 py-0.5 rounded-full font-medium">
                              Suspenso
                            </span>
                          ) : (
                            <span className="inline-block bg-emerald-50 text-emerald-700 text-xs px-3 py-0.5 rounded-full font-medium">
                              Ativo
                            </span>
                          )}
                        </td>

                        {/* Seta */}
                        <td className="py-3.5 px-3 text-right text-stone-300 group-hover:text-stone-600 transition-colors">
                          <span className="material-symbols-outlined text-lg">
                            chevron_right
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUNA DIREITA (CARDS LATERAIS DE GESTÃO) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Card 1: Precisa de atenção */}
          <div className="bg-white rounded-[24px] border border-stone-200/80 p-6 shadow-2xs">
            <h3 className="font-display font-bold text-xl text-stone-900 mb-4">
              Precisa de atenção
            </h3>

            {(!metrics.attention_items || metrics.attention_items.length === 0) ? (
              <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-xl">check</span>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed max-w-xs">
                  Nada pendente. Faturas vencidas e salões sem acesso há 7 dias aparecem aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.attention_items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/superadmin/tenants/${item.id}`)}
                    className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/40 hover:bg-rose-50 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-xs text-stone-900">{item.name}</div>
                      <div className="text-[11px] text-rose-600">{item.issue_description}</div>
                    </div>
                    <span className="material-symbols-outlined text-stone-400 text-base">
                      chevron_right
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Receita por plano */}
          <div className="bg-white rounded-[24px] border border-stone-200/80 p-6 shadow-2xs">
            <h3 className="font-display font-bold text-xl text-stone-900 mb-4">
              Receita por plano
            </h3>

            {(!metrics.revenue_by_plan || metrics.revenue_by_plan.length === 0) ? (
              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-stone-800">
                  <span>Enterprise</span>
                  <span className="tabular-nums lining-nums font-bold text-stone-900">
                    {formatCurrency(metrics.mrr || 199.80)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#7C3A4D] w-full my-2.5"></div>
                <div className="text-xs text-stone-500 mt-2">
                  Premium e Básico · 0 assinantes
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {metrics.revenue_by_plan.map((p, idx) => {
                  const maxMrr = Math.max(...metrics.revenue_by_plan.map((r) => r.total_mrr), 1);
                  const percentage = Math.max(12, Math.round((p.total_mrr / maxMrr) * 100));

                  return (
                    <div key={idx}>
                      <div className="flex justify-between items-center text-xs font-semibold text-stone-800">
                        <span>{p.plan_name}</span>
                        <span className="tabular-nums lining-nums font-bold text-stone-900">
                          {formatCurrency(p.total_mrr)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-stone-100 w-full overflow-hidden my-2">
                        <div
                          className="h-full bg-[#7C3A4D] rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {p.subscribers_count} {p.subscribers_count === 1 ? 'assinante' : 'assinantes'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* 4. MODAL DE CRIAÇÃO DE SALÃO */}
      <CreateTenantModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newTenant) => {
          setIsCreateModalOpen(false);
          fetchDashboardData();
          if (newTenant && newTenant.id) {
            navigate(`/superadmin/tenants/${newTenant.id}`);
          }
        }}
      />
    </div>
  );
};

export default SuperAdmin;
