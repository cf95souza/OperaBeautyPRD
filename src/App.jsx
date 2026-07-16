import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { api } from './lib/api';


// --- Context ---
import { NotificationProvider } from './context/NotificationProvider';
import { Crown } from 'lucide-react';

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
import AgendaProfissional from './pages/AgendaProfissional';
import FichaClienteCRM from './pages/FichaClienteCRM';
import ResumoAgendamento from './pages/ResumoAgendamento';
import { BookingProvider } from './context/BookingContext';
import AdminLayout from './components/admin/AdminLayout';
import LandingPage from './pages/LandingPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import PerfilProfissional from './pages/PerfilProfissional';

// --- Contexto Multi-Tenant ---
import { TenantProvider, useTenant } from './context/TenantContext';
// --- Wrapper para Proteger as Rotas do Salão ---
const TenantWrapper = () => {
  return (
    <TenantProvider>
      <BookingProvider>
        <Outlet />
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

// --- Rota de Redirecionamento da Raiz Staff ---
const StaffRootRedirect = () => {
  const { tenant_slug } = useParams();
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
import ControleEstoque from './pages/admin/ControleEstoque';
import AssinaturaSaaS from './pages/admin/AssinaturaSaaS';
import SuperAdmin from './pages/superadmin/SuperAdmin';
import SuperAdminLogin from './pages/superadmin/SuperAdminLogin';
import TenantDetailAdmin from './pages/superadmin/TenantDetailAdmin';
import TenantListAdmin from './pages/superadmin/TenantListAdmin';
import PlanosAdmin from './pages/superadmin/PlanosAdmin';
import SettingsAdmin from './pages/superadmin/SettingsAdmin';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [initializing, setInitializing] = useState(false); // Simplificado provisoriamente
  const [branding, setBranding] = useState({ salonName: 'OperaBeauty', primaryColor: '#7c5357', logoUrl: '' });

  // A lógica antiga de Supabase Auth foi temporariamente isolada aqui
  // pois precisará ser inteiramente refeita para usar a nova tabela `cap_staff` com RPC (Fase 22 concluída, agora aplicar no frontend).

  return (
    <NotificationProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota Raiz (SaaS Global) */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacidade" element={<PrivacyPolicy />} />
          <Route path="/termos" element={<TermsOfService />} />

          {/* Rotas Super Admin (SaaS Mestre) */}
          <Route path="/superadmin/login" element={<SuperAdminLogin />} />
          <Route element={<SuperAdminProtectedRoute />}>
            <Route path="/superadmin" element={<SuperAdmin />} />
            <Route path="/superadmin/tenants" element={<TenantListAdmin />} />
            <Route path="/superadmin/tenants/:id" element={<TenantDetailAdmin />} />
            <Route path="/superadmin/planos" element={<PlanosAdmin />} />
            <Route path="/superadmin/configuracoes" element={<SettingsAdmin />} />
          </Route>

          {/* Rotas Multi-Tenant (Todas encapsuladas no slug do salão) */}
          <Route path="/:tenant_slug" element={<TenantWrapper />}>
            
            {/* Rota Raiz do Salão (Redireciona para login ou dashboard) */}
            <Route index element={<Navigate to="home" replace />} />

            {/* Rotas Públicas do Salão */}
            <Route path="home" element={<HomeCliente />} />
            <Route path="agendar" element={<Navigate to="servicos" replace />} />
            <Route path="agendar/servicos" element={<AgendamentoServicos />} />
            <Route path="agendar/profissionais" element={<AgendamentoProfissionais />} />
            <Route path="agendar/horarios" element={<AgendamentoHorarios />} />
            <Route path="agendar/revisao" element={<AgendamentoRevisao />} />
            <Route path="agendar/confirmado" element={<AgendamentoConfirmado />} />
            <Route path="historico" element={<HistoricoAgendamentos />} />
            <Route path="perfil" element={<PerfilCliente />} />
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
                <Route path="staff/perfil" element={<PerfilProfissional />} />
                <Route path="staff/admin/dashboard" element={<DashboardAdmin />} />
                <Route path="staff/admin/financeiro" element={<GestaoFinanceira />} />
                <Route path="staff/admin/equipe" element={<GestaoEquipe />} />
                <Route path="staff/admin/clientes" element={<GestaoClientes />} />
                <Route path="staff/admin/servicos" element={<GestaoServicos />} />
                <Route path="staff/admin/configuracoes" element={<ConfiguracoesOperacionais />} />
                <Route path="staff/admin/branding" element={<BrandingCustomizacao />} />
                <Route path="staff/admin/estoque" element={<ControleEstoque />} />
                <Route path="staff/admin/assinatura" element={<AssinaturaSaaS />} />
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
