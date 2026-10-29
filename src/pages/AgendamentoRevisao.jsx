import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Calendar,
  Clock,
  User,
  Sparkles,
  Tag,
  Gift,
  Check,
  X,
  CreditCard,
  AlertCircle,
  HelpCircle,
  Coins,
  Layers
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useBooking } from '../context/BookingContext';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationProvider';
import { TelaCliente } from '../components/ui/TelaCliente';

// Função para formatar a data por extenso (Ex: "Quarta, 28 de Outubro")
function formatDateExtenso(dateStr) {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    const diaSem = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const diaSemCap = diaSem.charAt(0).toUpperCase() + diaSem.slice(1);
    const mes = date.toLocaleDateString('pt-BR', { month: 'long' });
    const mesCap = mes.charAt(0).toUpperCase() + mes.slice(1);
    return `${diaSemCap}, ${day} de ${mesCap}`;
  } catch (e) {
    return dateStr;
  }
}

// Formatar minutos para string legível (Ex: 90 -> "1h30")
function formatMinutes(minutes) {
  if (!minutes) return '30 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h${m.toString().padStart(2, '0')}`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}

const AgendamentoRevisao = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, session } = useTenant();
  const { bookingData, updateBooking } = useBooking();
  const { showSuccess, showError } = useNotification();

  const [loading, setLoading] = useState(false);

  // Cupons
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Vale-presente
  const [giftCardInput, setGiftCardInput] = useState('');
  const [giftCardApplied, setGiftCardApplied] = useState(null);
  const [giftCardLoading, setGiftCardLoading] = useState(false);

  // Pacote de Sessões (D13)
  const [eligiblePackage, setEligiblePackage] = useState(null);
  const [usePackageSession, setUsePackageSession] = useState(false);

  // Cashback / Carteira
  const [walletBalance, setWalletBalance] = useState(0);
  const [useCashback, setUseCashback] = useState(false);

  // Validação preliminar: se não houver serviço ou data, volta para o início do funil
  useEffect(() => {
    if (!bookingData.service && (!bookingData.services || bookingData.services.length === 0)) {
      navigate(`/${tenant_slug}/agendar/servicos`, { replace: true });
      return;
    }
    if (!bookingData.date || !bookingData.time) {
      navigate(`/${tenant_slug}/agendar/horarios`, { replace: true });
    }
  }, [bookingData, tenant_slug, navigate]);

  // Carrega saldo de cashback do cliente autenticado
  useEffect(() => {
    let isMounted = true;
    const fetchWallet = async () => {
      try {
        const wallet = await api.wallets.getMyWallet();
        if (wallet && isMounted) {
          setWalletBalance(parseFloat(wallet.balance || 0));
        }
      } catch (err) {
        // Ignora silenciosamente se cliente não tiver carteira criada
      }
    };
    if (session && session.role === 'client') {
      fetchWallet();
    }
    return () => {
      isMounted = false;
    };
  }, [session]);

  // Cálculo de Preço Base
  const servicesList = useMemo(() => {
    if (bookingData.services && bookingData.services.length > 0) {
      return bookingData.services;
    }
    if (bookingData.service) {
      return [bookingData.service];
    }
    return [];
  }, [bookingData]);

  const primaryServiceId = useMemo(() => {
    return servicesList[0]?.id || bookingData.service?.id;
  }, [servicesList, bookingData.service]);

  // Checa se a cliente possui pacote ativo elegível para o serviço primário (D13)
  useEffect(() => {
    let isMounted = true;
    const checkPackage = async () => {
      if (!session || session.role !== 'client' || !primaryServiceId) return;
      try {
        const res = await api.packages.checkEligible(primaryServiceId);
        if (isMounted && res?.eligible && res?.package) {
          setEligiblePackage(res.package);
          setUsePackageSession(true); // Seleciona automaticamente para comodidade
        }
      } catch (err) {
        console.warn('Erro ao verificar pacote elegível:', err);
      }
    };
    checkPackage();
    return () => {
      isMounted = false;
    };
  }, [session, primaryServiceId]);

  const servicePrice = useMemo(() => {
    if (servicesList.length > 0) {
      return servicesList.reduce((sum, s) => sum + parseFloat(s.price || 0), 0);
    }
    return bookingData.service?.price ? Number(bookingData.service.price) : 0;
  }, [servicesList, bookingData.service]);

  const totalDuration = useMemo(() => {
    if (servicesList.length > 0) {
      return servicesList.reduce(
        (sum, s) => sum + parseInt(s.duration_minutes || s.duration || 30, 10),
        0
      );
    }
    return bookingData.service?.duration || 30;
  }, [servicesList, bookingData.service]);

  // Desconto de Pacote de Sessões (D13)
  const packageDiscount = useMemo(() => {
    if (!usePackageSession || !eligiblePackage) return 0;
    const coveredService = servicesList[0] || bookingData.service;
    return parseFloat(coveredService?.price || 0);
  }, [usePackageSession, eligiblePackage, servicesList, bookingData.service]);

  const priceAfterPackage = Math.max(0, servicePrice - packageDiscount);

  // Descontos
  const couponDiscount = useMemo(() => {
    if (!couponApplied) return 0;
    if (couponApplied.discount_type === 'percentage') {
      const calc = priceAfterPackage * (couponApplied.discount_value / 100);
      return Math.min(calc, priceAfterPackage);
    }
    return Math.min(Number(couponApplied.discount_value || 0), priceAfterPackage);
  }, [couponApplied, priceAfterPackage]);

  const priceAfterCoupon = Math.max(0, priceAfterPackage - couponDiscount);

  const giftCardDiscount = useMemo(() => {
    if (!giftCardApplied) return 0;
    const balance = parseFloat(giftCardApplied.available_balance || 0);
    return Math.min(balance, priceAfterCoupon);
  }, [giftCardApplied, priceAfterCoupon]);

  const priceAfterGiftCard = Math.max(0, priceAfterCoupon - giftCardDiscount);

  const cashbackRedeemed = useMemo(() => {
    if (!useCashback) return 0;
    return Math.min(walletBalance, priceAfterGiftCard);
  }, [useCashback, walletBalance, priceAfterGiftCard]);

  const totalFinal = Math.max(0, priceAfterGiftCard - cashbackRedeemed);

  // Verificação de Sinal Antecipado (D3)
  const depositInfo = useMemo(() => {
    const serviceWithDeposit = servicesList.find((s) => s.requires_deposit) ||
      (bookingData.service?.requires_deposit ? bookingData.service : null);

    if (!serviceWithDeposit) return null;

    let depositAmount = 0;
    if (serviceWithDeposit.deposit_type === 'percentage') {
      const pct = parseFloat(serviceWithDeposit.deposit_amount || 0);
      depositAmount = Math.round((totalFinal * (pct / 100)) * 100) / 100;
    } else {
      depositAmount = Math.min(parseFloat(serviceWithDeposit.deposit_amount || 0), totalFinal);
    }

    if (depositAmount <= 0) return null;

    return {
      serviceName: serviceWithDeposit.name,
      type: serviceWithDeposit.deposit_type,
      rate: serviceWithDeposit.deposit_amount,
      amount: depositAmount,
      remainingAmount: Math.max(0, totalFinal - depositAmount)
    };
  }, [servicesList, bookingData.service, totalFinal]);

  // Aplicação de Cupom
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);

    try {
      const responseData = await api.coupons.getByCode(
        tenant.id,
        couponInput.toUpperCase().trim()
      );
      const data = responseData && responseData.length > 0 ? responseData[0] : null;

      if (!data) {
        showError('Cupom inválido ou não encontrado.');
        setCouponApplied(null);
        return;
      }

      if (data.max_uses && data.current_uses >= data.max_uses) {
        showError('Este cupom já atingiu o limite de utilizações.');
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        showError('Este cupom já está expirado.');
        return;
      }

      // Se for cupom de serviço específico
      if (data.service_id) {
        const matchesService = servicesList.some((s) => s.id === data.service_id);
        if (!matchesService) {
          showError('Este cupom não é válido para os serviços selecionados.');
          return;
        }
      }

      setCouponApplied(data);
      showSuccess(`Cupom "${data.code}" aplicado com sucesso!`);
    } catch (err) {
      console.error(err);
      showError('Erro ao validar o cupom. Tente novamente.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(null);
    setCouponInput('');
  };

  // Aplicação de Vale-Presente
  const handleApplyGiftCard = async () => {
    if (!giftCardInput.trim()) return;
    setGiftCardLoading(true);

    try {
      const data = await api.request(
        `/giftcards/validate/${giftCardInput.toUpperCase().trim()}`
      );
      if (!data || !data.redemption_code) {
        showError('Vale-presente inválido ou não encontrado.');
        setGiftCardApplied(null);
        return;
      }

      if (data.service_id) {
        const matchesService = servicesList.some((s) => s.id === data.service_id);
        if (!matchesService) {
          showError('Este vale-presente não é válido para o serviço selecionado.');
          return;
        }
      }

      setGiftCardApplied(data);
      showSuccess('Vale-presente aplicado com sucesso!');
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao validar vale-presente.');
      setGiftCardApplied(null);
    } finally {
      setGiftCardLoading(false);
    }
  };

  const handleRemoveGiftCard = () => {
    setGiftCardApplied(null);
    setGiftCardInput('');
  };

  // Finalização e Confirmação do Agendamento
  const handleConfirm = async () => {
    if (!session || session.role !== 'client') {
      showError('Por favor, identifique-se para confirmar o seu agendamento.');
      navigate(`/${tenant_slug}/login`);
      return;
    }

    setLoading(true);

    const startDateTimeStr = `${bookingData.date}T${bookingData.time}:00`;
    const startDateTime = new Date(startDateTimeStr);

    try {
      const assignedStaffId = (bookingData.professional && bookingData.professional.id !== 'any')
        ? bookingData.professional.id
        : 'any';

      // Fluxo de Remarcação em 1 Toque (D6 P1)
      if (bookingData.rescheduleAppointmentId) {
        const rescheduledAppt = await api.appointments.reschedule(bookingData.rescheduleAppointmentId, {
          start_time: startDateTime.toISOString(),
          staff_id: assignedStaffId
        });

        showSuccess('Agendamento remarcado com sucesso!');
        navigate(`/${tenant_slug}/agendar/confirmado`, {
          state: {
            appointmentId: rescheduledAppt?.id || bookingData.rescheduleAppointmentId,
            isReschedule: true,
            assignedStaffName: rescheduledAppt?.staff_name || bookingData.professional?.name
          }
        });
        return;
      }

      const primaryServiceId = servicesList[0]?.id || bookingData.service?.id;

      const createdAppt = await api.appointments.create({
        staff_id: assignedStaffId,
        service_id: primaryServiceId,
        services: servicesList.length > 0 ? servicesList.map(s => ({
          service_id: s.id,
          variation_id: s.variation_id || undefined,
          variation_name: s.variation_name || undefined,
          extras: s.extras || [],
          price: parseFloat(s.price || 0),
          duration_minutes: parseInt(s.duration_minutes || s.duration || 30, 10)
        })) : undefined,
        start_time: startDateTime.toISOString(),
        total_price: totalFinal + giftCardDiscount,
        cashback_redeemed: cashbackRedeemed,
        gift_card_code: giftCardApplied ? giftCardApplied.redemption_code : undefined,
        use_package: usePackageSession && eligiblePackage ? true : undefined,
        client_package_id: usePackageSession && eligiblePackage ? eligiblePackage.id : undefined
      });

      // Se o agendamento foi designado automaticamente ("Qualquer profissional"), atualiza o bookingData
      if (createdAppt?.staff_name) {
        updateBooking('professional', {
          id: createdAppt.staff_id,
          name: createdAppt.staff_name
        });
      }

      // Se aplicou cupom, incrementa o uso no backend
      if (couponApplied && couponApplied.id) {
        try {
          await api.coupons.redeem(couponApplied.id, tenant.id);
        } catch (e) {
          console.warn('Falha secundária ao registrar uso do cupom:', e);
        }
      }

      // Se o serviço exige sinal antecipado (D3), gera a cobrança PIX via Multi-Gateway
      let depositData = null;
      if (depositInfo && createdAppt?.id) {
        try {
          depositData = await api.payments.createDeposit(createdAppt.id, tenant.id);
        } catch (depErr) {
          console.warn('Aviso ao gerar PIX do sinal:', depErr);
        }
      }

      // Sucesso -> Redireciona para tela de confirmação 1:1 com os dados do sinal
      navigate(`/${tenant_slug}/agendar/confirmado`, {
        state: {
          appointmentId: createdAppt?.id,
          depositData,
          assignedStaffName: createdAppt?.staff_name
        }
      });
    } catch (err) {
      console.error(err);
      showError('Não foi possível confirmar o agendamento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TelaCliente temBarraFixaInferior className="selection:bg-brand-tint selection:text-brand">
      {/* Container Principal Mobile Centralizado */}
      <div className="w-full max-w-[420px] mx-auto px-5 pt-3 flex-1 flex flex-col pb-8">
        {/* Topo do Fluxo: Botão Voltar + Barra de Progresso + Etapa 3 de 4 */}
        <header className="flex items-center justify-between gap-3 pt-1 pb-4">
          <button
            type="button"
            onClick={() => navigate(`/${tenant_slug}/agendar/horarios`)}
            className="w-10 h-10 rounded-full border border-line bg-surface text-ink flex items-center justify-center hover:bg-brand-tint/30 transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer"
            aria-label="Voltar para seleção de horário"
          >
            <ChevronLeft size={20} strokeWidth={2.4} />
          </button>

          {/* Barra de Progresso Rosé (75% - 3 de 4) */}
          <div className="flex-1 max-w-[170px] mx-auto">
            <div
              className="h-1.5 w-full bg-line/60 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={75}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full bg-brand rounded-full w-3/4 transition-all duration-300" />
            </div>
          </div>

          <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider shrink-0 w-10 text-right">
            3 de 4
          </span>
        </header>

        {/* Título da Seção */}
        <div className="pt-2 pb-5">
          {bookingData.rescheduleAppointmentId && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-tint text-brand text-xs font-semibold mb-2 shadow-2xs">
              <span>🔄 Remarcação de Atendimento</span>
            </div>
          )}
          <h1 className="font-serif text-[28px] font-bold text-ink leading-tight tracking-tight">
            {bookingData.rescheduleAppointmentId ? 'Confirmar remarcação' : 'Revisão e confirmação'}
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            {bookingData.rescheduleAppointmentId
              ? 'Confira o novo dia e horário para o seu procedimento.'
              : 'Confira todos os detalhes do seu momento.'}
          </p>
        </div>

        {/* Card Principal: Resumo do Procedimento */}
        <div className="bg-surface rounded-2xl border border-line/70 shadow-xs p-5 space-y-4 mb-4">
          {/* Lista de Serviços */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                {servicesList.length > 1 ? 'Serviços Escolhidos' : 'Serviço Escolhido'}
              </span>
              <button
                type="button"
                onClick={() => navigate(`/${tenant_slug}/agendar/servicos`)}
                className="text-xs font-semibold text-brand hover:underline cursor-pointer"
              >
                Alterar
              </button>
            </div>

            <div className="space-y-2 pt-1">
              {servicesList.map((srv, idx) => (
                <div key={srv.id || idx} className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brand-tint/50 text-brand flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={15} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink leading-snug">{srv.name}</p>
                      {srv.variation_name && (
                        <span className="inline-block text-[11px] font-semibold text-brand bg-brand-tint/70 px-1.5 py-0.2 rounded-md mt-0.5">
                          Tamanho/Variação: {srv.variation_name}
                        </span>
                      )}
                      {srv.extras && srv.extras.length > 0 && (
                        <p className="text-[11px] text-ink-soft mt-0.5">
                          + {srv.extras.map(e => e.name).join(', ')}
                        </p>
                      )}
                      <p className="text-xs text-ink-soft mt-0.5">
                        {formatMinutes(srv.duration_minutes || srv.duration)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-ink tabular-nums shrink-0 pt-0.5">
                    R$ {parseFloat(srv.price || 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-line/60" />

          {/* Profissional */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-tint text-brand flex items-center justify-center font-serif text-base font-bold overflow-hidden shrink-0">
                {bookingData.professional?.id === 'any' ? (
                  <Sparkles size={18} className="text-brand" />
                ) : bookingData.professional?.image ? (
                  <img
                    src={bookingData.professional.image}
                    alt={bookingData.professional.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (bookingData.professional?.name || 'Q').charAt(0)
                )}
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft block">
                  Profissional
                </span>
                <p className="text-sm font-bold text-ink">
                  {bookingData.professional?.id === 'any'
                    ? 'Qualquer profissional (Mais rápido)'
                    : (bookingData.professional?.name || 'Qualquer profissional (Mais rápido)')}
                </p>
                {bookingData.professional?.id === 'any' && (
                  <p className="text-[11px] text-ink-soft">
                    Definido automaticamente por disponibilidade
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/${tenant_slug}/agendar/profissionais`)}
              className="text-xs font-semibold text-brand hover:underline cursor-pointer"
            >
              Trocar
            </button>
          </div>

          <div className="border-t border-line/60" />

          {/* Data e Horário */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-tint/60 text-brand flex items-center justify-center shrink-0">
                <Calendar size={18} />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft block">
                  Data e Horário
                </span>
                <p className="text-sm font-bold text-ink">
                  {formatDateExtenso(bookingData.date)}
                </p>
                <p className="text-xs text-ink-soft flex items-center gap-1 mt-0.5">
                  <Clock size={12} />
                  <span>
                    Às {bookingData.time} ({formatMinutes(totalDuration)} de duração)
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/${tenant_slug}/agendar/horarios`)}
              className="text-xs font-semibold text-brand hover:underline cursor-pointer"
            >
              Trocar
            </button>
          </div>
        </div>

        {/* Seção de Pacote de Sessões Elegível (D13) */}
        {eligiblePackage && (
          <div className="bg-gradient-to-br from-brand-tint/60 to-white rounded-2xl border border-brand/30 p-4 shadow-xs mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Layers size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-tint text-brand border border-brand/20">
                      Pacote Ativo
                    </span>
                    <span className="text-xs font-semibold text-ink-soft">
                      {eligiblePackage.remaining_sessions} de {eligiblePackage.total_sessions} sessões
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-ink mt-0.5">
                    {eligiblePackage.package_name}
                  </h4>
                  <p className="text-[11px] text-ink-soft">
                    Abate o valor da sessão ({parseFloat(eligiblePackage.unit_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} pré-pagos)
                  </p>
                </div>
              </div>

              {/* Switch Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={usePackageSession}
                onClick={() => setUsePackageSession(!usePackageSession)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 ${
                  usePackageSession ? 'bg-brand' : 'bg-line'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                    usePackageSession ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {usePackageSession && (
              <div className="mt-3 pt-2.5 border-t border-brand/15 flex items-center gap-1.5 text-xs text-brand font-medium">
                <Check size={14} className="shrink-0" />
                <span>1 sessão será descontada do seu saldo automaticamente após o atendimento.</span>
              </div>
            )}
          </div>
        )}

        {/* Seção de Cupons & Vale-Presente */}
        <div className="space-y-3 mb-4">
          {/* Cupom de Desconto */}
          <div className="bg-surface rounded-2xl border border-line/70 p-4 shadow-xs">
            <label
              htmlFor="coupon-input"
              className="text-xs font-semibold uppercase tracking-wider text-ink-soft flex items-center gap-1.5 mb-2.5"
            >
              <Tag size={14} className="text-brand" />
              Cupom de Desconto
            </label>

            {couponApplied ? (
              <div className="flex items-center justify-between bg-brand-tint/30 border border-brand/20 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center text-xs">
                    ✓
                  </span>
                  <div>
                    <p className="text-sm font-bold text-brand">{couponApplied.code}</p>
                    <p className="text-xs text-ink-soft">
                      Desconto de R$ {couponDiscount.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="p-1 text-ink-soft hover:text-danger transition-colors cursor-pointer"
                  aria-label="Remover cupom"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  id="coupon-input"
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="EX: PRIMEIRAVEZ"
                  className="flex-1 bg-bg border border-line rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-brand transition-colors uppercase tracking-wider font-semibold"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                  className="px-4 py-2.5 bg-ink text-surface rounded-xl text-sm font-semibold hover:bg-brand active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  {couponLoading ? 'Validando...' : 'Aplicar'}
                </button>
              </div>
            )}
          </div>

          {/* Vale-Presente */}
          <div className="bg-surface rounded-2xl border border-line/70 p-4 shadow-xs">
            <label
              htmlFor="giftcard-input"
              className="text-xs font-semibold uppercase tracking-wider text-ink-soft flex items-center gap-1.5 mb-2.5"
            >
              <Gift size={14} className="text-brand" />
              Vale-Presente
            </label>

            {giftCardApplied ? (
              <div className="flex items-center justify-between bg-brand-tint/30 border border-brand/20 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center text-xs">
                    ✓
                  </span>
                  <div>
                    <p className="text-sm font-bold text-brand">
                      {giftCardApplied.redemption_code}
                    </p>
                    <p className="text-xs text-ink-soft">
                      Abatido: R$ {giftCardDiscount.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveGiftCard}
                  className="p-1 text-ink-soft hover:text-danger transition-colors cursor-pointer"
                  aria-label="Remover vale-presente"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  id="giftcard-input"
                  type="text"
                  value={giftCardInput}
                  onChange={(e) => setGiftCardInput(e.target.value.toUpperCase())}
                  placeholder="VG-XXXX-XXXX"
                  className="flex-1 bg-bg border border-line rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-brand transition-colors uppercase tracking-wider font-semibold"
                />
                <button
                  type="button"
                  onClick={handleApplyGiftCard}
                  disabled={giftCardLoading || !giftCardInput.trim()}
                  className="px-4 py-2.5 bg-ink text-surface rounded-xl text-sm font-semibold hover:bg-brand active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  {giftCardLoading ? 'Validando...' : 'Validar'}
                </button>
              </div>
            )}
          </div>

          {/* Cashback / Carteira Digital */}
          {session && session.role === 'client' && walletBalance > 0 && (
            <div className="bg-surface rounded-2xl border border-gold/40 p-4 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0">
                  <Coins size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">Usar saldo de cashback</p>
                  <p className="text-xs text-ink-soft">
                    R$ {walletBalance.toFixed(2).replace('.', ',')} disponíveis
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={useCashback}
                onClick={() => setUseCashback(!useCashback)}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                  useCashback ? 'bg-brand' : 'bg-line'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                    useCashback ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Resumo Financeiro */}
        <div className="bg-brand-tint/25 rounded-2xl border border-line/60 p-5 space-y-2.5 mb-4">
          <div className="flex justify-between items-center text-sm text-ink-soft">
            <span>Subtotal</span>
            <span className="font-semibold text-ink tabular-nums">
              R$ {servicePrice.toFixed(2).replace('.', ',')}
            </span>
          </div>

          {packageDiscount > 0 && (
            <div className="flex justify-between items-center text-sm text-brand font-medium">
              <span className="flex items-center gap-1.5">
                <Layers size={14} />
                Sessão de Pacote ({eligiblePackage?.package_name})
              </span>
              <span className="tabular-nums font-semibold">
                - R$ {packageDiscount.toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}

          {couponDiscount > 0 && (
            <div className="flex justify-between items-center text-sm text-brand font-medium">
              <span>Desconto (Cupom)</span>
              <span className="tabular-nums">
                - R$ {couponDiscount.toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}

          {giftCardDiscount > 0 && (
            <div className="flex justify-between items-center text-sm text-brand font-medium">
              <span>Vale-Presente</span>
              <span className="tabular-nums">
                - R$ {giftCardDiscount.toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}

          {cashbackRedeemed > 0 && (
            <div className="flex justify-between items-center text-sm text-brand font-medium">
              <span>Cashback Resgatado</span>
              <span className="tabular-nums">
                - R$ {cashbackRedeemed.toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}

          <div className="border-t border-line/80 my-2" />

          <div className="flex justify-between items-baseline pt-1">
            <span className="text-base font-bold text-ink">Total do serviço</span>
            <span className="font-serif text-[26px] font-bold text-brand tabular-nums">
              R$ {totalFinal.toFixed(2).replace('.', ',')}
            </span>
          </div>

          {/* Destaque de Sinal PIX Exigido (D3) */}
          {depositInfo && (
            <div className="bg-brand-tint/70 border border-brand/30 rounded-xl p-3.5 mt-2 space-y-1.5 animate-fade-in">
              <div className="flex justify-between items-center text-sm font-bold text-brand">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={16} />
                  Sinal antecipado por PIX
                </span>
                <span className="tabular-nums text-base">
                  R$ {depositInfo.amount.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <p className="text-xs text-ink-soft leading-relaxed">
                Este serviço requer sinal de{' '}
                {depositInfo.type === 'percentage'
                  ? `${depositInfo.rate}% (R$ ${depositInfo.amount.toFixed(2).replace('.', ',')})`
                  : `R$ ${depositInfo.amount.toFixed(2).replace('.', ',')}`}{' '}
                para garantir a vaga na agenda. O valor restante de{' '}
                <strong className="text-ink">R$ {depositInfo.remainingAmount.toFixed(2).replace('.', ',')}</strong> será
                pago presencialmente no salão.
              </p>
            </div>
          )}
        </div>

        {/* Aviso de Pagamento Presencial ou Sinal */}
        <div className="bg-surface border border-line/70 rounded-xl p-3.5 flex items-center gap-3 text-ink-soft text-xs mb-4">
          <CreditCard size={18} className="text-brand shrink-0" />
          <p className="leading-relaxed">
            {depositInfo ? (
              <>
                Você pagará o sinal de <strong className="text-ink">R$ {depositInfo.amount.toFixed(2).replace('.', ',')}</strong> via PIX em seguida para confirmar a reserva. O restante será acertado no salão.
              </>
            ) : (
              'O pagamento será realizado presencialmente no salão após o seu atendimento.'
            )}
          </p>
        </div>
      </div>

      {/* Barra Fixa Inferior: Botão Primário 52px */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-md border-t border-line/60 p-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
        <div className="max-w-[420px] mx-auto">
          <button
            id="btn-confirmar-agendamento"
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="w-full h-[52px] bg-brand text-white rounded-full font-medium text-base hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Confirmando agendamento...</span>
              </>
            ) : bookingData.rescheduleAppointmentId ? (
              <span>Confirmar Novo Horário</span>
            ) : depositInfo ? (
              <span>
                Pagar Sinal PIX · R$ {depositInfo.amount.toFixed(2).replace('.', ',')}
              </span>
            ) : (
              <span>
                Confirmar Agendamento · R$ {totalFinal.toFixed(2).replace('.', ',')}
              </span>
            )}
          </button>
        </div>
      </footer>
    </TelaCliente>
  );
};

export default AgendamentoRevisao;
