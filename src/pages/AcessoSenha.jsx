import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const AcessoSenha = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant, loginClient } = useTenant();
  
  const [phone, setPhone] = useState(location.state?.phone || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!phone) {
      navigate(`/${tenant_slug}/login`);
    }
  }, [phone, navigate, tenant_slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await loginClient(phone, password);
      
      if (data) {
        navigate(`/${tenant_slug}/home`); 
      } else {
        setError('Senha incorreta.');
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao realizar login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background font-body-md text-on-surface selection:bg-primary-container selection:text-on-primary-container min-h-screen flex flex-col">
      <header className="w-full bg-transparent flex items-center justify-between px-container-margin pt-[calc(env(safe-area-inset-top,0px)+32px)] pb-md z-40 max-w-md mx-auto shrink-0">
        <div className="w-6 flex items-center justify-start">
          <button 
            onClick={() => navigate(-1)} 
            aria-label="Voltar" 
            className="hover:opacity-80 transition-opacity active:scale-95 duration-150 text-primary flex items-center justify-center"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-center">
          {tenant?.logo_url ? (
            <img 
              src={tenant.logo_url} 
              alt={tenant.name} 
              className="h-8 object-contain rounded bg-surface p-0.5 shadow-sm" 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <span className="material-symbols-outlined text-primary text-[24px] shrink-0">spa</span>
          )}
          <span className="font-serif text-headline-md font-semibold text-primary tracking-tight">
            {tenant?.name || 'Serene Beauty'}
          </span>
        </div>
        <div className="w-6"></div>
      </header>

      <main className="flex-grow flex flex-col items-center px-container-margin pt-xl pb-lg relative">
        <div className="relative w-full max-w-md aspect-[4/3] rounded-3xl overflow-hidden mb-xl shadow-premium">
          <img 
            alt="Spa Interior" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAX9lBuc4OUxQunjttUlB9g9uJlLw-UiNGP7l30r2RuUjBdqmIwQ_B8lv1-O_lQ184F3oBJvehMv-jao-ePyTZjj7eqt9IBY3LdJdvRbwF_muMRFnF_KGptD8x62jKcnQCP3gjRt6gGUc-hrcHZNG7gZibsTqz2F1EEBcrcOoyyvScLNX3-jZfhWgUgv8-i2GrAdIX_qMtPQHDxarxDM8SwFrR5qQe7TEGfIA5v7ImpmGlT1AYAOOmUFjVk3qqmFSpLDYMqRXqhyF5D"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background to-70%"></div>
        </div>

        <div className="w-full max-w-md animate-fade-in-up">
          <div className="text-left mb-lg">
            <p className="font-semibold text-label-md text-secondary mb-1">{phone}</p>
            <h2 className="font-serif text-headline-md font-semibold text-on-surface mb-2">
              Olá! Digite sua senha para continuar
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-lg">
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                label="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                error={error}
                startIcon="lock"
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

            <div className="flex flex-col gap-md pt-sm">
              <Button 
                type="submit" 
                variant="primary"
                size="lg"
                className="w-full"
                disabled={loading || password.length < 3}
                isLoading={loading}
                startIcon={!loading ? "login" : undefined}
              >
                Entrar
              </Button>
              <div className="flex flex-col items-center gap-2">
                <button 
                  type="button" 
                  className="text-center font-semibold text-label-md text-primary hover:underline decoration-2 underline-offset-4 transition-all"
                >
                  Esqueci minha senha
                </button>
                <button 
                  type="button" 
                  onClick={() => navigate(`/${tenant_slug}/cadastro`, { state: { phone } })}
                  className="text-center font-medium text-label-sm text-on-surface-variant hover:text-primary transition-all mt-2"
                >
                  Não tem uma conta? Cadastre-se
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="mt-auto pt-xl opacity-20">
          <span className="material-symbols-outlined text-[64px] text-primary">spa</span>
        </div>
      </main>
    </div>
  );
};

export default AcessoSenha;
