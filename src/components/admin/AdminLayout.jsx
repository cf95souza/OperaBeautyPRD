import React, { useState, useEffect } from 'react';
import { Outlet, Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import NotificationDropdown from './NotificationDropdown';

const AdminLayout = () => {
  const { tenant_slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { tenant, session, logout } = useTenant();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationToast, setNotificationToast] = useState({ show: false, message: '' });

  // Temporizador para esconder o toast de notificação após 3 segundos
  useEffect(() => {
    if (notificationToast.show) {
      const timer = setTimeout(() => {
        setNotificationToast({ show: false, message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notificationToast.show]);

  // Fecha o menu mobile quando a rota mudar
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock scroll quando o menu mobile estiver aberto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    if (logout) logout();
    navigate(`/${tenant_slug}/staff/login`);
  };

  const isManager = !session || session?.role === 'manager' || session?.role === 'admin';

  // J1 (P1): Navegação Agrupada Canônica (§9.2 e §9.6)
  const navGroups = [
    {
      title: 'Operação',
      items: [
        ...(isManager ? [{ to: `/${tenant_slug}/staff/admin/dashboard`, icon: 'dashboard', label: 'Dashboard' }] : []),
        { to: `/${tenant_slug}/staff/agenda-profissional`, icon: 'calendar_today', label: isManager ? 'Agenda do Salão' : 'Minha Agenda' },
        ...(isManager ? [{ to: `/${tenant_slug}/staff/admin/clientes`, icon: 'groups', label: 'Clientes' }] : []),
        ...(isManager && tenant?.features?.pdv ? [{ to: `/${tenant_slug}/staff/admin/pdv`, icon: 'point_of_sale', label: 'PDV (Caixa)' }] : []),
      ]
    },
    {
      title: 'Catálogo',
      items: [
        ...(isManager ? [{ to: `/${tenant_slug}/staff/admin/servicos`, icon: 'content_cut', label: 'Serviços' }] : []),
        ...(isManager && (tenant?.features?.packages || tenant?.features?.PACKAGES || (Array.isArray(tenant?.features) && tenant?.features?.includes('packages'))) ? [{ to: `/${tenant_slug}/staff/admin/pacotes`, icon: 'layers', label: 'Pacotes de Sessões' }] : []),
        ...(isManager ? [{ to: `/${tenant_slug}/staff/admin/estoque`, icon: 'inventory_2', label: 'Estoque' }] : []),
        ...(isManager && tenant?.features?.clube ? [{ to: `/${tenant_slug}/staff/admin/assinaturas`, icon: 'card_membership', label: 'Clube do Salão' }] : []),
        ...(isManager && tenant?.features?.giftcards ? [{ to: `/${tenant_slug}/staff/admin/giftcards`, icon: 'card_giftcard', label: 'Vales-Presente' }] : []),
        ...(isManager ? [{ to: `/${tenant_slug}/staff/admin/anamnese`, icon: 'assignment', label: 'Ficha de Anamnese' }] : []),
      ]
    },
    {
      title: 'Gestão',
      items: [
        ...(isManager ? [{ to: `/${tenant_slug}/staff/admin/financeiro`, icon: 'payments', label: 'Financeiro' }] : []),
        ...(isManager ? [{ to: `/${tenant_slug}/staff/admin/campanhas`, icon: 'campaign', label: 'Campanhas & Retenção' }] : []),
        ...(isManager ? [{ to: `/${tenant_slug}/staff/admin/indicacoes`, icon: 'share', label: 'Indicações & Amigas' }] : []),
        ...(isManager ? [{ to: `/${tenant_slug}/staff/admin/avaliacoes`, icon: 'star', label: 'Avaliações & Google' }] : []),
        { to: `/${tenant_slug}/staff/comissoes`, icon: 'account_balance_wallet', label: 'Minhas Comissões' },
        ...(isManager ? [{ to: `/${tenant_slug}/staff/admin/equipe`, icon: 'badge', label: 'Equipe' }] : []),
        ...(isManager && tenant?.features?.bi_reports ? [{ to: `/${tenant_slug}/staff/admin/relatorios-bi`, icon: 'insights', label: 'Relatórios BI' }] : []),
      ]
    },
    {
      title: 'Configurações',
      items: [
        ...(isManager ? [{ to: `/${tenant_slug}/staff/admin/minisite`, icon: 'public', label: 'Mini-site & SEO' }] : []),
        ...(isManager ? [{ to: `/${tenant_slug}/staff/admin/lookbook`, icon: 'photo_library', label: 'Lookbook' }] : []),
        ...(isManager ? [{ to: `/${tenant_slug}/staff/admin/configuracoes`, icon: 'tune', label: 'Operacional' }] : []),
        ...(isManager ? [{ to: `/${tenant_slug}/staff/admin/branding`, icon: 'palette', label: 'Branding' }] : []),
        ...(isManager ? [{ to: `/${tenant_slug}/staff/admin/lgpd`, icon: 'shield', label: 'Segurança e LGPD' }] : []),
        ...(isManager ? [{ to: `/${tenant_slug}/staff/admin/assinatura`, icon: 'workspace_premium', label: 'Minha Assinatura' }] : []),
      ]
    }
  ].filter(group => group.items.length > 0);

  return (
    <div className="antialiased min-h-screen flex bg-bg font-sans text-ink selection:bg-brand-tint selection:text-brand relative">
      
      {/* Overlay Escuro para Mobile e Tablets (< 1024px) (§9.6·J8) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 lg:hidden animate-fade-in transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Navigation Drawer (Desktop 264px fixo e Gaveta Retrátil em Mobile/Tablet) */}
      <aside className={`
        fixed left-0 top-0 h-full w-[264px] bg-surface border-r border-line z-[60] flex flex-col transition-transform duration-300 ease-out shadow-2xl lg:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* Header da Sidebar */}
        <div className="h-16 px-5 border-b border-line flex items-center justify-between shrink-0">
          <Link 
            to={`/${tenant_slug}/home`}
            className="flex items-center gap-2.5 group"
            title="Ir para tela pública do salão"
          >
            <div className="w-9 h-9 rounded-xl bg-brand-tint flex items-center justify-center text-brand font-display font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
              {(tenant?.name || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-bold text-base text-ink leading-tight truncate max-w-[150px]">
                {tenant?.name || 'OperaBeauty'}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-soft">
                  {isManager ? 'Painel do Gestor' : 'Portal Profissional'}
                </span>
                {tenant?.is_founder && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-0.5">
                    <span>★</span>
                    <span>{tenant.founder_badge_label || 'Fundador'}</span>
                  </span>
                )}
              </div>
            </div>
          </Link>
          <button 
            className="lg:hidden text-ink-soft hover:text-ink p-1.5 rounded-lg hover:bg-surface-variant transition-colors cursor-pointer"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Fechar menu lateral"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
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
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
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
        
        {/* Rodapé Fixo da Sidebar com Perfil e Sair */}
        <div className="p-3 border-t border-line shrink-0 bg-surface flex flex-col gap-2">
          <Link 
            to={`/${tenant_slug}/staff/perfil`}
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-surface-variant/60 transition-colors group"
            title="Ver e editar meu perfil"
          >
            <div className="w-9 h-9 rounded-full bg-brand-tint flex items-center justify-center text-brand font-semibold text-sm shrink-0 border border-brand/20">
              {(session?.name || (isManager ? 'G' : 'P')).charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold text-ink group-hover:text-brand transition-colors truncate">
                {session?.name || (isManager ? 'Gestor' : 'Profissional')}
              </span>
              <span className="text-[11px] text-ink-soft truncate">
                {isManager ? 'Administrador' : 'Equipe'}
              </span>
            </div>
            <span className="material-symbols-outlined text-ink-soft text-[18px]">chevron_right</span>
          </Link>

          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 text-error hover:bg-error-container/20 px-3 py-2 rounded-xl text-xs font-semibold transition-colors w-full cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Sair da Conta</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 w-full lg:ml-[264px] flex flex-col min-h-screen">
        
        {/* TopAppBar (Mobile & Desktop) */}
        <header className="h-16 border-b border-line bg-surface/90 backdrop-blur-md sticky top-0 z-30 shrink-0 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden text-brand hover:opacity-80 transition-opacity p-2 -ml-2 rounded-xl border border-line/60 bg-surface-variant/40 active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir menu lateral"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
            <h1 className="font-display font-bold text-base sm:text-lg md:text-xl text-ink tracking-tight truncate max-w-[200px] sm:max-w-none">
              {tenant?.name || 'OperaBeauty'}
            </h1>
          </div>

          {/* Ações à Direita */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to={`/${tenant_slug}/staff/agenda-profissional`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line text-xs font-semibold text-ink-soft hover:text-brand hover:border-brand/40 transition-colors shadow-2xs"
              title="Acessar Agenda Rápida"
            >
              <span className="material-symbols-outlined text-[16px]">calendar_today</span>
              <span>Agenda</span>
            </Link>

            <NotificationDropdown />

            <Link 
              to={`/${tenant_slug}/staff/perfil`}
              className="w-9 h-9 rounded-full bg-surface-variant hover:border-brand/40 border border-transparent transition-all flex items-center justify-center overflow-hidden"
              title="Meu Perfil"
            >
              <span className="material-symbols-outlined text-ink-soft text-[18px]">person</span>
            </Link>
          </div>
        </header>

        {/* Outlet Canvas com largura total e padding responsivo (§9.6·J8) */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>

      {/* Toast de Notificação */}
      {notificationToast.show && (
        <div className="fixed top-20 right-4 z-[100] bg-surface text-ink px-4 py-3 rounded-2xl shadow-card border border-brand/20 flex items-center gap-2.5 animate-fade-in">
          <span className="material-symbols-outlined text-brand text-[20px]">notifications_active</span>
          <span className="text-sm font-semibold">{notificationToast.message}</span>
        </div>
      )}

    </div>
  );
};

export default AdminLayout;
