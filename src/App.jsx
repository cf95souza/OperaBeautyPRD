import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { api } from './lib/api';


// --- Context ---
import { NotificationProvider } from './context/NotificationProvider';
import { Crown } from 'lucide-react';
import PwaUpdatePrompt from './components/PwaUpdatePrompt';

// --- Páginas Novas do Design System ---
import AcessoProfissional from './pages/AcessoProfissional';
import AcessoTelefone from './pages/AcessoTelefone';
import AcessoSenha from './pages/AcessoSenha';
import CadastroCliente from './pages/CadastroCliente';
import AgendamentoServicos from './pages/AgendamentoServicos';
import AgendamentoProfissionais from './pages/AgendamentoProfissionais';
import AgendamentoHorarios from './pages/AgendamentoHorarios';
import AgendamentoRevisao from './pages/AgendamentoRevisao';
import AgendamentoConfirmado from './pages/AgendamentoConfirmado';
import HistoricoAgendamentos from './pages/HistoricoAgendamentos';
import HomeCliente from './pages/HomeCliente';
import PerfilCliente from './pages/PerfilCliente';
import ClienteAnamnese from './pages/ClienteAnamnese';
import AgendaProfissional from './pages/AgendaProfissional';
import FichaClienteCRM from './pages/FichaClienteCRM';
import ResumoAgendamento from './pages/ResumoAgendamento';
import AnamneseTemplate from './pages/admin/AnamneseTemplate';
import { BookingProvider } from './context/BookingContext';
import AdminLayout from './components/admin/AdminLayout';
import LandingPage from './pages/LandingPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CanalPrivacidadeDPO from './pages/CanalPrivacidadeDPO';
import ContratoOperadoraDPA from './pages/ContratoOperadoraDPA';
import PaginaPlanos from './pages/PaginaPlanos';
import PainelRevendedor from './pages/PainelRevendedor';
import PerfilProfissional from './pages/PerfilProfissional';
import ComissoesProfissional from './pages/ComissoesProfissional';
import ComprarGiftCard from './pages/ComprarGiftCard';
import IndiqueGanhe from './pages/IndiqueGanhe';
import NotificacoesCliente from './pages/NotificacoesCliente';
import UiKitShowcase from './pages/UiKitShowcase';
import DemoBanner from './components/DemoBanner';

// --- Contexto Multi-Tenant ---
import { TenantProvider, useTenant } from './context/TenantContext';

// --- Gate de Verificação do Salão ---
const TenantGate = () => {
  const { tenant, loading } = useTenant();
  const { tenant_slug } = useParams();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] text-[#2B2327]">
        <div className="w-10 h-10 border-4 border-[#8E3B4E] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-[#7D6B6E] font-medium tracking-wide">Carregando ambiente do salão...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] text-[#2B2327] px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#FDE8E8] text-[#B81D1D] flex items-center justify-center mb-4 shadow-xs">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#2B2327] mb-2 font-display">Salão não encontrado</h1>
        <p className="text-sm text-[#7D6B6E] max-w-md mb-6 leading-relaxed">
          Não foi possível localizar o estabelecimento <strong className="text-[#8E3B4E]">/{tenant_slug}</strong> ou ele está temporariamente indisponível.
        </p>
        <a 
          href="/" 
          className="px-5 py-2.5 bg-[#8E3B4E] text-white rounded-xl text-sm font-medium shadow-xs hover:opacity-95 transition"
        >
          Conhecer o OperaBeauty
        </a>
      </div>
    );
  }

  return (
    <>
      <DemoBanner />
      <Outlet />
    </>
  );
};

// --- Wrapper para Proteger as Rotas do Salão ---
const TenantWrapper = () => {
  return (
    <TenantProvider>
      <BookingProvider>
        <TenantGate />
      </BookingProvider>
    </TenantProvider>
  );
};

// --- Rota Protegida Super Admin ---
const SuperAdminProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await api.auth.me();
        if (userData && userData.role === 'superadmin') {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch (err) {
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-surface text-on-surface font-body-md">Validando acesso...</div>;
  if (!authorized) return <Navigate to="/superadmin/login" replace />;

  return children || <Outlet />;
};

// --- Rota Protegida Staff ---
const StaffProtectedRoute = ({ children }) => {
  const { session, loading } = useTenant();
  const { tenant_slug } = useParams();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-surface text-on-surface font-body-md">Validando acesso...</div>;
  if (!session || (session.role !== 'professional' && session.role !== 'manager' && session.role !== 'admin')) {
    return <Navigate to={`/${tenant_slug}/staff/login`} replace />;
  }

  return children || <Outlet />;
};

// --- Rota Protegida de Feature Premium ---
const FeatureProtectedRoute = ({ feature, children }) => {
  const { tenant, loading } = useTenant();
  const { tenant_slug } = useParams();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-surface text-on-surface font-body-md">Validando recursos...</div>;
  
  const hasFeature = tenant?.features?.[feature] || 
    tenant?.features?.[feature.toUpperCase()] ||
    Object.keys(tenant?.features || {}).some(k => k.toLowerCase() === feature.toLowerCase() || (feature === 'pdv' && k.toLowerCase().includes('pdv')));

  if (!hasFeature) {
    return <Navigate to={`/${tenant_slug}/staff/admin/upgrade-plan`} replace />;
  }

  return children || <Outlet />;
};

// --- Rota de Redirecionamento da Raiz Staff ---
const StaffRootRedirect = () => {
  const { tenant_slug } = useParams();
  const { session } = useTenant();
  
  if (session) {
    if (session.role === 'manager' || session.role === 'admin') {
      return <Navigate to={`/${tenant_slug}/staff/admin/dashboard`} replace />;
    } else if (session.role === 'professional') {
      return <Navigate to={`/${tenant_slug}/staff/agenda-profissional`} replace />;
    }
  }
  
  return <Navigate to={`/${tenant_slug}/staff/login`} replace />;
};

// --- Componente Principal ---
import DashboardAdmin from './pages/admin/DashboardAdmin';
import GestaoFinanceira from './pages/admin/GestaoFinanceira';
import GestaoEquipe from './pages/admin/GestaoEquipe';
import GestaoServicos from './pages/admin/GestaoServicos';
import GestaoClientes from './pages/admin/GestaoClientes';
import ConfiguracoesOperacionais from './pages/admin/ConfiguracoesOperacionais';
import BrandingCustomizacao from './pages/admin/BrandingCustomizacao';
import LookbookAdmin from './pages/admin/LookbookAdmin';
import GestaoGiftCards from './pages/admin/GestaoGiftCards';
import ControleEstoque from './pages/admin/ControleEstoque';
import RelatoriosBI from './pages/admin/RelatoriosBI';
import GestaoLGPD from './pages/admin/GestaoLGPD';
import AssinaturaSaaS from './pages/admin/AssinaturaSaaS';
import GestaoAssinaturas from './pages/admin/GestaoAssinaturas';
import GestaoPacotes from './pages/admin/GestaoPacotes';
import ClubeFidelidade from './pages/ClubeFidelidade';
import FidelidadeCarteira from './pages/FidelidadeCarteira';
import PDV from './pages/admin/PDV';
import GestaoCampanhas from './pages/admin/GestaoCampanhas';
import GestaoAvaliacoes from './pages/admin/GestaoAvaliacoes';
import GestaoIndicacoes from './pages/admin/GestaoIndicacoes';
import GestaoMiniSite from './pages/admin/GestaoMiniSite';
import MiniSiteSalao from './pages/MiniSiteSalao';
import UpgradePlanRequired from './pages/admin/UpgradePlanRequired';
import SuperAdmin from './pages/superadmin/SuperAdmin';
import SuperAdminLogin from './pages/superadmin/SuperAdminLogin';
import TenantDetailAdmin from './pages/superadmin/TenantDetailAdmin';
import TenantListAdmin from './pages/superadmin/TenantListAdmin';
import PlanosAdmin from './pages/superadmin/PlanosAdmin';
import ParceirosAdmin from './pages/superadmin/ParceirosAdmin';
import SettingsAdmin from './pages/superadmin/SettingsAdmin';
import EquipeAdmin from './pages/superadmin/EquipeAdmin';
import AvisosAdmin from './pages/superadmin/AvisosAdmin';
import AuditoriaAdmin from './pages/superadmin/AuditoriaAdmin';
import FeatureFlagsAdmin from './pages/superadmin/FeatureFlagsAdmin';
import SuperAdminLayout from './components/superadmin/SuperAdminLayout';

function App() {
  return (
    <NotificationProvider>
      <PwaUpdatePrompt />
      <BrowserRouter>
        <Routes>
          {/* Rota Raiz (SaaS Global) */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/planos" element={<PaginaPlanos />} />
          <Route path="/parceiros" element={<PainelRevendedor />} />
          <Route path="/revenda" element={<Navigate to="/parceiros" replace />} />
          <Route path="/privacidade" element={<PrivacyPolicy />} />
          <Route path="/politica-de-privacidade" element={<Navigate to="/privacidade" replace />} />
          <Route path="/termos" element={<TermsOfService />} />
          <Route path="/termos-de-uso" element={<Navigate to="/termos" replace />} />
          <Route path="/dpo" element={<CanalPrivacidadeDPO />} />
          <Route path="/privacidade/canal" element={<Navigate to="/dpo" replace />} />
          <Route path="/dpa" element={<ContratoOperadoraDPA />} />
          <Route path="/contrato-operadora" element={<Navigate to="/dpa" replace />} />
          <Route path="/ui-kit" element={<UiKitShowcase />} />

          {/* Rotas Super Admin (SaaS Mestre) */}
          <Route path="/superadmin/login" element={<SuperAdminLogin />} />
          <Route element={<SuperAdminProtectedRoute />}>
            <Route element={<SuperAdminLayout />}>
              <Route path="/superadmin" element={<SuperAdmin />} />
              <Route path="/superadmin/tenants" element={<TenantListAdmin />} />
              <Route path="/superadmin/tenants/:id" element={<TenantDetailAdmin />} />
              <Route path="/superadmin/planos" element={<PlanosAdmin />} />
              <Route path="/superadmin/parceiros" element={<ParceirosAdmin />} />
              <Route path="/superadmin/equipe" element={<EquipeAdmin />} />
              <Route path="/superadmin/features" element={<FeatureFlagsAdmin />} />
              <Route path="/superadmin/avisos" element={<AvisosAdmin />} />
              <Route path="/superadmin/auditoria" element={<AuditoriaAdmin />} />
              <Route path="/superadmin/configuracoes" element={<SettingsAdmin />} />
            </Route>
          </Route>

          {/* Rotas Multi-Tenant (Todas encapsuladas no slug do salão) */}
          <Route path="/:tenant_slug" element={<TenantWrapper />}>
            
            {/* Rota Raiz do Salão (Redireciona para login ou dashboard) */}
            <Route index element={<Navigate to="home" replace />} />

            {/* Rotas Públicas do Salão */}
            <Route path="site" element={<MiniSiteSalao />} />
            <Route path="home" element={<HomeCliente />} />
            <Route path="agendar" element={<Navigate to="agendar/servicos" replace />} />
            <Route path="servicos" element={<Navigate to="agendar/servicos" replace />} />
            <Route path="agendar/servicos" element={<AgendamentoServicos />} />
            <Route path="agendar/profissionais" element={<AgendamentoProfissionais />} />
            <Route path="agendar/horarios" element={<AgendamentoHorarios />} />
            <Route path="agendar/revisao" element={<AgendamentoRevisao />} />
            <Route path="agendar/confirmado" element={<AgendamentoConfirmado />} />
            <Route path="historico" element={<HistoricoAgendamentos />} />
            <Route path="perfil" element={<PerfilCliente />} />
            <Route path="anamnese" element={<ClienteAnamnese />} />
            <Route path="clube" element={<ClubeFidelidade />} />
            <Route path="carteira" element={<FidelidadeCarteira />} />
            <Route path="presentear" element={<ComprarGiftCard />} />
            <Route path="indique-e-ganhe" element={<IndiqueGanhe />} />
            <Route path="notificacoes" element={<NotificacoesCliente />} />
            <Route path="ui-kit" element={<UiKitShowcase />} />
            {/* Jornada de Login (Cliente e Staff) */}
            <Route path="login" element={<AcessoTelefone />} />
            <Route path="acesso-senha" element={<AcessoSenha />} />
            <Route path="cadastro" element={<CadastroCliente />} />
            <Route path="staff" element={<StaffRootRedirect />} />
            <Route path="staff/login" element={<AcessoProfissional />} />
            <Route element={<StaffProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="staff/agendamento/:id" element={<ResumoAgendamento />} />
                <Route path="staff/ficha-cliente/:id" element={<FichaClienteCRM />} />
                <Route path="staff/agenda-profissional" element={<AgendaProfissional />} />
                <Route path="staff/comissoes" element={<ComissoesProfissional />} />
                <Route path="staff/perfil" element={<PerfilProfissional />} />
                <Route path="staff/admin/dashboard" element={<DashboardAdmin />} />
                <Route path="staff/admin/financeiro" element={<GestaoFinanceira />} />
                <Route path="staff/admin/equipe" element={<GestaoEquipe />} />
                <Route path="staff/admin/clientes" element={<GestaoClientes />} />
                <Route path="staff/admin/anamnese" element={<AnamneseTemplate />} />
                <Route path="staff/admin/campanhas" element={<GestaoCampanhas />} />
                <Route path="staff/admin/indicacoes" element={<GestaoIndicacoes />} />
                <Route path="staff/admin/avaliacoes" element={<GestaoAvaliacoes />} />
                <Route path="staff/admin/servicos" element={<GestaoServicos />} />
                <Route path="staff/admin/configuracoes" element={<ConfiguracoesOperacionais />} />
                <Route path="staff/admin/lgpd" element={<GestaoLGPD />} />
                <Route path="staff/admin/assinaturas" element={<GestaoAssinaturas />} />
                <Route path="staff/admin/branding" element={<BrandingCustomizacao />} />
                <Route path="staff/admin/minisite" element={<GestaoMiniSite />} />
                <Route path="staff/admin/lookbook" element={<LookbookAdmin />} />
                <Route path="staff/admin/estoque" element={<ControleEstoque />} />
                <Route path="staff/admin/assinatura" element={<AssinaturaSaaS />} />
                <Route path="staff/admin/upgrade-plan" element={<UpgradePlanRequired />} />
                
                {/* Rotas Protegidas por Feature Premium */}
                <Route element={<FeatureProtectedRoute feature="clube" />}>
                  <Route path="staff/admin/assinaturas" element={<GestaoAssinaturas />} />
                </Route>
                <Route element={<FeatureProtectedRoute feature="pdv" />}>
                  <Route path="staff/admin/pdv" element={<PDV />} />
                </Route>
                <Route element={<FeatureProtectedRoute feature="giftcards" />}>
                  <Route path="staff/admin/giftcards" element={<GestaoGiftCards />} />
                </Route>
                <Route element={<FeatureProtectedRoute feature="bi_reports" />}>
                  <Route path="staff/admin/relatorios-bi" element={<RelatoriosBI />} />
                </Route>
                <Route element={<FeatureProtectedRoute feature="packages" />}>
                  <Route path="staff/admin/pacotes" element={<GestaoPacotes />} />
                </Route>
              </Route>
            </Route>

          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </NotificationProvider>
  );
}

export default App;
