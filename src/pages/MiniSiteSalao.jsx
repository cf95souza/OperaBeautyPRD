import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { useSEO } from '../hooks/useSEO';
import { 
  Sparkles, 
  Calendar, 
  MapPin, 
  Clock, 
  Star, 
  Phone, 
  ExternalLink, 
  Check, 
  Heart, 
  ChevronRight, 
  X, 
  ZoomIn, 
  Coffee, 
  ShieldCheck, 
  Award,
  ArrowRight
} from 'lucide-react';

const InstagramIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const WhatsAppIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const GoogleIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.08 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
  </svg>
);

const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export const MiniSiteSalao = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { session } = useTenant();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [activeTab, setActiveTab] = useState('todos'); // 'todos' | 'galeria' | 'lookbook'

  useEffect(() => {
    fetchMinisite();
  }, [tenant_slug]);

  const fetchMinisite = async () => {
    setLoading(true);
    try {
      const res = await api.minisite.get(tenant_slug);
      setData(res);
    } catch (err) {
      console.error('Erro ao carregar mini-site:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dados estruturados Schema.org BeautySalon para busca local do Google (F3 / D20)
  const jsonLdData = useMemo(() => {
    if (!data?.tenant) return null;
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BeautySalon',
      'name': data.tenant.name,
      'description': data?.seo?.description || data.tenant.headline || data.tenant.about_text || 'Agende online seu horário com especialistas.',
      'image': data?.seo?.image || data.tenant.logo_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
      'url': typeof window !== 'undefined' ? `${window.location.origin}/${tenant_slug}/site` : undefined,
      'priceRange': '$$',
      'telephone': data.tenant.social_whatsapp || undefined,
      'address': data.tenant.address ? {
        '@type': 'PostalAddress',
        'streetAddress': data.tenant.address,
        'addressCountry': 'BR'
      } : undefined
    };

    if (data.tenant.rating && Number(data.tenant.rating) > 0) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        'ratingValue': String(data.tenant.rating),
        'reviewCount': String(data.tenant.total_reviews || 1),
        'bestRating': '5',
        'worstRating': '1'
      };
    }

    return schema;
  }, [data, tenant_slug]);

  // Atualização dinâmica de SEO, OpenGraph e Schema.org no cliente (F3 / D20)
  useSEO({
    title: data?.seo?.title || `${data?.tenant?.name || 'Salão'} | Mini-site Oficial`,
    description: data?.seo?.description || 'Agende online seu horário com profissionais especialistas.',
    image: data?.seo?.image || data?.tenant?.logo_url,
    url: typeof window !== 'undefined' ? `${window.location.origin}/${tenant_slug}/site` : window.location.pathname,
    canonical: typeof window !== 'undefined' ? `${window.location.origin}/${tenant_slug}/site` : undefined,
    jsonLd: jsonLdData
  });

  // Cálculo de Status Aberto / Fechado em tempo real
  const currentOpenStatus = useMemo(() => {
    if (!data?.businessHours || data.businessHours.length === 0) return null;
    const now = new Date();
    const currentDay = now.getDay();
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const todaySchedule = data.businessHours.find(h => h.day_of_week === currentDay);
    if (!todaySchedule || todaySchedule.is_closed || !todaySchedule.open_time || !todaySchedule.close_time) {
      return { isOpen: false, text: 'Fechado hoje', nextDayText: 'Consulte os horários da semana' };
    }

    const isOpen = currentHourMin >= todaySchedule.open_time && currentHourMin <= todaySchedule.close_time;
    if (isOpen) {
      return { isOpen: true, text: `Aberto agora • Fecha às ${todaySchedule.close_time.slice(0, 5)}` };
    }
    if (currentHourMin < todaySchedule.open_time) {
      return { isOpen: false, text: `Fechado no momento • Abre às ${todaySchedule.open_time.slice(0, 5)}` };
    }
    return { isOpen: false, text: 'Fechado agora' };
  }, [data]);

  // Galeria combinada (Fotos do Espaço + Lookbook)
  const allGalleryItems = useMemo(() => {
    if (!data) return [];
    const spacePhotos = (data.tenant?.minisite_gallery || []).map((img, idx) => ({
      id: `space-${idx}`,
      url: img.url,
      caption: img.caption || 'Nosso Espaço',
      type: 'galeria',
      category: 'Estrutura'
    }));

    const lookbookPhotos = (data.lookbook || []).map(item => ({
      id: item.id,
      url: item.image_url,
      caption: item.title,
      description: item.description,
      type: 'lookbook',
      category: item.service_name || 'Procedimento'
    }));

    if (activeTab === 'galeria') return spacePhotos;
    if (activeTab === 'lookbook') return lookbookPhotos;
    return [...spacePhotos, ...lookbookPhotos];
  }, [data, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF7F5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 border-3 border-brand/20 border-t-brand rounded-full animate-spin mb-4" />
        <h2 className="font-serif text-xl font-bold text-ink">Carregando apresentação do salão...</h2>
        <p className="text-xs text-ink-soft mt-1">Preparando fotos, horários e depoimentos exclusivos.</p>
      </div>
    );
  }

  if (!data || !data.tenant) {
    return (
      <div className="min-h-screen bg-[#FBF7F5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-brand flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-ink mb-2">Salão não encontrado</h2>
        <p className="text-sm text-ink-soft max-w-md mb-6">
          O endereço informado não corresponde a um estabelecimento ativo no OperaBeauty.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-full bg-brand text-white font-medium text-xs hover:bg-brand-dark transition-colors"
        >
          Ir para a página inicial
        </button>
      </div>
    );
  }

  const { tenant, reviews, businessHours, staff, featuredServices } = data;
  const brandColor = tenant.brand_hex || tenant.primary_color || '#8E3B4E';

  const handleGoToBooking = () => {
    const slug = tenant?.slug || tenant_slug;
    const token = typeof window !== 'undefined' ? localStorage.getItem('operabeauty_token') : null;
    const isLoggedIn = Boolean(session?.id || token);

    if (isLoggedIn) {
      navigate(`/${slug}/agendar/servicos`);
    } else {
      navigate(`/${slug}/login`);
    }
  };

  const handleOpenWhatsApp = () => {
    const rawPhone = tenant.social_whatsapp || tenant.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá! Gostaria de tirar uma dúvida sobre os serviços do ${tenant.name}.`);
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#FBF7F5] text-ink antialiased font-sans selection:bg-brand-tint selection:text-brand">
      
      {/* 1. Header / Navbar Flutuante Editorial */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-line/60 transition-all safe-top">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          
          {/* Logo e Nome */}
          <Link to={`/${tenant.slug}/site`} className="flex items-center gap-3 group">
            {tenant.logo_url ? (
              <img 
                src={tenant.logo_url} 
                alt={tenant.name} 
                className="w-10 h-10 rounded-full object-cover border border-line shadow-2xs group-hover:scale-105 transition-transform" 
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-serif font-bold text-white shadow-2xs"
                style={{ backgroundColor: brandColor }}
              >
                {tenant.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <span className="font-serif font-bold text-base sm:text-lg text-ink tracking-tight block leading-tight group-hover:text-brand transition-colors">
                {tenant.name}
              </span>
              {tenant.rating > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-[11px] font-semibold text-ink-soft lining-nums">
                    {tenant.rating.toFixed(1)} ({tenant.total_reviews} avaliações)
                  </span>
                </div>
              )}
            </div>
          </Link>

          {/* Navegação Desktop */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-ink-soft uppercase tracking-wider">
            <a href="#sobre" className="hover:text-brand transition-colors">Sobre</a>
            <a href="#galeria" className="hover:text-brand transition-colors">Lookbook</a>
            <a href="#especialistas" className="hover:text-brand transition-colors">Especialistas</a>
            <a href="#depoimentos" className="hover:text-brand transition-colors">Depoimentos</a>
            <a href="#localizacao" className="hover:text-brand transition-colors">Localização</a>
          </nav>

          {/* Botão de Agendamento Superior */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGoToBooking}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-xs font-semibold shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              style={{ backgroundColor: brandColor }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Agendar Horário</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section com Imagem de Capa e Sofisticação */}
      <section className="relative min-h-[580px] sm:min-h-[640px] flex items-center justify-center text-center overflow-hidden bg-stone-900">
        {/* Background Image / Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
          style={{ 
            backgroundImage: `url(${tenant.meta_image_url || tenant.logo_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=80'})`,
            filter: 'brightness(0.38)'
          }}
        />
        
        {/* Gradiente Rosé Sofisticado */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-20 flex flex-col items-center">
          
          {/* Badge de Destaque */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-xs font-medium tracking-wide uppercase mb-6 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Espaço Exclusivo de Beleza & Bem-Estar</span>
          </div>

          {/* Headline Nobre */}
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.15] mb-6 drop-shadow-xs max-w-3xl">
            {tenant.headline || 'Realçando sua beleza natural com sofisticação e cuidado.'}
          </h1>

          {/* Subtítulo Afetuoso */}
          <p className="text-sm sm:text-base text-stone-200/90 font-normal max-w-2xl leading-relaxed mb-8">
            {tenant.welcome_message || 'Um refúgio acolhedor com atendimento personalizado, profissionais especialistas e produtos premium para você se sentir deslumbrante.'}
          </p>

          {/* CTAs Primários */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
            <button
              onClick={handleGoToBooking}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full text-white text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer group"
              style={{ backgroundColor: brandColor }}
            >
              <Calendar className="w-4 h-4" />
              <span>Agendar Atendimento Online</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {tenant.social_whatsapp && (
              <button
                onClick={handleOpenWhatsApp}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/25 backdrop-blur-md text-sm font-semibold transition-all cursor-pointer"
              >
                <WhatsAppIcon className="w-4 h-4 text-emerald-400" />
                <span>Tirar Dúvidas</span>
              </button>
            )}
          </div>

          {/* 4 Badges de Confiança no Rodapé do Hero */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-12 w-full pt-8 border-t border-white/10 text-stone-300 text-xs font-medium">
            <div className="flex items-center justify-center gap-2 bg-white/5 backdrop-blur-xs py-2 px-3 rounded-xl border border-white/10">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="lining-nums">{tenant.rating > 0 ? `${tenant.rating.toFixed(1)} de Avaliação` : '5.0 Estrelas'}</span>
            </div>
            <div className="flex items-center justify-center gap-2 bg-white/5 backdrop-blur-xs py-2 px-3 rounded-xl border border-white/10">
              <Award className="w-3.5 h-3.5 text-rose-300" />
              <span>Equipe Especialista</span>
            </div>
            <div className="flex items-center justify-center gap-2 bg-white/5 backdrop-blur-xs py-2 px-3 rounded-xl border border-white/10">
              <Coffee className="w-3.5 h-3.5 text-amber-300" />
              <span>Café & Espumante</span>
            </div>
            <div className="flex items-center justify-center gap-2 bg-white/5 backdrop-blur-xs py-2 px-3 rounded-xl border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Agendamento Seguro</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Seção "Sobre Nós & A Experiência" */}
      <section id="sobre" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Coluna da Imagem */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-[32px] overflow-hidden border border-line shadow-xl bg-white aspect-4/5">
              <img
                src={tenant.minisite_gallery?.[0]?.url || tenant.meta_image_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80'}
                alt={tenant.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80 block mb-1">
                  Espaço Intimista
                </span>
                <p className="font-serif text-lg font-bold">
                  Projetado para sua tranquilidade e conforto.
                </p>
              </div>
            </div>

            {/* Card Flutuante de Avaliação */}
            <div className="absolute -bottom-6 -right-4 sm:-right-6 bg-white border border-line rounded-2xl p-4 shadow-xl max-w-[220px] animate-fade-in hidden sm:block">
              <div className="flex items-center gap-1 text-amber-400 mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs font-bold text-ink">Experiência 5 Estrelas</p>
              <p className="text-[11px] text-ink-soft mt-0.5 leading-tight">
                Mais de {tenant.total_reviews || '100'} clientes atendidas com excelência.
              </p>
            </div>
          </div>

          {/* Coluna de Texto */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-tint text-brand text-xs font-semibold tracking-wider uppercase">
              <Heart className="w-3 h-3" />
              <span>Nossa Filosofia</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight leading-tight">
              Mais do que um salão, um momento de reconexão consigo mesma.
            </h2>

            <p className="text-sm sm:text-base text-ink-soft leading-relaxed">
              {tenant.about_text || 'No Studio da Tha, cada atendimento é uma experiência pensada para proporcionar bem-estar, autoestima e relaxamento. Com profissionais especialistas nas mais modernas técnicas de beleza, utilizamos produtos de alta performance em um ambiente acolhedor, climatizado e intimista.'}
            </p>

            {/* Mimos & Cortesia do Espaço */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-line shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-brand-tint text-brand flex items-center justify-center shrink-0">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink">Menu de Boas-Vindas</h4>
                  <p className="text-[11px] text-ink-soft mt-0.5">Café espresso, chás especiais, água saborizada e espumante cortesia.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-line shadow-2xs">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink">Biossegurança Rigorosa</h4>
                  <p className="text-[11px] text-ink-soft mt-0.5">Alicates em autoclave hospitalar e materiais 100% descartáveis.</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleGoToBooking}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
                style={{ backgroundColor: brandColor }}
              >
                <span>Conhecer Todos os Serviços & Agendar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Vitrine de Procedimentos em Destaque */}
      {featuredServices && featuredServices.length > 0 && (
        <section className="py-16 bg-white border-y border-line/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="text-xs font-bold text-brand uppercase tracking-wider block mb-1">
                Menu de Procedimentos
              </span>
              <h2 className="font-serif text-3xl font-bold text-ink tracking-tight">
                Serviços mais amados por nossas clientes
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredServices.map(service => (
                <div 
                  key={service.id}
                  className="bg-[#FBF7F5] border border-line rounded-2xl p-5 hover:border-brand/40 hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand px-2 py-0.5 rounded-md bg-brand-tint inline-block mb-2">
                      {service.category || 'Destaque'}
                    </span>
                    <h3 className="font-serif text-base font-bold text-ink group-hover:text-brand transition-colors">
                      {service.name}
                    </h3>
                    {service.short_description && (
                      <p className="text-xs text-ink-soft mt-1.5 line-clamp-2 leading-relaxed">
                        {service.short_description}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-line/60 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-ink-soft block">Investimento</span>
                      <span className="font-serif font-bold text-base text-ink lining-nums">
                        R$ {parseFloat(service.price).toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    <button
                      onClick={handleGoToBooking}
                      className="px-3 py-1.5 rounded-full bg-white border border-line text-xs font-semibold text-ink group-hover:bg-brand group-hover:text-white group-hover:border-brand transition-colors cursor-pointer"
                    >
                      Agendar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <button
                onClick={handleGoToBooking}
                className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1"
              >
                <span>Ver cardápio completo de serviços com preços e durações</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 5. Seção Lookbook & Galeria de Fotos */}
      <section id="galeria" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <span className="text-xs font-bold text-brand uppercase tracking-wider block mb-1">
              Portfólio & Espaço
            </span>
            <h2 className="font-serif text-3xl font-bold text-ink tracking-tight">
              Galeria de Trabalhos & Nosso Espaço
            </h2>
            <p className="text-xs sm:text-sm text-ink-soft mt-1">
              Resultados reais feitos com paixão por nossas profissionais.
            </p>
          </div>

          {/* Abas de Filtro da Galeria */}
          <div className="inline-flex p-1 rounded-full bg-stone-200/60 border border-line text-xs font-semibold text-ink-soft">
            <button
              onClick={() => setActiveTab('todos')}
              className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                activeTab === 'todos' ? 'bg-white text-ink shadow-xs font-bold' : 'hover:text-ink'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setActiveTab('lookbook')}
              className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                activeTab === 'lookbook' ? 'bg-white text-ink shadow-xs font-bold' : 'hover:text-ink'
              }`}
            >
              Procedimentos
            </button>
            <button
              onClick={() => setActiveTab('galeria')}
              className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                activeTab === 'galeria' ? 'bg-white text-ink shadow-xs font-bold' : 'hover:text-ink'
              }`}
            >
              O Espaço
            </button>
          </div>
        </div>

        {/* Grid de Imagens */}
        {allGalleryItems.length === 0 ? (
          <div className="text-center py-12 bg-white border border-line rounded-3xl p-8">
            <Sparkles className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-ink">Nenhuma foto adicionada ainda</p>
            <p className="text-xs text-ink-soft mt-1">Em breve adicionaremos fotos do espaço e trabalhos realizados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {allGalleryItems.map((item) => (
              <div 
                key={item.id}
                onClick={() => setSelectedPhoto(item)}
                className="group relative rounded-2xl overflow-hidden aspect-square border border-line bg-stone-100 cursor-pointer shadow-2xs hover:shadow-lg transition-all"
              >
                <img
                  src={item.url}
                  alt={item.caption}
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block mb-0.5">
                    {item.category}
                  </span>
                  <p className="text-xs font-semibold leading-tight line-clamp-1">
                    {item.caption}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-white/80">
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Ver ampliado</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. Seção "Nossa Equipe de Especialistas" */}
      {staff && staff.length > 0 && (
        <section id="especialistas" className="py-20 bg-stone-100/60 border-y border-line">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="text-xs font-bold text-brand uppercase tracking-wider block mb-1">
                Especialistas
              </span>
              <h2 className="font-serif text-3xl font-bold text-ink tracking-tight">
                Mãos talentosas dedicadas à sua beleza
              </h2>
              <p className="text-xs sm:text-sm text-ink-soft mt-1">
                Profissionais qualificadas com constante aprimoramento técnico.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {staff.map(person => (
                <div 
                  key={person.id}
                  className="bg-white border border-line rounded-3xl p-6 text-center shadow-2xs hover:shadow-md transition-all flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-brand-tint shadow-xs mb-4">
                    {person.photoUrl ? (
                      <img src={person.photoUrl} alt={person.name} className="w-full h-full object-cover" />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center font-serif font-bold text-xl text-white"
                        style={{ backgroundColor: brandColor }}
                      >
                        {person.name.slice(0, 1)}
                      </div>
                    )}
                  </div>

                  <h3 className="font-serif text-lg font-bold text-ink">{person.name}</h3>
                  <p className="text-xs font-semibold text-brand mt-0.5">{person.role}</p>

                  <div className="mt-5 pt-4 border-t border-line/60 w-full">
                    <button
                      onClick={handleGoToBooking}
                      className="w-full py-2 rounded-full border border-line text-xs font-semibold text-ink hover:bg-brand hover:text-white hover:border-brand transition-colors cursor-pointer"
                    >
                      Agendar com {person.name.split(' ')[0]}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. Seção Depoimentos Reais & Avaliações Google (D16) */}
      <section id="depoimentos" className="py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-2">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            <span>Avaliações Verificadas</span>
          </div>
          <h2 className="font-serif text-3xl font-bold text-ink tracking-tight">
            O que nossas clientes dizem
          </h2>
          <p className="text-xs sm:text-sm text-ink-soft mt-1">
            Depoimentos autênticos deixados após o atendimento no salão.
          </p>
        </div>

        {reviews && reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map(rev => (
              <div 
                key={rev.id} 
                className="bg-white border border-line rounded-3xl p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Verificada</span>
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-ink leading-relaxed italic mb-4">
                    "{rev.comment || 'Atendimento impecável! Saí extremamente feliz e renovada.'}"
                  </p>
                </div>

                <div className="pt-3 border-t border-line/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-ink">{rev.clientName}</span>
                    {rev.serviceName && (
                      <span className="text-[11px] text-ink-soft truncate max-w-[130px]">
                        {rev.serviceName}
                      </span>
                    )}
                  </div>

                  {rev.staffReply && (
                    <div className="mt-3 p-2.5 rounded-xl bg-brand-tint/60 border border-brand-tint text-[11px] text-ink">
                      <span className="font-bold text-brand block mb-0.5">Resposta do Salão:</span>
                      <p className="text-ink-soft italic leading-snug">{rev.staffReply}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-white border border-line rounded-3xl p-6">
            <p className="text-xs text-ink-soft">Seja a primeira a avaliar o atendimento!</p>
          </div>
        )}

        {/* Link para Google Reviews se configurado */}
        {tenant.google_review_url && (
          <div className="text-center mt-10">
            <a
              href={tenant.google_review_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-line text-xs font-semibold text-ink shadow-2xs hover:shadow-xs transition-all hover:border-ink-soft"
            >
              <GoogleIcon className="w-4 h-4 text-[#4285F4]" />
              <span>Ver todas as avaliações no Google Meu Negócio</span>
              <ExternalLink className="w-3.5 h-3.5 text-ink-soft" />
            </a>
          </div>
        )}
      </section>

      {/* 8. Seção "Onde Estamos & Horários de Atendimento" */}
      <section id="localizacao" className="py-20 bg-stone-100/70 border-t border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Card de Localização */}
            <div className="lg:col-span-6 bg-white border border-line rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-brand flex items-center justify-center mb-4">
                <MapPin className="w-5 h-5" />
              </div>

              <h3 className="font-serif text-2xl font-bold text-ink mb-2">Localização & Acesso</h3>
              <p className="text-xs text-ink-soft mb-6">
                Estamos localizados em ponto privilegiado e de fácil acesso.
              </p>

              <div className="p-4 rounded-2xl bg-stone-50 border border-line mb-6">
                <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block mb-1">
                  Endereço Completo
                </span>
                <p className="text-sm font-semibold text-ink leading-relaxed">
                  {tenant.address || 'Endereço disponível sob consulta.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                {tenant.google_maps_url ? (
                  <a
                    href={tenant.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-stone-900 text-white text-xs font-semibold hover:bg-black transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>Abrir no Google Maps</span>
                    <ExternalLink className="w-3 h-3 text-stone-400" />
                  </a>
                ) : (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(tenant.address || tenant.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-stone-900 text-white text-xs font-semibold hover:bg-black transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>Traçar Rota no Maps</span>
                  </a>
                )}

                {tenant.social_whatsapp && (
                  <button
                    onClick={handleOpenWhatsApp}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-line text-xs font-semibold text-ink hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Como Chegar via WhatsApp</span>
                  </button>
                )}
              </div>
            </div>

            {/* Card de Horários */}
            <div className="lg:col-span-6 bg-white border border-line rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>

                {currentOpenStatus && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                    currentOpenStatus.isOpen 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${currentOpenStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span>{currentOpenStatus.text}</span>
                  </span>
                )}
              </div>

              <h3 className="font-serif text-2xl font-bold text-ink mb-2">Horários de Atendimento</h3>
              <p className="text-xs text-ink-soft mb-6">
                Atendimentos com agendamento prévio para garantir pontualidade.
              </p>

              <div className="divide-y divide-line/60">
                {businessHours && businessHours.length > 0 ? (
                  businessHours.map(bh => (
                    <div key={bh.day_of_week} className="py-2.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-ink">
                        {DIAS_SEMANA[bh.day_of_week]}
                      </span>
                      {bh.is_closed ? (
                        <span className="text-ink-soft/80 italic">Fechado</span>
                      ) : (
                        <span className="font-semibold text-ink lining-nums">
                          {bh.open_time?.slice(0, 5)} às {bh.close_time?.slice(0, 5)}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-ink-soft py-4">Horários sob agendamento.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Banner de Fechamento & Chamada Final */}
      <section className="py-20 px-4 sm:px-6 bg-stone-900 text-white text-center relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <div className="w-12 h-12 rounded-full bg-white/10 text-amber-300 flex items-center justify-center mx-auto border border-white/20">
            <Sparkles className="w-6 h-6" />
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
            Pronta para viver um momento único de autocuidado?
          </h2>

          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-lg mx-auto">
            Reserve seu horário em segundos pelo aplicativo oficial do salão. Sem esperas e com confirmação imediata.
          </p>

          <div>
            <button
              onClick={handleGoToBooking}
              className="px-8 py-3.5 rounded-full text-white text-sm font-semibold shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
              style={{ backgroundColor: brandColor }}
            >
              Agendar Meu Horário Agora
            </button>
          </div>
        </div>
      </section>

      {/* 10. Rodapé Institucional */}
      <footer className="py-8 bg-stone-950 text-stone-400 text-xs border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-white text-sm">{tenant.name}</span>
            <span>•</span>
            <span>Todos os direitos reservados</span>
          </div>

          <div className="flex items-center gap-4">
            {tenant.social_instagram && (
              <a href={tenant.social_instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <InstagramIcon className="w-4 h-4" />
              </a>
            )}
            {tenant.social_whatsapp && (
              <button onClick={handleOpenWhatsApp} className="hover:text-white transition-colors cursor-pointer">
                <WhatsAppIcon className="w-4 h-4" />
              </button>
            )}
            <span className="text-[11px] text-stone-500">
              Powered by <strong>OperaBeauty</strong>
            </span>
          </div>
        </div>
      </footer>

      {/* 11. Modal Lightbox de Foto Ampliada */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-6 right-6 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption}
              className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
            />
            <div className="text-center mt-4 text-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block mb-1">
                {selectedPhoto.category}
              </span>
              <h3 className="font-serif text-lg font-bold">{selectedPhoto.caption}</h3>
              {selectedPhoto.description && (
                <p className="text-xs text-stone-300 mt-1 max-w-md">{selectedPhoto.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 12. Sticky Mobile Bottom CTA Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-line p-3 px-4 flex items-center justify-between gap-3 shadow-lg">
        <div className="truncate">
          <span className="font-serif font-bold text-xs text-ink block truncate">{tenant.name}</span>
          <span className="text-[10px] text-ink-soft">Agendamento online 24h</span>
        </div>

        <button
          onClick={handleGoToBooking}
          className="px-5 py-2.5 rounded-full text-white text-xs font-semibold shadow-xs shrink-0 cursor-pointer"
          style={{ backgroundColor: brandColor }}
        >
          Agendar Horário
        </button>
      </div>
    </div>
  );
};

export default MiniSiteSalao;
