import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useBooking } from '../context/BookingContext';
import { api } from '../lib/api';
import WaitlistModal from '../components/WaitlistModal';
import ClienteBottomNavBar from '../components/ClienteBottomNavBar';

const AgendamentoHorarios = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { bookingData, updateBooking } = useBooking();
  
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTime, setSelectedTime] = useState(bookingData.time || null);
  const [morningSlots, setMorningSlots] = useState([]);
  const [afternoonSlots, setAfternoonSlots] = useState([]);
  const [eveningSlots, setEveningSlots] = useState([]);
  const [isClosed, setIsClosed] = useState(false);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [showWaitlist, setShowWaitlist] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    const fetchSchedule = async () => {
      setLoadingSlots(true);
      
      try {
        // 1. Fetch appointments using API
        try {
          const apptData = await api.appointments.getOccupiedSlots(
            tenant.id, 
            selectedDate, 
            bookingData.professional?.id
          );
          
          let times = [];
          if (apptData) {
            times = apptData.map(app => {
              const dt = new Date(app.start_time);
              return `${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
            });
          }
          setBookedTimes(times);
        } catch (err) {
          console.error("Erro ao buscar horários ocupados:", err);
          setBookedTimes([]);
        }

        // 2. Fetch Business Hours & Exceptions
        const [bhRes, exRes] = await Promise.all([
          api.settings.getBusinessHours(tenant.id),
          api.settings.getExceptions(tenant.id)
        ]);

        let startHour = 8;
        let endHour = 19;
        let isClosedDay = false;

        const dateObj = new Date(selectedDate + 'T00:00:00');
        const dow = dateObj.getDay(); // 0 = dom, 1 = seg...

        // Check Business Hours
        if (bhRes && Array.isArray(bhRes)) {
          const dayConfig = bhRes.find(d => d.day_of_week === dow);
          if (dayConfig) {
            if (dayConfig.is_closed) {
              isClosedDay = true;
            } else if (dayConfig.open_time && dayConfig.close_time) {
              startHour = parseInt(dayConfig.open_time.split(':')[0], 10);
              endHour = parseInt(dayConfig.close_time.split(':')[0], 10) - 1; 
            }
          }
        }

        // Check Exceptions
        if (exRes && Array.isArray(exRes)) {
          const exception = exRes.find(e => e.exception_date && String(e.exception_date).startsWith(selectedDate));
          if (exception) {
            if (exception.is_closed) {
              isClosedDay = true;
            } else if (exception.open_time && exception.close_time) {
              isClosedDay = false;
              startHour = parseInt(exception.open_time.split(':')[0], 10);
              endHour = parseInt(exception.close_time.split(':')[0], 10) - 1;
            }
          }
        }

        setIsClosed(isClosedDay);

        const mSlots = [];
        const aSlots = [];
        const eSlots = [];

        if (!isClosedDay) {
          for (let i = startHour; i <= endHour; i++) {
            const slotStr = `${i.toString().padStart(2, '0')}:00`;
            if (i < 12) mSlots.push(slotStr);
            else if (i < 18) aSlots.push(slotStr);
            else eSlots.push(slotStr);
          }
        }

        setMorningSlots(mSlots);
        setAfternoonSlots(aSlots);
        setEveningSlots(eSlots);
        
      } catch (err) {
        console.error("Erro ao carregar horários", err);
      }

      setLoadingSlots(false);
    };
    fetchSchedule();
  }, [tenant, selectedDate, bookingData.professional]);

  useEffect(() => {
    console.log("=== [AgendamentoHorarios] Montado/Atualizado ===");
    console.log("bookingData atual:", bookingData);
  }, [bookingData]);

  const handleSelectTime = (time) => {
    console.log("=== [AgendamentoHorarios] handleSelectTime chamado ===", time);
    setSelectedTime(time);
    updateBooking({ date: selectedDate, time });
  };

  const handleContinue = () => {
    console.log("=== [AgendamentoHorarios] handleContinue chamado ===", bookingData);
    if (selectedTime && selectedDate) {
      navigate(`/${tenant_slug}/agendar/revisao`);
    }
  };

  const renderSlot = (timeStr) => {
    const isSelected = selectedTime === timeStr;
    const isBooked = bookedTimes.includes(timeStr);
    
    if (isBooked) {
      return (
        <button key={timeStr} disabled className="px-[8px] py-[16px] rounded-xl bg-[#eeeeee] text-secondary opacity-50 cursor-not-allowed font-semibold text-[14px] flex flex-col items-center gap-[4px]">
          <span>{timeStr}</span>
          <span className="text-[10px]">Lotado</span>
        </button>
      );
    }

    return (
      <button 
        key={timeStr}
        onClick={() => handleSelectTime(timeStr)}
        className={`relative px-[8px] py-[16px] rounded-xl font-semibold text-[14px] text-center transition-all ${
          isSelected 
            ? 'bg-primary-container text-on-primary-container border-primary shadow-md scale-95' 
            : 'bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.04)] text-on-surface hover:border-primary border border-transparent'
        }`}
      >
        {timeStr}
        {isSelected && (
          <span className="material-symbols-outlined text-[16px] absolute -top-1 -right-1 bg-primary text-white rounded-full p-[2px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
        )}
      </button>
    );
  };

  return (
    <div className="font-body-md text-on-surface bg-[#f9f9f9] min-h-screen pb-[120px]">
      <header className="w-full top-0 sticky z-50 bg-[#f9f9f9] shadow-sm transition-all duration-300 ease-in-out pt-[calc(env(safe-area-inset-top,0px)+28px)] pb-2 md:pt-4">
        <div className="flex justify-between items-center px-gutter py-sm w-full max-w-7xl mx-auto">
          <div className="w-10"></div>{/* Spacer to keep title centered */}
          <h1 className="font-headline-md text-headline-md-mobile md:text-headline-md text-primary tracking-tight text-center flex-1">
            {tenant?.name || 'Carregando...'}
          </h1>
          <div className="w-10"></div>{/* Spacer to keep title centered */}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-[16px] py-[40px]">
        <div className="mb-[40px] text-center md:text-left animate-fade-in-up">
          <h2 className="font-serif text-[28px] md:text-[32px] font-semibold text-on-surface mb-2">Escolha a Data e Horário</h2>
          <p className="font-sans text-[16px] text-secondary">Selecione o melhor dia e horário para o seu atendimento personalizado.</p>
        </div>
        <section className="mb-[40px] animate-fade-in-up">
          <div className="flex items-center justify-between mb-[16px]">
            <h2 className="font-serif text-[24px] font-semibold text-on-surface">Data Selecionada</h2>
          </div>

          <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-[16px]">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedTime(null);
                updateBooking({ date: e.target.value, time: null });
              }}
              min={today}
              className="w-full text-center font-headline-md text-primary bg-transparent outline-none cursor-pointer"
            />
          </div>
        </section>

        <section className="space-y-[40px] animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-baseline justify-between border-b border-[#e2e2e2] pb-[4px]">
            <h2 className="font-serif text-[24px] font-semibold text-on-surface">Horários Disponíveis</h2>
            {loadingSlots && <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>}
          </div>

          {isClosed ? (
            <div className="py-[40px] flex flex-col items-center justify-center text-center gap-[16px] bg-surface-container-low rounded-2xl border border-outline-variant/30">
              <span className="material-symbols-outlined text-[48px] text-secondary/50">door_front</span>
              <div>
                <h3 className="font-serif text-[20px] font-semibold text-on-surface mb-[4px]">Salão Fechado</h3>
                <p className="font-sans text-[14px] text-secondary">Não há horários disponíveis para esta data. Por favor, selecione outro dia.</p>
              </div>
            </div>
          ) : (
            <>
              {morningSlots.length > 0 && (
                <div className="space-y-[16px]">
                  <div className="flex items-center gap-[8px] text-primary">
                    <span className="material-symbols-outlined text-[20px]">light_mode</span>
                    <h3 className="font-semibold text-[14px] uppercase tracking-widest">Manhã</h3>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-[8px]">
                    {morningSlots.map(renderSlot)}
                  </div>
                </div>
              )}

              {afternoonSlots.length > 0 && (
                <div className="space-y-[16px]">
                  <div className="flex items-center gap-[8px] text-primary">
                    <span className="material-symbols-outlined text-[20px]">sunny</span>
                    <h3 className="font-semibold text-[14px] uppercase tracking-widest">Tarde</h3>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-[8px]">
                    {afternoonSlots.map(renderSlot)}
                  </div>
                </div>
              )}

              {eveningSlots.length > 0 && (
                <div className="space-y-[16px]">
                  <div className="flex items-center gap-[8px] text-primary">
                    <span className="material-symbols-outlined text-[20px]">bedtime</span>
                    <h3 className="font-semibold text-[14px] uppercase tracking-widest">Noite</h3>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-[8px]">
                    {eveningSlots.map(renderSlot)}
                  </div>
                </div>
              )}

              {morningSlots.length === 0 && afternoonSlots.length === 0 && eveningSlots.length === 0 && (
                <div className="py-[40px] flex flex-col items-center justify-center text-center gap-[16px] bg-surface-container-low rounded-2xl border border-outline-variant/30">
                  <span className="material-symbols-outlined text-[48px] text-secondary/50">event_busy</span>
                  <div>
                    <h3 className="font-serif text-[20px] font-semibold text-on-surface mb-[4px]">Poxa, tudo lotado!</h3>
                    <p className="font-sans text-[14px] text-secondary mb-4">Não temos mais horários disponíveis para este dia.</p>
                    {tenant?.features?.waitlist && (
                      <button 
                        onClick={() => setShowWaitlist(true)}
                        className="bg-primary-container text-on-primary-container px-6 py-2 rounded-xl font-bold hover:shadow-md transition-all active:scale-95 text-sm"
                      >
                        Entrar na Lista de Espera
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
        {/* Espaçador de segurança para a BottomNavBar móvel */}
        <div className="h-24 md:hidden"></div>
      </main>

      {selectedTime && (
        <div className="fixed bottom-0 left-0 w-full z-40 bg-white shadow-[0px_-4px_20px_rgba(0,0,0,0.04)] p-[16px] pb-[calc(env(safe-area-inset-bottom,0px)+72px)] md:pb-[16px] flex flex-col gap-[16px] md:flex-row md:items-center md:justify-between border-t border-[#e2e2e2] animate-fade-in-up">
          <div className="hidden md:flex flex-col">
            <span className="font-medium text-[12px] text-secondary">Horário Selecionado</span>
            <span className="font-serif text-[24px] font-semibold text-primary">{selectedDate.split('-').reverse().join('/')}, {selectedTime}</span>
          </div>
          <button 
            onClick={handleContinue}
            className="w-full md:w-auto px-[40px] py-[24px] bg-primary text-white rounded-xl font-semibold text-[14px] uppercase tracking-widest shadow-lg hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-[8px]"
          >
            <span>Confirmar Agendamento</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      )}

      {showWaitlist && (
        <WaitlistModal
          tenantSlug={tenant_slug}
          desiredDate={selectedDate}
          serviceId={bookingData.service?.id}
          professionalId={bookingData.professional?.id}
          onClose={() => setShowWaitlist(false)}
        />
      )}

      {/* BottomNavBar (Mobile Only) */}
      <ClienteBottomNavBar activeTab="home" tenantSlug={tenant_slug} />
    </div>
  );
};

export default AgendamentoHorarios;
