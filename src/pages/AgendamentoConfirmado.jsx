import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useBooking } from '../context/BookingContext';
import ClienteBottomNavBar from '../components/ClienteBottomNavBar';

const AgendamentoConfirmado = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { bookingData, clearBooking } = useBooking();

  // Trigger confetti effect
  useEffect(() => {
    const triggerConfetti = () => {
      const colors = ['#e8b4b8', '#7c5357', '#ffffff'];
      for (let i = 0; i < 40; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = Math.random() * 8 + 4 + 'px';
        confetti.style.height = confetti.style.width;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-10px';
        confetti.style.borderRadius = '50%';
        confetti.style.zIndex = '999';
        confetti.style.opacity = Math.random();
        document.body.appendChild(confetti);

        const duration = Math.random() * 3 + 2;
        const destinationY = window.innerHeight + 20;
        const destinationX = (Math.random() - 0.5) * 200;

        confetti.animate([
          { transform: 'translate(0, 0)', opacity: 1 },
          { transform: `translate(${destinationX}px, ${destinationY}px)`, opacity: 0 }
        ], {
          duration: duration * 1000,
          easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }).onfinish = () => confetti.remove();
      }
    };
    
    const timer = setTimeout(triggerConfetti, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleFinish = () => {
    clearBooking();
    navigate(`/${tenant_slug}/historico`); // Ou para dashboard
  };

  const handleClose = () => {
    clearBooking();
    navigate(`/${tenant_slug}/home`);
  };

  const handleAddToCalendar = () => {
    if (!bookingData.date || !bookingData.time) return;

    // Create dates assuming local time zone
    const startDateTime = new Date(`${bookingData.date}T${bookingData.time}:00`);
    const duration = bookingData.service?.duration || 60;
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    // Format date to ICS floating local time format (YYYYMMDDTHHMMSS)
    // We avoid toISOString() because it converts to UTC, causing timezone offsets in Brazil.
    const formatToLocalICSString = (date) => {
      const pad = (n) => (n < 10 ? '0' + n : n);
      return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    };

    const startICS = formatToLocalICSString(startDateTime);
    const endICS = formatToLocalICSString(endDateTime);

    const title = `${bookingData.service?.name || 'Serviço'} no ${tenant?.name || 'Salão'}`;
    const description = `Agendamento de ${bookingData.service?.name || 'Serviço'} com ${bookingData.professional?.name || 'a equipe'}.`;
    const location = `Unidade ${tenant?.name || 'Sede'}`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OperaBeauty//Agendamento//PT',
      'BEGIN:VEVENT',
      `DTSTART:${startICS}`,
      `DTEND:${endICS}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'agendamento.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#f9f9f9] text-on-surface font-body-md selection:bg-primary-container min-h-screen">
      <header className="w-full top-0 sticky bg-[#f9f9f9] shadow-sm z-50 pt-[calc(env(safe-area-inset-top,0px)+28px)] pb-2 md:pt-4">
        <div className="flex justify-between items-center px-gutter py-sm w-full max-w-7xl mx-auto">
          <div className="w-10"></div>{/* Spacer to keep title centered */}
          <h1 className="font-headline-md text-headline-md-mobile md:text-headline-md text-primary tracking-tight text-center flex-1">
            {tenant?.name || 'Carregando...'}
          </h1>
          <div className="w-10"></div>{/* Spacer to keep title centered */}
        </div>
      </header>

      <main className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-[20px] py-[40px] relative overflow-hidden">
        {/* Subtle Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#e8b4b8] rounded-full blur-[100px] animate-[float_6s_ease-in-out_infinite]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#e8b4b8] rounded-full blur-[120px] animate-[float_6s_ease-in-out_infinite]" style={{ animationDelay: '-3s' }}></div>
        </div>

        <section className="w-full max-w-[448px] animate-[fadeInUp_0.8s_ease-out_forwards] text-center relative z-10">
          <div className="relative inline-flex items-center justify-center mb-[24px]">
            <div className="absolute inset-0 bg-[#e8b4b8] opacity-20 scale-150 rounded-full blur-xl"></div>
            <div className="w-24 h-24 bg-[#e8b4b8] text-[#6b4448] rounded-full flex items-center justify-center relative shadow-lg">
              <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
          </div>
          
          <h2 className="font-serif text-[32px] font-semibold text-primary mb-[4px]">Sucesso!</h2>
          <p className="font-sans text-[18px] text-secondary mb-[40px]">Agendamento Confirmado!</p>

          <div className="bg-white p-[24px] rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] text-left mb-[40px] border border-[#e2e2e2]/50">
            <div className="flex items-center justify-between mb-[16px] border-b border-[#e2e2e2] pb-[16px]">
              <div>
                <p className="font-medium text-[12px] text-secondary uppercase tracking-widest">Serviço</p>
                <h3 className="font-serif text-[24px] font-semibold text-on-surface mt-[4px]">
                  {bookingData.service?.name || 'Assinatura Ethereal Facial'}
                </h3>
              </div>
              <div className="bg-[#ffdadc] text-[#301216] px-3 py-1 rounded-full font-semibold text-[14px]">
                PENDENTE
              </div>
            </div>

            <div className="grid grid-cols-2 gap-[16px]">
              <div>
                <div className="flex items-center gap-[4px] text-primary mb-[4px]">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <p className="font-semibold text-[12px] uppercase tracking-wider">Data</p>
                </div>
                <p className="font-sans text-[16px] font-semibold text-on-surface">
                  {bookingData.date || 'Quinta, 24 Out'}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-[4px] text-primary mb-[4px]">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <p className="font-semibold text-[12px] uppercase tracking-wider">Horário</p>
                </div>
                <p className="font-sans text-[16px] font-semibold text-on-surface">
                  {bookingData.time || '14:30'}
                </p>
              </div>
              <div className="col-span-2 mt-[8px]">
                <div className="flex items-center gap-[4px] text-primary mb-[4px]">
                  <span className="material-symbols-outlined text-sm">person</span>
                  <p className="font-semibold text-[12px] uppercase tracking-wider">Profissional</p>
                </div>
                <div className="flex items-center gap-[8px]">
                  <div className="w-8 h-8 rounded-full bg-[#f3f3f4] flex items-center justify-center overflow-hidden">
                    {bookingData.professional?.image ? (
                      <img src={bookingData.professional.image} alt={bookingData.professional.name} className="w-full h-full object-cover"/>
                    ) : (
                      <span className="material-symbols-outlined text-secondary text-[20px]">person</span>
                    )}
                  </div>
                  <p className="font-sans text-[16px] font-semibold text-on-surface">
                    {bookingData.professional?.name || 'Equipe Grace'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-[24px] pt-[16px] border-t border-[#e2e2e2] flex items-center justify-between">
              <div className="flex items-center gap-[4px] text-secondary">
                <span className="material-symbols-outlined">location_on</span>
                <span className="font-semibold text-[14px]">Unidade {tenant?.name || 'Sede'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[16px]">
            <button 
              onClick={handleFinish}
              className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-[14px] text-center shadow-md hover:opacity-90 transition-all active:scale-95"
            >
              Meus Agendamentos
            </button>
            <button onClick={handleAddToCalendar} className="w-full text-secondary font-semibold text-[14px] py-4 hover:bg-[#f3f3f4] rounded-xl transition-all">
              Adicionar ao Calendário
            </button>
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

export default AgendamentoConfirmado;

