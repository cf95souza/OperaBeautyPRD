import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import CreateTenantModal from '../../components/superadmin/CreateTenantModal';

const SuperAdmin = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 5;

  const [metrics, setMetrics] = useState({
    active_tenants: 0,
    earnings_paid: 0,
    earnings_pending: 0,
    unique_clients: 0
  });

  const [selectedTenant, setSelectedTenant] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [plans, setPlans] = useState([]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset page on search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    fetchTenants();
    fetchMetrics();
    fetchPlans();
  }, [debouncedSearch, currentPage]);

  const fetchPlans = async () => {
    try {
      const data = await api.plans.list();
      if (data) setPlans(data);
    } catch (err) {
      console.error('Erro ao buscar planos', err);
    }
  };

  const getPlanName = (price) => {
    if (!price) return 'Personalizado';
    const plan = plans.find(p => Number(p.price) === Number(price));
    return plan ? plan.name : `R$ ${Number(price).toFixed(2)}`;
  };

  const fetchMetrics = async () => {
    try {
      const data = await api.superadmin.getDashboardMetrics();
      if (data) setMetrics(data);
    } catch (err) {
      console.error('Erro ao buscar métricas', err);
    }
  };

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const data = await api.superadmin.listTenants();
      
      // Filtrar localmente por debouncedSearch
      let filtered = data || [];
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        filtered = filtered.filter(t => 
          (t.name && t.name.toLowerCase().includes(query)) || 
          (t.slug && t.slug.toLowerCase().includes(query))
        );
      }
      
      // Ordenar alfabeticamente por name
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      setTotalCount(filtered.length);
      
      // Paginação
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage;
      setTenants(filtered.slice(from, to));
    } catch (err) {
      console.error('Erro ao buscar salões:', err);
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  const handleOpenModal = (tenant) => {
    setSelectedTenant(tenant);
    setIsModalOpen(true);
  };

  const handleDeleteTenant = async () => {
    if (!selectedTenant) return;
    setIsDeleting(true);
    try {
      await api.superadmin.deleteTenant(selectedTenant.id);
      setIsDeleteDialogOpen(false);
      setIsModalOpen(false);
      setSelectedTenant(null);
      fetchTenants();
      fetchMetrics();
    } catch (err) {
      console.error('Erro ao deletar salão', err);
      alert('Erro ao deletar salão: ' + (err.message || 'Tente novamente.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    api.auth.logout();
    navigate('/superadmin/login');
  };

  return (
    <div className="font-body-md text-body-md antialiased overflow-x-hidden min-h-screen flex bg-surface text-on-surface animate-fade-in-up">
      
      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        ></div>
      )}

      {/* Navigation Drawer (Responsive) */}
      <aside className={`flex flex-col h-screen w-72 fixed top-0 bg-surface shadow-md py-lg gap-sm z-50 transition-all duration-300 ${isDrawerOpen ? 'left-0' : '-left-72'} md:left-0`}>
        <div className="px-md mb-lg">
          <h2 className="font-headline-md text-headline-md text-primary tracking-tight">OperaBeauty</h2>
        </div>
        <nav className="flex flex-col gap-xs flex-1">
          <Link to="/superadmin" className="flex items-center gap-md py-3 px-4 bg-primary-container text-on-primary-container rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
            Painel Geral
          </Link>
          <Link to="/superadmin/tenants" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>storefront</span>
            Salões e Clientes
          </Link>
          <Link to="/superadmin/planos" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>subscriptions</span>
            Gestão de Planos
          </Link>
          <Link to="/superadmin/configuracoes" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>settings</span>
            Configurações
          </Link>
        </nav>
        <div className="px-md mt-auto flex flex-col gap-2">
          <button onClick={handleLogout} className="flex items-center gap-md py-3 px-4 text-error hover:bg-error-container rounded-lg font-label-md text-label-md transition-colors w-full text-left">
            <span className="material-symbols-outlined">logout</span>
            Sair do Sistema
          </button>
          <div className="flex items-center gap-sm p-4 bg-surface-container-low rounded-xl">
            <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden">
              <span className="material-symbols-outlined text-secondary">person</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface">Super Admin</span>
              <span className="font-label-sm text-label-sm text-secondary">Administrador do Sistema</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 flex flex-col min-h-screen bg-background">
        
        {/* Top App Bar (Mobile) */}
        <header className="md:hidden flex justify-between items-center px-gutter py-3 w-full max-w-full bg-surface shadow-sm sticky top-0 z-30 pt-[max(env(safe-area-inset-top),_0.75rem)] min-h-[4rem]">
          <div className="flex items-center gap-sm">
            <button onClick={() => setIsDrawerOpen(true)} className="material-symbols-outlined text-primary p-2">menu</button>
            <div className="flex items-center gap-xs cursor-pointer active:opacity-80">
              <span className="material-symbols-outlined text-primary font-headline-md text-headline-md">spa</span>
              <span className="font-headline-md text-[20px] text-primary tracking-tight">Admin Mestre</span>
            </div>
          </div>
          <div className="w-8 h-8"></div> {/* Placeholder to keep flex-between balanced */}
        </header>

        <div className="p-container-margin md:p-xl flex-1 flex flex-col gap-xl">
          
          {/* Page Header & Quick Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-lg">
            <div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">Visão Geral</h1>
              <p className="font-body-md text-body-md text-secondary">Monitore o desempenho e faturamento de todos os salões.</p>
            </div>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-primary text-on-primary font-label-md text-label-md py-3 px-6 rounded-full flex items-center gap-sm hover:opacity-90 transition-opacity shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transform duration-300"
            >
              <span className="material-symbols-outlined">add</span>
              Novo Salão
            </button>
          </div>

          {/* Bento Grid: Global Overview Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            
            {/* Total Active Salons */}
            <div className="bg-surface-container-lowest rounded-xl p-lg shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-label-md text-secondary">Salões Ativos</span>
                <div className="bg-surface-container-low p-2 rounded-full text-primary">
                  <span className="material-symbols-outlined">storefront</span>
                </div>
              </div>
              <div>
                <div className="font-display-lg text-display-lg text-on-surface">{metrics.active_tenants}</div>
                <div className="flex items-center gap-xs mt-1 text-on-primary-container font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  <span>Na plataforma</span>
                </div>
              </div>
            </div>

            {/* Total MRR */}
            <div className="bg-surface-container-lowest rounded-xl p-lg shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col justify-between min-h-[160px] relative overflow-hidden">
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 100% 0%, var(--color-primary) 0%, transparent 50%)" }}></div>
              <div className="flex justify-between items-start relative z-10">
                <span className="font-label-md text-label-md text-secondary">Faturamento (Pago)</span>
                <div className="bg-surface-container-low p-2 rounded-full text-primary">
                  <span className="material-symbols-outlined">payments</span>
                </div>
              </div>
              <div className="relative z-10">
                <div className="font-display-lg text-display-lg text-on-surface">R$ {Number(metrics.earnings_paid).toFixed(2).replace('.', ',')}</div>
                <div className="flex items-center gap-xs mt-1 text-on-primary-container font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  <span>Receita já recebida</span>
                </div>
              </div>
            </div>

            {/* Pending Approvals */}
            <div className="bg-surface-container-lowest rounded-xl p-lg shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-label-md text-secondary">Aprovações Pendentes</span>
                <div className="bg-error-container p-2 rounded-full text-on-error-container">
                  <span className="material-symbols-outlined">hourglass_empty</span>
                </div>
              </div>
              <div>
                <div className="font-display-lg text-display-lg text-on-surface">0</div>
                <div className="flex items-center gap-xs mt-1 text-secondary font-label-sm text-label-sm">
                  <span>Requerem análise</span>
                </div>
              </div>
            </div>

            {/* Cancelamentos (Churn) */}
            <div className="bg-surface-container-lowest rounded-xl p-lg shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-label-md text-secondary">Cancelamentos (Churn)</span>
                <div className="bg-surface-container-low p-2 rounded-full text-secondary">
                  <span className="material-symbols-outlined">trending_down</span>
                </div>
              </div>
              <div>
                <div className="font-display-lg text-display-lg text-on-surface">0%</div>
                <div className="flex items-center gap-xs mt-1 text-secondary font-label-sm text-label-sm">
                  <span>Nenhuma evasão este mês</span>
                </div>
              </div>
            </div>

            {/* Inadimplência */}
            <div className="bg-surface-container-lowest rounded-xl p-lg shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-label-md text-secondary">Faturas Pendentes</span>
                <div className="bg-error-container p-2 rounded-full text-on-error-container">
                  <span className="material-symbols-outlined">warning</span>
                </div>
              </div>
              <div>
                <div className="font-display-lg text-display-lg text-error">R$ {Number(metrics.earnings_pending).toFixed(2).replace('.', ',')}</div>
                <div className="flex items-center gap-xs mt-1 text-secondary font-label-sm text-label-sm">
                  <span>A receber / Em aberto</span>
                </div>
              </div>
            </div>

            {/* Clientes Únicos */}
            <div className="bg-surface-container-lowest rounded-xl p-lg shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col justify-between min-h-[160px] relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="font-label-md text-label-md text-secondary">Clientes Únicos (Plataforma)</span>
                <div className="bg-surface-container-low p-2 rounded-full text-primary">
                  <span className="material-symbols-outlined">groups</span>
                </div>
              </div>
              <div>
                <div className="font-display-lg text-display-lg text-on-surface">{metrics.unique_clients}</div>
                <div className="flex items-center gap-xs mt-1 text-secondary font-label-sm text-label-sm">
                  <span>Base consolidada sem duplicações</span>
                </div>
              </div>
            </div>

          </section>

          {/* Salon Directory (Tenants) */}
          <section className="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-md md:p-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-lg gap-md">
              <h2 className="font-headline-md text-headline-md text-on-surface">Diretório de Salões</h2>
              <div className="flex items-center gap-md w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">search</span>
                  <input 
                    className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 font-body-md text-body-md focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all outline-none" 
                    placeholder="Buscar salão..." 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="bg-surface-container-high p-2 rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors">
                  <span className="material-symbols-outlined">filter_list</span>
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-variant">
                    <th className="py-sm px-md font-label-md text-label-md text-secondary whitespace-nowrap">Nome do Salão</th>
                    <th className="py-sm px-md font-label-md text-label-md text-secondary whitespace-nowrap">Plano</th>
                    <th className="py-sm px-md font-label-md text-label-md text-secondary whitespace-nowrap">Status</th>
                    <th className="py-sm px-md font-label-md text-label-md text-secondary text-right whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-body-md">
                  {loading ? (
                    <tr><td colSpan="4" className="text-center py-8 text-secondary">Carregando...</td></tr>
                  ) : tenants.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-8 text-secondary">Nenhum salão encontrado.</td></tr>
                  ) : (
                    tenants.map(t => (
                      <tr key={t.id} className="border-b border-surface-variant hover:bg-surface-container-low transition-colors group cursor-pointer" onClick={() => handleOpenModal(t)}>
                        <td className="py-md px-md">
                          <div className="flex items-center gap-md">
                            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary overflow-hidden shrink-0" style={{ backgroundColor: t.primary_color ? `${t.primary_color}20` : undefined, color: t.primary_color }}>
                              <span className="material-symbols-outlined">storefront</span>
                            </div>
                            <div>
                              <div className="font-label-md text-label-md text-on-surface">{t.name}</div>
                              <div className="font-label-sm text-label-sm text-secondary">{t.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-md px-md">
                          <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full font-label-sm text-label-sm">
                            {getPlanName(t.plan_price)}
                          </span>
                        </td>
                        <td className="py-md px-md">
                          <div className="flex items-center gap-xs">
                            <div className={`w-2 h-2 rounded-full ${t.status === 'active' ? 'bg-[#10b981]' : 'bg-error'}`}></div>
                            <span className="text-on-surface-variant text-sm capitalize">{t.status === 'active' ? 'Ativo' : t.status || 'Inativo'}</span>
                          </div>
                        </td>
                        <td className="py-md px-md text-right">
                          <button className="text-secondary hover:text-primary transition-colors p-2" onClick={(e) => { e.stopPropagation(); handleOpenModal(t); }}>
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden flex flex-col gap-sm mt-4">
              {loading ? (
                 <div className="text-center py-8 text-secondary">Carregando...</div>
              ) : tenants.length === 0 ? (
                 <div className="text-center py-8 text-secondary">Nenhum salão encontrado.</div>
              ) : (
                tenants.map(t => (
                  <div key={t.id} className="bg-surface border border-surface-variant rounded-xl p-md flex flex-col gap-sm cursor-pointer" onClick={() => handleOpenModal(t)}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-md">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary overflow-hidden shrink-0" style={{ backgroundColor: t.primary_color ? `${t.primary_color}20` : undefined, color: t.primary_color }}>
                          <span className="material-symbols-outlined">storefront</span>
                        </div>
                        <div>
                          <div className="font-label-md text-label-md text-on-surface">{t.name}</div>
                          <div className="font-label-sm text-label-sm text-secondary">{t.slug}</div>
                        </div>
                      </div>
                      <button className="text-secondary hover:text-primary transition-colors p-2 -mr-2" onClick={(e) => { e.stopPropagation(); handleOpenModal(t); }}>
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-surface-variant">
                      <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full font-label-sm text-label-sm">
                        {getPlanName(t.plan_price)}
                      </span>
                      <div className="flex items-center gap-xs">
                        <div className={`w-2 h-2 rounded-full ${t.status === 'active' ? 'bg-[#10b981]' : 'bg-error'}`}></div>
                        <span className="text-on-surface-variant text-sm capitalize">{t.status === 'active' ? 'Ativo' : t.status || 'Inativo'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Pagination Controls */}
            {!loading && totalCount > itemsPerPage && (
              <div className="mt-lg flex justify-between items-center">
                <span className="text-secondary font-label-sm text-sm">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount}
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="p-2 rounded-lg border border-surface-variant text-secondary hover:bg-surface-container disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <button 
                    disabled={currentPage * itemsPerPage >= totalCount}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="p-2 rounded-lg border border-surface-variant text-secondary hover:bg-surface-container disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
            
            <div className="mt-md flex justify-center">
              <button onClick={() => {setSearchQuery(''); setCurrentPage(1);}} className="text-primary font-label-md text-label-md hover:underline py-2">Limpar Busca e Ver Todos</button>
            </div>
          </section>

        </div>



        {/* MODAL DE DETALHES DO SALÃO */}
        {isModalOpen && selectedTenant && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
            <div className="bg-surface rounded-2xl w-full max-w-[500px] flex flex-col p-lg shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-md">
                  <div className="w-14 h-14 rounded-xl bg-surface-container-high flex items-center justify-center text-primary overflow-hidden shrink-0" style={{ backgroundColor: selectedTenant.primary_color ? `${selectedTenant.primary_color}20` : undefined, color: selectedTenant.primary_color }}>
                    <span className="material-symbols-outlined text-[32px]">storefront</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">{selectedTenant.name}</h3>
                    <p className="font-body-sm text-secondary">/{selectedTenant.slug}</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-secondary hover:text-error transition-colors p-1">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-surface-container-lowest p-md rounded-xl border border-surface-variant">
                  <span className="block font-label-sm text-secondary mb-1">Status da Conta</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${selectedTenant.status === 'active' ? 'bg-[#10b981]' : 'bg-error'}`}></div>
                    <span className="font-label-md text-on-surface capitalize">{selectedTenant.status === 'active' ? 'Ativo' : selectedTenant.status || 'Inativo'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-container-lowest p-md rounded-xl border border-surface-variant">
                    <span className="block font-label-sm text-secondary mb-1">Plano Assinado</span>
                    <span className="font-label-md text-on-surface">{getPlanName(selectedTenant.plan_price)}</span>
                  </div>
                  <div className="bg-surface-container-lowest p-md rounded-xl border border-surface-variant">
                    <span className="block font-label-sm text-secondary mb-1">Faturamento</span>
                    <span className="font-label-md text-on-surface">Em dia</span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-md rounded-xl border border-surface-variant">
                  <span className="block font-label-sm text-secondary mb-3">Identidade Visual (White Label)</span>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-[12px] text-secondary block mb-1">Cor Primária</span>
                      <div className="w-10 h-10 rounded-full border border-surface-variant" style={{ backgroundColor: selectedTenant.primary_color || '#7c5357' }}></div>
                    </div>
                    <div>
                      <span className="text-[12px] text-secondary block mb-1">Cor Secundária</span>
                      <div className="w-10 h-10 rounded-full border border-surface-variant" style={{ backgroundColor: selectedTenant.secondary_color || '#f3eaeb' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <a href={`/${selectedTenant.slug}`} target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 text-sm font-label-md bg-primary-container text-on-primary-container rounded-full hover:brightness-95 transition-all flex items-center gap-2 w-full justify-center">
                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  Acessar Salão
                </a>
                <button onClick={() => setIsDeleteDialogOpen(true)} className="px-6 py-2.5 text-sm font-label-md bg-error-container text-error rounded-full hover:brightness-95 transition-all flex items-center gap-2 w-full justify-center">
                  <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                  Deletar Salão
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE CONFIRMAÇÃO DE DELEÇÃO */}
        {isDeleteDialogOpen && selectedTenant && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md" onClick={() => setIsDeleteDialogOpen(false)}>
            <div className="bg-surface rounded-2xl w-full max-w-[400px] flex flex-col p-lg shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-error-container text-error flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[32px]">warning</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Excluir Salão?</h3>
                <p className="font-body-md text-secondary">
                  Você está prestes a excluir o salão <strong>{selectedTenant.name}</strong>. Esta ação apagará TODOS os clientes, agendamentos, profissionais e configurações associadas a este salão e <strong>NÃO PODE SER DESFEITA</strong>.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteDialogOpen(false)} 
                  disabled={isDeleting}
                  className="flex-1 py-3 font-label-md bg-surface-container-high text-on-surface-variant rounded-full hover:bg-surface-variant transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteTenant} 
                  disabled={isDeleting}
                  className="flex-1 py-3 font-label-md bg-error text-on-error rounded-full hover:brightness-90 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? 'Deletando...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
      
      <CreateTenantModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={(newTenant) => {
          fetchTenants();
          navigate(`/superadmin/tenants/${newTenant.id}`);
        }} 
      />
    </div>
  );
};

export default SuperAdmin;
