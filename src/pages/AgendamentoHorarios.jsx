import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ArrowRight, Sparkles, Scissors, Eye, Heart, Calendar as CalendarIcon, Clock, Zap } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useBooking } from '../context/BookingContext';
import { api } from '../lib/api';
import FaixaDeDias from '../components/ui/FaixaDeDias';
import WaitlistModal from '../components/WaitlistModal';
import { TelaCliente } from '../components/ui/TelaCliente';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Formatador elegante de duração (ex: 90 min -> 1h30, 60 min -> 1h, 45 min -> 45 min)
const formatDuration = (totalMinutes) => {
  if (!totalMinutes || totalMinutes <= 0) return '30 min';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours}h${minutes < 10 ? '0' : ''}${minutes}`;
  } else if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes} min`;
};

// Ícone contextual para o cartão resumo
const getServiceIcon = (name = '') => {
  const lower = name.toLowerCase();
  if (
    lower.includes('corte') ||
    lower.includes('escova') ||
    lower.includes('cabelo') ||
    lower.includes('mechas') ||
    lower.includes('luzes') ||
    lower.includes('barba') ||
    lower.includes('hidratação') ||
    lower.includes('cronograma')
  ) {
    return <Scissors size={20} strokeWidth={1.8} />;
  }
  if (lower.includes('sobrancelha') || lower.includes('cilios') || lower.includes('lash') || lower.includes('olhar')) {
    return <Eye size={20} strokeWidth={1.8} />;
  }
  if (lower.includes('unha') || lower.includes('manicure') || lower.includes('pedicure') || lower.includes('gel') || lower.includes('fibra')) {
    return <Sparkles size={20} strokeWidth={1.8} />;
  }
  if (lower.includes('massagem') || lower.includes('drenagem') || lower.includes('limpeza') || lower.includes('facial') || lower.includes('estética') || lower.includes('corpo')) {
    return <Heart size={20} strokeWidth={1.8} />;
  }
  return <Scissors size={20} strokeWidth={1.8} />;
};

// Formatação por extenso para a barra inferior (ex: "qua, 28 de outubro · 11:00")
const formatSelectedDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return 'Selecione um horário';
  try {
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 12, 0, 0);
    const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const meses = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    const diaSem = diasSemana[dateObj.getDay()];
    const diaNum = parseInt(d, 10);
    const mesNome = meses[dateObj.getMonth()];
    return `${diaSem}, ${diaNum} de ${mesNome} · ${timeStr}`;
  } catch (e) {
    return `${dateStr} · ${timeStr}`;
  }
};

const AgendamentoHorarios = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { bookingData, updateBooking } = useBooking();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(() => bookingData.date || todayStr);
  const [selectedTime, setSelectedTime] = useState(() => bookingData.time || null);

  const [businessHours, setBusinessHours] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [nextAvailableSlot, setNextAvailableSlot] = useState(null);

  // 1. Carrega Horários de Funcionamento e Exceções do Salão
  useEffect(() => {
    if (!tenant) return;
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const [bhRes, exRes] = await Promise.all([
          api.settings.getBusinessHours(tenant.id).catch(() => []),
          api.settings.getExceptions(tenant.id).catch(() => [])
        ]);
        if (isMounted) {
          if (Array.isArray(bhRes)) setBusinessHours(bhRes);
          if (Array.isArray(exRes)) setExceptions(exRes);
        }
      } catch (err) {
        console.error('Erro ao carregar configurações de horário:', err);
      }
    };

    loadSettings();
    return () => {
      isMounted = false;
    };
  }, [tenant]);

  // 1.1 Consulta Próximo Horário Livre (D5 P1)
  useEffect(() => {
    if (!tenant) return;
    let isMounted = true;

    const fetchNextSlot = async () => {
      try {
        const staffId = bookingData.professional?.id || 'any';
        const services = bookingData.services
          ? bookingData.services.map((s) => (s?.id || s?.service_id || s)).filter(Boolean)
          : (bookingData.service?.id ? [bookingData.service.id] : []);
        
        if (services.length === 0) return;

        const nextSlot = await api.appointments.getNextAvailableSlot(tenant.id, {
          staffId,
          services
        });
        if (isMounted && nextSlot) {
          setNextAvailableSlot(nextSlot);
        }
      } catch (err) {
        console.error('Erro ao consultar próximo horário livre:', err);
      }
    };

    fetchNextSlot();
    return () => {
      isMounted = false;
    };
  }, [tenant, bookingData.professional, bookingData.services, bookingData.service]);

  // 2. Consulta Agendamentos Ocupados na data e profissional selecionados
  useEffect(() => {
    if (!tenant || !selectedDate) return;
    let isMounted = true;
    setLoadingSlots(true);

    const fetchOccupied = async () => {
      try {
        const staffId = bookingData.professional?.id || 'any';
        const serviceIds = bookingData.services
          ? bookingData.services.map((s) => (s?.id || s?.service_id || s)).filter(Boolean)
          : (bookingData.service?.id ? [bookingData.service.id] : []);

        const apptData = await api.appointments.getOccupiedSlots(
          tenant.id, 
          selectedDate, 
          staffId, 
          null, 
          serviceIds
        );

        if (isMounted && Array.isArray(apptData)) {
          const times = apptData.map((app) => {
            const dt = new Date(app.start_time);
            const hh = dt.getHours().toString().padStart(2, '0');
            const mm = dt.getMinutes().toString().padStart(2, '0');
            return `${hh}:${mm}`;
          });
          setBookedTimes(times);
        }
      } catch (err) {
        console.error('Erro ao consultar slots ocupados:', err);
        if (isMounted) setBookedTimes([]);
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    };

    fetchOccupied();
    return () => {
      isMounted = false;
    };
  }, [tenant, selectedDate, bookingData.professional, bookingData.services, bookingData.service]);

  // Função auxiliar para verificar se uma data específica está fechada
  const checkIsDateClosed = useCallback((dateStr, dayOfWeek) => {
    // 1. Verifica exceções específicas por data
    const exception = exceptions.find(
      (e) => e.exception_date && String(e.exception_date).startsWith(dateStr)
    );
    if (exception) {
      return Boolean(exception.is_closed);
    }

    // 2. Verifica horário semanal padrão
    const dayConfig = businessHours.find((d) => d.day_of_week === dayOfWeek);
    if (dayConfig) {
      return Boolean(dayConfig.is_closed);
    }

    // Padrão: domingo (0) e segunda (1) podem ser fechados caso não configurados
    return false;
  }, [exceptions, businessHours]);

  // 3. Calcula os slots disponíveis para o dia selecionado (intervalos de 30 minutos)
  const { morningSlots, afternoonSlots, eveningSlots, isClosedDay } = useMemo(() => {
    if (!selectedDate) {
      return { morningSlots: [], afternoonSlots: [], eveningSlots: [], isClosedDay: false };
    }

    const [y, m, d] = selectedDate.split('-');
    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 0, 0, 0);
    const dayOfWeek = dateObj.getDay();

    const isClosed = checkIsDateClosed(selectedDate, dayOfWeek);
    if (isClosed) {
      return { morningSlots: [], afternoonSlots: [], eveningSlots: [], isClosedDay: true };
    }

    // Identifica horário de abertura e fechamento
    let startHour = 8;
    let endHour = 19;

    const exception = exceptions.find(
      (e) => e.exception_date && String(e.exception_date).startsWith(selectedDate)
    );
    if (exception && exception.open_time && exception.close_time) {
      startHour = parseInt(exception.open_time.split(':')[0], 10);
      endHour = parseInt(exception.close_time.split(':')[0], 10);
    } else {
      const dayConfig = businessHours.find((b) => b.day_of_week === dayOfWeek);
      if (dayConfig && dayConfig.open_time && dayConfig.close_time) {
        startHour = parseInt(dayConfig.open_time.split(':')[0], 10);
        endHour = parseInt(dayConfig.close_time.split(':')[0], 10);
      }
    }

    const morning = [];
    const afternoon = [];
    const evening = [];

    // Gera horários de 30 em 30 minutos
    for (let h = startHour; h < endHour; h++) {
      for (const min of [0, 30]) {
        const timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        if (h < 12) {
          morning.push(timeStr);
        } else if (h < 18) {
          afternoon.push(timeStr);
        } else {
          evening.push(timeStr);
        }
      }
    }

    return {
      morningSlots: morning,
      afternoonSlots: afternoon,
      eveningSlots: evening,
      isClosedDay: false
    };
  }, [selectedDate, checkIsDateClosed, exceptions, businessHours]);

  // Dados consolidados do serviço e profissional
  const serviceName = useMemo(() => {
    if (bookingData.service?.name) return bookingData.service.name;
    if (bookingData.services && bookingData.services.length > 0) {
      return bookingData.services.map((s) => s.name).join(' + ');
    }
    return 'Serviço Selecionado';
  }, [bookingData]);

  const totalMinutes = useMemo(() => {
    if (bookingData.service?.duration) return bookingData.service.duration;
    if (bookingData.services && bookingData.services.length > 0) {
      return bookingData.services.reduce(
        (acc, s) => acc + parseInt(s.duration_minutes || s.duration || 30, 10),
        0
      );
    }
    return 60;
  }, [bookingData]);

  const professionalName = useMemo(() => {
    if (bookingData.professional?.name) return bookingData.professional.name;
    return 'Qualquer profissional';
  }, [bookingData.professional]);

  // Seleção de Horário
  const handleSelectTime = (timeStr) => {
    setSelectedTime(timeStr);
    updateBooking({ date: selectedDate, time: timeStr });
  };

  // Prosseguir para a Revisão
  const handleContinue = () => {
    if (!selectedDate || !selectedTime) return;
    updateBooking({ date: selectedDate, time: selectedTime });
    navigate(`/${tenant_slug}/agendar/revisao`);
  };

  // Renderizador de botão de Horário individual na grade de 3 colunas
  const renderSlotButton = (timeStr) => {
    const isSelected = selectedTime === timeStr;
    const isBooked = bookedTimes.includes(timeStr);

    return (
      <button
        key={timeStr}
        type="button"
        disabled={isBooked}
        onClick={() => handleSelectTime(timeStr)}
        className={cn(
          'h-[44px] rounded-[16px] font-sans text-[15px] transition-all duration-200 flex items-center justify-center select-none',
          isSelected
            ? 'bg-brand text-white font-semibold shadow-sm border-transparent'
            : isBooked
            ? 'bg-[#FAF5F4] text-[#b5a8ab] border border-line/40 line-through cursor-not-allowed opacity-60'
            : 'bg-surface text-ink border border-line hover:border-brand hover:text-brand cursor-pointer shadow-xs active:scale-95'
        )}
      >
        <span className="tabular-nums [font-feature-settings:'lnum']">{timeStr}</span>
      </button>
    );
  };

  const totalSlotsCount = morningSlots.length + afternoonSlots.length + eveningSlots.length;
  const isAllBooked = totalSlotsCount > 0 && totalSlotsCount === bookedTimes.length;

  return (
    <TelaCliente temBarraFixaInferior className="selection:bg-brand-tint selection:text-brand">
      {/* Container Centralizado Padrão Mobile */}
      <div className="w-full max-w-[420px] mx-auto px-5 pt-3 flex-1 flex flex-col pb-8">
        
        {/* 1. Topo do Fluxo: Botão Voltar + Barra de Progresso + Etapa 2 de 4 */}
        <header className="flex items-center justify-between gap-3 pt-1 pb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full border border-line bg-surface text-ink flex items-center justify-center hover:bg-brand-tint/30 transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer"
            aria-label="Voltar para a etapa anterior"
          >
            <ChevronLeft size={20} strokeWidth={2.4} />
          </button>

          {/* Barra de Progresso Rosé Editorial (Etapa 2 de 4 = 50%) */}
          <div className="flex-1 h-1.5 bg-[#EADFDC] rounded-full overflow-hidden mx-1.5">
            <div
              className="h-full bg-brand rounded-full transition-all duration-300"
              style={{ width: '50%' }}
            />
          </div>

          <span className="font-sans text-[13px] font-semibold text-ink-soft shrink-0">
            2 de 4
          </span>
        </header>

        {/* 2. Título da Tela */}
        <section className="pt-2 pb-3 text-left">
          <h1 className="font-display text-[28px] font-semibold text-ink leading-tight tracking-tight">
            Escolha o dia e a hora
          </h1>
        </section>

        {/* 3. Cartão Resumo do Atendimento (~60px) */}
        <section className="mb-4">
          <div className="w-full bg-surface rounded-[20px] p-3.5 border border-line/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-[16px] bg-[#F6E4E4] text-brand flex items-center justify-center shrink-0 border border-line/40">
              {getServiceIcon(serviceName)}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <h3 className="font-sans text-[15px] font-bold text-ink truncate leading-tight">
                {serviceName} · {formatDuration(totalMinutes)}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="font-sans text-[13px] text-ink-soft truncate">
                  com {professionalName}
                </p>
                {(!bookingData.professional || bookingData.professional.id === 'any') && (
                  <span className="inline-flex items-center text-[10px] font-bold text-brand bg-brand-tint/60 px-1.5 py-0.2 rounded-full border border-brand/15">
                    ⚡ Mais opções
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3.1 Banner Atalho: Próximo Horário Livre (D5 P1) */}
        {nextAvailableSlot && (
          <section className="mb-4 animate-fade-in">
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedDate(nextAvailableSlot.date);
                setSelectedTime(nextAvailableSlot.time);
                updateBooking({ date: nextAvailableSlot.date, time: nextAvailableSlot.time });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedDate(nextAvailableSlot.date);
                  setSelectedTime(nextAvailableSlot.time);
                  updateBooking({ date: nextAvailableSlot.date, time: nextAvailableSlot.time });
                }
              }}
              className={cn(
                'w-full rounded-[20px] p-3.5 border transition-all duration-200 select-none cursor-pointer flex items-center justify-between gap-3 shadow-xs',
                selectedDate === nextAvailableSlot.date && selectedTime === nextAvailableSlot.time
                  ? 'bg-brand-tint/30 border-brand ring-2 ring-brand/15'
                  : 'bg-[#FFF8F7] border-brand/25 hover:border-brand/50 hover:bg-[#FDF3F3]'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Zap size={18} className="fill-white" />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand">
                      Próximo horário livre
                    </span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-[14px] font-bold text-ink truncate leading-tight mt-0.5">
                    {nextAvailableSlot.label}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                <button
                  type="button"
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs cursor-pointer',
                    selectedDate === nextAvailableSlot.date && selectedTime === nextAvailableSlot.time
                      ? 'bg-brand text-white'
                      : 'bg-brand-tint text-brand hover:bg-brand hover:text-white'
                  )}
                >
                  {selectedDate === nextAvailableSlot.date && selectedTime === nextAvailableSlot.time
                    ? 'Selecionado ✓'
                    : 'Escolher'}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 4. Faixa de Dias (Próximos 14 dias + Botão Calendário) */}
        <section className="mb-5">
          <FaixaDeDias
            selectedDate={selectedDate}
            onSelectDate={(dateStr) => {
              setSelectedDate(dateStr);
              setSelectedTime(null);
            }}
            isDateClosed={checkIsDateClosed}
            daysCount={14}
          />
        </section>

        {/* 5. Grupos de Horários Disponíveis */}
        <main className="space-y-5 flex-1">
          {loadingSlots ? (
            /* Skeleton Loading Suave de Horários */
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-line/60 rounded w-20" />
              <div className="grid grid-cols-3 gap-2.5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-[44px] rounded-[16px] bg-line/40" />
                ))}
              </div>
            </div>
          ) : isClosedDay ? (
            /* Estado Fechado */
            <div className="w-full bg-surface rounded-[22px] p-6 border border-line shadow-card text-center space-y-2 my-4">
              <div className="w-11 h-11 rounded-full bg-[#F6E4E4] text-brand flex items-center justify-center mx-auto mb-2 shadow-xs">
                <Clock size={20} strokeWidth={2} />
              </div>
              <h3 className="font-display text-[17px] font-semibold text-ink">
                Salão Fechado Neste Dia
              </h3>
              <p className="font-sans text-[13px] text-ink-soft">
                Não há expediente nesta data. Por favor, escolha outro dia na faixa acima.
              </p>
            </div>
          ) : isAllBooked ? (
            /* Estado Dia Lotado */
            <div className="w-full bg-surface rounded-[22px] p-6 border border-line shadow-card text-center space-y-3 my-4">
              <div className="w-11 h-11 rounded-full bg-[#F6E4E4] text-brand flex items-center justify-center mx-auto shadow-xs">
                <CalendarIcon size={20} strokeWidth={2} />
              </div>
              <h3 className="font-display text-[17px] font-semibold text-ink">
                Todos os horários estão ocupados
              </h3>
              <p className="font-sans text-[13px] text-ink-soft">
                Que tal entrar na fila de espera para este dia ou escolher outra data?
              </p>
              <button
                type="button"
                onClick={() => setShowWaitlist(true)}
                className="inline-block mt-2 px-5 py-2.5 rounded-full bg-brand text-white font-sans text-[13px] font-semibold shadow-xs hover:opacity-95 transition-all cursor-pointer"
              >
                Entrar na Lista de Espera
              </button>
            </div>
          ) : (
            <>
              {/* Período Manhã */}
              {morningSlots.length > 0 && (
                <div className="space-y-2.5 text-left">
                  <h3 className="font-sans text-[12px] font-bold text-ink-soft uppercase tracking-wider pl-1">
                    Manhã
                  </h3>
                  <div className="grid grid-cols-3 gap-2.5">
                    {morningSlots.map(renderSlotButton)}
                  </div>
                </div>
              )}

              {/* Período Tarde */}
              {afternoonSlots.length > 0 && (
                <div className="space-y-2.5 text-left pt-1">
                  <h3 className="font-sans text-[12px] font-bold text-ink-soft uppercase tracking-wider pl-1">
                    Tarde
                  </h3>
                  <div className="grid grid-cols-3 gap-2.5">
                    {afternoonSlots.map(renderSlotButton)}
                  </div>
                </div>
              )}

              {/* Período Noite */}
              {eveningSlots.length > 0 && (
                <div className="space-y-2.5 text-left pt-1">
                  <h3 className="font-sans text-[12px] font-bold text-ink-soft uppercase tracking-wider pl-1">
                    Noite
                  </h3>
                  <div className="grid grid-cols-3 gap-2.5">
                    {eveningSlots.map(renderSlotButton)}
                  </div>
                </div>
              )}

              {/* Link de Lista de Espera */}
              <div className="pt-3 pb-2 text-center">
                <span className="font-sans text-[13px] text-ink-soft">Dia lotado? </span>
                <button
                  type="button"
                  onClick={() => setShowWaitlist(true)}
                  className="font-sans text-[13px] font-semibold text-brand underline decoration-brand/50 hover:decoration-brand cursor-pointer"
                >
                  Entrar na lista de espera
                </button>
              </div>
            </>
          )}
        </main>
      </div>

      {/* 6. Barra Fixa Inferior: Data e Hora Selecionada + Botão Continuar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-line/60 px-5 pt-3.5 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] shadow-[0_-8px_24px_rgba(142,59,78,0.06)]">
        <div className="max-w-[420px] mx-auto w-full space-y-3">
          {/* Linha com Data e Horário Formatados */}
          <div className="flex items-center justify-between">
            <span className="font-sans text-[14px] text-ink-soft font-medium">
              {formatSelectedDateTime(selectedDate, selectedTime)}
            </span>
          </div>

          {/* Botão Primário "Continuar →" */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={!selectedDate || !selectedTime}
            className={cn(
              'h-[52px] w-full rounded-full font-sans text-[16px] font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-md',
              selectedDate && selectedTime
                ? 'bg-brand text-white hover:opacity-95 active:scale-[0.99] cursor-pointer'
                : 'bg-line/80 text-ink-soft/60 cursor-not-allowed opacity-80'
            )}
          >
            <span>Continuar</span>
            <ArrowRight size={18} strokeWidth={2.4} />
          </button>
        </div>
      </footer>

      {/* Modal de Lista de Espera */}
      {showWaitlist && (
        <WaitlistModal
          tenantSlug={tenant_slug}
          desiredDate={selectedDate}
          serviceId={bookingData.service?.id}
          professionalId={bookingData.professional?.id}
          onClose={() => setShowWaitlist(false)}
        />
      )}
    </TelaCliente>
  );
};

export default AgendamentoHorarios;
