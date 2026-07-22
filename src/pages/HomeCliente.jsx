import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import ClienteBottomNavBar from '../components/ClienteBottomNavBar';
import PushNotificationManager from '../components/PushNotificationManager';
import ReviewModal from '../components/ReviewModal';
import AssinarTermoModal from '../components/AssinarTermoModal';

const HomeCliente = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, session } = useTenant();
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [lookbooks, setLookbooks] = useState([]);
  const [loadingLookbooks, setLoadingLookbooks] = useState(true);
  const [selectedLook, setSelectedLook] = useState(null);
  
  const [pendingReview, setPendingReview] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const [pendingConsents, setPendingConsents] = useState([]);
  const [selectedConsent, setSelectedConsent] = useState(null);

  const getVipBadge = (tier) => {
    const styles = {
      Prata: 'bg-slate-100 text-slate-700 border border-slate-200/80 shadow-[0_2px_4px_rgba(148,163,184,0.06)]',
      Ouro: 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]/60 shadow-[0_2px_4px_rgba(180,83,9,0.04)]',
      VIP: 'bg-[#FAF5FF] text-[#6B21A8] border border-[#E9D5FF]/60 shadow-[0_2px_4px_rgba(107,33,168,0.04)]',
      Black: 'bg-neutral-900 text-amber-200 border border-neutral-800 shadow-[0_2px_6px_rgba(0,0,0,0.12)] font-bold'
    };
    
    const label = tier || 'Prata';
    const styleClass = styles[label] || styles.Prata;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all duration-300 ${styleClass}`}>
        <span className="material-symbols-outlined text-[12px] filled" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
        {label}
      </span>
    );
  };

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

    const fetchWallet = async () => {
      try {
        const wallet = await api.wallets.getMyWallet();
        if (wallet) setWalletBalance(parseFloat(wallet.balance || 0));
      } catch (err) {
        console.error(err);
      }
    };

    const fetchLookbooks = async () => {
      setLoadingLookbooks(true);
      try {
        const data = await api.lookbook.list(tenant.id);
        setLookbooks(data || []);
      } catch (err) {
        console.error("Erro ao carregar lookbooks:", err);
      } finally {
        setLoadingLookbooks(false);
      }
    };

    const fetchPendingReviews = async () => {
      try {
        const pending = await api.request('/reviews/pending');
        if (pending) {
          setPendingReview(pending);
          setShowReviewModal(true);
        }
      } catch (err) {
        console.error("Erro ao buscar avaliações pendentes:", err);
      }
    };

    const fetchNotificationsCount = async () => {
      try {
        const notifs = await api.request('/notifications');
        if (notifs) {
          setUnreadCount(notifs.filter(n => !n.is_read).length);
        }
      } catch (err) {
        console.error("Erro ao buscar notificações:", err);
      }
    };

    const fetchPendingConsents = async () => {
      try {
        const consents = await api.request('/consents/pending');
        if (consents && consents.length > 0) {
          setPendingConsents(consents);
        }
      } catch (err) {
        console.error("Erro ao buscar termos pendentes:", err);
      }
    };

    fetchServices();
    fetchLookbooks();
    if (session && session.role === 'client') {
      fetchWallet();
      fetchPendingReviews();
      fetchNotificationsCount();
      fetchPendingConsents();
    }
  }, [tenant, session]);

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
          <div className="w-10 flex justify-end">
            <button 
              onClick={() => navigate(`/${tenant_slug}/notificacoes`)}
              className="text-primary hover:bg-surface-variant/30 p-2 rounded-full transition-colors relative"
            >
              <span className="material-symbols-outlined">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-3 h-3 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-container-margin md:px-xl py-lg space-y-xl animate-fade-in-up">
        
        {/* Hero Section */}
        <section className="space-y-sm">
          <PushNotificationManager tenantSlug={tenant_slug} />
          
          <div className="mb-md">
            <h2 className="font-headline-lg-mobile md:text-headline-lg text-on-surface flex items-center gap-2 flex-wrap">
              Olá, {session?.name ? session.name.split(' ')[0] : 'Bem-vindo(a)'}
              {session?.vip_tier && getVipBadge(session.vip_tier)}
            </h2>
            <p className="text-secondary">
              {tenant?.welcome_message || 'Encontre sua serenidade hoje.'}
            </p>
          </div>
        </section>

        {/* Alertas de Assinatura Pendente */}
        {pendingConsents.length > 0 && (
          <div className="bg-[#fff3e0] border border-[#ffb74d] rounded-2xl p-4 shadow-sm animate-fade-in-up flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
            <div className="flex gap-3 items-start">
              <span className="material-symbols-outlined text-[#e65100] mt-1 shrink-0">gavel</span>
              <div>
                <h3 className="font-headline-sm text-[#e65100]">Ação Necessária</h3>
                <p className="text-[#e65100]/80 text-sm font-medium">Você possui {pendingConsents.length} termo(s) aguardando assinatura digital.</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedConsent(pendingConsents[0])}
              className="bg-[#e65100] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#ef6c00] transition-colors w-full sm:w-auto shrink-0"
            >
              Assinar Agora
            </button>
          </div>
        )}

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

        {/* Atalho Carteira Digital (Cashback) */}
        {session && session.role === 'client' && (
          <section 
            onClick={() => navigate(`/${tenant_slug}/carteira`)}
            className="flex items-center justify-between p-lg bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0px_8px_30px_rgba(0,0,0,0.08)] border border-surface-variant/50 cursor-pointer transition-all group active:scale-[0.99] animate-fade-in"
          >
            <div className="flex items-center gap-md">
              <div className="w-12 h-12 flex items-center justify-center bg-primary/10 text-primary rounded-full shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[24px]">wallet</span>
              </div>
              <div className="text-left">
                <span className="font-label-sm text-secondary text-[11px] block uppercase tracking-wider">Meu Saldo de Cashback</span>
                <span className="font-headline-sm text-primary font-bold text-lg">R$ {walletBalance.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
            <div className="text-secondary group-hover:text-primary transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined">chevron_right</span>
            </div>
          </section>
        )}

        {/* Assinaturas & Planos (Glassmorphism Card) */}
        <section 
          onClick={() => navigate(`/${tenant_slug}/clube`)}
          className="relative rounded-xl overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-surface-variant/30 cursor-pointer group active:scale-[0.99] transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary-container/40 to-surface-container-lowest/80 backdrop-blur-md z-0"></div>
          <div className="relative z-10 p-lg flex items-center justify-between">
            <div className="space-y-base">
              <div className="flex items-center space-x-2 text-primary">
                <span className="material-symbols-outlined filled text-body-md" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider">Fidelidade</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Clube {tenant?.name ? tenant.name.split(' ')[0] : ''}</h3>
              <p className="text-secondary text-sm md:text-base">
                {session?.vip_tier 
                  ? `Seu nível atual no clube é ${session.vip_tier}. Aproveite os seus benefícios exclusivos!` 
                  : 'Veja os planos de assinatura disponíveis para você.'}
              </p>
            </div>
            <div className="bg-primary text-on-primary rounded-full p-3 group-hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined">arrow_forward</span>
            </div>
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

        {/* Gift Cards / Vales-Presente */}
        {tenant?.features?.giftcards && (
          <section 
            onClick={() => navigate(`/${tenant_slug}/presentear`)}
            className="relative rounded-xl overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-[#f4c8ce]/30 cursor-pointer group active:scale-[0.99] transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#ffe4e8] to-surface-container-lowest z-0"></div>
            <div className="relative z-10 p-lg flex items-center justify-between">
              <div className="space-y-base max-w-[70%]">
                <div className="flex items-center space-x-2 text-[#b0616b]">
                  <span className="material-symbols-outlined text-body-md" style={{ fontVariationSettings: "'FILL' 1" }}>redeem</span>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold">Gift Cards</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Dê beleza de presente</h3>
                <p className="text-secondary text-sm md:text-base">
                  Compre um vale-presente e surpreenda quem você ama pelo WhatsApp.
                </p>
              </div>
              <div className="w-12 h-12 bg-white text-[#b0616b] rounded-full shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">arrow_forward</span>
              </div>
            </div>
          </section>
        )}

        {/* Lookbook / Inspire-se */}
        {lookbooks.length > 0 && (
          <section className="space-y-md">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">Inspire-se</h3>
            </div>
            <div className="flex overflow-x-auto hide-scrollbar space-x-md pb-4 -mx-container-margin px-container-margin md:mx-0 md:px-0">
              {loadingLookbooks ? (
                <div className="flex items-center justify-center w-full py-10">
                  <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
                </div>
              ) : (
                lookbooks.map(look => (
                  <div 
                    key={look.id} 
                    onClick={() => setSelectedLook(look)} 
                    className="min-w-[140px] w-[40vw] md:w-1/4 aspect-[4/5] bg-surface-container-lowest rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] overflow-hidden shrink-0 group cursor-pointer relative"
                  >
                    <img src={look.image_url} alt={look.title || 'Inspiração'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                ))
              )}
            </div>
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
        <div className="h-24 md:hidden"></div>
      </main>

      {selectedConsent && (
        <AssinarTermoModal 
          consent={selectedConsent} 
          onClose={() => setSelectedConsent(null)} 
          onSigned={() => {
            setPendingConsents(prev => prev.filter(c => c.id !== selectedConsent.id));
            setSelectedConsent(null);
          }}
        />
      )}

      {/* Bottom Nav Bar */}
      <ClienteBottomNavBar activeTab="home" tenantSlug={tenant_slug} />

      {/* Modal de Avaliação Pendente */}
      {showReviewModal && pendingReview && (
        <ReviewModal 
          reviewData={pendingReview} 
          onClose={() => setShowReviewModal(false)}
          onReviewSubmitted={() => {
            setShowReviewModal(false);
            setPendingReview(null);
          }}
        />
      )}

      {/* Modal Lookbook */}
      {selectedLook && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in">
          <div className="bg-surface rounded-2xl w-full max-w-[400px] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="relative w-full aspect-square bg-surface-variant">
              <img src={selectedLook.image_url} alt={selectedLook.title || 'Inspiração'} className="w-full h-full object-cover" />
              <button 
                onClick={() => setSelectedLook(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-sm hover:bg-black/70 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <h3 className="font-headline-md text-on-surface mb-2">{selectedLook.title || 'Inspiração'}</h3>
              {selectedLook.description && <p className="text-secondary text-sm mb-6">{selectedLook.description}</p>}
              
              <button 
                onClick={() => {
                  navigate(`/${tenant_slug}/agendar/servicos`, { 
                    state: { 
                      preselectedServiceId: selectedLook.service_id,
                      preselectedStaffId: selectedLook.staff_id
                    } 
                  });
                }}
                className="w-full py-4 rounded-xl font-bold text-on-primary bg-primary hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 mt-4"
              >
                <span className="material-symbols-outlined">auto_awesome</span>
                Quero Fazer Igual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeCliente;
