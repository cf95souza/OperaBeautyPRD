import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { NavegacaoInferior } from './ui/NavegacaoInferior.jsx';

export const ClienteBottomNavBar = ({ activeTab, tenantSlug }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant } = useTenant();

  // Verifica se o salão possui o módulo de Clube no plano (ou feature flag ativa)
  const hasClube = tenant?.features?.clube !== false;

  // Não exibir durante o funil de agendamento (conforme DoD do plano)
  const isBookingFlow = location.pathname.includes('/agendar/');
  if (isBookingFlow) {
    return null;
  }

  const rotas = {
    home: `/${tenantSlug}/home`,
    agenda: `/${tenantSlug}/historico`,
    clube: `/${tenantSlug}/clube`,
    perfil: `/${tenantSlug}/perfil`,
  };

  const handleMudarAba = (aba) => {
    if (activeTab !== aba && rotas[aba]) {
      navigate(rotas[aba]);
    }
  };

  const handleClicarAgendar = () => {
    navigate(`/${tenantSlug}/agendar/servicos`);
  };

  return (
    <NavegacaoInferior
      abaAtiva={activeTab}
      aoMudarAba={handleMudarAba}
      aoClicarAgendar={handleClicarAgendar}
      temClube={hasClube}
    />
  );
};

export default ClienteBottomNavBar;
