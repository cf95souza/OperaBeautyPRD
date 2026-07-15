import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useBooking } from '../context/BookingContext';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationProvider';
import ClienteBottomNavBar from '../components/ClienteBottomNavBar';

const AgendamentoRevisao = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, session } = useTenant();
  const { bookingData } = useBooking();
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useNotification();
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);

  const servicePrice = bookingData.service?.price ? Number(bookingData.service.price) : 280;
  const [discount, setDiscount] = useState(0);
  const tax = 0;
  const total = servicePrice - discount + tax;

  React.useEffect(() => {
    console.log("=== [AgendamentoRevisao] Montado ===");
    console.log("bookingData lido do useBooking():", bookingData);
    console.log("sessionStorage bruto:", sessionStorage.getItem('operabeauty_booking_data'));
  }, [bookingData]);

  const handleConfirm = async () => {
    if (!session || session.role !== 'client') {
      showError("Por favor, faça login ou cadastre-se para confirmar o agendamento.");
      navigate(`/${tenant_slug}/login`);
      return;
    }

    setLoading(true);
    
    // Parse start time and end time
    const startDateTimeStr = `${bookingData.date}T${bookingData.time}:00`;
    const startDateTime = new Date(startDateTimeStr);
    const endDateTime = new Date(startDateTime.getTime() + (bookingData.service.duration * 60000));
    
    try {
      let assignedStaffId = bookingData.professional?.id;
      
      // Se for "Sem preferência", busca um profissional aleatório do salão para assumir o serviço
      if (!assignedStaffId) {
        const staffData = await api.staff.list(tenant.id);
          
        if (staffData && staffData.length > 0) {
          const manager = staffData.find(s => s.role === 'manager');
          assignedStaffId = manager ? manager.id : staffData[0].id;
        } else {
          throw new Error("Nenhum profissional cadastrado encontrado para este serviço.");
        }
      }

      await api.appointments.create({
        staff_id: assignedStaffId,
        service_id: bookingData.service.id,
        start_time: startDateTime.toISOString(),
        total_price: total
      });
      
      // Se usou cupom e tem id, incrementa o uso
      if (couponApplied && couponApplied.id) {
         await api.coupons.redeem(couponApplied.id, tenant.id);
      }

      navigate(`/${tenant_slug}/agendar/confirmado`);
    } catch (err) {
      console.error(err);
      showError('Erro ao confirmar agendamento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return;
    setLoading(true);
    
    try {
      const responseData = await api.coupons.getByCode(tenant.id, coupon.toUpperCase().trim());
      const data = responseData && responseData.length > 0 ? responseData[0] : null;
        
      if (!data) {
        showError("Cupom inválido ou não encontrado.");
        setCouponApplied(false);
        setDiscount(0);
        return;
      }
      
      if (data.max_uses && data.current_uses >= data.max_uses) {
        showError("Este cupom já atingiu o limite de usos.");
        return;
      }
      
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
         showError("Este cupom já expirou.");
         return;
      }
      
      if (data.service_id && bookingData?.service?.id && data.service_id !== bookingData.service.id) {
        showError("Este cupom não é válido para o serviço selecionado.");
        return;
      }
      
      let calcDiscount = 0;
      if (data.discount_type === 'percentage') {
         calcDiscount = servicePrice * (data.discount_value / 100);
      } else {
         calcDiscount = data.discount_value;
      }
      
      // Garante que o desconto não seja maior que o preço do serviço
      if (calcDiscount > servicePrice) calcDiscount = servicePrice;
      
      setDiscount(calcDiscount);
      setCouponApplied(data);
    } catch (err) {
      console.error(err);
      showError("Erro ao validar cupom.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-body-md text-on-background bg-[#f9f9f9] min-h-screen pb-[120px]">
      <header className="w-full top-0 sticky bg-[#f9f9f9] shadow-sm z-50 pt-[calc(env(safe-area-inset-top,0px)+28px)] pb-2 md:pt-4">
        <div className="flex justify-between items-center px-gutter py-sm w-full max-w-7xl mx-auto">
          <div className="w-10"></div>{/* Spacer to keep title centered */}
          <h1 className="font-headline-md text-headline-md-mobile md:text-headline-md text-primary tracking-tight text-center flex-1">
            {tenant?.name || 'Carregando...'}
          </h1>
          <div className="w-10"></div>{/* Spacer to keep title centered */}
        </div>
      </header>

      <main className="max-w-[576px] mx-auto px-[16px] pt-[40px] space-y-[24px]">
        <div className="animate-fade-in-up">
          <h2 className="font-serif text-[28px] font-semibold text-on-surface">Revisar Agendamento</h2>
          <p className="font-sans text-[16px] text-secondary mt-[4px]">Confirme os detalhes da sua experiência de beleza.</p>
        </div>

        <section className="animate-fade-in-up bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] overflow-hidden" style={{ animationDelay: '0.1s' }}>
          <div className="p-[16px] space-y-[16px]">
            <div className="flex items-start gap-[16px]">
              <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-[#e8b4b8]">
                <span className="material-symbols-outlined w-full h-full flex items-center justify-center text-white text-[32px]">
                  {bookingData.service?.icon || 'spa'}
                </span>
              </div>
              <div className="flex-1">
                <span className="font-semibold text-[12px] text-primary uppercase tracking-wider">
                  {bookingData.service?.category || 'Tratamento'}
                </span>
                <h3 className="font-serif text-[24px] font-semibold text-on-surface mt-[4px]">
                  {bookingData.service?.name || 'Hidratação Profunda Glow'}
                </h3>
                <p className="font-sans text-[16px] text-secondary">{bookingData.service?.duration || '60'} minutos</p>
              </div>
            </div>

            <div className="h-[1px] bg-[#d4c2c3]/50 w-full"></div>

            <div className="grid grid-cols-2 gap-[16px]">
              <div className="space-y-[4px]">
                <div className="flex items-center gap-[4px] text-primary">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                  <span className="font-semibold text-[14px]">Profissional</span>
                </div>
                <p className="font-sans text-[16px] font-semibold text-on-surface">
                  {bookingData.professional?.name || 'Sem preferência'}
                </p>
              </div>
              <div className="space-y-[4px]">
                <div className="flex items-center gap-[4px] text-primary">
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                  <span className="font-semibold text-[14px]">Data e Hora</span>
                </div>
                <p className="font-sans text-[16px] font-semibold text-on-surface">
                  {bookingData.date ? `${bookingData.date}, ${bookingData.time}` : '15 Set, 14:30'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="animate-fade-in-up space-y-[8px]" style={{ animationDelay: '0.2s' }}>
          <label className="font-semibold text-[14px] text-on-surface px-[4px]" htmlFor="coupon">Cupom de Desconto</label>
          <div className="flex gap-[8px]">
            <input 
              id="coupon" 
              type="text"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              disabled={couponApplied}
              placeholder="Digite seu código"
              className="flex-1 bg-[#f3f3f4] border-0 border-b border-[#d4c2c3] focus:border-primary focus:ring-0 px-[16px] py-[8px] rounded-t-lg font-sans transition-colors outline-none"
            />
            <button 
              onClick={handleApplyCoupon}
              disabled={couponApplied}
              className={`px-[24px] py-[8px] rounded-xl font-semibold text-[14px] transition-colors ${
                couponApplied ? 'bg-primary text-white opacity-80' : 'bg-[#5f5e5e] text-white hover:opacity-90'
              }`}
            >
              {couponApplied ? 'Aplicado!' : 'Aplicar'}
            </button>
          </div>
        </section>

        <section className="animate-fade-in-up bg-[#f3f3f4] rounded-xl p-[16px] space-y-[8px]" style={{ animationDelay: '0.3s' }}>
          <div className="flex justify-between items-center">
            <span className="font-sans text-[16px] text-secondary">Subtotal</span>
            <span className="font-sans text-[16px] text-on-surface">R$ {servicePrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-primary">
            <span className="font-sans text-[16px]">Desconto (Cupom)</span>
            <span className="font-sans text-[16px]">- R$ {discount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center hidden">
            <span className="font-sans text-[16px] text-secondary">Taxa de Serviço</span>
            <span className="font-sans text-[16px] text-on-surface">R$ {tax.toFixed(2)}</span>
          </div>
          <div className="h-[1px] bg-[#d4c2c3]/50 w-full my-[8px]"></div>
          <div className="flex justify-between items-center pt-[4px]">
            <span className="font-serif text-[24px] font-semibold text-on-surface">Total</span>
            <span className="font-serif text-[24px] font-semibold text-primary">R$ {total.toFixed(2)}</span>
          </div>
        </section>

        <div className="animate-fade-in-up flex items-center gap-[8px] bg-[#e8b4b8]/20 p-[16px] rounded-xl" style={{ animationDelay: '0.4s' }}>
          <span className="material-symbols-outlined text-[#6b4448]">info</span>
          <p className="font-medium text-[12px] text-[#6b4448]">
            O pagamento será realizado presencialmente após o serviço.
          </p>
        </div>
        {/* Espaçador de segurança para a BottomNavBar móvel */}
        <div className="h-24 md:hidden"></div>
      </main>

      <div className="fixed bottom-0 left-0 w-full p-[16px] pb-[calc(env(safe-area-inset-bottom,0px)+72px)] md:pb-[16px] bg-white/80 backdrop-blur-md z-40">
        <div className="max-w-[576px] mx-auto">
          <button 
            onClick={handleConfirm}
            disabled={loading}
            className={`w-full bg-primary text-white py-[24px] rounded-full font-semibold text-[18px] shadow-lg hover:scale-[0.98] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 ${
              loading ? 'bg-[#5f5e5e]' : ''
            }`}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin">sync</span> Processando...
              </>
            ) : (
              'Confirmar Agendamento'
            )}
          </button>
        </div>
      </div>

      {/* BottomNavBar (Mobile Only) */}
      <ClienteBottomNavBar activeTab="home" tenantSlug={tenant_slug} />
    </div>
  );
};

export default AgendamentoRevisao;

