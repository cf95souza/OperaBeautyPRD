import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Calendar, 
  Scissors, 
  Package, 
  UserCircle, 
  LogOut,
  X 
} from 'lucide-react';

const ProfessionalSidebar = ({ profile, onLogout, onClose }) => {
  const menuItems = [
    { to: '/portal', icon: Calendar, label: 'Minha Agenda' },
    { to: '/servicos', icon: Scissors, label: 'Serviços' },
    { to: '/estoque', icon: Package, label: 'Estoque' },
    { to: '/minha-conta', icon: UserCircle, label: 'Meu Perfil' },
  ];

  return (
    <div className="h-full w-full bg-white flex flex-col overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-sm">
            {profile?.full_name?.[0]}
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Profissional</p>
            <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">{profile?.full_name?.split(' ')[0]}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-300 hover:text-slate-900 transition-colors md:hidden">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) => `
              flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all
              ${isActive 
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' 
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}
            `}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-100 shrink-0">
        <button 
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-4 py-3.5 text-rose-500 bg-rose-50 rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all"
        >
          <LogOut size={18} />
          Sair da Conta
        </button>
      </div>
    </div>
  );
};

export default ProfessionalSidebar;
