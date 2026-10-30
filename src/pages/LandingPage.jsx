import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Bell, 
  Star, 
  Gift, 
  Tag, 
  Users, 
  ShieldCheck, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  Smartphone, 
  X,
  ExternalLink,
  Sparkles,
  Store,
  Lock,
  MessageCircle,
  CheckCheck,
  CreditCard,
  Play,
  QrCode
} from 'lucide-react';
import QRCode from 'qrcode';
import { api } from '../lib/api';
import useSEO from '../hooks/useSEO';
import { captureReferralFromUrl } from '../lib/referralTracker';

export default function LandingPage() {
  const navigate = useNavigate();

  // --- Redirecionamento Automático PWA ---
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      const lastTenant = localStorage.getItem('operabeauty_last_tenant');
      const pwaMode = localStorage.getItem('operabeauty_pwa_mode');
      
      if (lastTenant) {
        if (pwaMode === 'staff') {
          navigate(`/${lastTenant}/staff/login`, { replace: true });
        } else {
          navigate(`/${lastTenant}/home`, { replace: true });
        }
      }
    }
  }, [navigate]);

  // Estados dos Modais e Interações
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showHeroQrModal, setShowHeroQrModal] = useState(false);
  const [heroQrCodeDataUrl, setHeroQrCodeDataUrl] = useState('');
  const [selectedPlanForLead, setSelectedPlanForLead] = useState('Premium');
  const [tenantSlugInput, setTenantSlugInput] = useState('');
  const [referralInfo, setReferralInfo] = useState(null);
  const [isResellerEnabled, setIsResellerEnabled] = useState(false);

  // Rastreamento automático de cupom/parceiro e verificação de ativação do programa pelo Super Admin
  useEffect(() => {
    api.resellers.getStatus().then(status => {
      if (status && status.enabled) {
        setIsResellerEnabled(true);
        captureReferralFromUrl().then(info => {
          if (info) setReferralInfo(info);
        });
      } else {
        setIsResellerEnabled(false);
      }
    }).catch(() => setIsResellerEnabled(false));
  }, []);

  // Geração automática do QR Code do Salão Demo para o visitante testar no celular
  useEffect(() => {
    const demoUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/demo`
      : 'https://operabeauty.com.br/demo';

    QRCode.toDataURL(demoUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#2B2327',
        light: '#FFFFFF'
      }
    })
    .then(url => setHeroQrCodeDataUrl(url))
    .catch(err => console.error('Erro ao gerar QR Code demo:', err));
  }, []);
  
  // Planos Dinâmicos da API e Ciclo de Cobrança
  const [plans, setPlans] = useState([
    {
      id: 'basico',
      slug: 'basico',
      name: 'Básico',
      description: 'Solução completa para o seu salão de beleza.',
      price: 69.90,
      max_staff: 2,
      max_whatsapp_messages: 0,
      is_featured: false,
      badge_label: null,
      marketing_features: [
        'Profissionais ilimitados',
        'Agenda online com link exclusivo',
        'App com a sua marca e cores',
        'WhatsApp ilimitado',
        'Suporte via WhatsApp'
      ]
    },
    {
      id: 'essencial',
      slug: 'essencial',
      name: 'Essencial',
      description: 'Para salões pequenos e barbearias em expansão.',
      price: 79.90,
      max_staff: 3,
      max_whatsapp_messages: 300,
      is_featured: false,
      badge_label: null,
      marketing_features: [
        'Até 3 profissionais inclusos',
        'Tudo do plano Solo',
        'Controle de caixa e financeiro',
        'Cálculo automático de comissões',
        '300 lembretes WhatsApp/mês'
      ]
    },
    {
      id: 'premium',
      slug: 'premium',
      name: 'Premium',
      description: 'A solução completa para salões que desejam fidelizar e lucrar mais.',
      price: 129.90,
      max_staff: 6,
      max_whatsapp_messages: 1000,
      is_featured: true,
      badge_label: 'Mais Escolhido',
      marketing_features: [
        'Até 6 profissionais inclusos',
        'Tudo do Essencial',
        'Clube de Assinatura recorrente',
        'Programa de Cashback automático',
        '1.000 lembretes WhatsApp/mês'
      ]
    },
    {
      id: 'signature',
      slug: 'signature',
      name: 'Signature',
      description: 'Para salões de grande porte, franquias e alta performance.',
      price: 199.90,
      max_staff: 12,
      max_whatsapp_messages: 999999,
      is_featured: false,
      badge_label: 'Alta Performance',
      marketing_features: [
        'Até 12 profissionais inclusos',
        'Tudo do Premium',
        'Frente de Caixa (PDV) completa',
        'Disparos WhatsApp ilimitados',
        'Suporte prioritário via WhatsApp'
      ]
    }
  ]);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Carrega planos dinamicamente da API
  useEffect(() => {
    let isMounted = true;
    async function fetchPlans() {
      try {
        const data = await api.plans.list(true);
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setPlans(data);
        }
      } catch (err) {
        console.warn('Usando planos padrão na LandingPage:', err?.message);
      } finally {
        if (isMounted) setLoadingPlans(false);
      }
    }
    fetchPlans();
    return () => { isMounted = false; };
  }, []);

  // Lead Form
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '', salon_name: '' });
  const [submitStatus, setSubmitStatus] = useState({ loading: false, success: false, error: null });

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // Suporte a scroll suave
  const scrollToSection = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenLeadModal = (planName = 'Premium') => {
    setSelectedPlanForLead(planName);
    setIsLeadModalOpen(true);
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus({ loading: true, success: false, error: null });
    
    try {
      try {
        await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...leadForm, plan: selectedPlanForLead })
        });
      } catch (err) {
        // Ignora erro de endpoint de lead se não existir na VPS
      }
      
      setSubmitStatus({ loading: false, success: true, error: null });
      
      setTimeout(() => {
        setIsLeadModalOpen(false);
        setSubmitStatus({ loading: false, success: false, error: null });
        const msg = `Olá! Me chamo ${encodeURIComponent(leadForm.name)} e gostaria de iniciar o teste grátis de 14 dias do plano ${encodeURIComponent(selectedPlanForLead)} para o meu salão ${encodeURIComponent(leadForm.salon_name || '')}.`;
        window.open(`https://wa.me/5511922928343?text=${msg}`, '_blank');
      }, 1500);
      
    } catch (error) {
      setSubmitStatus({ loading: false, success: false, error: error.message });
    }
  };

  const handleGoToTenant = (e) => {
    e.preventDefault();
    if (tenantSlugInput.trim()) {
      const cleanSlug = tenantSlugInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      navigate(`/${cleanSlug}`);
    }
  };

  const faqs = [
    {
      q: "Preciso instalar algum programa?",
      a: "Não! O OperaBeauty funciona 100% online no navegador de qualquer dispositivo (celular, tablet ou computador). Você e suas clientes podem inclusive adicionar um atalho direto na tela inicial (PWA) com apenas um toque, sem ocupar a memória do celular."
    },
    {
      q: "Minhas clientes precisam baixar um aplicativo?",
      a: "Não. As clientes acessam o link exclusivo do seu salão pelo WhatsApp, Instagram ou link na bio e agendam em menos de 1 minuto sem precisar criar cadastros complicados."
    },
    {
      q: "Posso usar a minha marca e as minhas cores?",
      a: "Sim, com certeza! O sistema é 100% White-Label. Seu salão recebe um endereço próprio, com o seu nome, seu logotipo, banners promocionais e uma seleção entre temas elegantes ou a cor exata da sua identidade visual."
    },
    {
      q: "Como funciona o teste grátis?",
      a: "Você tem 14 dias de acesso completo e irrestrito para cadastrar seus serviços, convidar sua equipe e testar com clientes reais. Não exigimos cartão de crédito para começar."
    },
    {
      q: "Meus dados e os das minhas clientes estão seguros?",
      a: "Absolutamente seguros. Cada salão opera em ambiente isolado no banco de dados com criptografia de ponta a ponta e total conformidade com a LGPD (Lei Geral de Proteção de Dados)."
    },
    {
      q: "Posso cancelar quando quiser?",
      a: "Sim. Nossos planos não possuem fidelidade nem multas rescisórias. Você tem total liberdade para pausar ou cancelar quando desejar diretamente pelo painel."
    }
  ];

  const themesShowcase = [
    { id: 'rose', name: 'Rosé', bar: '#8E3B4E', dots: ['#F6E4E4', '#8E3B4E'] },
    { id: 'nude', name: 'Nude', bar: '#7A5C43', dots: ['#EFE3D3', '#7A5C43'] },
    { id: 'lavanda', name: 'Lavanda', bar: '#5E4B8B', dots: ['#E9E3F5', '#5E4B8B'] },
    { id: 'salvia', name: 'Sálvia', bar: '#3F6B55', dots: ['#E2EBDF', '#3F6B55'] },
    { id: 'noir', name: 'Preto e Dourado', bar: '#1F1B1C', dots: ['#E9E4DA', '#C9A66B'] },
    { id: 'bordeaux', name: 'Bordô', bar: '#6E1F34', dots: ['#F1DDE0', '#6E1F34'] },
  ];

  // --- SEO Dinâmico e Dados Estruturados Schema.org (F1) ---
  useSEO({
    title: 'OperaBeauty — O Aplicativo e Sistema com a Marca do Seu Salão',
    description: 'Software de gestão e aplicativo White-Label para salões de beleza, barbearias e clínicas de estética. Agendamento online 24h, lembretes por WhatsApp e fidelização.',
    url: '/',
    canonical: 'https://operabeauty.com.br/',
    image: 'https://operabeauty.com.br/pwa-512x512.png',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'SoftwareApplication',
          'name': 'OperaBeauty',
          'url': 'https://operabeauty.com.br',
          'applicationCategory': 'BusinessApplication',
          'operatingSystem': 'Web, iOS, Android (PWA)',
          'description': 'Software de gestão e aplicativo White-Label para salões de beleza, barbearias e clínicas de estética com agendamento online 24h e lembretes automáticos.',
          'offers': {
            '@type': 'AggregateOffer',
            'priceCurrency': 'BRL',
            'lowPrice': '49.90',
            'highPrice': '199.90',
            'offerCount': '4'
          },
          'aggregateRating': {
            '@type': 'AggregateRating',
            'ratingValue': '4.9',
            'reviewCount': '128'
          }
        },
        {
          '@type': 'Organization',
          'name': 'OperaBeauty SaaS',
          'url': 'https://operabeauty.com.br',
          'logo': 'https://operabeauty.com.br/favicon.png',
          'sameAs': [
            'https://instagram.com/operabeautyapp'
          ],
          'contactPoint': {
            '@type': 'ContactPoint',
            'telephone': '+55-11-92292-8343',
            'contactType': 'sales',
            'areaServed': 'BR',
            'availableLanguage': 'Portuguese'
          }
        },
        {
          '@type': 'FAQPage',
          'mainEntity': faqs.map(faq => ({
            '@type': 'Question',
            'name': faq.q,
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': faq.a
            }
          }))
        }
      ]
    }
  });

  // --- Demonstração Interativa & Animação no Hero (F1) ---
  const [activeDemoTab, setActiveDemoTab] = useState(0); // 0: Agendamento, 1: WhatsApp, 2: Clube/Cashback
  const [isDemoPaused, setIsDemoPaused] = useState(false);
  const [confirmedViaWhatsApp, setConfirmedViaWhatsApp] = useState(false);

  useEffect(() => {
    if (isDemoPaused) return;
    const interval = setInterval(() => {
      setActiveDemoTab((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(interval);
  }, [isDemoPaused]);

  return (
    <div className="min-h-screen bg-[#FBF7F5] text-[#2B2327] font-sans antialiased selection:bg-[#F6E4E4] selection:text-[#8E3B4E]">
      
      {/* =========================================================================
          MODAL: INICIAR TESTE GRÁTIS (LEAD)
      ========================================================================= */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] w-full max-w-[460px] p-6 sm:p-8 shadow-2xl border border-[#EADFDC] relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsLeadModalOpen(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#FBF7F5] text-[#6F6168] hover:text-[#2B2327] flex items-center justify-center transition"
            >
              <X size={18} />
            </button>

            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8E3B4E] bg-[#F6E4E4] px-3 py-1 rounded-full inline-block mb-2">
                14 Dias Grátis · Plano {selectedPlanForLead}
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2B2327]">
                Comece sua jornada
              </h3>
              <p className="text-sm text-[#6F6168] mt-1">
                Sem cartão de crédito. Leva menos de 2 minutos para configurar.
              </p>
            </div>

            {submitStatus.success ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-16 h-16 bg-[#F6E4E4] text-[#8E3B4E] rounded-full flex items-center justify-center mx-auto mb-2">
                  <Check size={32} />
                </div>
                <h4 className="font-serif text-2xl font-bold text-[#2B2327]">Pronto para começar!</h4>
                <p className="text-sm text-[#6F6168]">Redirecionando para seu consultor exclusivo no WhatsApp...</p>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2B2327] mb-1.5">Seu Nome Completo *</label>
                  <input 
                    required 
                    type="text" 
                    value={leadForm.name} 
                    onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} 
                    className="w-full bg-[#FBF7F5] border border-[#EADFDC] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#8E3B4E] focus:ring-1 focus:ring-[#8E3B4E] transition"
                    placeholder="Ex: Thaís Oliveira"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2327] mb-1.5">Nome do Salão ou Estúdio *</label>
                  <input 
                    required 
                    type="text" 
                    value={leadForm.salon_name} 
                    onChange={e => setLeadForm({ ...leadForm, salon_name: e.target.value })} 
                    className="w-full bg-[#FBF7F5] border border-[#EADFDC] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#8E3B4E] focus:ring-1 focus:ring-[#8E3B4E] transition"
                    placeholder="Ex: Studio Thaís Beauty"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2327] mb-1.5">WhatsApp com DDD *</label>
                  <input 
                    required 
                    type="tel" 
                    value={leadForm.phone} 
                    onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} 
                    className="w-full bg-[#FBF7F5] border border-[#EADFDC] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#8E3B4E] focus:ring-1 focus:ring-[#8E3B4E] transition"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2B2327] mb-1.5">E-mail Profissional</label>
                  <input 
                    type="email" 
                    value={leadForm.email} 
                    onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} 
                    className="w-full bg-[#FBF7F5] border border-[#EADFDC] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#8E3B4E] focus:ring-1 focus:ring-[#8E3B4E] transition"
                    placeholder="thais@seuemail.com"
                  />
                </div>

                {submitStatus.error && (
                  <p className="text-xs text-[#B3261E] bg-[#B3261E]/10 p-2.5 rounded-lg">{submitStatus.error}</p>
                )}

                <button 
                  type="submit" 
                  disabled={submitStatus.loading}
                  className="w-full bg-[#8E3B4E] hover:bg-[#783040] text-white py-3.5 rounded-full font-semibold text-sm shadow-md transition flex items-center justify-center gap-2 mt-2"
                >
                  {submitStatus.loading ? 'Preparando seu salão...' : 'Criar meu aplicativo agora →'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ENTRAR / ACESSAR SALÃO
      ========================================================================= */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] w-full max-w-[420px] p-6 sm:p-8 shadow-2xl border border-[#EADFDC] relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#FBF7F5] text-[#6F6168] hover:text-[#2B2327] flex items-center justify-center transition"
            >
              <X size={18} />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-[#F6E4E4] text-[#8E3B4E] rounded-full flex items-center justify-center mx-auto mb-3">
                <Store size={22} />
              </div>
              <h3 className="font-serif text-2xl font-semibold text-[#2B2327]">Acessar seu Salão</h3>
              <p className="text-xs text-[#6F6168] mt-1">
                Digite o link ou identificador (slug) do seu salão parceiro:
              </p>
            </div>

            <form onSubmit={handleGoToTenant} className="space-y-4">
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-xs text-[#6F6168] select-none font-medium">operabeauty.com.br/</span>
                <input 
                  type="text" 
                  required
                  autoFocus
                  placeholder="nomedosalao"
                  value={tenantSlugInput}
                  onChange={e => setTenantSlugInput(e.target.value)}
                  className="w-full bg-[#FBF7F5] border border-[#EADFDC] rounded-xl pl-36 pr-4 py-3 text-sm font-semibold text-[#2B2327] focus:outline-none focus:border-[#8E3B4E] transition"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-[#8E3B4E] hover:bg-[#783040] text-white py-3.5 rounded-full font-semibold text-sm shadow-md transition"
              >
                Entrar no meu Salão →
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#EADFDC] text-center">
              <p className="text-xs text-[#6F6168] mb-2">Exemplo demonstrativo:</p>
              <Link 
                to="/demo" 
                onClick={() => setIsLoginModalOpen(false)}
                className="text-xs font-semibold text-[#8E3B4E] hover:underline"
              >
                Acessar Salão de Demonstração (Studio Demo)
              </Link>
              <div className="mt-4 pt-3 border-t border-[#EADFDC]/50">
                <Link 
                  to="/superadmin/login" 
                  onClick={() => setIsLoginModalOpen(false)}
                  className="text-xs text-[#6F6168] hover:text-[#2B2327] inline-flex items-center gap-1 font-medium"
                >
                  <Lock size={12} /> Acesso Restrito Super Admin
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: QR CODE PARA TESTE NO CELULAR (F2)
      ========================================================================= */}
      {showHeroQrModal && (
        <div 
          id="hero-qrcode-modal"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowHeroQrModal(false)}
        >
          <div 
            className="bg-[#1C161A] text-white border border-[#D4AF37]/35 rounded-[32px] w-full max-w-[400px] p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowHeroQrModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 text-[#C4B3BC] hover:text-white flex items-center justify-center transition"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center mx-auto text-[#D4AF37] mb-3">
                <Smartphone size={24} />
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#FBF7F4]">
                Teste no seu Celular
              </h3>
              <p className="text-xs text-[#B5A5AE] leading-relaxed">
                Aponte a câmera do smartphone para o QR Code abaixo e experimente o app real do Studio Demo.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-inner inline-block mx-auto border-4 border-[#D4AF37]/30">
              {heroQrCodeDataUrl ? (
                <img 
                  src={heroQrCodeDataUrl} 
                  alt="QR Code do Salão Demo" 
                  className="w-52 h-52 mx-auto block"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-xs text-gray-500">
                  Gerando QR Code...
                </div>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[11px] text-[#A3929C]">
                Ou acesse diretamente pelo link:
              </p>
              <Link
                to="/demo"
                onClick={() => setShowHeroQrModal(false)}
                className="inline-flex items-center gap-1.5 text-xs text-[#E6C665] hover:underline font-semibold"
              >
                <span>Abrir demonstração no navegador</span>
                <ExternalLink size={13} />
              </Link>
            </div>

            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#8E7E88]">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Simulação sem custos e sem necessidade de cadastro.</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          BARRA DE CONVITE / INDICAÇÃO DE PARCEIRO (F4)
      ========================================================================= */}
      {isResellerEnabled && referralInfo && (
        <aside 
          aria-label="Benefício de indicação de parceiro"
          className="bg-gradient-to-r from-[#2B1720] via-[#481E2C] to-[#2B1720] border-b border-[#8E3B4E]/40 text-white py-2.5 px-4 text-center text-xs font-medium flex items-center justify-center gap-2 relative z-50 animate-in slide-in-from-top-2 duration-300"
        >
          <Sparkles size={14} className="text-amber-300 animate-pulse flex-shrink-0" />
          <span>
            Você foi convidada por <strong>{referralInfo.reseller_name || 'um Parceiro Oficial'}</strong> (código: <span className="font-mono text-amber-200 font-bold">{referralInfo.code}</span>)! Ganhe <strong>1 MÊS GRÁTIS</strong> na criação do seu salão.
          </span>
          <Link 
            to="/planos" 
            className="underline text-amber-300 hover:text-white font-semibold ml-2 inline-flex items-center gap-1"
          >
            Ver planos →
          </Link>
        </aside>
      )}

      {/* =========================================================================
          1. HEADER / NAVBAR
      ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#FBF7F5]/90 backdrop-blur-md border-b border-[#EADFDC]/60 transition-all duration-200 safe-top">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-serif text-2xl md:text-3xl font-semibold tracking-tight text-[#2B2327] group-hover:text-[#8E3B4E] transition">
              OperaBeauty
            </span>
          </Link>

          {/* Links Centrais (Desktop) */}
          <nav className="hidden md:flex items-center gap-8">
            <a 
              href="#recursos" 
              onClick={(e) => scrollToSection(e, 'recursos')} 
              className="text-sm font-medium text-[#2B2327] hover:text-[#8E3B4E] transition"
            >
              Recursos
            </a>
            <a 
              href="#como-funciona" 
              onClick={(e) => scrollToSection(e, 'como-funciona')} 
              className="text-sm font-medium text-[#2B2327] hover:text-[#8E3B4E] transition"
            >
              Como funciona
            </a>
            <a 
              href="#planos" 
              onClick={(e) => scrollToSection(e, 'planos')} 
              className="text-sm font-medium text-[#2B2327] hover:text-[#8E3B4E] transition"
            >
              Planos
            </a>
            {isResellerEnabled && (
              <Link 
                to="/parceiros" 
                className="text-sm font-semibold text-[#8E3B4E] hover:text-[#783040] transition flex items-center gap-1"
              >
                <Sparkles size={13} className="text-[#8E3B4E]" />
                Parceiros
              </Link>
            )}
            <a 
              href="#perguntas" 
              onClick={(e) => scrollToSection(e, 'perguntas')} 
              className="text-sm font-medium text-[#2B2327] hover:text-[#8E3B4E] transition"
            >
              Perguntas
            </a>
          </nav>

          {/* CTAs Direitos */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsLoginModalOpen(true)}
              className="border border-[#EADFDC] bg-white text-[#2B2327] hover:border-[#8E3B4E] hover:text-[#8E3B4E] rounded-full px-5 py-2 text-sm font-semibold transition"
            >
              Entrar
            </button>
            <button 
              onClick={() => handleOpenLeadModal('Premium')}
              className="bg-[#8E3B4E] hover:bg-[#783040] text-white rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition"
            >
              Testar grátis
            </button>
          </div>

        </div>
      </header>

      <main>
        {/* =========================================================================
            2. HERO SECTION
        ========================================================================= */}
        <section className="pt-12 pb-16 md:pt-16 md:pb-24 px-6 overflow-hidden">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Lado Esquerdo: Textos e CTAs */}
            <div className="lg:col-span-7">
              <span className="inline-block bg-[#F6E4E4] text-[#8E3B4E] text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
                Para salões, manicures e clínicas de estética
              </span>
              
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[56px] font-semibold text-[#2B2327] leading-[1.12] tracking-tight mb-6">
                O aplicativo com a marca do seu salão
              </h1>
              
              <p className="text-[#6F6168] text-lg sm:text-xl leading-relaxed mb-8 max-w-xl">
                Suas clientes agendam sozinhas, recebem lembrete e voltam mais vezes. Você organiza agenda, caixa, estoque e comissões em um só lugar.
              </p>
              
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={() => handleOpenLeadModal('Premium')}
                  className="bg-[#8E3B4E] hover:bg-[#783040] text-white px-7 py-3.5 rounded-full font-semibold text-base shadow-[0_8px_20px_rgba(142,59,78,0.25)] hover:scale-[1.02] transition cursor-pointer"
                >
                  Testar grátis por 14 dias
                </button>
                <Link 
                  to="/demo" 
                  className="bg-white border border-[#EADFDC] hover:border-[#8E3B4E] text-[#2B2327] px-7 py-3.5 rounded-full font-semibold text-base hover:bg-[#FBF7F5] transition cursor-pointer"
                >
                  Ver demonstração
                </Link>
                <button 
                  type="button"
                  id="btn-hero-qrcode"
                  onClick={() => setShowHeroQrModal(true)}
                  className="inline-flex items-center gap-2 bg-[#FBF7F5] border border-[#EADFDC] hover:border-[#8E3B4E] text-[#6F6168] hover:text-[#2B2327] px-5 py-3.5 rounded-full font-semibold text-sm transition cursor-pointer"
                  title="Aponte a câmera do seu celular para testar o app"
                >
                  <QrCode size={18} className="text-[#8E3B4E]" />
                  <span>Testar no celular</span>
                </button>
              </div>
              
              <p className="text-xs text-[#6F6168] mt-4">
                Sem cartão de crédito. Instala pelo navegador, sem loja de aplicativos.
              </p>
            </div>

            {/* Lado Direito: Demonstração Interativa em Smartphone com Animação Fluida (F1) */}
            <div 
              className="lg:col-span-5 relative flex flex-col justify-center items-center py-4"
              onMouseEnter={() => setIsDemoPaused(true)}
              onMouseLeave={() => setIsDemoPaused(false)}
            >
              
              {/* Seletor Superior de Demonstrações (3 Recursos em Destaque) */}
              <div className="flex items-center justify-center gap-1.5 p-1 bg-white/90 backdrop-blur-xs border border-[#EADFDC] rounded-full shadow-xs mb-3.5 z-20">
                {[
                  { id: 0, label: 'Agendamento no App', icon: Smartphone },
                  { id: 1, label: 'Lembrete WhatsApp', icon: MessageCircle },
                  { id: 2, label: 'Clube & Retenção', icon: Sparkles },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeDemoTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveDemoTab(tab.id);
                        setIsDemoPaused(true);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-[#8E3B4E] text-white shadow-xs scale-102'
                          : 'text-[#6F6168] hover:text-[#2B2327] hover:bg-[#F6E4E4]/50'
                      }`}
                    >
                      <Icon size={13} />
                      <span className="text-[11px] sm:text-xs">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Chassis Smartphone — Proporção esbelta e elegante (iPhone 16 Pro) */}
              <div className="relative w-[290px] h-[580px] bg-[#141213] rounded-[48px] p-2.5 shadow-[0_24px_60px_-12px_rgba(43,35,39,0.28)] border-2 border-[#2F2B2D] select-none shrink-0 transition-all duration-300">
                
                {/* Dynamic Island / Speaker */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-3.5 bg-black rounded-full z-20 flex items-center justify-end pr-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#1F1C1D]"></div>
                </div>

                {/* Tela Interna do Celular */}
                <div className="w-full h-full bg-[#FBF7F5] rounded-[38px] p-5 pt-8 overflow-hidden flex flex-col justify-between border border-[#EADFDC]/40 relative">
                  
                  {/* Cenário 1: Agendamento da Cliente no App */}
                  {activeDemoTab === 0 && (
                    <div className="animate-in fade-in zoom-in-95 duration-300 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Header do Salão */}
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-7 h-7 rounded-full bg-[#8E3B4E] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                            ST
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#2B2327] block leading-none">Studio Thaís</span>
                            <span className="text-[9px] text-[#4F7F68] font-semibold">● Aberto agora</span>
                          </div>
                        </div>

                        {/* Saudação */}
                        <div className="mb-4">
                          <h4 className="font-serif text-2xl font-semibold text-[#2B2327] leading-tight">
                            Olá, Beatriz
                          </h4>
                          <p className="text-[11px] text-[#6F6168] mt-0.5">Que tal cuidar de você hoje?</p>
                        </div>

                        {/* Card: SEU PRÓXIMO HORÁRIO */}
                        <div className="bg-white rounded-2xl p-3.5 border border-[#EADFDC] shadow-xs mb-3">
                          <span className="text-[9px] font-bold text-[#8E3B4E] tracking-wider uppercase block mb-2">
                            SEU PRÓXIMO HORÁRIO
                          </span>
                          <div className="flex items-center">
                            <div className="bg-[#F6E4E4] rounded-xl p-2 w-12 text-center mr-3 shrink-0">
                              <span className="text-[9px] font-bold text-[#8E3B4E] block uppercase">QUA</span>
                              <span className="font-serif text-lg font-bold text-[#8E3B4E] leading-none block">28</span>
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-[#2B2327]">Corte Bordô + Escova</h5>
                              <p className="text-[10px] text-[#6F6168] mt-0.5">11:00 · com Thaís</p>
                              <p className="text-[10px] font-bold text-[#8E3B4E] mt-0.5">R$ 95,00</p>
                            </div>
                          </div>
                        </div>

                        {/* Botão + Agendar */}
                        <button 
                          type="button"
                          onClick={() => handleOpenLeadModal('Demonstração')}
                          className="w-full bg-[#8E3B4E] hover:bg-[#783040] text-white rounded-full py-2.5 text-center text-xs font-semibold shadow-xs transition"
                        >
                          + Agendar novo horário
                        </button>
                      </div>

                      {/* Mini vitrine inferior de serviços */}
                      <div className="bg-white/80 rounded-2xl p-3 border border-[#EADFDC]/60 mt-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#6F6168] block mb-1.5">Mais pedidos</span>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-[#2B2327]">Manicure em Gel</span>
                          <span className="font-bold text-[#8E3B4E]">R$ 65,00</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cenário 2: Lembrete WhatsApp com Confirmação em 1 Toque */}
                  {activeDemoTab === 1 && (
                    <div className="animate-in fade-in zoom-in-95 duration-300 flex-1 flex flex-col justify-between">
                      <div>
                        {/* WhatsApp Header Simulado */}
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#EADFDC]">
                          <div className="w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                            <MessageCircle size={14} className="fill-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-[#2B2327]">Studio Thaís</span>
                              <CheckCheck size={12} className="text-[#34B7F1]" />
                            </div>
                            <span className="text-[9px] text-[#6F6168]">Conta oficial verificada</span>
                          </div>
                        </div>

                        {/* Balão de Mensagem WhatsApp */}
                        <div className="bg-[#E7F8ED] border border-[#25D366]/30 rounded-2xl p-3.5 shadow-xs mb-3 relative">
                          <p className="text-[11px] text-[#2B2327] leading-relaxed">
                            Olá, Beatriz! 💖 Seu horário de <strong>Corte Bordô + Escova</strong> no Studio Thaís é amanhã às <strong>11:00</strong>.
                          </p>
                          <p className="text-[10px] text-[#4F7F68] font-medium mt-1">
                            Confirme sua presença em 1 toque:
                          </p>
                          <div className="text-right text-[8px] text-[#6F6168] mt-1 flex items-center justify-end gap-1">
                            <span>10:00</span>
                            <CheckCheck size={11} className="text-[#34B7F1]" />
                          </div>
                        </div>

                        {/* Botões Interativos de Ação Rápida */}
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setConfirmedViaWhatsApp(true)}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                              confirmedViaWhatsApp
                                ? 'bg-[#4F7F68] text-white shadow-xs'
                                : 'bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-xs'
                            }`}
                          >
                            <Check size={14} />
                            <span>{confirmedViaWhatsApp ? 'Presença Confirmada ✓' : 'Confirmar Presença'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenLeadModal('Demonstração')}
                            className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-white border border-[#EADFDC] text-[#6F6168] hover:text-[#2B2327] transition"
                          >
                            Remarcar horário
                          </button>
                        </div>
                      </div>

                      {/* Notificação de Status */}
                      <div className="bg-[#FAF7F5] rounded-xl p-2.5 border border-[#EADFDC] text-center">
                        <span className="text-[10px] font-semibold text-[#4F7F68]">
                          ⚡ Redução de 80% das faltas e no-shows
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Cenário 3: Clube de Assinaturas, Fidelidade e Cashback */}
                  {activeDemoTab === 2 && (
                    <div className="animate-in fade-in zoom-in-95 duration-300 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Header do Clube */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-1.5">
                            <Sparkles size={16} className="text-[#C9A66B]" />
                            <span className="text-xs font-serif font-bold text-[#2B2327]">Clube Studio Thaís</span>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            ★ VIP Ouro
                          </span>
                        </div>

                        {/* Cartão de Fidelidade com Borda Dourada */}
                        <div className="bg-gradient-to-br from-[#2B2327] to-[#43353B] rounded-2xl p-4 text-white shadow-md mb-3 border border-amber-300/40 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-300/10 rounded-full blur-xl pointer-events-none"></div>
                          <span className="text-[9px] tracking-wider uppercase text-amber-200 font-bold block mb-1">
                            CARTEIRA DIGITAL & CASHBACK
                          </span>
                          <div className="font-serif text-2xl font-bold text-white mb-2">
                            R$ 25,00
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-white/80 pt-2 border-t border-white/10">
                            <span>Sessões restantes: <strong>2/4</strong></span>
                            <span className="text-amber-200 font-semibold">10% de volta</span>
                          </div>
                        </div>

                        {/* Cupom Comemorativo */}
                        <div className="bg-white rounded-xl p-3 border border-[#EADFDC] shadow-xs mb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Gift size={16} className="text-[#8E3B4E]" />
                              <div>
                                <h6 className="text-[11px] font-bold text-[#2B2327]">Presente de Aniversário</h6>
                                <p className="text-[9px] text-[#6F6168]">Cupom: NIVER20 (-R$ 20,00)</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-[#4F7F68] bg-[#4F7F68]/10 px-2 py-0.5 rounded-full">Ativo</span>
                          </div>
                        </div>

                        <button 
                          type="button"
                          onClick={() => handleOpenLeadModal('Demonstração')}
                          className="w-full bg-[#8E3B4E] hover:bg-[#783040] text-white rounded-full py-2.5 text-center text-xs font-semibold shadow-xs transition"
                        >
                          Usar saldo no agendamento
                        </button>
                      </div>

                      {/* Notificação Inferior */}
                      <div className="bg-[#FAF7F5] rounded-xl p-2.5 border border-[#EADFDC] text-center">
                        <span className="text-[10px] font-semibold text-[#8E3B4E]">
                          💖 Clientes voltam 3x mais vezes no mês
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Home Indicator inferior do iPhone */}
                  <div className="w-28 h-1 bg-[#2B2327]/20 rounded-full mx-auto shrink-0 mb-1"></div>

                </div>

                {/* Notificação Flutuante Dinâmica de Acordo com a Aba */}
                <div className="absolute bottom-12 -left-10 sm:-left-14 bg-white border border-[#EADFDC] rounded-2xl p-3 px-3.5 shadow-[0_12px_32px_rgba(43,35,39,0.16)] flex items-center gap-3 w-56 z-30 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="w-8 h-8 rounded-full bg-[#F6E4E4] text-[#8E3B4E] flex items-center justify-center shrink-0">
                    {activeDemoTab === 0 && <Calendar size={16} />}
                    {activeDemoTab === 1 && <MessageCircle size={16} className="text-[#25D366]" />}
                    {activeDemoTab === 2 && <Star size={16} className="text-[#C9A66B]" />}
                  </div>
                  <div>
                    <h6 className="text-xs font-bold text-[#2B2327] leading-tight">
                      {activeDemoTab === 0 && 'Agendamento 24h'}
                      {activeDemoTab === 1 && 'Lembrete enviado'}
                      {activeDemoTab === 2 && 'Cashback creditado'}
                    </h6>
                    <p className="text-[10px] text-[#6F6168] mt-0.5">
                      {activeDemoTab === 0 && 'Sem trocar mensagens'}
                      {activeDemoTab === 1 && 'Amanhã às 11:00'}
                      {activeDemoTab === 2 && 'R$ 15,00 para a próxima'}
                    </p>
                  </div>
                </div>

              </div>

              {/* Indicador de Bolinhas do Carrossel de Demonstração */}
              <div className="flex items-center justify-center gap-1.5 mt-4">
                {[0, 1, 2].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveDemoTab(idx);
                      setIsDemoPaused(true);
                    }}
                    aria-label={`Ver demonstração ${idx + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      activeDemoTab === idx ? 'w-6 bg-[#8E3B4E]' : 'w-2 bg-[#EADFDC] hover:bg-[#8E3B4E]/40'
                    }`}
                  />
                ))}
              </div>

            </div>

          </div>
        </section>

        {/* =========================================================================
            3. TRÍADE DE BENEFÍCIOS (3 CARDS ELEVADOS)
        ========================================================================= */}
        <section className="py-8 px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <div className="bg-white rounded-[22px] p-7 border border-[#EADFDC] shadow-[0_8px_24px_rgba(142,59,78,0.06)] hover:translate-y-[-2px] transition duration-300">
              <div className="w-11 h-11 rounded-xl bg-[#F6E4E4] text-[#8E3B4E] flex items-center justify-center mb-5">
                <Calendar size={22} />
              </div>
              <h3 className="font-serif text-xl font-semibold text-[#2B2327] mb-2">
                Agenda cheia, sem esforço
              </h3>
              <p className="text-[#6F6168] text-sm leading-relaxed">
                Suas clientes agendam 24 horas por dia no app com o nome e as cores do seu salão.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-[22px] p-7 border border-[#EADFDC] shadow-[0_8px_24px_rgba(142,59,78,0.06)] hover:translate-y-[-2px] transition duration-300">
              <div className="w-11 h-11 rounded-xl bg-[#F6E4E4] text-[#8E3B4E] flex items-center justify-center mb-5">
                <Bell size={22} />
              </div>
              <h3 className="font-serif text-xl font-semibold text-[#2B2327] mb-2">
                Menos faltas
              </h3>
              <p className="text-[#6F6168] text-sm leading-relaxed">
                Lembretes no celular da cliente e política de cancelamento configurável.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-[22px] p-7 border border-[#EADFDC] shadow-[0_8px_24px_rgba(142,59,78,0.06)] hover:translate-y-[-2px] transition duration-300">
              <div className="w-11 h-11 rounded-xl bg-[#F6E4E4] text-[#8E3B4E] flex items-center justify-center mb-5">
                <Star size={22} />
              </div>
              <h3 className="font-serif text-xl font-semibold text-[#2B2327] mb-2">
                Clientes que voltam
              </h3>
              <p className="text-[#6F6168] text-sm leading-relaxed">
                Clube de fidelidade, cashback, cupons e vale-presente para ela voltar.
              </p>
            </div>

          </div>
        </section>

        {/* =========================================================================
            4. COMO FUNCIONA (PRONTO EM 3 PASSOS)
        ========================================================================= */}
        <section id="como-funciona" className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            
            <div className="text-center mb-14">
              <span className="text-xs uppercase tracking-widest font-bold text-[#8E3B4E] mb-2 block">
                COMO FUNCIONA
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#2B2327]">
                Pronto em 3 passos
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Passo 1 */}
              <div className="bg-white rounded-[22px] p-7 border border-[#EADFDC] shadow-[0_8px_24px_rgba(142,59,78,0.05)]">
                <span className="font-serif text-4xl text-[#C9A66B] font-light block mb-3">1</span>
                <h3 className="text-lg font-bold text-[#2B2327] mb-2">Cadastre seu salão</h3>
                <p className="text-sm text-[#6F6168] leading-relaxed">
                  Serviços, equipe, horários e a sua marca. Modelos prontos para unhas, sobrancelha, estética e cabelo.
                </p>
              </div>

              {/* Passo 2 */}
              <div className="bg-white rounded-[22px] p-7 border border-[#EADFDC] shadow-[0_8px_24px_rgba(142,59,78,0.05)]">
                <span className="font-serif text-4xl text-[#C9A66B] font-light block mb-3">2</span>
                <h3 className="text-lg font-bold text-[#2B2327] mb-2">Compartilhe o link</h3>
                <p className="text-sm text-[#6F6168] leading-relaxed">
                  Coloque o link ou o QR code no Instagram, no WhatsApp e no balcão.
                </p>
              </div>

              {/* Passo 3 */}
              <div className="bg-white rounded-[22px] p-7 border border-[#EADFDC] shadow-[0_8px_24px_rgba(142,59,78,0.05)]">
                <span className="font-serif text-4xl text-[#C9A66B] font-light block mb-3">3</span>
                <h3 className="text-lg font-bold text-[#2B2327] mb-2">Receba agendamentos</h3>
                <p className="text-sm text-[#6F6168] leading-relaxed">
                  A agenda se organiza sozinha e você acompanha caixa, estoque e comissões.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* =========================================================================
            5. SUA MARCA, NÃO A NOSSA (WHITE-LABEL & TEMAS)
        ========================================================================= */}
        <section className="py-20 px-6 border-y border-[#EADFDC]/60 bg-[#FAF6F4]/50">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Lado Esquerdo */}
            <div className="lg:col-span-6">
              <span className="text-xs uppercase tracking-widest font-bold text-[#8E3B4E] mb-2 block">
                SUA MARCA, NÃO A NOSSA
              </span>
              
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#2B2327] mb-6 leading-tight">
                O app tem o nome, a logo e as cores do seu salão
              </h2>
              
              <p className="text-[#6F6168] text-base leading-relaxed mb-6">
                Sua cliente não vê concorrentes nem anúncios. Escolha um dos temas prontos ou use a cor da sua marca: o sistema ajusta os tons e garante que tudo fique legível.
              </p>

              <ul className="space-y-3.5 text-sm text-[#2B2327] font-medium">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#4F7F68]/15 text-[#4F7F68] flex items-center justify-center shrink-0">
                    <Check size={14} />
                  </div>
                  <span>Instala pelo navegador, sem loja de aplicativos</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#4F7F68]/15 text-[#4F7F68] flex items-center justify-center shrink-0">
                    <Check size={14} />
                  </div>
                  <span>Slogan, banners e redes sociais do seu jeito</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#4F7F68]/15 text-[#4F7F68] flex items-center justify-center shrink-0">
                    <Check size={14} />
                  </div>
                  <span>Contraste verificado automaticamente</span>
                </li>
              </ul>
            </div>

            {/* Lado Direito: Mostruário dos 6 Temas */}
            <div className="lg:col-span-6">
              <div className="grid grid-cols-3 gap-3.5">
                {themesShowcase.map((t) => (
                  <div 
                    key={t.id} 
                    className="bg-white rounded-2xl p-4 border border-[#EADFDC] shadow-sm hover:shadow-md transition text-center"
                  >
                    <span className="text-xs font-semibold text-[#2B2327] block mb-2.5">
                      {t.name}
                    </span>
                    <div 
                      className="w-full h-7 rounded-lg mb-3 shadow-inner"
                      style={{ backgroundColor: t.bar }}
                    ></div>
                    <div className="flex justify-center items-center gap-1.5">
                      <div 
                        className="w-3.5 h-3.5 rounded-full border border-black/10"
                        style={{ backgroundColor: t.dots[0] }}
                      ></div>
                      <div 
                        className="w-3.5 h-3.5 rounded-full border border-black/10"
                        style={{ backgroundColor: t.dots[1] }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* =========================================================================
            6. RECURSOS (TUDO PARA O DIA A DIA DO SALÃO)
        ========================================================================= */}
        <section id="recursos" className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            
            <div className="text-center mb-14">
              <span className="text-xs uppercase tracking-widest font-bold text-[#8E3B4E] mb-2 block">
                RECURSOS
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#2B2327]">
                Tudo para o dia a dia do salão
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1 */}
              <div className="bg-white rounded-[22px] p-6 border border-[#EADFDC] shadow-sm hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl bg-[#F6E4E4] text-[#8E3B4E] flex items-center justify-center mb-4">
                  <Calendar size={20} />
                </div>
                <h3 className="font-serif text-lg font-semibold text-[#2B2327] mb-1.5">
                  Agenda e app da cliente
                </h3>
                <p className="text-xs text-[#6F6168] leading-relaxed">
                  Agendamento online, remarcação e histórico de atendimentos.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-[22px] p-6 border border-[#EADFDC] shadow-sm hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl bg-[#F6E4E4] text-[#8E3B4E] flex items-center justify-center mb-4">
                  <Star size={20} />
                </div>
                <h3 className="font-serif text-lg font-semibold text-[#2B2327] mb-1.5">
                  Clube de fidelidade
                </h3>
                <p className="text-xs text-[#6F6168] leading-relaxed">
                  Planos de assinatura com benefícios para clientes frequentes.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-[22px] p-6 border border-[#EADFDC] shadow-sm hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl bg-[#F6E4E4] text-[#8E3B4E] flex items-center justify-center mb-4">
                  <Gift size={20} />
                </div>
                <h3 className="font-serif text-lg font-semibold text-[#2B2327] mb-1.5">
                  Cashback, cupons e vale-presente
                </h3>
                <p className="text-xs text-[#6F6168] leading-relaxed">
                  Promoções e presentes com controle de uso e saldo.
                </p>
              </div>

              {/* Card 4 */}
              <div className="bg-white rounded-[22px] p-6 border border-[#EADFDC] shadow-sm hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl bg-[#F6E4E4] text-[#8E3B4E] flex items-center justify-center mb-4">
                  <Tag size={20} />
                </div>
                <h3 className="font-serif text-lg font-semibold text-[#2B2327] mb-1.5">
                  Caixa, PDV e estoque
                </h3>
                <p className="text-xs text-[#6F6168] leading-relaxed">
                  Vendas, entradas, saídas e alerta de estoque baixo.
                </p>
              </div>

              {/* Card 5 */}
              <div className="bg-white rounded-[22px] p-6 border border-[#EADFDC] shadow-sm hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl bg-[#F6E4E4] text-[#8E3B4E] flex items-center justify-center mb-4">
                  <Users size={20} />
                </div>
                <h3 className="font-serif text-lg font-semibold text-[#2B2327] mb-1.5">
                  Equipe e comissões
                </h3>
                <p className="text-xs text-[#6F6168] leading-relaxed">
                  Comissão calculada sozinha e agenda por profissional.
                </p>
              </div>

              {/* Card 6 */}
              <div className="bg-white rounded-[22px] p-6 border border-[#EADFDC] shadow-sm hover:shadow-md transition">
                <div className="w-10 h-10 rounded-xl bg-[#F6E4E4] text-[#8E3B4E] flex items-center justify-center mb-4">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="font-serif text-lg font-semibold text-[#2B2327] mb-1.5">
                  Ficha da cliente e LGPD
                </h3>
                <p className="text-xs text-[#6F6168] leading-relaxed">
                  Anamnese, observações e dados protegidos por salão.
                </p>
              </div>

            </div>

            {/* Pílula "Em breve" */}
            <div className="text-center mt-10">
              <div className="inline-flex flex-wrap items-center justify-center gap-2 text-xs text-[#6F6168]">
                <span className="font-semibold text-[#2B2327]">Em breve:</span>
                <span className="bg-[#F6E4E4] text-[#8E3B4E] px-3 py-1 rounded-full font-medium">Lembretes por WhatsApp</span>
                <span className="bg-[#F6E4E4] text-[#8E3B4E] px-3 py-1 rounded-full font-medium">Sinal por PIX</span>
                <span className="bg-[#F6E4E4] text-[#8E3B4E] px-3 py-1 rounded-full font-medium">Pacotes de sessões</span>
                <span className="bg-[#F6E4E4] text-[#8E3B4E] px-3 py-1 rounded-full font-medium">Avaliações</span>
              </div>
            </div>

          </div>
        </section>

        {/* =========================================================================
            7. PLANOS (UM PLANO PARA CADA TAMANHO DE SALÃO - DINÂMICO)
        ========================================================================= */}
        <section id="planos" className="py-20 px-6 bg-[#FAF6F4]/50 border-t border-[#EADFDC]/60">
          <div className="max-w-6xl mx-auto">
            
            <div className="text-center mb-10">
              <span className="text-xs uppercase tracking-widest font-bold text-[#8E3B4E] mb-2 block">
                PLANOS & PREÇOS TRANSPARENTES
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#2B2327] mb-2">
                Um plano sob medida para o seu salão
              </h2>
              <p className="text-sm text-[#6F6168] max-w-xl mx-auto">
                Teste qualquer plano grátis por 14 dias sem cartão. Escolha o faturamento anual e economize 2 meses inteiros de assinatura.
              </p>
            </div>

            {/* Toggle de Ciclo de Cobrança (Mensal vs Anual) */}
            <div className="flex items-center justify-center gap-3 mb-12">
              <span className={`text-xs font-semibold transition ${billingCycle === 'monthly' ? 'text-[#8E3B4E]' : 'text-[#6F6168]'}`}>
                Faturamento Mensal
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={billingCycle === 'yearly'}
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className="relative inline-flex h-7 w-14 items-center rounded-full bg-[#EADFDC] hover:bg-[#DFCFCB] transition-colors focus:outline-none"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-[#8E3B4E] transition-transform shadow-sm ${
                    billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-xs font-semibold flex items-center gap-1.5 transition ${billingCycle === 'yearly' ? 'text-[#8E3B4E]' : 'text-[#6F6168]'}`}>
                Faturamento Anual
                <span className="bg-[#4F7F68]/15 text-[#4F7F68] border border-[#4F7F68]/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  2 meses grátis (17% off)
                </span>
              </span>
            </div>

            {/* Grid dos 4 Planos Oficiais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
              {plans.map((p) => {
                const numericPrice = typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0;
                const isYearly = billingCycle === 'yearly';
                const displayPrice = isYearly ? (numericPrice * 10) / 12 : numericPrice;
                const annualBilled = numericPrice * 10;
                const isFeatured = p.is_featured || p.slug === 'premium' || p.name === 'Premium';

                // Marketing features com fallback se não existirem no objeto
                const featuresList = (Array.isArray(p.marketing_features) && p.marketing_features.length > 0)
                  ? p.marketing_features
                  : [
                      p.max_staff ? (p.max_staff === 1 ? '1 profissional incluso' : `Até ${p.max_staff} profissionais`) : 'Profissionais ilimitados',
                      'Agenda online com link exclusivo',
                      'App com a sua marca e cores',
                      p.max_whatsapp_messages && p.max_whatsapp_messages < 999999 ? `${p.max_whatsapp_messages} lembretes WhatsApp/mês` : 'WhatsApp ilimitado',
                      'Suporte via WhatsApp'
                    ];

                return (
                  <div 
                    key={p.slug || p.id || p.name}
                    className={`bg-white rounded-[24px] p-6 border flex flex-col justify-between relative transition-all duration-200 ${
                      isFeatured 
                        ? 'border-2 border-[#8E3B4E] shadow-[0_12px_32px_rgba(142,59,78,0.14)] transform lg:-translate-y-2' 
                        : 'border-[#EADFDC] shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div>
                      {/* Badge Superior */}
                      {p.badge_label ? (
                        <div className="mb-3">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block ${
                            isFeatured ? 'bg-[#6E1F34] text-white shadow-sm' : 'bg-[#EADFDC] text-[#2B2327]'
                          }`}>
                            {p.badge_label}
                          </span>
                        </div>
                      ) : (
                        <div className="h-6 mb-3" />
                      )}

                      <h3 className="text-lg font-bold text-[#2B2327] mb-1">{p.name}</h3>
                      <p className="text-xs text-[#6F6168] mb-4 min-h-[32px] line-clamp-2">
                        {p.description || 'Solução completa para o seu salão de beleza.'}
                      </p>

                      <div className="mb-4 pb-4 border-b border-[#EADFDC]/60">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-semibold text-[#2B2327]">R$</span>
                          <span className="font-serif text-3xl font-bold text-[#2B2327]">
                            {displayPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs text-[#6F6168]">/mês</span>
                        </div>
                        {isYearly && (
                          <p className="text-[11px] text-[#4F7F68] font-medium mt-1">
                            Cobrado anualmente R$ {annualBilled.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (2 meses grátis)
                          </p>
                        )}
                        <p className="text-xs text-[#6F6168] mt-1 font-medium">
                          {p.max_staff === 1 ? '1 profissional incluso' : `Até ${p.max_staff || '∞'} profissionais`}
                        </p>
                      </div>

                      <ul className="space-y-2.5 text-xs text-[#6F6168] mb-8">
                        {featuresList.slice(0, 5).map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2">
                            <Check size={14} className={isFeatured ? 'text-[#8E3B4E] mt-0.5 shrink-0' : 'text-[#4F7F68] mt-0.5 shrink-0'} />
                            <span className="leading-tight">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button 
                      onClick={() => handleOpenLeadModal(p.name)}
                      className={`w-full py-2.5 rounded-full font-semibold text-xs transition duration-200 ${
                        isFeatured
                          ? 'bg-[#6E1F34] hover:bg-[#581829] text-white shadow-md'
                          : 'border border-[#EADFDC] hover:border-[#8E3B4E] hover:text-[#8E3B4E] text-[#2B2327]'
                      }`}
                    >
                      Começar teste grátis
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Ações Inferiores com Link para Página Dedicada /planos */}
            <div className="mt-12 text-center flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/planos"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-[#FAF5F3] text-[#8E3B4E] font-semibold text-xs sm:text-sm border border-[#EADFDC] transition shadow-sm hover:shadow"
              >
                <span>Ver tabela comparativa completa de recursos</span>
                <ArrowRight size={16} />
              </Link>
              <button
                onClick={() => handleOpenLeadModal('Premium')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#8E3B4E] hover:bg-[#783040] text-white font-semibold text-xs sm:text-sm shadow-md transition"
              >
                <span>Iniciar teste de 14 dias sem cartão</span>
              </button>
            </div>

          </div>
        </section>

        {/* =========================================================================
            8. QUEM USA (DEPOIMENTO DO SALÃO PARCEIRO)
        ========================================================================= */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-xs uppercase tracking-widest font-bold text-[#8E3B4E] mb-4 block">
              QUEM USA
            </span>
            
            <div className="bg-white rounded-[24px] p-8 sm:p-12 border border-[#EADFDC] shadow-[0_8px_24px_rgba(142,59,78,0.06)] relative">
              <span className="font-serif text-6xl text-[#F6E4E4] leading-none absolute top-4 left-6 select-none font-bold">
                “
              </span>
              <p className="font-serif text-xl sm:text-2xl text-[#2B2327] font-medium leading-relaxed italic mb-8 relative z-10">
                Desde que comecei a usar o OperaBeauty, o tempo que eu gastava confirmando clientes no WhatsApp caiu pela metade e as faltas praticamente zeraram. Minhas clientes amaram poder agendar sozinhas direto no link do meu salão!
              </p>
              
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#8E3B4E] text-white flex items-center justify-center font-bold text-sm shadow-md">
                  TO
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-sm text-[#2B2327]">Thaís Oliveira</h4>
                  <p className="text-xs text-[#6F6168]">Fundadora do Studio Thaís · São Paulo, SP</p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* =========================================================================
            9. PERGUNTAS FREQUENTES (FAQ ACCORDION)
        ========================================================================= */}
        <section id="perguntas" className="py-20 px-6 bg-[#FAF6F4]/50 border-t border-[#EADFDC]/60">
          <div className="max-w-3xl mx-auto">
            
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#2B2327]">
                Perguntas frequentes
              </h2>
            </div>

            <div className="space-y-3.5">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div 
                    key={index} 
                    className="bg-white rounded-2xl border border-[#EADFDC] overflow-hidden transition"
                  >
                    <button 
                      onClick={() => toggleFaq(index)}
                      className="w-full px-6 py-4.5 text-left flex items-center justify-between gap-4 font-semibold text-sm text-[#2B2327] hover:text-[#8E3B4E] transition"
                    >
                      <span>{faq.q}</span>
                      <span className="w-6 h-6 rounded-full bg-[#FBF7F5] flex items-center justify-center text-[#6F6168] shrink-0">
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-[#6F6168] leading-relaxed border-t border-[#EADFDC]/40">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* =========================================================================
            10. BANNER CTA FINAL (ROSÉ VINHO PROFUNDO)
        ========================================================================= */}
        <section className="py-24 px-6 bg-[#8E3B4E] text-center text-white relative overflow-hidden">
          <div className="max-w-3xl mx-auto relative z-10">
            <h2 className="font-serif text-3xl sm:text-5xl font-semibold mb-4 leading-tight">
              Seu salão com app próprio, a partir de hoje
            </h2>
            <p className="text-white/80 text-base sm:text-lg mb-8 max-w-xl mx-auto">
              Teste grátis por 14 dias e veja suas clientes agendando sozinhas.
            </p>
            <button 
              onClick={() => handleOpenLeadModal('Premium')}
              className="bg-white text-[#8E3B4E] hover:bg-[#FBF7F5] rounded-full px-9 py-4 font-semibold text-base shadow-xl hover:scale-[1.03] transition"
            >
              Testar grátis
            </button>
          </div>
        </section>
      </main>

      {/* =========================================================================
          11. FOOTER
      ========================================================================= */}
      <footer className="bg-[#1F1B1C] text-[#B9AEB3] py-12 px-6 border-t border-[#2B2327]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <span className="font-serif text-2xl font-bold text-white tracking-tight">
              OperaBeauty
            </span>
            <span className="hidden sm:inline text-[#6F6168]">·</span>
            <p className="text-xs text-[#B9AEB3]">
              © {new Date().getFullYear()} OperaBeauty SaaS. Todos os direitos reservados.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs font-medium">
            <Link to="/planos" className="hover:text-white transition">Tabela de Planos</Link>
            {isResellerEnabled && (
              <Link to="/parceiros" className="hover:text-white transition text-[#D4AF37] font-semibold">Programa de Parceiros</Link>
            )}
            <Link to="/termos" className="hover:text-white transition">Termos de uso</Link>
            <Link to="/privacidade" className="hover:text-white transition">Privacidade</Link>
            <Link to="/dpo" className="hover:text-white transition text-brand-muted hover:text-white">Canal DPO</Link>
            <button 
              onClick={() => handleOpenLeadModal('Contato')} 
              className="hover:text-white transition"
            >
              Contato
            </button>
          </div>

        </div>
      </footer>

      {/* =========================================================================
          12. BOTÃO FLUTUANTE DE WHATSAPP (ATENDIMENTO & CONVERSÃO DIRETA)
      ========================================================================= */}
      <aside 
        aria-label="Atendimento via WhatsApp"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <a
          href="https://wa.me/5511922928343?text=Ol%C3%A1!%20Estive%20navegando%20no%20site%20do%20OperaBeauty%20e%20gostaria%20de%20tirar%20algumas%20d%C3%BAvidas%20sobre%20o%20aplicativo%20para%20o%20meu%20sal%C3%A3o."
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar com consultor via WhatsApp"
          className="relative flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white pl-4 pr-5 py-3 rounded-full font-semibold text-xs sm:text-sm shadow-[0_12px_28px_rgba(37,211,102,0.35)] hover:shadow-[0_16px_36px_rgba(37,211,102,0.45)] hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white group select-none"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <MessageCircle size={18} className="fill-white" />
          <span className="tracking-tight">Falar no WhatsApp</span>
        </a>
      </aside>

    </div>
  );
}
