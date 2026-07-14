import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const AcessoProfissional = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, loginStaff } = useTenant();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha e-mail e senha.');
      setLoading(false);
      return;
    }

    try {
      const data = await loginStaff(email, password);

      if (data) {
        // Direcionar de acordo com a role
        if (data.role === 'manager') {
          navigate(`/${tenant_slug}/staff/admin/dashboard`);
        } else {
          navigate(`/${tenant_slug}/staff/agenda-profissional`);
        }
      } else {
        setError('E-mail ou senha inválidos.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao processar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background antialiased min-h-screen flex items-center justify-center p-gutter md:p-0">
      <div className="w-full max-w-[1024px] flex flex-col md:flex-row bg-surface rounded-3xl md:rounded-[40px] shadow-premium overflow-hidden min-h-[600px] border border-outline-variant">
        
        {/* Image Section (Desktop Only) */}
        <div className="hidden md:block md:w-1/2 relative bg-surface-container">
          <img 
            alt="Spa interior" 
            className="absolute inset-0 w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUPnRMkAaP3fjFFG7IFw7QHsrroWNFmOBHMWnmyvvawxSViimXi_cId57WtKtxA1ep3z4Oy93rQEh0_zsXt6FMJZcfD6Qy6NZj2NAYzkt62X2YFxdtBBq_ZFMgKQrgxb9SHAeml_fAHc0qBmx0MTSNwJUiBY8r8XZqDuSDh-MpbJjZ8HI1jCpq2QuBu050ww5wR4QOFhXraGlIBhv0s9s2FW2hI_29CJkbjB0qJ88ltzYBG_J-oDb8oZYU8TW8RqABnZTytdvOUjuA"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-xl left-xl right-xl text-white">
            <span className="font-headline-md text-headline-md block mb-sm">{tenant?.name || 'Radiant Salon'}</span>
            <p className="font-body-md text-body-md opacity-90">Gestão e excelência para nossa equipe.</p>
          </div>
        </div>

        {/* Login Form Section */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-lg py-xl md:px-xl">
          <div className="w-full max-w-[384px] mx-auto">
            
            {/* Mobile Brand (Hidden on Desktop) */}
            <div className="md:hidden mb-xl text-center flex flex-col items-center">
              {tenant?.logo_url ? (
                <img 
                  src={tenant.logo_url} 
                  alt={tenant.name} 
                  className="h-16 object-contain mb-1 rounded-lg shadow-sm bg-surface p-1" 
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <span className="material-symbols-outlined text-primary text-[48px] mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>spa</span>
              )}
              <span className="font-headline-md text-headline-md text-primary">{tenant?.name || 'Radiant Salon'}</span>
            </div>
            
            <div className="mb-xl text-center md:text-left">
              <h1 className="font-serif text-headline-lg-mobile md:text-headline-lg text-on-surface mb-sm">
                Acesso Equipe
              </h1>
              <p className="font-body-md text-on-surface-variant">
                Bem-vindo(a) de volta. Insira suas credenciais para acessar o painel.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-lg flex flex-col">
              
              {/* Phone Input */}
              <Input
                id="email"
                type="email"
                label="E-mail Institucional"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="gestor@salao.com.br"
                startIcon="mail"
              />

              {/* Password Input */}
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  startIcon="lock"
                  error={error}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-10 text-outline hover:text-primary transition-colors focus:outline-none"
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {/* Actions Row */}
              <div className="flex items-center justify-between pt-sm">
                <label className="flex items-center gap-sm cursor-pointer group">
                  <input className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary transition-all cursor-pointer accent-primary" type="checkbox" />
                  <span className="font-label-md text-on-surface-variant group-hover:text-on-surface transition-colors">Lembrar-me</span>
                </label>
                <a className="font-label-sm text-primary hover:text-on-primary-fixed-variant transition-colors hover:underline cursor-pointer">
                  Esqueci minha senha
                </a>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-lg"
                disabled={loading}
                isLoading={loading}
                endIcon={!loading ? "arrow_forward" : undefined}
              >
                Entrar
              </Button>

            </form>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default AcessoProfissional;
