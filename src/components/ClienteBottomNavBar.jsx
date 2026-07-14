import React from 'react';
import { useNavigate } from 'react-router-dom';

const ClienteBottomNavBar = ({ activeTab, tenantSlug }) => {
  const navigate = useNavigate();

  const tabs = [
    { id: 'home', label: 'Início', icon: 'spa', path: `/${tenantSlug}/home` },
    { id: 'agenda', label: 'Agenda', icon: 'calendar_month', path: `/${tenantSlug}/historico` },
    { id: 'perfil', label: 'Perfil', icon: 'person', path: `/${tenantSlug}/perfil` }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] bg-surface/95 backdrop-blur-lg shadow-[0px_-4px_24px_rgba(0,0,0,0.06)] rounded-t-2xl border-t border-outline-variant/10">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => !isActive && navigate(tab.path)}
            className="flex flex-col items-center justify-center w-20 py-1 transition-all duration-200 relative"
          >
            {/* Ícone Minimalista */}
            <div className={`mb-1 flex items-center justify-center transition-all duration-200 ${
              isActive 
                ? 'text-primary scale-110' 
                : 'text-secondary/60 hover:text-secondary'
            }`}>
              <span 
                className="material-symbols-outlined text-[26px]" 
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {tab.icon}
              </span>
            </div>
            {/* Texto */}
            <span className={`font-label-sm text-[11px] font-semibold tracking-wide transition-colors ${
              isActive ? 'text-primary' : 'text-secondary/60'
            }`}>
              {tab.label}
            </span>
            {/* Sutil indicador de linha ativo embaixo do texto */}
            {isActive && (
              <div className="absolute -bottom-1 w-6 h-[3px] bg-primary rounded-full animate-fade-in"></div>
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default ClienteBottomNavBar;
