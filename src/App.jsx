import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { supabase } from './lib/supabase';

// --- Components ---
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Birthdays from './pages/Birthdays';
import ClientDetail from './pages/ClientDetail';
import Settings from './pages/Settings';
import Agenda from './pages/Agenda';
import Services from './pages/Services';
import Employees from './pages/Employees';
import Inventory from './pages/Inventory';
import PublicBooking from './pages/PublicBooking';
import Maintenance from './pages/Maintenance';
import ProfileSettings from './pages/ProfileSettings';
import ProfessionalPortal from './pages/ProfessionalPortal';
import { Clock, Bell, ShieldOff, AlertCircle, Loader2 } from 'lucide-react';

// --- Protected Route Wrapper ---
const ProtectedRoute = ({ children, allowedRoles, profile, session, initializing }) => {
  if (initializing) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to={profile.role === 'professional' ? '/portal' : '/'} replace />;
  }
  return children || <Outlet />;
};

// --- Login Page ---
const Login = ({ setProfile, setSession, branding }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // 1. Tentar Login Oficial (Supabase Auth)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (authError) {
      // 2. Tentar Login Interno (Nossa Tabela)
      const { data: internalData, error: internalError } = await supabase.rpc('cap_verify_login', {
        p_email: email,
        p_password: password
      });

      if (internalError || !internalData || internalData.length === 0) {
        alert('Falha no login: Credenciais inválidas ou conta inativa.');
      } else {
        // Login Interno Sucesso
        const user = internalData[0];
        const sessionData = { ...user, access_email: email };
        localStorage.setItem('cap_internal_session', JSON.stringify(sessionData));
        
        // Atualiza estados para disparar o redirecionamento reativo
        setProfile(user);
        setSession({ user: { id: user.user_id, email: email }, isInternal: true });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb] p-6 lg:p-0">
      <div className="w-full max-w-md space-y-12 animate-in fade-in duration-1000">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-serif text-slate-900 tracking-tight">{branding?.salonName || 'Capelli'}</h1>
          <p className="text-slate-500 uppercase tracking-widest text-[10px] font-bold">Acesso ao Sistema</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Seu E-mail</label>
            <input 
              type="email" 
              required
              className="input-base"
              placeholder="exemplo@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Senha de Acesso</label>
            <input 
              type="password" 
              required
              className="input-base"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="btn-accent w-full py-4 text-sm font-bold shadow-xl shadow-accent/20"
          >
            {loading ? 'Validando Acesso...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="pt-8 border-t border-slate-50 text-center">
          <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest">
            Acesso Restrito à Equipe {branding?.salonName || 'Capelli'}
          </p>
        </div>
      </div>
    </div>
  );
};

const AccountDisabled = ({ onLogout }) => (
  <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb] p-6">
    <div className="max-w-md w-full bg-white rounded-[2rem] p-10 shadow-2xl shadow-accent/10 border border-slate-50 text-center space-y-8 animate-in zoom-in-95 duration-700">
      <div className="w-24 h-24 bg-accent/5 rounded-full flex items-center justify-center mx-auto relative overflow-hidden">
        <ShieldOff className="text-accent animate-pulse" size={48} />
      </div>
      
      <div className="space-y-3">
        <h2 className="text-3xl font-serif text-slate-900 tracking-tight">Acesso Suspenso</h2>
        <p className="text-slate-500 text-sm leading-relaxed">
          Olá. Notamos que sua conta não está ativa no momento. Entre em contato com o gestor do salão para reabilitar seu acesso ao sistema.
        </p>
      </div>

      <div className="p-4 bg-accent/5 rounded-2xl text-accent text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2">
        <AlertCircle size={14} /> Segurança Capelli
      </div>

      <button 
        onClick={onLogout}
        className="text-stone-400 text-xs font-bold hover:text-rose-500 transition-colors uppercase tracking-widest"
      >
        Sair / Tentar outro acesso
      </button>
    </div>
  </div>
);

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [branding, setBranding] = useState({ salonName: 'Capelli', primaryColor: '#be185d' });

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('cap_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setProfile(data);
      return data;
    } catch (err) {
      console.warn("Retrying profile fetch due to possible lock or missing record...");
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    let profileSubscription = null;
    
    // FAIL-SAFE: Se em 3.5 segundos não carregar, libera a tela por força
    const fallbackTimer = setTimeout(() => {
      if (mounted && initializing) {
        console.warn("Fail-safe: Forçando saída do estado de inicialização.");
        setInitializing(false);
      }
    }, 3500);

    // Unificando a inicialização para evitar NavigatorLockAcquireTimeoutError
    const initApp = async () => {
      try {
        // 1. Verificar Sessão Interna (LocalStorage)
        const savedSession = localStorage.getItem('cap_internal_session');
        if (savedSession) {
          const internalUser = JSON.parse(savedSession);
          setProfile(internalUser);
          setSession({ user: { id: internalUser.user_id, email: internalUser.access_email }, isInternal: true });
          setInitializing(false);
          return;
        }

        // 2. Pega a sessão oficial do Supabase
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        setSession(initialSession);
        
        if (initialSession) {
          await fetchProfile(initialSession.user.id);

          // ESCUTANDO MUDANÇAS EM TEMPO REAL NO PERFIL (Apenas para Oficiais)
          profileSubscription = supabase
            .channel(`profile-${initialSession.user.id}`)
            .on('postgres_changes', { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'cap_profiles', 
              filter: `id=eq.${initialSession.user.id}` 
            }, (payload) => {
              if (mounted) {
                console.log("Perfil atualizado em tempo real:", payload.new);
                setProfile(payload.new);
              }
            })
            .subscribe();
        }
      } catch (err) {
        console.error("Erro na carga inicial:", err);
      } finally {
        if (mounted) {
          setInitializing(false);
          clearTimeout(fallbackTimer);
        }
      }
    };

    const loadBranding = async () => {
      const { data } = await supabase.from('cap_settings').select('primary_color, salon_name').maybeSingle();
      if (data) {
        setBranding({ salonName: data.salon_name || 'Capelli', primaryColor: data.primary_color || '#be185d' });
        if (data.primary_color) {
          document.documentElement.style.setProperty('--dynamic-accent', data.primary_color);
        }
      }
    };

    initApp();
    loadBranding();

    // 2. Escuta mudanças oficiais, mas limpa a interna se necessário
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('cap_internal_session');
      }

      setSession(currentSession);
      if (currentSession) {
        fetchProfile(currentSession.user.id);
      } else if (!localStorage.getItem('cap_internal_session')) {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (profileSubscription) supabase.removeChannel(profileSubscription);
      clearTimeout(fallbackTimer);
    };
  }, []);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb]">
         <div className="text-center space-y-6 animate-in fade-in duration-700">
            <h1 className="text-5xl font-serif text-slate-200 tracking-tighter select-none">{branding.salonName}</h1>
            <div className="relative w-12 h-12 mx-auto">
              <div className="absolute inset-0 border-4 border-accent/10 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Conectando ao Sistema</p>
              <p className="text-[9px] text-slate-300 italic">Sincronizando dados...</p>
            </div>
         </div>
      </div>
    );
  }

  // LÓGICA DE BLOQUEIO DE SEGURANÇA (Contas Inativas)
  const isDisabled = session && profile && !profile.is_active;
  
  if (isDisabled) {
    return (
      <AccountDisabled onLogout={() => supabase.auth.signOut()} />
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* redirecionamento de profissional logado na raiz */}
        <Route 
          path="/" 
          element={
            initializing ? null : 
            !session ? <Navigate to="/login" replace /> :
            profile?.role === 'professional' ? <Navigate to="/portal" replace /> :
            <Navigate to="/dashboard" replace />
          } 
        />
        
        {/* --- Public Access Area --- */}
        <Route path="/agendar" element={<PublicBooking branding={branding} />} />
        <Route path="/login" element={!session ? <Login setSession={setSession} setProfile={setProfile} branding={branding} /> : <Navigate to="/" />} />
        
        {/* --- Protected Area (Admin/Profissional) --- */}
        <Route element={
          <ProtectedRoute session={session} profile={profile} initializing={initializing}>
            <Layout user={session?.user} profile={profile} branding={branding} />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']} session={session} profile={profile} initializing={initializing}>
              <Dashboard profile={profile} />
            </ProtectedRoute>
          } />
          <Route path="/clientes" element={
            <ProtectedRoute allowedRoles={['admin']} session={session} profile={profile} initializing={initializing}>
              <Clients />
            </ProtectedRoute>
          } />
          <Route path="/clientes/:id" element={<ClientDetail />} />
          <Route path="/aniversariantes" element={<Birthdays />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/servicos" element={
            <ProtectedRoute allowedRoles={['admin', 'professional']} session={session} profile={profile} initializing={initializing}>
              <Services profile={profile} />
            </ProtectedRoute>
          } />
          <Route path="/profissionais" element={
            <ProtectedRoute allowedRoles={['admin']} session={session} profile={profile} initializing={initializing}>
              <Employees />
            </ProtectedRoute>
          } />
          <Route path="/estoque" element={
            <ProtectedRoute allowedRoles={['admin', 'professional']} session={session} profile={profile} initializing={initializing}>
              <Inventory profile={profile} />
            </ProtectedRoute>
          } />
          <Route path="/manutencao" element={
            <ProtectedRoute allowedRoles={['admin']} session={session} profile={profile} initializing={initializing}>
              <Maintenance />
            </ProtectedRoute>
          } />
          <Route path="/configuracoes" element={
            <ProtectedRoute allowedRoles={['admin']} session={session} profile={profile} initializing={initializing}>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/minha-conta" element={<ProfileSettings />} />
          <Route path="/portal" element={
            <ProtectedRoute allowedRoles={['professional', 'admin']} session={session} profile={profile} initializing={initializing}>
              <ProfessionalPortal />
            </ProtectedRoute>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
