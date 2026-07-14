import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import ClienteBottomNavBar from '../components/ClienteBottomNavBar';

const HomeCliente = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, session } = useTenant();
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);

  const banners = Array.isArray(tenant?.banners) && tenant.banners.length > 0
    ? tenant.banners
    : (tenant?.banner_url || tenant?.banner_title || tenant?.banner_subtitle)
      ? [
          {
            id: 'legacy',
            url: tenant.banner_url,
            title: tenant.banner_title,
            subtitle: tenant.banner_subtitle
          }
        ]
      : [];

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners]);

  useEffect(() => {
    if (!tenant) return;
    const fetchServices = async () => {
      setLoadingServices(true);
      try {
        const data = await api.services.list(tenant.id);
        if (data) {
          // Apenas os 5 primeiros que estão ativos
          setServices(data.filter(s => s.is_active).slice(0, 5));
        }
      } catch (err) {
        console.error("Erro ao carregar serviços:", err);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, [tenant]);

  return (
    <div className="bg-background text-on-background min-h-screen pb-[80px] md:pb-0 font-body-md text-body-md antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* TopAppBar */}
      <header className="w-full top-0 sticky z-40 bg-surface shadow-sm transition-all duration-300 ease-in-out pt-[calc(env(safe-area-inset-top,0px)+28px)] pb-2 md:pt-4">
        <div className="flex justify-between items-center px-gutter py-sm w-full max-w-7xl mx-auto">
          <div className="w-10"></div>{/* Spacer to keep title centered */}
          <div className="flex items-center justify-center gap-2 flex-1">
            {tenant?.logo_url ? (
              <img 
                src={tenant.logo_url} 
                alt={tenant.name} 
                className="h-8 md:h-10 object-contain rounded-md" 
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <span className="material-symbols-outlined text-primary font-headline-md text-headline-md shrink-0">spa</span>
            )}
            <h1 className="font-headline-md text-headline-md-mobile md:text-headline-md text-primary tracking-tight">
              {tenant?.name || 'Carregando...'}
            </h1>
          </div>
          <div className="w-10"></div>{/* Spacer to keep title centered */}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-container-margin md:px-xl py-lg space-y-xl animate-fade-in-up">
        
        {/* Hero Section */}
        <section className="space-y-sm">
          <div className="mb-md">
            <h2 className="font-headline-lg-mobile md:text-headline-lg text-on-surface">
              Olá, {session?.name ? session.name.split(' ')[0] : 'Bem-vindo(a)'}
            </h2>
            <p className="text-secondary">
              {tenant?.welcome_message || 'Encontre sua serenidade hoje.'}
            </p>
          </div>
        </section>

        {/* Primary Actions (Bento Grid Style) */}
        <section className="grid grid-cols-2 gap-md">
          <button 
            onClick={() => navigate(`/${tenant_slug}/agendar/servicos`)}
            className="flex flex-col items-start p-lg bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0px_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 group border border-surface-variant/50 relative overflow-hidden text-left animate-fade-in"
          >
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-12 h-12 flex items-center justify-center bg-primary-container text-on-primary-container rounded-full mb-lg relative z-10 shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-headline-md">calendar_add_on</span>
            </div>
            <span className="font-label-md text-label-md text-on-surface relative z-10 group-hover:text-primary transition-colors">Agendar Novo<br />Horário</span>
          </button>

          <button 
            onClick={() => navigate(`/${tenant_slug}/historico`)}
            className="flex flex-col items-start p-lg bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0px_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 group border border-surface-variant/50 relative overflow-hidden text-left animate-fade-in"
          >
            <div className="absolute inset-0 bg-surface-variant/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-12 h-12 flex items-center justify-center bg-surface-variant text-on-surface-variant rounded-full mb-lg relative z-10 shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-headline-md">history</span>
            </div>
            <span className="font-label-md text-label-md text-on-surface relative z-10 group-hover:text-on-surface-variant transition-colors">Meus<br />Agendamentos</span>
          </button>
        </section>

        {/* Assinaturas & Planos (Glassmorphism Card) */}
        <section className="relative rounded-xl overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-surface-variant/30">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-container/40 to-surface-container-lowest/80 backdrop-blur-md z-0"></div>
          <div className="relative z-10 p-lg flex items-center justify-between">
            <div className="space-y-base">
              <div className="flex items-center space-x-2 text-primary">
                <span className="material-symbols-outlined filled text-body-md" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider">Fidelidade</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Clube {tenant?.name ? tenant.name.split(' ')[0] : ''}</h3>
              <p className="text-secondary text-sm md:text-base">Em breve benefícios exclusivos para você.</p>
            </div>
            <button className="bg-primary text-on-primary rounded-full p-3 hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </section>

        {/* Banners Promocionais (Carrossel Dinâmico) */}
        {banners.length > 0 && (
          <section className="w-full overflow-hidden relative rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] group">
            {/* Wrapper deslizante */}
            <div 
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * (100 / banners.length)}%)`, width: `${banners.length * 100}%` }}
            >
              {banners.map((slide, idx) => (
                <div key={slide.id || idx} className="w-full h-40 md:h-56 relative shrink-0 overflow-hidden" style={{ width: `${100 / banners.length}%` }}>
                  {slide.url ? (
                    <img 
                      src={slide.url} 
                      alt={slide.title || 'Banner promocional'} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div 
                      className="w-full h-full"
                      style={{
                        background: `linear-gradient(135deg, ${tenant?.primary_color || '#7c5357'}, ${tenant?.secondary_color || '#eeb9bd'})`
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-lg">
                    {slide.title && (
                      <h3 className="text-white font-headline-md text-headline-md-mobile md:text-headline-md shadow-sm">
                        {slide.title}
                      </h3>
                    )}
                    {slide.subtitle && (
                      <p className="text-white/90 text-sm md:text-base mt-1 shadow-sm">
                        {slide.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Indicadores de Slide (Dots) */}
            {banners.length > 1 && (
              <div className="absolute bottom-sm left-1/2 -translate-x-1/2 flex items-center gap-xs z-10">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      currentSlide === idx ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'
                    }`}
                    aria-label={`Ir para slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Serviços Especiais (Horizontal Scroll) */}
        <section className="space-y-md">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-md text-headline-md text-on-surface">Recomendações</h3>
            <button onClick={() => navigate(`/${tenant_slug}/agendar/servicos`)} className="text-primary font-label-md text-label-md hover:underline">Ver todos</button>
          </div>
          <div className="flex overflow-x-auto hide-scrollbar space-x-md pb-4 -mx-container-margin px-container-margin md:mx-0 md:px-0">
            {loadingServices ? (
              <div className="flex items-center justify-center w-full py-10">
                <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
              </div>
            ) : services.length === 0 ? (
              <div className="text-secondary py-4 w-full text-center">Nenhum serviço disponível no momento.</div>
            ) : (
              services.map(service => (
                <div key={service.id} onClick={() => navigate(`/${tenant_slug}/agendar/servicos`)} className="min-w-[280px] w-[70vw] md:w-1/3 bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] overflow-hidden shrink-0 group cursor-pointer border border-transparent hover:border-primary-container/30">
                  <div className="h-40 bg-surface-container overflow-hidden relative">
                    <div className="w-full h-full flex items-center justify-center text-primary/20">
                        <span className="material-symbols-outlined text-[64px]">spa</span>
                    </div>
                    <div className="absolute top-sm right-sm bg-surface-container-lowest/80 backdrop-blur-sm rounded-full p-1.5 text-primary">
                      <span className="material-symbols-outlined text-[18px]">favorite</span>
                    </div>
                  </div>
                  <div className="p-md space-y-xs">
                    <h4 className="font-label-md text-label-md text-on-surface line-clamp-1">{service.name}</h4>
                    <p className="text-secondary text-sm">R$ {parseFloat(service.price).toFixed(2).replace('.', ',')} • {service.duration_minutes} min</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
        {/* Espaçador de segurança para a BottomNavBar móvel */}
        <div className="h-24 md:hidden"></div>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <ClienteBottomNavBar activeTab="home" tenantSlug={tenant_slug} />
    </div>
  );
};

export default HomeCliente;
