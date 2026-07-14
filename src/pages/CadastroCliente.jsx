import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

const CadastroCliente = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant, login } = useTenant();
  
  const [phone] = useState(location.state?.phone || '');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
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
      const { token, user } = await api.auth.registerClient(tenant.id, name, phone, password, birthDate || null);
      login(user, token);

      navigate(`/${tenant_slug}/home`);

    } catch (err) {
      console.error(err);
      setError("Erro ao realizar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start overflow-x-hidden bg-background font-body-md text-on-surface">
      <header className="w-full bg-transparent flex items-center justify-between px-container-margin pt-[calc(env(safe-area-inset-top,0px)+32px)] pb-md z-40 max-w-md mx-auto shrink-0">
        <div className="w-6 flex items-center justify-start">
          <button 
            onClick={() => navigate(-1)}
            className="active:scale-95 duration-150 hover:opacity-80 transition-opacity text-primary flex items-center justify-center"
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

      <main className="w-full max-w-md px-container-margin flex-grow flex flex-col pb-xl">
        <section className="mt-md mb-xl animate-fade-in-up">
          <div className="grid grid-cols-2 gap-sm h-48">
            <div className="bg-primary-container rounded-3xl overflow-hidden relative group transition-transform duration-500 hover:scale-[1.02]">
              <img 
                alt="Beauty Atmosphere" 
                className="w-full h-full object-cover opacity-80" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBY2D0vDZtjzyiwfZHAfSdcsfMe2eBgerm3GkEy1h9CfY63fh8WGVTjZGNdRzcni39FE13M0kmtTmgPqayJxgNT3XHeGPgetAL38r4C8IK6Nn2ZCm8wezHp_5m4MgbSHZwXUlyP8maVtAYWvPKPYqqVKtibIHPbxpqI_S56CsryrV0_6TqIS3AA-9I1kgLP7h-GhOvTETGtP82vQ-f9gGPmpTSUMbefEituG_cNFoyf0YLT1kB3X6XqNOEdFjSdbF8wF25PNvaUYC1b"
              />
              <div className="absolute inset-0 bg-primary/20 mix-blend-multiply"></div>
            </div>
            <div className="flex flex-col gap-sm">
              <div className="h-1/2 bg-surface-variant rounded-3xl flex items-center justify-center p-md">
                <span className="material-symbols-outlined text-primary text-[40px]">auto_awesome</span>
              </div>
              <div className="h-1/2 bg-surface-container rounded-3xl flex items-center justify-center p-md">
                <span className="material-symbols-outlined text-secondary text-[40px]">spa</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-lg animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h1 className="font-serif text-headline-md font-semibold text-on-surface mb-xs">
            Parece que você é novo por aqui!
          </h1>
          <p className="font-sans text-body-md text-on-surface-variant">
            Vamos fazer seu cadastro para você aproveitar a melhor experiência de beleza.
          </p>
        </section>

        <section className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <Card className="p-lg">
            <form onSubmit={handleSubmit} className="space-y-lg">
              {error && <p className="text-error text-label-sm">{error}</p>}
              
              <Input
                id="name"
                label="Nome completo"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Como quer ser chamado(a)?"
                startIcon="person"
              />

              <div className="relative">
                <label className="text-label-md text-on-surface block mb-1">Telefone</label>
                <div className="flex items-center h-12 w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 text-secondary opacity-70 cursor-not-allowed">
                  <span className="material-symbols-outlined text-outline text-[20px] mr-2">phone_android</span>
                  <input 
                    type="tel" 
                    value={phone}
                    readOnly
                    className="flex-1 bg-transparent focus:outline-none"
                  />
                  <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                </div>
              </div>

              <Input
                id="birthDate"
                label="Data de Nascimento"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
                startIcon="cake"
              />

              <Input
                id="password"
                label="Crie uma Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Mínimo 6 caracteres"
                startIcon="lock"
              />

              <div className="flex flex-col gap-2 bg-surface-container-low p-3 rounded-xl border border-surface-variant transition-all">
                <span className="text-label-sm font-label-sm text-secondary mb-1">Sua senha deve conter:</span>
                <div className="flex items-center gap-2 transition-colors duration-300">
                  <span className={`material-symbols-outlined text-[16px] ${password.length >= 6 ? 'text-[#10b981]' : 'text-secondary'}`} style={{ fontVariationSettings: password.length >= 6 ? "'FILL' 1" : "'FILL' 0" }}>
                    {password.length >= 6 ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className={`text-label-sm ${password.length >= 6 ? 'text-[#10b981] font-medium' : 'text-secondary'}`}>Mínimo de 6 caracteres</span>
                </div>
                <div className="flex items-center gap-2 transition-colors duration-300">
                  <span className={`material-symbols-outlined text-[16px] ${/[a-zA-Z]/.test(password) ? 'text-[#10b981]' : 'text-secondary'}`} style={{ fontVariationSettings: /[a-zA-Z]/.test(password) ? "'FILL' 1" : "'FILL' 0" }}>
                    {/[a-zA-Z]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className={`text-label-sm ${/[a-zA-Z]/.test(password) ? 'text-[#10b981] font-medium' : 'text-secondary'}`}>Pelo menos 1 letra</span>
                </div>
                <div className="flex items-center gap-2 transition-colors duration-300">
                  <span className={`material-symbols-outlined text-[16px] ${/[0-9]/.test(password) ? 'text-[#10b981]' : 'text-secondary'}`} style={{ fontVariationSettings: /[0-9]/.test(password) ? "'FILL' 1" : "'FILL' 0" }}>
                    {/[0-9]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className={`text-label-sm ${/[0-9]/.test(password) ? 'text-[#10b981] font-medium' : 'text-secondary'}`}>Pelo menos 1 número</span>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <input 
                  type="checkbox" 
                  id="terms" 
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
                />
                <label htmlFor="terms" className="text-label-sm text-on-surface-variant flex-1">
                  Li e concordo com os <a href="#" className="text-primary hover:underline">Termos de Serviço</a> e a <a href="#" className="text-primary hover:underline">Política de Privacidade (LGPD)</a>, consentindo com o tratamento dos meus dados.
                </label>
              </div>

              <div className="pt-md">
                <Button 
                  type="submit" 
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={loading || password.length < 6 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password) || name.length < 3 || !termsAccepted}
                  isLoading={loading}
                  endIcon={!loading ? "check_circle" : undefined}
                >
                  Finalizar Cadastro
                </Button>
              </div>
            </form>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default CadastroCliente;
