import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useBooking } from '../context/BookingContext';
import { api } from '../lib/api';
import { useSEO } from '../hooks/useSEO';
import ClienteBottomNavBar from '../components/ClienteBottomNavBar';
import ReviewModal from '../components/ReviewModal';
import AssinarTermoModal from '../components/AssinarTermoModal';
import { ModalIndicarAmiga } from '../components/cliente/ModalIndicarAmiga';
import { Botao } from '../components/ui/Botao';
import { Chip } from '../components/ui/Chip';
import { TelaCliente } from '../components/ui/TelaCliente';
import {
  Bell,
  Plus,
  ArrowRight,
  Star,
  RotateCcw,
  Users,
  MapPin,
  Calendar,
  Clock,
  User,
  X,
  Share2,
  Copy,
  Check,
  Sparkles,
  Globe
} from 'lucide-react';

const HomeCliente = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, session } = useTenant();
  const { updateBooking } = useBooking();

  // Estados dos dados principais
  const [proximoHorario, setProximoHorario] = useState(null);
  const [activeWaitlistOffer, setActiveWaitlistOffer] = useState(null);
  const [ultimoAgendamento, setUltimoAgendamento] = useState(null);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [services, setServices] = useState([]);
  const [membershipSessions, setMembershipSessions] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Metadados dinâmicos de SEO e compartilhamento social no portal do cliente (F3)
  useSEO({
    title: tenant?.name ? `${tenant.name} | Agendamento Online` : 'OperaBeauty | Agendamento',
    description: tenant?.welcome_message || `Agende serviços no ${tenant?.name || 'salão'} com facilidade, acumule cashback e acompanhe seus horários.`,
    image: tenant?.meta_image_url || tenant?.logo_url || tenant?.banner_url,
    url: typeof window !== 'undefined' ? `${window.location.origin}/${tenant_slug}/home` : undefined,
    canonical: typeof window !== 'undefined' ? `${window.location.origin}/${tenant_slug}/home` : undefined
  });

  // Modais e alertas
  const [pendingReview, setPendingReview] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [pendingConsents, setPendingConsents] = useState([]);
  const [selectedConsent, setSelectedConsent] = useState(null);
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false);
  const [indicarModalOpen, setIndicarModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Faixa de lembretes
  const [showReminderBanner, setShowReminderBanner] = useState(
    () => !localStorage.getItem('operabeauty_dismiss_reminder')
  );

  // Carrossel de Banners
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
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Carregamento dos dados do cliente e do salão
  useEffect(() => {
    if (!tenant) return;

    let isMounted = true;

    const fetchData = async () => {
      // 1. Busca os serviços disponíveis
      try {
        const data = await api.services.list(tenant.id);
        if (data && isMounted) {
          setServices(data.filter((s) => s.is_active).slice(0, 6));
        }
      } catch (err) {
        console.error('Erro ao carregar serviços:', err);
      }

      // 2. Dados específicos do cliente autenticado
      if (session && session.role === 'client') {
        // Agendamentos (Próximo e Último concluído)
        setLoadingAppts(true);
        try {
          const appts = await api.appointments.list({
            client_id: session.id,
            tenant_id: tenant.id
          });

          if (appts && Array.isArray(appts) && isMounted) {
            // Início do dia de hoje (00:00) para garantir que agendamentos de hoje continuem visíveis
            const inicioDeHoje = new Date();
            inicioDeHoje.setHours(0, 0, 0, 0);

            // Próximo agendamento futuro ou de hoje ainda ativo
            const futuros = appts
              .filter((a) => {
                if (!['scheduled', 'in-progress'].includes(a.status)) return false;
                const dataAgendamento = new Date(a.start_time);
                return dataAgendamento >= inicioDeHoje;
              })
              .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

            setProximoHorario(futuros[0] || null);

            // Último agendamento concluído para "Repetir último serviço"
            const passados = appts
              .filter((a) => a.status === 'completed')
              .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

            setUltimoAgendamento(passados[0] || null);
          }
        } catch (err) {
          console.error('Erro ao buscar agendamentos:', err);
        } finally {
          if (isMounted) setLoadingAppts(false);
        }

        // Clube / Sessões do Cliente
        try {
          const myMembership = await api.memberships.getMy();
          if (myMembership && isMounted) {
            setMembershipSessions(myMembership.remaining_sessions ?? null);
          }
        } catch (err) {
          // Salão pode não ter clube ativo
        }

        // Notificações não lidas
        try {
          const notifs = await api.request('/notifications');
          if (notifs && isMounted) {
            setUnreadCount(notifs.filter((n) => !n.is_read).length);
          }
        } catch (err) {
          // Silencioso
        }

        // Avaliação pendente
        try {
          const pending = await api.request('/reviews/pending');
          const reviewItem = Array.isArray(pending) ? pending[0] : pending;
          if (reviewItem && reviewItem.appointment_id && isMounted) {
            setPendingReview(reviewItem);
            setShowReviewModal(true);
          }
        } catch (err) {
          // Silencioso
        }

        // Termos / Consentimentos pendentes
        try {
          const consents = await api.request('/consents/pending');
          if (consents && consents.length > 0 && isMounted) {
            setPendingConsents(consents);
          }
        } catch (err) {
          // Silencioso
        }

        // Oferta de vaga liberada da lista de espera (D6 P1)
        try {
          const waitlistData = await api.waitlist.getMy();
          if (waitlistData && Array.isArray(waitlistData)) {
            const offered = waitlistData.find((w) => w.status === 'offered');
            if (offered && isMounted) {
              setActiveWaitlistOffer(offered);
            }
          }
        } catch (err) {
          // Silencioso
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [tenant, session]);

  // Ativação de lembrete push
  const handleAtivarLembrete = async () => {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          localStorage.setItem('operabeauty_dismiss_reminder', 'true');
          setShowReminderBanner(false);
        } else {
          localStorage.setItem('operabeauty_dismiss_reminder', 'true');
          setShowReminderBanner(false);
        }
      } else {
        localStorage.setItem('operabeauty_dismiss_reminder', 'true');
        setShowReminderBanner(false);
      }
    } catch (err) {
      setShowReminderBanner(false);
    }
  };

  const handleDispensarLembrete = () => {
    localStorage.setItem('operabeauty_dismiss_reminder', 'true');
    setShowReminderBanner(false);
  };

  // Repetir último serviço
  const handleRepetirUltimoServico = () => {
    if (ultimoAgendamento) {
      navigate(`/${tenant_slug}/agendar/horarios`, {
        state: {
          preselectedServiceId: ultimoAgendamento.service_id,
          preselectedStaffId: ultimoAgendamento.staff_id,
          serviceName: ultimoAgendamento.service_name
        }
      });
    } else {
      navigate(`/${tenant_slug}/agendar/servicos`);
    }
  };

  // Remarcar em 1 toque a partir do cartão da Home (D6 P1)
  const handleRemarcarProximo = () => {
    if (!proximoHorario) return;
    updateBooking({
      rescheduleAppointmentId: proximoHorario.id,
      originalAppointment: proximoHorario,
      service: {
        id: proximoHorario.service_id,
        name: proximoHorario.service_name,
        price: proximoHorario.total_price || 0,
        duration: 60
      },
      services: [{
        id: proximoHorario.service_id,
        name: proximoHorario.service_name,
        price: proximoHorario.total_price || 0,
        duration_minutes: 60
      }],
      professional: proximoHorario.staff_id
        ? { id: proximoHorario.staff_id, name: proximoHorario.staff_name }
        : { id: 'any', name: 'Qualquer profissional' }
    });
    navigate(`/${tenant_slug}/agendar/horarios`);
  };

  // Compartilhar link de indicação
  const handleCopiarIndicaLink = () => {
    const link = `${window.location.origin}/${tenant_slug}/cadastro?ref=${session?.id || 'amiga'}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Dados formatados do próximo agendamento
  const dataProximo = proximoHorario ? new Date(proximoHorario.start_time) : null;
  const diaSemana = dataProximo
    ? dataProximo
        .toLocaleDateString('pt-BR', { weekday: 'short' })
        .toUpperCase()
        .replace('.', '')
        .slice(0, 3)
    : '';
  const diaNumero = dataProximo ? dataProximo.getDate() : '';
  const horaFormatada = dataProximo
    ? dataProximo.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';

  // Monograma e primeiro nome
  const initialLetter = tenant?.name ? tenant.name.trim().charAt(0).toUpperCase() : (tenant_slug ? tenant_slug.charAt(0).toUpperCase() : 'O');
  const primeiroNome = session?.name ? session.name.trim().split(' ')[0] : '';

  return (
    <TelaCliente temNavegacaoInferior className="selection:bg-brand-tint selection:text-brand">
      {/* 1. Cabeçalho Fixo Rosé Editorial */}
      <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur-md border-b border-line/40 px-5 pt-3 pb-3 max-w-[420px] mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Logo Circular */}
          <div className="w-9 h-9 rounded-full bg-ink border border-gold flex items-center justify-center overflow-hidden shadow-sm select-none shrink-0">
            {tenant?.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={tenant?.name}
                className="w-full h-full object-cover p-0.5 rounded-full"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <span className="font-display italic text-gold text-[17px] leading-none">
                {initialLetter}
              </span>
            )}
          </div>
          <span className="font-display text-[18px] font-semibold text-brand tracking-tight truncate max-w-[220px]">
            {tenant?.name || 'OperaBeauty'}
          </span>
        </div>

        {/* Ícone de Notificações */}
        <button
          type="button"
          onClick={() => navigate(`/${tenant_slug}/notificacoes`)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-ink hover:text-brand hover:bg-brand-tint/40 transition-colors relative"
          aria-label="Notificações"
        >
          <Bell size={21} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-brand rounded-full ring-2 ring-bg animate-pulse" />
          )}
        </button>
      </header>

      {/* Conteúdo Principal Centralizado Mobile */}
      <main className="w-full max-w-[420px] mx-auto px-5 pt-3 space-y-5 flex-grow">
        {/* 2. Faixa de Lembretes (Fina e Dispensável) */}
        {showReminderBanner && (
          <div className="w-full h-11 px-3.5 rounded-full bg-[#F6E4E4] border border-line/60 flex items-center justify-between shadow-xs animate-fade-in text-[13px]">
            <span className="font-sans font-medium text-[#2B2327] truncate pr-2">
              Receber lembrete 24h antes?
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleAtivarLembrete}
                className="h-7 px-3.5 rounded-full bg-brand text-white font-sans text-[12px] font-semibold hover:opacity-90 active:scale-95 transition-all shadow-xs"
              >
                Ativar
              </button>
              <button
                type="button"
                onClick={handleDispensarLembrete}
                className="w-6 h-6 rounded-full flex items-center justify-center text-ink-soft hover:text-ink transition-colors"
                aria-label="Dispensar aviso"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Alerta de Assinatura de Termo Pendente */}
        {pendingConsents.length > 0 && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-[20px] p-4 shadow-sm flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <span className="text-[12px] font-bold text-amber-900 uppercase tracking-wider block">
                Termo Pendente
              </span>
              <p className="text-[13px] text-amber-900/90 font-medium">
                Você possui termo de consentimento para assinar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedConsent(pendingConsents[0])}
              className="h-8 px-3.5 rounded-full bg-amber-800 text-white text-[12px] font-semibold shrink-0 hover:bg-amber-900 transition-colors"
            >
              Assinar
            </button>
          </div>
        )}

        {/* 2.1 Banner de Oferta de Vaga Liberada da Lista de Espera (D6 P1) */}
        {activeWaitlistOffer && (
          <section className="animate-fade-in-down">
            <div className="w-full bg-linear-to-r from-brand-tint via-surface to-brand-tint/60 border-2 border-brand/50 rounded-card p-4 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                  <Sparkles size={18} />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand block">
                    ⚡ Vaga Liberada para Você!
                  </span>
                  <p className="text-xs font-bold text-ink leading-tight mt-0.5">
                    {activeWaitlistOffer.service_name || 'Procedimento'} · {new Date(`${activeWaitlistOffer.desired_date}T12:00:00Z`).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-[11px] text-ink-soft mt-0.5">
                    Você tem prioridade para garantir este horário.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  updateBooking({
                    service: activeWaitlistOffer.service_id ? {
                      id: activeWaitlistOffer.service_id,
                      name: activeWaitlistOffer.service_name || 'Serviço',
                      price: activeWaitlistOffer.service_price || 0,
                      duration: 60
                    } : null,
                    professional: activeWaitlistOffer.professional_id ? {
                      id: activeWaitlistOffer.professional_id,
                      name: activeWaitlistOffer.professional_name || 'Profissional'
                    } : { id: 'any', name: 'Qualquer profissional' },
                    date: activeWaitlistOffer.desired_date
                  });
                  navigate(`/${tenant_slug}/agendar/horarios?waitlistId=${activeWaitlistOffer.id}`);
                }}
                className="px-3.5 py-2 rounded-full bg-brand text-white text-xs font-bold shadow-xs hover:bg-brand-hover active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                Garantir
              </button>
            </div>
          </section>
        )}

        {/* 3. Saudação Editorial */}
        <section className="pt-1">
          <h1 className="font-display text-[30px] font-semibold text-ink leading-tight mb-1">
            {primeiroNome ? `Olá, ${primeiroNome}` : 'Olá'}
          </h1>
          <p className="font-sans text-[15px] text-ink-soft">
            {tenant?.welcome_message || 'Que tal um momento só seu?'}
          </p>
        </section>

        {/* 4. Cartão "SEU PRÓXIMO HORÁRIO" (ou Convite se vazio) */}
        <section>
          {loadingAppts ? (
            <div className="w-full h-[156px] rounded-card bg-surface border border-line p-5 flex items-center justify-center animate-pulse shadow-card">
              <span className="text-ink-soft text-[14px]">Carregando seu próximo horário...</span>
            </div>
          ) : proximoHorario ? (
            <div className="w-full bg-surface rounded-card p-5 border border-line shadow-card text-left space-y-4">
              <span className="text-[11px] font-semibold font-sans uppercase tracking-wider text-ink-soft block">
                Seu próximo horário
              </span>

              {/* Linha com Data e Info do Atendimento */}
              <div className="flex items-center gap-3.5">
                {/* Bloco de Data Rosa Suave */}
                <div className="w-16 h-16 rounded-[18px] bg-[#F6E4E4] border border-line/50 flex flex-col items-center justify-center shrink-0 shadow-xs select-none">
                  <span className="text-[11px] font-bold font-sans text-ink-soft tracking-wider">
                    {diaSemana}
                  </span>
                  <span className="font-display text-[22px] font-bold text-brand leading-none mt-0.5">
                    {diaNumero}
                  </span>
                </div>

                {/* Detalhes do Serviço */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-sans text-[17px] font-bold text-ink truncate leading-snug">
                    {proximoHorario.service_name}
                  </h3>
                  <p className="font-sans text-[14px] text-ink-soft mt-0.5 truncate">
                    {horaFormatada} · com {proximoHorario.staff_name}
                  </p>
                </div>
              </div>

              {/* Botões de Ação com Contorno */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleRemarcarProximo}
                  className="flex-1 h-11 rounded-full border border-line bg-surface hover:bg-[#F6E4E4]/40 text-ink text-[14px] font-semibold transition-colors duration-150 active:scale-[0.99] cursor-pointer"
                >
                  Remarcar
                </button>
                <button
                  type="button"
                  onClick={() => setDetalhesModalOpen(true)}
                  className="flex-1 h-11 rounded-full border border-line bg-surface hover:bg-[#F6E4E4]/40 text-ink text-[14px] font-semibold transition-colors duration-150 active:scale-[0.99] cursor-pointer"
                >
                  Detalhes
                </button>
              </div>
            </div>
          ) : (
            /* Estado sem agendamento futuro: Card Acolhedor */
            <div className="w-full bg-surface rounded-card p-5 border border-line shadow-card text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F6E4E4] text-brand border border-line/60 flex items-center justify-center mx-auto shadow-xs">
                <Calendar size={22} strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-display text-[18px] font-semibold text-ink">
                  Nenhum agendamento agendado
                </h3>
                <p className="font-sans text-[13px] text-ink-soft mt-1">
                  Reserve um momento especial para cuidar de você hoje mesmo.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* 5. Botão Primário Dominante "+ Agendar novo horário" */}
        <section>
          <Botao
            variante="primario"
            tamanho="lg"
            className="w-full shadow-md"
            onClick={() => navigate(`/${tenant_slug}/agendar/servicos`)}
            iconeInicio={<Plus size={20} strokeWidth={2.4} />}
          >
            Agendar novo horário
          </Botao>
        </section>

        {/* 6. Atalhos em Chips: Repetir último serviço & Indicar */}
        <section className="flex items-center justify-center gap-2.5 flex-wrap">
          <Chip
            onClick={handleRepetirUltimoServico}
            icone={<RotateCcw size={14} strokeWidth={2.2} />}
          >
            Repetir último serviço
          </Chip>

          <Chip
            onClick={() => setIndicarModalOpen(true)}
            icone={<Users size={14} strokeWidth={2.2} />}
          >
            Indicar uma amiga
          </Chip>

          <Chip
            onClick={() => navigate(`/${tenant_slug}/site`)}
            icone={<Globe size={14} strokeWidth={2.2} />}
          >
            Conhecer o espaço
          </Chip>
        </section>

        {/* 7. Cartão do Clube de Fidelidade */}
        <section>
          <div
            onClick={() => navigate(`/${tenant_slug}/clube`)}
            className="w-full bg-surface border border-gold/60 hover:border-gold rounded-card p-4 shadow-card flex items-center justify-between transition-colors duration-200 cursor-pointer active:scale-[0.99] select-none"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-[16px] bg-[#FAF3E0] text-gold flex items-center justify-center shrink-0 shadow-sm">
                <Star size={24} strokeWidth={2.2} className="fill-gold/20 text-gold" />
              </div>
              <div className="text-left">
                <span className="text-[11px] font-bold font-sans uppercase tracking-wider text-ink-soft block">
                  Clube {tenant?.name ? tenant.name.split(' ')[0] : 'Studio'}
                </span>
                <span className="font-sans text-[15px] font-bold text-ink leading-tight block mt-0.5">
                  {membershipSessions !== null
                    ? `Você tem ${membershipSessions} ${membershipSessions === 1 ? 'sessão disponível' : 'sessões disponíveis'}`
                    : 'Acesse benefícios e planos exclusivos'}
                </span>
              </div>
            </div>
            <div className="text-ink-soft hover:text-ink pl-2 shrink-0">
              <ArrowRight size={18} strokeWidth={2.2} />
            </div>
          </div>
        </section>

        {/* 8. Banner Promocional do Salão */}
        <section className="w-full rounded-card overflow-hidden shadow-card border border-line select-none relative">
          {banners.length > 0 ? (
            <div className="relative w-full h-[140px] overflow-hidden">
              <div
                className="flex transition-transform duration-700 ease-in-out h-full"
                style={{
                  transform: `translateX(-${currentSlide * (100 / banners.length)}%)`,
                  width: `${banners.length * 100}%`
                }}
              >
                {banners.map((slide, idx) => (
                  <div
                    key={slide.id || idx}
                    className="w-full h-full relative shrink-0 overflow-hidden"
                    style={{ width: `${100 / banners.length}%` }}
                  >
                    {slide.url ? (
                      <img
                        src={slide.url}
                        alt={slide.title || 'Banner promocional'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#F6E4E4] flex items-center justify-center relative overflow-hidden">
                        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-[#EFD2D4] opacity-80" />
                        <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-white/70 opacity-90" />
                        <span className="font-sans text-[12px] font-bold tracking-wider text-brand uppercase relative z-10 px-4 py-1.5 rounded-full bg-white/85 backdrop-blur-xs shadow-xs border border-line/60">
                          [Banner Promocional do Salão]
                        </span>
                      </div>
                    )}
                    {(slide.title || slide.subtitle) && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4">
                        {slide.title && (
                          <h4 className="text-white font-display text-[16px] font-semibold">
                            {slide.title}
                          </h4>
                        )}
                        {slide.subtitle && (
                          <p className="text-white/90 font-sans text-[12px]">
                            {slide.subtitle}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Indicadores do Slide (Dots) */}
              {banners.length > 1 && (
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                  {banners.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlide(idx)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        currentSlide === idx ? 'bg-white scale-125' : 'bg-white/50'
                      }`}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Fallback quando sem banners */
            <div className="w-full h-[140px] bg-[#F6E4E4] rounded-card flex items-center justify-center relative overflow-hidden border border-line/60">
              <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-[#EFD2D4] opacity-80" />
              <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-white/70 opacity-90" />
              <span className="font-sans text-[12px] font-bold tracking-wider text-brand uppercase relative z-10 px-4 py-1.5 rounded-full bg-white/85 backdrop-blur-xs shadow-xs border border-line/60">
                [Banner Promocional do Salão]
              </span>
            </div>
          )}
        </section>

        {/* 9. Recomendações de Serviços (Inspirações Rápidas) */}
        {services.length > 0 && (
          <section className="pt-1 space-y-3 text-left">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[18px] font-semibold text-ink">
                Serviços em Destaque
              </h2>
              <button
                type="button"
                onClick={() => navigate(`/${tenant_slug}/agendar/servicos`)}
                className="text-brand font-sans text-[13px] font-semibold hover:underline"
              >
                Ver todos
              </button>
            </div>

            <div className="flex overflow-x-auto gap-3 pb-2 -mx-5 px-5 scrollbar-none">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  onClick={() =>
                    navigate(`/${tenant_slug}/agendar/servicos`, {
                      state: { preselectedServiceId: svc.id }
                    })
                  }
                  className="min-w-[200px] w-[200px] bg-surface rounded-[18px] p-4 border border-line shadow-sm hover:border-brand-accent/50 transition-all cursor-pointer shrink-0 active:scale-[0.99] flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-ink-soft">
                      {svc.duration_minutes} min
                    </span>
                    <h3 className="font-sans text-[14px] font-bold text-ink line-clamp-1">
                      {svc.name}
                    </h3>
                  </div>
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-line/50">
                    <span className="font-sans text-[14px] font-bold text-brand">
                      {svc.is_starting_price && 'A partir de '}
                      R$ {parseFloat(svc.price).toFixed(2).replace('.', ',')}
                    </span>
                    <span className="w-7 h-7 rounded-full bg-[#F6E4E4] text-brand border border-line/50 flex items-center justify-center text-[12px] font-bold">
                      +
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Modal: Detalhes do Próximo Agendamento */}
      {detalhesModalOpen && proximoHorario && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-surface rounded-card p-6 shadow-card max-w-sm w-full border border-line relative animate-scale-up text-left space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display text-[20px] font-semibold text-brand">
                Detalhes do Agendamento
              </h3>
              <button
                type="button"
                onClick={() => setDetalhesModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:text-ink hover:bg-brand-tint/50 transition-colors"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-[14px]">
              <div className="flex items-start gap-3">
                <Sparkles size={18} className="text-brand shrink-0 mt-0.5" />
                <div>
                  <span className="text-ink-soft text-[12px] block">Serviço</span>
                  <span className="font-semibold text-ink">{proximoHorario.service_name}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User size={18} className="text-brand shrink-0 mt-0.5" />
                <div>
                  <span className="text-ink-soft text-[12px] block">Profissional</span>
                  <span className="font-semibold text-ink">{proximoHorario.staff_name}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar size={18} className="text-brand shrink-0 mt-0.5" />
                <div>
                  <span className="text-ink-soft text-[12px] block">Data e Hora</span>
                  <span className="font-semibold text-ink">
                    {dataProximo?.toLocaleDateString('pt-BR', { dateStyle: 'long' })} às{' '}
                    {horaFormatada}
                  </span>
                </div>
              </div>

              {tenant?.address && (
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-brand shrink-0 mt-0.5" />
                  <div>
                    <span className="text-ink-soft text-[12px] block">Endereço</span>
                    <span className="font-medium text-ink">{tenant.address}</span>
                  </div>
                </div>
              )}

              {proximoHorario.total_price && (
                <div className="pt-2 border-t border-line flex justify-between items-center">
                  <span className="text-ink-soft text-[13px]">Valor estimado:</span>
                  <span className="font-bold text-brand text-[16px]">
                    R$ {parseFloat(proximoHorario.total_price).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 space-y-2">
              <Botao
                variante="contorno"
                tamanho="md"
                className="w-full"
                onClick={() => {
                  setDetalhesModalOpen(false);
                  navigate(`/${tenant_slug}/historico`);
                }}
              >
                Ver todos os agendamentos
              </Botao>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Indicar uma Amiga (Item D19 P2) */}
      <ModalIndicarAmiga
        isOpen={indicarModalOpen}
        onClose={() => setIndicarModalOpen(false)}
      />


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

      {/* Modal de Assinatura de Termo */}
      {selectedConsent && (
        <AssinarTermoModal
          consent={selectedConsent}
          onClose={() => setSelectedConsent(null)}
          onSigned={() => {
            setPendingConsents((prev) => prev.filter((c) => c.id !== selectedConsent.id));
            setSelectedConsent(null);
          }}
        />
      )}

      {/* 10. Navegação Inferior Rosé Editorial */}
      <ClienteBottomNavBar activeTab="home" tenantSlug={tenant_slug} />
    </TelaCliente>
  );
};

export default HomeCliente;
