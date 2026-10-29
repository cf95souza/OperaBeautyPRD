import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

const SuperAdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fecha o menu mobile quando a rota mudar
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Bloqueia o scroll quando o menu mobile estiver aberto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    api.auth.logout();
    navigate('/superadmin/login');
  };

  // H2 (P1): Grupos Canônicos da Plataforma SaaS (§9.2 e §9.5)
  const navGroups = [
    {
      title: 'Negócio',
      items: [
        { to: '/superadmin', icon: 'dashboard', label: 'Painel Geral' },
        { to: '/superadmin/tenants', icon: 'storefront', label: 'Salões e Clientes' },
        { to: '/superadmin/planos', icon: 'subscriptions', label: 'Gestão de Planos' },
        { to: '/superadmin/parceiros', icon: 'handshake', label: 'Parceiros e Revenda' },
      ]
    },
    {
      title: 'Plataforma',
      items: [
        { to: '/superadmin/features', icon: 'toggle_on', label: 'Feature Flags' },
        { to: '/superadmin/avisos', icon: 'campaign', label: 'Mural de Avisos' },
        { to: '/superadmin/equipe', icon: 'admin_panel_settings', label: 'Equipe SaaS' },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { to: '/superadmin/auditoria', icon: 'security', label: 'Auditoria e Saúde' },
        { to: '/superadmin/configuracoes', icon: 'settings', label: 'Configurações' },
      ]
    }
  ];

  return (
    <div className="antialiased min-h-screen flex bg-bg font-sans text-ink selection:bg-brand-tint selection:text-brand relative">
      
      {/* Overlay Escuro para Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 md:hidden animate-fade-in transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Navigation Drawer (Desktop 264px e Mobile Gaveta) */}
      <aside className={`
        fixed left-0 top-0 h-full w-[264px] bg-surface border-r border-line z-[60] flex flex-col transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* Header da Sidebar Super Admin */}
        <div className="h-16 px-5 border-b border-line flex items-center justify-between shrink-0">
          <Link 
            to="/superadmin"
            className="flex items-center gap-2.5 group"
            title="Painel Geral do Super Admin"
          >
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white font-display font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                spa
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-bold text-base text-ink leading-tight truncate">
                OperaBeauty
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-brand">
                Super Admin
              </span>
            </div>
          </Link>
          <button 
            className="md:hidden text-ink-soft hover:text-ink p-1 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Fechar menu lateral"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        
        {/* Navigation Links Agrupados (com rolagem suave) */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto hide-scrollbar space-y-4">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              <span className="px-3 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft/70 block">
                {group.title}
              </span>
              <div className="space-y-0.5">
                {group.items.map((link) => {
                  const isActive = location.pathname === link.to;
                  return (
                    <Link 
                      key={link.to}
                      to={link.to} 
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        isActive 
                          ? 'bg-brand-tint text-brand font-semibold shadow-xs' 
                          : 'text-ink-soft hover:bg-surface-variant/60 hover:text-ink'
                      }`}
                    >
                      <span 
                        className={`material-symbols-outlined text-[20px] ${isActive ? 'text-brand' : 'text-ink-soft'}`} 
                        style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {link.icon}
                      </span>
                      <span className="truncate">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        
        {/* Rodapé Fixo da Sidebar com Identificação Master e Sair */}
        <div className="p-3 border-t border-line shrink-0 bg-surface flex flex-col gap-2">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-variant/40">
            <div className="w-9 h-9 rounded-full bg-brand-tint flex items-center justify-center text-brand font-bold text-sm shrink-0 border border-brand/20">
              SA
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold text-ink truncate">
                Administrador
              </span>
              <span className="text-[11px] text-ink-soft truncate">
                Gestão da Plataforma
              </span>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 text-error hover:bg-error-container/20 px-3 py-2 rounded-xl text-xs font-semibold transition-colors w-full"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 w-full md:ml-[264px] flex flex-col min-h-screen">
        
        {/* TopAppBar Mobile */}
        <header className="md:hidden h-16 border-b border-line bg-surface/90 backdrop-blur-md sticky top-0 z-30 shrink-0 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              className="text-brand hover:opacity-80 transition-opacity p-1.5 -ml-2 rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-brand text-[22px]">spa</span>
              <h1 className="font-display font-bold text-lg text-ink tracking-tight">
                Super Admin
              </h1>
            </div>
          </div>
        </header>

        {/* Outlet Canvas com largura total e padding responsivo */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>

    </div>
  );
};

export default SuperAdminLayout;
