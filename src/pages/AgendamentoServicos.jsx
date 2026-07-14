import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useBooking } from '../context/BookingContext';
import { api } from '../lib/api';
import ClienteBottomNavBar from '../components/ClienteBottomNavBar';

const AgendamentoServicos = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { bookingData, updateBooking } = useBooking();
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [dbServices, setDbServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;
    const fetchServices = async () => {
      setLoading(true);
      try {
        const data = await api.services.list(tenant.id);
        if (data) {
          setDbServices(data.filter(s => s.is_active));
        }
      } catch (err) {
        console.error("Erro ao carregar serviços:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, [tenant]);

  // Simulamos categorias apenas para a UI (se existisse no DB, faríamos group by)
  const categories = ['Todos'];

  const filteredServices = dbServices;

  useEffect(() => {
    console.log("=== [AgendamentoServicos] Montado/Atualizado ===");
    console.log("bookingData atual:", bookingData);
  }, [bookingData]);

  const handleSelectService = (service) => {
    console.log("=== [AgendamentoServicos] handleSelectService chamado ===", service);
    updateBooking('service', service);
  };

  const handleContinue = () => {
    console.log("=== [AgendamentoServicos] handleContinue chamado ===", bookingData.service);
    if (bookingData.service) {
      navigate(`/${tenant_slug}/agendar/profissionais`);
    }
  };

  return (
    <div className="font-body-md text-on-background bg-[#f9f9f9] min-h-screen pb-[120px]">
      <header className="w-full top-0 sticky z-40 bg-surface shadow-sm transition-all duration-300 ease-in-out pt-[calc(env(safe-area-inset-top,0px)+28px)] pb-2 md:pt-4">
        <div className="flex justify-between items-center px-gutter py-sm w-full max-w-7xl mx-auto">
          <div className="w-10"></div>{/* Spacer to keep title centered */}
          <h1 className="font-headline-md text-headline-md-mobile md:text-headline-md text-primary tracking-tight text-center flex-1">
            {tenant?.name || 'Carregando...'}
          </h1>
          <div className="w-10"></div>{/* Spacer to keep title centered */}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-[16px] py-[40px]">
        <div className="mb-[40px] animate-fade-in-up">
          <h2 className="font-serif text-[28px] md:text-[32px] font-semibold text-on-surface mb-2">Selecionar Serviço</h2>
          <p className="font-sans text-[16px] text-secondary max-w-[512px]">Escolha o tratamento ideal para o seu momento de cuidado e relaxamento.</p>
        </div>

        <div className="flex gap-[8px] overflow-x-auto pb-[16px] mb-[40px] no-scrollbar">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-none px-6 py-2 rounded-full font-semibold text-[14px] transition-all duration-300 ${
                activeCategory === cat 
                  ? 'bg-primary-container text-on-primary-container' 
                  : 'bg-[#eeeeee] text-secondary hover:bg-primary-container/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px]">
          {loading ? (
             <div className="col-span-3 text-center py-10"><span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span></div>
          ) : filteredServices.length === 0 ? (
             <div className="col-span-3 text-center py-10 text-secondary">Nenhum serviço disponível no momento.</div>
          ) : (
            filteredServices.map(service => {
              const isSelected = bookingData.service?.id === service.id;
              return (
                <div 
                  key={service.id}
                  onClick={() => handleSelectService({
                    id: service.id,
                    name: service.name,
                    price: service.price,
                    duration: service.duration_minutes
                  })}
                  className={`group relative bg-white rounded-xl p-[24px] shadow-[0px_4px_20px_rgba(0,0,0,0.04)] transition-all duration-300 cursor-pointer border ${
                    isSelected ? 'border-primary ring-2 ring-primary border-l-4 border-l-primary' : 'border-transparent hover:border-primary-container/30 hover:shadow-[0px_10px_30px_rgba(0,0,0,0.08)]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-[#ffdadc] rounded-lg text-primary">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>spa</span>
                    </div>
                  </div>
                  <h3 className="font-serif text-[24px] font-semibold text-on-surface mb-2">{service.name}</h3>
                  <div className="flex justify-between items-center border-t border-[#d4c2c3]/30 pt-4 mt-6">
                    <div className="flex flex-col">
                      <span className="font-medium text-[12px] text-outline uppercase tracking-wider">Investimento</span>
                      <span className="font-serif text-[24px] font-semibold text-primary">R$ {parseFloat(service.price).toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-secondary">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <span className="font-semibold text-[14px]">{service.duration_minutes} min</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* Espaçador de segurança para a BottomNavBar móvel */}
        <div className="h-24 md:hidden"></div>
      </main>

      {bookingData.service && (
        <div className="fixed bottom-0 left-0 w-full z-40 animate-fade-in-up">
          <div className="bg-white shadow-[0px_-4px_20px_rgba(0,0,0,0.1)] p-4 pb-[calc(env(safe-area-inset-bottom,0px)+72px)] md:pb-4 flex flex-col items-center gap-3 rounded-t-2xl">
            <button 
              onClick={handleContinue}
              className="w-full max-w-[448px] bg-primary text-on-primary font-semibold text-[14px] py-4 rounded-xl shadow-lg active:scale-95 transition-all"
            >
              Continuar para Profissional
            </button>
          </div>
        </div>
      )}

      {/* BottomNavBar (Mobile Only) */}
      <ClienteBottomNavBar activeTab="home" tenantSlug={tenant_slug} />
    </div>
  );
};

export default AgendamentoServicos;

