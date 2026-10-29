import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle,
  Sparkles,
  Layers,
  Database,
  LockKeyhole
} from 'lucide-react';

const SuperAdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [step, setStep] = useState('credentials'); // 'credentials' | '2fa'
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Por favor, informe seu e-mail e senha de administrador.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.auth.loginSuperAdmin(email.trim(), password);
      
      // Se a conta do Super Admin exigir 2FA TOTP (C13)
      if (res.require_2fa) {
        setTempToken(res.temp_token);
        setStep('2fa');
        setTotpCode('');
        return;
      }

      // Salva no localStorage para uso do SuperAdminProtectedRoute e me()
      localStorage.setItem('operabeauty_token', res.token);
      localStorage.setItem('operabeauty_user', JSON.stringify(res.user));
      
      navigate('/superadmin');
    } catch (err) {
      console.error('Erro no login do Super Admin:', err);
      if (err.status === 401 || err.message?.toLowerCase().includes('inválid')) {
        setError('Credenciais mestres incorretas. Verifique seu e-mail e senha.');
      } else if (err.status === 429) {
        setError('Muitas tentativas consecutivas. Aguarde alguns instantes por segurança.');
      } else {
        setError(err.message || 'Erro de conexão com o servidor de segurança.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2Fa = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanCode = totpCode.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setError('Por favor, informe o código de 6 dígitos do seu autenticador.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.auth.verifySuperAdmin2Fa(tempToken, cleanCode);
      localStorage.setItem('operabeauty_token', res.token);
      localStorage.setItem('operabeauty_user', JSON.stringify(res.user));
      navigate('/superadmin');
    } catch (err) {
      console.error('Erro ao validar 2FA:', err);
      if (err.status === 401 || err.message?.toLowerCase().includes('inválid')) {
        setError('Código 2FA incorreto ou expirado. Verifique o relógio do seu dispositivo.');
      } else if (err.status === 429) {
        setError('Muitas tentativas incorretas. Aguarde alguns minutos.');
      } else {
        setError(err.message || 'Erro ao validar segundo fator.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg relative p-4 sm:p-6 md:p-8 font-sans text-ink selection:bg-brand-tint selection:text-brand overflow-hidden">
      
      {/* Esferas decorativas translúcidas (Rosé Editorial) */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-tint/70 blur-3xl opacity-80"
      />
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#E5D2BA]/25 blur-3xl opacity-80"
      />

      {/* Card Principal Split */}
      <div className="w-full max-w-[1020px] bg-white rounded-[28px] md:rounded-[36px] border border-line shadow-[0_25px_70px_-15px_rgba(43,35,39,0.08)] overflow-hidden flex flex-col md:flex-row relative z-10 animate-fade-in-up">
        
        {/* Coluna da Esquerda: Vitrine Institucional Master (Desktop) */}
        <div className="hidden md:flex md:w-5/12 lg:w-1/2 relative min-h-[620px] flex-col justify-between p-8 lg:p-10 text-white overflow-hidden bg-gradient-to-br from-[#231A1E] via-[#2D1B22] to-[#1A1215] select-none">
          
          {/* Texturas e brilhos sutis no fundo escuro */}
          <div 
            aria-hidden="true" 
            className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#7C3A4D]/35 blur-2xl" 
          />
          <div 
            aria-hidden="true" 
            className="pointer-events-none absolute bottom-0 right-0 w-96 h-96 rounded-full bg-[#C89D66]/15 blur-3xl" 
          />

          {/* Topo da vitrine */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-rose-100 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-300" />
              <span>Painel de Controle SaaS Mestre</span>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-3xl lg:text-4xl font-normal tracking-tight text-white leading-tight">
                OperaBeauty <span className="italic font-light text-rose-200">SaaS</span>
              </h2>
              <p className="mt-3 text-xs lg:text-sm text-stone-300 leading-relaxed max-w-sm">
                Ambiente de alta governança para orquestração de inquilinos, faturamento recorrente, auditoria de infraestrutura e gestão global.
              </p>
            </div>
          </div>

          {/* Destaques Centrais em Cartões Compactos */}
          <div className="relative z-10 my-8 space-y-3">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-rose-300 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Multi-Tenant Isolado</h4>
                <p className="text-[11px] text-stone-300">Isolamento rigoroso por salão e dados criptografados.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-rose-300 shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">PostgreSQL Dedicado & Redis</h4>
                <p className="text-[11px] text-stone-300">Alta performance, cache inteligente e réplica de segurança.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-rose-300 shrink-0">
                <LockKeyhole className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Trilha de Auditoria Audit Trail</h4>
                <p className="text-[11px] text-stone-300">Rastreabilidade integral de ações críticas e suspensão segura.</p>
              </div>
            </div>
          </div>

          {/* Rodapé da vitrine */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-stone-400">
            <span>© 2026 OperaBeauty Platform</span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sistemas Operacionais
            </span>
          </div>
        </div>

        {/* Coluna da Direita: Formulário de Autenticação */}
        <div className="w-full md:w-7/12 lg:w-1/2 p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
          
          {/* Topo do Formulário */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 transition-colors font-medium group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Página inicial</span>
              </Link>

              <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full bg-[#F6E4E4] text-[#7C3A4D] border border-rose-200/60">
                <Lock className="w-3 h-3" />
                Super Admin
              </span>
            </div>

            {/* Cabeçalho do Card */}
            <div className="mb-7">
              <div className="w-12 h-12 rounded-2xl bg-[#F6E4E4] text-[#7C3A4D] flex items-center justify-center font-display font-bold text-xl mb-4 border border-rose-200/60 shadow-2xs">
                {step === '2fa' ? <ShieldCheck className="w-6 h-6 text-[#7C3A4D]" /> : 'OB'}
              </div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">
                {step === '2fa' ? 'Segundo Fator de Autenticação' : 'Acesso do Mestre'}
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 mt-1.5 leading-relaxed">
                {step === '2fa' 
                  ? 'Abra seu aplicativo autenticador (Google Authenticator, Authy) e digite o código de 6 dígitos.' 
                  : 'Entre com as suas credenciais de administrador da plataforma OperaBeauty.'}
              </p>
            </div>

            {/* Mensagem de Erro Semântica */}
            {error && (
              <div 
                role="alert" 
                className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5 animate-scale-in"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{error}</div>
              </div>
            )}

            {/* Formulário Etapa 2: Código 2FA TOTP */}
            {step === '2fa' ? (
              <form onSubmit={handleVerify2Fa} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5 text-center">
                    Código de 6 dígitos
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoFocus
                      required
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                      placeholder="000000"
                      className="w-full bg-stone-50/80 border border-stone-200 rounded-2xl py-3.5 text-center text-2xl font-mono tracking-[0.4em] text-stone-900 placeholder:text-stone-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3A4D]/20 focus:border-[#7C3A4D] transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-stone-400 text-center mt-2">
                    O código se renova a cada 30 segundos no seu celular.
                  </p>
                </div>

                {/* Botão de Validação */}
                <button
                  type="submit"
                  disabled={loading || totpCode.replace(/\D/g, '').length !== 6}
                  className="w-full bg-[#7C3A4D] hover:bg-[#682F40] active:scale-[0.99] text-white font-medium text-xs sm:text-sm py-3.5 px-6 rounded-full transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Validando segundo fator...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirmar e Entrar</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Voltar */}
                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setTempToken(''); setError(''); }}
                  className="w-full text-center text-xs text-stone-500 hover:text-stone-800 transition-colors pt-2 cursor-pointer"
                >
                  ← Voltar e usar outro e-mail
                </button>
              </form>
            ) : (
              /* Formulário Etapa 1: E-mail e Senha */
              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* E-mail */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    E-mail institucional
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-4 pointer-events-none" />
                    <input
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@operabeauty.com"
                      className="w-full bg-stone-50/80 border border-stone-200 rounded-2xl py-3 pl-11 pr-4 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3A4D]/20 focus:border-[#7C3A4D] transition-all"
                    />
                  </div>
                </div>

                {/* Senha */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-stone-700">
                      Chave de segurança (senha)
                    </label>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-4 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-stone-50/80 border border-stone-200 rounded-2xl py-3 pl-11 pr-11 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3A4D]/20 focus:border-[#7C3A4D] transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-stone-400 hover:text-stone-700 p-1 rounded-lg transition-colors cursor-pointer"
                      title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Opções: Lembrar de mim */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-stone-300 text-[#7C3A4D] focus:ring-[#7C3A4D] cursor-pointer accent-[#7C3A4D]"
                    />
                    <span className="text-xs text-stone-600">Manter sessão ativa</span>
                  </label>
                  
                  <span className="text-[11px] text-stone-400">
                    Protegido por 2FA / JWT
                  </span>
                </div>

                {/* Botão de Entrar */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#7C3A4D] hover:bg-[#682F40] active:scale-[0.99] text-white font-medium text-xs sm:text-sm py-3.5 px-6 rounded-full transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Autenticando mestre...</span>
                    </>
                  ) : (
                    <>
                      <span>Entrar no Painel Global</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

              </form>
            )}
          </div>

          {/* Rodapé Informativo */}
          <div className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C89D66]" />
              Painel Exclusivo da Gestão
            </span>
            <span>v1.0 Rosé Editorial</span>
          </div>

        </div>

      </div>

    </div>
  );
};

export default SuperAdminLogin;
