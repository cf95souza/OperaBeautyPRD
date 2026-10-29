import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2,
  HelpCircle,
  X
} from 'lucide-react';

const AcessoProfissional = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, session, loginStaff } = useTenant();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  React.useEffect(() => {
    if (session) {
      if (session.role === 'manager' || session.role === 'admin') {
        navigate(`/${tenant_slug}/staff/admin/dashboard`, { replace: true });
      } else if (session.role === 'professional') {
        navigate(`/${tenant_slug}/staff/agenda-profissional`, { replace: true });
      }
    }
  }, [session, navigate, tenant_slug]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha o e-mail e a senha.');
      setLoading(false);
      return;
    }

    try {
      const data = await loginStaff(email.trim(), password);

      if (data) {
        if (data.role === 'manager' || data.role === 'admin') {
          navigate(`/${tenant_slug}/staff/admin/dashboard`);
        } else {
          navigate(`/${tenant_slug}/staff/agenda-profissional`);
        }
      } else {
        setError('Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    } catch (err) {
      console.error(err);
      if (err.status === 401) {
        setError('E-mail ou senha incorretos.');
      } else if (err.status === 429) {
        setError('Muitas tentativas consecutivas. Aguarde alguns instantes.');
      } else {
        setError(err.message || 'Não foi possível conectar ao servidor. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const initialLetter = tenant?.name ? tenant.name.trim().charAt(0).toUpperCase() : (tenant_slug ? tenant_slug.charAt(0).toUpperCase() : 'O');

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg relative p-4 sm:p-6 md:p-8 font-sans text-ink selection:bg-brand-tint selection:text-brand overflow-hidden">
      
      {/* Círculos decorativos e calor de fundo (Rosé Editorial) */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-tint/60 blur-3xl opacity-70"
      />
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gold/15 blur-3xl opacity-70"
      />

      {/* Card Principal Split */}
      <div className="w-full max-w-[1020px] bg-surface rounded-[28px] md:rounded-[36px] border border-line shadow-[0_20px_60px_-15px_rgba(43,35,39,0.08)] overflow-hidden flex flex-col md:flex-row relative z-10 animate-fade-in-up">
        
        {/* Coluna da Esquerda: Vitrine Institucional da Equipe */}
        <div className="hidden md:flex md:w-5/12 lg:w-1/2 relative min-h-[640px] flex-col justify-between p-8 lg:p-10 text-white overflow-hidden bg-ink select-none">
          {/* Foto de alta estética de salão */}
          <img 
            alt="Ambiente do Salão" 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
            src={tenant?.banner_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80"}
          />
          
          {/* Camadas de gradiente para contraste perfeito */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/40 to-ink/25" />
          <div className="absolute inset-0 bg-brand/15 mix-blend-multiply" />

          {/* Topo do Banner */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-medium text-white tracking-wide shadow-xs">
              <ShieldCheck size={14} className="text-gold" />
              <span>Portal da Equipe</span>
            </div>

            <div className="text-[11px] font-medium text-white/70 uppercase tracking-widest">
              OperaBeauty SaaS
            </div>
          </div>

          {/* Rodapé do Banner */}
          <div className="relative z-10">
            {/* Monograma ou Logo do Salão */}
            <div className="w-14 h-14 rounded-full bg-surface/20 backdrop-blur-md border-2 border-gold flex items-center justify-center mb-4 shadow-sm">
              {tenant?.logo_url ? (
                <img 
                  src={tenant.logo_url} 
                  alt={tenant.name} 
                  className="w-full h-full object-cover rounded-full p-1"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <span className="font-display italic text-gold text-2xl font-bold leading-none">
                  {initialLetter}
                </span>
              )}
            </div>

            <h2 className="font-display text-2xl lg:text-3xl font-medium tracking-tight text-white mb-2 leading-snug">
              {tenant?.name || (tenant_slug ? tenant_slug.toUpperCase() : 'Portal da Equipe')}
            </h2>
            
            <p className="text-sm text-white/85 font-normal leading-relaxed max-w-sm mb-5">
              Gestão ágil da agenda, controle completo de clientes e excelência em cada atendimento.
            </p>

            {/* Destaques em pílulas */}
            <div className="flex flex-wrap gap-2 text-[11px] text-white/90">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/10">
                <CheckCircle2 size={12} className="text-gold" /> Agenda Dinâmica
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/10">
                <CheckCircle2 size={12} className="text-gold" /> CRM & Histórico
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/10">
                <CheckCircle2 size={12} className="text-gold" /> Gestão Segura
              </span>
            </div>
          </div>
        </div>

        {/* Coluna da Direita: Formulário de Autenticação */}
        <div className="w-full md:w-7/12 lg:w-1/2 flex flex-col justify-between p-6 sm:p-8 md:p-10 lg:p-12 bg-surface">
          
          {/* Topo: Atalho para o Portal do Cliente */}
          <div className="flex items-center justify-between mb-6">
            <Link 
              to={`/${tenant_slug}/login`} 
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-brand transition-colors group"
            >
              <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
              <span>Ir para o Portal da Cliente</span>
            </Link>

            <span className="text-[11px] font-semibold text-brand bg-brand-tint px-2.5 py-1 rounded-full uppercase tracking-wider">
              Área Restrita
            </span>
          </div>

          {/* Área Principal do Formulário */}
          <div className="w-full max-w-[390px] mx-auto my-auto py-2">
            
            {/* Cabeçalho do Card */}
            <div className="mb-6">
              <div className="w-12 h-12 rounded-full bg-brand-tint border-2 border-gold/70 flex items-center justify-center mb-3 shadow-xs">
                {tenant?.logo_url ? (
                  <img 
                    src={tenant.logo_url} 
                    alt={tenant.name} 
                    className="w-full h-full object-cover rounded-full p-1"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <span className="font-display italic text-brand text-xl font-bold leading-none">
                    {initialLetter}
                  </span>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl text-ink font-normal tracking-tight mb-2">
                Acesso da Equipe
              </h1>
              <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
                Bem-vinda(o) de volta! Insira seu e-mail e senha de staff para acessar a agenda e o painel.
              </p>
            </div>

            {/* Alerta de Erro Visual */}
            {error && (
              <div className="mb-5 p-3 rounded-2xl bg-[#FDE8E8] border border-[#F8B4B4] text-[#B81D1D] text-xs font-medium flex items-start gap-2.5 animate-shake">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Campo E-mail */}
              <div>
                <label 
                  htmlFor="staff-email" 
                  className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wider mb-2"
                >
                  E-mail Institucional <span className="text-brand">*</span>
                </label>
                <div className="relative flex items-center h-[52px] bg-bg/50 border border-line rounded-[16px] px-3.5 transition-all focus-within:border-brand focus-within:ring-4 focus-within:ring-brand-tint/60 focus-within:bg-surface">
                  <Mail size={18} className="text-ink-soft/70 shrink-0" />
                  <input
                    id="staff-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder="gestor@salao.com.br"
                    className="w-full h-full bg-transparent pl-3 pr-2 text-sm text-ink placeholder:text-ink-soft/40 outline-none font-sans"
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label 
                    htmlFor="staff-password" 
                    className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wider"
                  >
                    Senha de Acesso <span className="text-brand">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs text-brand font-medium hover:underline focus:outline-none"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                
                <div className="relative flex items-center h-[52px] bg-bg/50 border border-line rounded-[16px] px-3.5 transition-all focus-within:border-brand focus-within:ring-4 focus-within:ring-brand-tint/60 focus-within:bg-surface">
                  <Lock size={18} className="text-ink-soft/70 shrink-0" />
                  <input
                    id="staff-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full h-full bg-transparent pl-3 pr-10 text-sm text-ink placeholder:text-ink-soft/40 outline-none font-sans tracking-wider"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                    className="absolute right-3.5 text-ink-soft/70 hover:text-brand transition-colors p-1 rounded-md focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Linha Lembrar-me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                  <input 
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-line text-brand focus:ring-brand/30 accent-brand cursor-pointer"
                  />
                  <span className="text-xs text-ink-soft group-hover:text-ink transition-colors font-medium">
                    Lembrar-me neste dispositivo
                  </span>
                </label>
              </div>

              {/* Botão de Submissão com Visual Rosé Editorial */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[52px] mt-2 bg-brand text-white font-semibold text-sm rounded-[16px] shadow-[0_8px_20px_-4px_rgba(142,59,78,0.35)] hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-4 focus:ring-brand-tint"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Painel</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

            </form>
          </div>

          {/* Rodapé Informativo */}
          <div className="pt-6 mt-6 border-t border-line/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-soft text-center sm:text-left">
            <span>
              Não é da equipe?{' '}
              <Link to={`/${tenant_slug}/login`} className="text-brand font-semibold hover:underline">
                Agende um serviço
              </Link>
            </span>

            <span className="text-[11px] text-ink-soft/60">
              OperaBeauty SaaS • Seguro
            </span>
          </div>

        </div>

      </div>

      {/* Modal Educativo: Esqueci Minha Senha */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-surface rounded-[24px] border border-line shadow-2xl p-6 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full border border-line text-ink-soft hover:text-ink flex items-center justify-center hover:bg-bg transition-colors"
            >
              <X size={16} />
            </button>

            <div className="w-12 h-12 rounded-full bg-brand-tint text-brand flex items-center justify-center mb-4">
              <HelpCircle size={24} />
            </div>

            <h3 className="font-display text-xl text-ink font-semibold mb-2">
              Recuperação de Senha
            </h3>

            <p className="text-sm text-ink-soft leading-relaxed mb-4">
              Por questões de segurança da equipe do salão:
            </p>

            <div className="space-y-3 mb-6 bg-bg/60 p-4 rounded-xl border border-line/70 text-xs text-ink-soft leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-brand/10 text-brand font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <span>Se você é <strong>profissional da equipe</strong>, solicite a redefinição de sua senha diretamente ao <strong>Gestor do Salão</strong> pelo painel em <em>Gestão de Equipe</em>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-brand/10 text-brand font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <span>Se você é o <strong>Gestor ou Proprietário</strong> e não lembra da senha master, entre em contato com o suporte da plataforma OperaBeauty.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full h-11 bg-brand text-white font-medium text-sm rounded-xl hover:opacity-95 transition-opacity"
            >
              Compreendi
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AcessoProfissional;

