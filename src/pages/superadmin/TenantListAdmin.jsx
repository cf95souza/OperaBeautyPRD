import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import CreateTenantModal from '../../components/superadmin/CreateTenantModal';

const TenantListAdmin = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const itemsPerPage = 10;
  
  const navigate = useNavigate();

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
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const data = await api.plans.list();
      if (data) setPlans(data);
    } catch (err) {
      console.error('Erro ao buscar planos', err);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [debouncedSearch, currentPage]);

  const getPlanName = (price) => {
    if (!price) return 'Personalizado';
    const plan = plans.find(p => Number(p.price) === Number(price));
    return plan ? plan.name : `R$ ${Number(price).toFixed(2)}`;
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

  const handleOpenDetail = (tenant) => {
    navigate(`/superadmin/tenants/${tenant.id}`);
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
          <Link to="/superadmin" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>dashboard</span>
            Painel Geral
          </Link>
          <Link to="/superadmin/tenants" className="flex items-center gap-md py-3 px-4 bg-primary-container text-on-primary-container rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
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
          <div className="w-8 h-8"></div> {/* Placeholder */}
        </header>

        <div className="p-container-margin md:p-xl flex-1 flex flex-col gap-xl">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-lg">
            <div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">Salões e Clientes</h1>
              <p className="font-body-md text-body-md text-secondary">Gerencie e acesse todos os salões cadastrados no OperaBeauty.</p>
            </div>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-primary text-on-primary font-label-md text-label-md py-3 px-6 rounded-full flex items-center gap-sm hover:opacity-90 transition-opacity shadow-sm"
            >
              <span className="material-symbols-outlined">add</span>
              Novo Salão
            </button>
          </div>

          <section className="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-md md:p-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-lg gap-md">
              <div className="relative w-full md:w-96">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary">search</span>
                <input 
                  className="w-full bg-surface-container-low border-none rounded-full py-3 pl-10 pr-4 font-body-md text-body-md focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all outline-none" 
                  placeholder="Pesquisar salão..." 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="bg-surface-container-high p-3 rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
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
                      <tr key={t.id} className="border-b border-surface-variant hover:bg-surface-container-low transition-colors group cursor-pointer" onClick={() => handleOpenDetail(t)}>
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
                          <button className="text-secondary hover:text-primary transition-colors p-2" onClick={(e) => { e.stopPropagation(); handleOpenDetail(t); }}>
                            <span className="material-symbols-outlined">chevron_right</span>
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
                  <div key={t.id} className="bg-surface border border-surface-variant rounded-xl p-md flex flex-col gap-sm cursor-pointer" onClick={() => handleOpenDetail(t)}>
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
                      <button className="text-secondary hover:text-primary transition-colors p-2 -mr-2" onClick={(e) => { e.stopPropagation(); handleOpenDetail(t); }}>
                        <span className="material-symbols-outlined">chevron_right</span>
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
            
          </section>

        </div>
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

export default TenantListAdmin;
