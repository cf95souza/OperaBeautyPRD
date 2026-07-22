import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const AcessoTelefone = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [businessHours, setBusinessHours] = useState([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);

  React.useEffect(() => {
    if (tenant?.id) {
      api.settings.getBusinessHours(tenant.id)
        .then((data) => {
          if (data) {
            setBusinessHours(data.sort((a, b) => a.day_of_week - b.day_of_week));
          }
        })
        .catch(err => console.error("Erro ao carregar horários:", err));
    }
  }, [tenant]);

  const formatPhone = (value) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    
    if (v.length > 10) {
        v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    } else if (v.length > 6) {
        v = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
    } else if (v.length > 2) {
        v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    } else if (v.length > 0) {
        v = `(${v}`;
    }
    return v;
  };

  const handlePhoneChange = (e) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tenant) {
      setError("Salão não configurado ou inativo. Contate o administrador.");
      return;
    }
    
    if (phone.length < 14) return;
    
    setLoading(true);
    try {
      const { action } = await api.auth.checkClientExists(tenant.id, phone);
      if (action === 'login') {
        navigate(`/${tenant_slug}/acesso-senha`, { state: { phone } });
      } else if (action === 'register') {
        navigate(`/${tenant_slug}/cadastro`, { state: { phone } });
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao verificar telefone. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen font-body-md text-on-surface bg-background">
      <main className="flex-grow flex flex-col items-center px-container-margin pt-[calc(env(safe-area-inset-top,0px)+40px)] pb-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 -z-10 w-64 h-64 bg-primary-fixed opacity-20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 -z-10 w-72 h-72 bg-secondary-container opacity-30 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3"></div>
        
        <div className="w-full max-w-md flex flex-col items-center text-center animate-fade-in-up">
          <header className="mb-xl">
            <div className="flex flex-col items-center gap-sm">
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
              <h1 className="font-headline-md text-headline-md font-semibold text-primary tracking-tight">{tenant?.name || 'Serene Beauty'}</h1>
            </div>
          </header>

          <div className="w-full mb-lg">
            <img 
              className="w-full aspect-[4/3] object-cover rounded-3xl shadow-premium mb-lg" 
              alt="Beauty Spa environment" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0lmx1ogRGahvge5467Oei_h2Ymvaj_nE7LBksQ8zKBZy0rlQg_rfa6SOC8RbIhbh5bqY7VRaB3PlKXh3oHdk-vLRIdIBC9tTYSN0mt2FDGD9tLCTGxRj8RK4hcMzAwsv19gSq879TjByzaP7jecxaIvxjrO_m3K3nQ9ZmgHq7j2DxuhOid1LGOskqBU3DEJJ_WT0s3p_SwEmhdALdH0NusT4EVHaezcWZoqtHnuAZ3EoJB0sFrT5nvlV4NCx3OK6JCGnKAK3R4Z42"
            />
          </div>

          <section className="w-full space-y-md">
            <div className="space-y-xs">
              <h2 className="font-serif text-headline-md font-semibold text-on-surface">Bem-vindo ao {tenant?.name || 'Serene Beauty'}</h2>
              <p className="text-on-surface-variant font-body-md">Sua jornada de autocuidado e luxo começa aqui.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-lg pt-md">
              <div className="text-left">
                <Input
                  id="phone"
                  type="tel"
                  label="Digite seu telefone"
                  value={phone}
                  onChange={handlePhoneChange}
                  required
                  placeholder="(00) 00000-0000"
                  error={error}
                  startIcon="phone"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                size="lg"
                disabled={loading || phone.length < 14}
                isLoading={loading}
                endIcon="arrow_forward"
              >
                Próximo
              </Button>
            </form>

            <div className="pt-lg flex items-center justify-center gap-xs">
              <div className="h-[1px] w-8 bg-outline-variant"></div>
              <p className="text-label-sm font-medium text-outline-variant uppercase tracking-widest">Acesso Cliente</p>
              <div className="h-[1px] w-8 bg-outline-variant"></div>
            </div>
            
            <div className="pt-sm">
               <button 
                onClick={() => navigate(`/${tenant_slug}/staff/login`)}
                className="text-label-md text-primary hover:underline"
              >
                Sou funcionário / Gestor
              </button>
            </div>

            {/* Ícones de Redes Sociais */}
            {(tenant?.social_instagram || tenant?.social_facebook || tenant?.social_whatsapp) && (
              <div className="pt-md flex items-center justify-center gap-md">
                {tenant?.social_instagram && (
                  <a 
                    href={tenant.social_instagram.startsWith('http') ? tenant.social_instagram : `https://${tenant.social_instagram}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-surface border border-outline-variant flex items-center justify-center hover:border-primary text-secondary hover:text-primary shadow-sm transition-all duration-200"
                    title="Instagram"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                    </svg>
                  </a>
                )}
                {tenant?.social_whatsapp && (
                  <a 
                    href={tenant.social_whatsapp.startsWith('http') ? tenant.social_whatsapp : `https://wa.me/${tenant.social_whatsapp.replace(/\D/g, '')}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-surface border border-outline-variant flex items-center justify-center hover:border-primary text-secondary hover:text-primary shadow-sm transition-all duration-200"
                    title="WhatsApp"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                       <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-5.824 4.74-10.563 10.573-10.564 5.832.001 10.566 4.739 10.566 10.564 0 5.826-4.733 10.562-10.566 10.562z"/>
                    </svg>
                  </a>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Modais omitidos no refactoring por concisão, mas podem ser facilmente migrados usando o novo Card */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm">
           <div className="bg-surface rounded-3xl p-6 shadow-premium max-w-sm w-full border border-outline-variant relative">
             <h3 className="font-serif text-headline-md mb-4 text-primary">Localização</h3>
             <p className="text-body-md text-on-surface-variant mb-6">{tenant?.address}</p>
             <Button variant="outline" className="w-full" onClick={() => setIsLocationModalOpen(false)}>Fechar</Button>
           </div>
        </div>
      )}

      {isHoursModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm">
           <div className="bg-surface rounded-3xl p-6 shadow-premium max-w-sm w-full border border-outline-variant relative">
             <h3 className="font-serif text-headline-md mb-4 text-primary">Horários</h3>
             <div className="space-y-2 mb-6">
               {businessHours.map(h => (
                 <div key={h.day_of_week} className="flex justify-between text-body-md text-on-surface-variant">
                   <span>{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][h.day_of_week]}</span>
                   <span>{h.is_closed ? 'Fechado' : `${h.open_time.slice(0,5)} - ${h.close_time.slice(0,5)}`}</span>
                 </div>
               ))}
             </div>
             <Button variant="outline" className="w-full" onClick={() => setIsHoursModalOpen(false)}>Fechar</Button>
           </div>
        </div>
      )}
    </div>
  );
};

export default AcessoTelefone;
