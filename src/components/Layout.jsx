import React from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Crown, 
  Calendar, 
  Users, 
  Scissors, 
  Package, 
  TrendingUp, 
  LogOut,
  Bell,
  Search,
  Cake,
  Settings,
  User as UserIcon,
  Menu,
  X as CloseIcon,
  Menu as MenuIcon
} from 'lucide-react';
import ProfessionalSidebar from './ProfessionalSidebar';

const Layout = ({ children, user, profile, branding }) => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const isProfessional = profile?.role === 'professional';

  const handleLogout = async () => {
    localStorage.removeItem('cap_internal_session');
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: TrendingUp, label: 'Dashboard', end: true, adminOnly: true },
    { to: '/agenda', icon: Calendar, label: 'Agenda' },
    { to: '/clientes', icon: Users, label: 'Clientes' },
    { to: '/manutencao', icon: Bell, label: 'Manutenção' },
    { to: '/aniversariantes', icon: Cake, label: 'Aniversariantes' },
    { to: '/profissionais', icon: Crown, label: 'Profissionais', adminOnly: true },
    { to: '/servicos', icon: Scissors, label: 'Serviços', adminOnly: true },
    { to: '/estoque', icon: Package, label: 'Estoque', adminOnly: true },
    { to: '/configuracoes', icon: Settings, label: 'Configurações', adminOnly: true },
    { to: '/minha-conta', icon: UserIcon, label: 'Minha Conta' },
  ];

  const filteredNav = navItems.filter(item => !item.adminOnly || (profile?.role === 'admin'));

  return (
    <div className="flex h-screen bg-secondary overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className={`bg-white border-r border-slate-200 hidden md:flex flex-col ${isProfessional ? 'w-72' : 'w-64'}`}>
        {isProfessional ? (
          <ProfessionalSidebar profile={profile} onLogout={handleLogout} />
        ) : (
          <>
            <div className="h-16 flex items-center px-6 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-2">
                <Crown className="text-accent w-5 h-5" />
                <span className="text-[15px] font-serif font-bold tracking-tight truncate max-w-[180px]">{branding?.salonName || 'Capelli'}</span>
              </div>
            </div>
            
            <nav className="flex-1 px-4 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2 italic">Menu</p>
              {filteredNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `
                    flex items-center gap-3 w-full px-3 py-2 rounded-md font-medium text-sm transition-all
                    ${isActive 
                      ? 'bg-rose-50 text-rose-600 border border-rose-100 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}
                  `}
                >
                  <item.icon size={16} /> {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="p-4 border-t border-slate-100">
              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-md font-medium text-sm transition-all"
              >
                <LogOut size={16} /> Sair do Sistema
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden p-2 text-slate-500 bg-slate-50 rounded-xl"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            
            {!isProfessional && (
              <div className="relative w-full hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar clientes, agendamentos..." 
                  className="w-full bg-slate-50 border-none rounded-full py-1.5 pl-10 pr-4 text-xs focus:ring-1 focus:ring-accent/50 outline-none"
                />
              </div>
            )}

            {isProfessional && (
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Portal do Profissional</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-6 ml-6">
            {!isProfessional && (
              <button className="relative text-slate-500 hover:text-slate-900 transition-colors">
                <Bell size={18} />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              </button>
            )}
            
            <div className="flex items-center gap-3 pl-6 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-none">{profile?.full_name || 'Carregando...'}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-tighter mt-1">{profile?.role === 'admin' ? 'Administrador' : 'Profissional'}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0 uppercase">
                {profile?.full_name?.[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100] md:hidden animate-in fade-in duration-300">
             <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
             <div className={`relative h-full flex flex-col animate-in slide-in-from-left duration-500 shadow-2xl bg-white ${isProfessional ? 'w-80' : 'w-72'}`}>
                {isProfessional ? (
                  <ProfessionalSidebar 
                    profile={profile} 
                    onLogout={handleLogout} 
                    onClose={() => setIsMobileMenuOpen(false)} 
                  />
                ) : (
                  <div className="h-full flex flex-col">
                    <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
                       <div className="flex items-center gap-2">
                          <Crown className="text-accent w-5 h-5" />
                          <span className="text-[15px] font-serif font-bold tracking-tight truncate max-w-[180px]">{branding?.salonName || 'Capelli'}</span>
                       </div>
                       <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400"><CloseIcon size={20} /></button>
                    </div>
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                       {filteredNav.map((item) => (
                          <NavLink
                             key={item.to}
                             to={item.to}
                             onClick={() => setIsMobileMenuOpen(false)}
                             className={({ isActive }) => `
                                flex items-center gap-3 w-full px-4 py-3 rounded-xl font-bold text-sm transition-all mb-2
                                ${isActive ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-slate-500 hover:bg-slate-50'}
                             `}
                          >
                             <item.icon size={18} /> {item.label}
                          </NavLink>
                       ))}
                    </nav>
                    <div className="p-6 border-t border-slate-100">
                       <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-rose-500 bg-rose-50 rounded-xl font-bold text-sm">
                          <LogOut size={18} /> Sair
                       </button>
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto ${isProfessional ? 'p-4 md:p-8' : 'p-6 md:p-8'} max-w-[1400px] mx-auto w-full`}>
          {children || <Outlet />}
        </div>
      </div>
    </div>
  );
};

export default Layout;
