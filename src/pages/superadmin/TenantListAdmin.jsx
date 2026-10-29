import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import CreateTenantModal from '../../components/superadmin/CreateTenantModal';
import { formatCurrency } from '../../utils/formatters';

const TenantListAdmin = () => {
  const navigate = useNavigate();

  // Estados principais
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Estados de Filtros e Busca (Item H4)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'suspended'
  const [invoiceFilter, setInvoiceFilter] = useState('all'); // 'all' | 'up_to_date' | 'overdue'
  const [planFilter, setPlanFilter] = useState('all'); // 'all' | plan_id / plan_name
  const [sortBy, setSortBy] = useState('name_asc'); // 'name_asc' | 'name_desc' | 'mrr_desc' | 'mrr_asc' | 'recent'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantsData, plansData] = await Promise.all([
        api.superadmin.listTenants(),
        api.plans.list()
      ]);

      if (tenantsData) setTenants(tenantsData);
      if (plansData) setPlans(plansData);
    } catch (err) {
      console.error('Erro ao buscar salões e planos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtragem e Ordenação Combinadas
  const processedTenants = useMemo(() => {
    let result = [...tenants];

    // 1. Busca por texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          (t.name && t.name.toLowerCase().includes(q)) ||
          (t.slug && t.slug.toLowerCase().includes(q)) ||
          (t.plan_name && t.plan_name.toLowerCase().includes(q))
      );
    }

    // 2. Filtro de Status
    if (statusFilter === 'active') {
      result = result.filter((t) => t.status === 'active');
    } else if (statusFilter === 'suspended') {
      result = result.filter((t) => t.status === 'suspended' || t.status === 'inactive');
    }

    // 3. Filtro de Situação da Fatura
    if (invoiceFilter === 'up_to_date') {
      result = result.filter((t) => Number(t.overdue_invoices_count || 0) === 0);
    } else if (invoiceFilter === 'overdue') {
      result = result.filter((t) => Number(t.overdue_invoices_count || 0) > 0);
    }

    // 4. Filtro de Plano
    if (planFilter !== 'all') {
      result = result.filter(
        (t) => (t.plan_name && t.plan_name.toLowerCase() === planFilter.toLowerCase()) || t.plan_id === planFilter
      );
    }

    // 5. Ordenação
    result.sort((a, b) => {
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name_desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (sortBy === 'mrr_desc') {
        return Number(b.plan_price || 0) - Number(a.plan_price || 0);
      }
      if (sortBy === 'mrr_asc') {
        return Number(a.plan_price || 0) - Number(b.plan_price || 0);
      }
      if (sortBy === 'recent') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      return 0;
    });

    return result;
  }, [tenants, searchQuery, statusFilter, invoiceFilter, planFilter, sortBy]);

  // Paginação
  const totalCount = processedTenants.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const paginatedTenants = useMemo(() => {
    const from = (currentPage - 1) * itemsPerPage;
    return processedTenants.slice(from, from + itemsPerPage);
  }, [processedTenants, currentPage]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setInvoiceFilter('all');
    setPlanFilter('all');
    setSortBy('name_asc');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    invoiceFilter !== 'all' ||
    planFilter !== 'all' ||
    sortBy !== 'name_asc';

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-7xl mx-auto pb-10">
      
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl md:text-[34px] text-stone-900 leading-tight">
            Salões e clientes
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Gerencie, filtre e acesse todos os salões cadastrados no OperaBeauty SaaS.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-[#7C3A4D] hover:bg-[#682F40] text-white font-medium text-xs md:text-sm px-5 py-2.5 rounded-full flex items-center gap-1.5 shadow-sm hover:shadow transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>Novo salão</span>
        </button>
      </div>

      {/* 2. BARRA DE FERRAMENTAS: BUSCA, FILTROS E ORDENAÇÃO (§9.5·H4) */}
      <div className="bg-white rounded-[22px] border border-stone-200/80 p-5 shadow-2xs flex flex-col gap-4">
        
        {/* Linha Superior: Busca + Dropdowns de Plano e Ordenação */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Campo de Busca com Lupa e Limpeza */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              placeholder="Pesquisar por nome, slug ou plano..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-stone-50/80 border border-stone-200/80 rounded-full py-2.5 pl-10 pr-10 text-xs text-stone-800 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3A4D]/20 focus:border-[#7C3A4D] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filtro de Plano */}
            <div className="flex items-center gap-1.5 bg-stone-50/80 border border-stone-200/80 rounded-full px-3 py-1.5 text-xs text-stone-700">
              <span className="text-stone-400 font-medium">Plano:</span>
              <select
                value={planFilter}
                onChange={(e) => {
                  setPlanFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none text-xs font-semibold text-stone-800 focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os planos</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropdown de Ordenação */}
            <div className="flex items-center gap-1.5 bg-stone-50/80 border border-stone-200/80 rounded-full px-3 py-1.5 text-xs text-stone-700">
              <span className="text-stone-400 font-medium">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-stone-800 focus:outline-none cursor-pointer"
              >
                <option value="name_asc">Nome (A-Z)</option>
                <option value="name_desc">Nome (Z-A)</option>
                <option value="mrr_desc">Maior MRR</option>
                <option value="mrr_asc">Menor MRR</option>
                <option value="recent">Mais recentes</option>
              </select>
            </div>

            {/* Botão Limpar Filtros */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-rose-700 hover:text-rose-900 font-medium px-3 py-1.5 rounded-full hover:bg-rose-50 transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                <span>Limpar filtros</span>
              </button>
            )}
          </div>

        </div>

        {/* Linha Inferior: Filtros de Pílula (Status e Situação da Fatura) */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-stone-100 text-xs">
          
          {/* Segmented Control: Status da Conta */}
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400 font-medium mr-1">Status:</span>
            <div className="bg-stone-100 p-0.5 rounded-full flex items-center">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('active');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  statusFilter === 'active'
                    ? 'bg-emerald-50 text-emerald-700 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Ativos
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('suspended');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  statusFilter === 'suspended'
                    ? 'bg-rose-50 text-rose-700 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Suspensos
              </button>
            </div>
          </div>

          {/* Segmented Control: Situação da Fatura */}
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400 font-medium mr-1">Fatura:</span>
            <div className="bg-stone-100 p-0.5 rounded-full flex items-center">
              <button
                type="button"
                onClick={() => {
                  setInvoiceFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  invoiceFilter === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => {
                  setInvoiceFilter('up_to_date');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  invoiceFilter === 'up_to_date'
                    ? 'bg-emerald-50 text-emerald-700 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Em dia
              </button>
              <button
                type="button"
                onClick={() => {
                  setInvoiceFilter('overdue');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  invoiceFilter === 'overdue'
                    ? 'bg-rose-50 text-rose-700 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Vencidas / Pendentes
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* 3. TABELA CORPORATIVA DE SALÕES COM LINHA CLICÁVEL */}
      <section className="bg-white rounded-[24px] border border-stone-200/80 p-6 shadow-2xs">
        
        <div className="flex justify-between items-center mb-4">
          <div className="text-xs text-stone-500 font-medium">
            Exibindo <strong className="text-stone-800">{processedTenants.length}</strong> {processedTenants.length === 1 ? 'salão' : 'salões'}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-100 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                <th className="pb-3 px-3">SALÃO</th>
                <th className="pb-3 px-3">PLANO</th>
                <th className="pb-3 px-3">MRR</th>
                <th className="pb-3 px-3">FATURA</th>
                <th className="pb-3 px-3">STATUS</th>
                <th className="pb-3 px-3">CLIENTES / EQUIPE</th>
                <th className="pb-3 px-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100/80">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-xs text-stone-400">
                    Carregando salões...
                  </td>
                </tr>
              ) : paginatedTenants.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mb-3">
                        <span className="material-symbols-outlined text-2xl">search_off</span>
                      </div>
                      <h4 className="font-semibold text-stone-800 text-sm mb-1">Nenhum salão encontrado</h4>
                      <p className="text-xs text-stone-500 mb-4 text-center">
                        Tente ajustar os filtros ou pesquisar com outros termos.
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="px-4 py-2 rounded-full bg-stone-100 text-stone-700 hover:bg-stone-200 text-xs font-semibold transition-colors"
                        >
                          Limpar todos os filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTenants.map((t) => {
                  const initial = (t.name || 'S').trim().charAt(0).toUpperCase();
                  const isOverdue = Number(t.overdue_invoices_count || 0) > 0;
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
                          <div className="w-10 h-10 rounded-full bg-[#F6E4E4] text-[#7C3A4D] flex items-center justify-center font-bold text-sm shrink-0 border border-rose-100">
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

                      {/* Clientes e Equipe */}
                      <td className="py-3.5 px-3 text-xs text-stone-600">
                        <span className="font-semibold text-stone-800 tabular-nums">{t.client_count || 0}</span> clientes ·{' '}
                        <span className="font-semibold text-stone-800 tabular-nums">{t.staff_count || 0}</span> equipe
                      </td>

                      {/* Seta de Ação */}
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

        {/* 4. CONTROLES DE PAGINAÇÃO */}
        {!loading && totalPages > 1 && (
          <div className="mt-6 pt-4 border-t border-stone-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-stone-500">
            <span>
              Página <strong className="text-stone-800">{currentPage}</strong> de{' '}
              <strong className="text-stone-800">{totalPages}</strong> ({totalCount} salões no total)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}

      </section>

      {/* MODAL DE CRIAÇÃO DE SALÃO */}
      <CreateTenantModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newTenant) => {
          setIsCreateModalOpen(false);
          fetchData();
          if (newTenant && newTenant.id) {
            navigate(`/superadmin/tenants/${newTenant.id}`);
          }
        }}
      />
    </div>
  );
};

export default TenantListAdmin;
