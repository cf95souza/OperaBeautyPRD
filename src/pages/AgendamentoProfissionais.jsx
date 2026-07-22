import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useBooking } from '../context/BookingContext';
import { api } from '../lib/api';
import ClienteBottomNavBar from '../components/ClienteBottomNavBar';

const AgendamentoProfissionais = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant } = useTenant();
  const { bookingData, updateBooking } = useBooking();
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [dbStaff, setDbStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoProcessed, setAutoProcessed] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    const fetchStaff = async () => {
      setLoading(true);
      try {
        const data = await api.staff.list(tenant.id);
        if (data) {
          setDbStaff(data.filter(s => s.is_active));
        }
      } catch (err) {
        console.error("Erro ao carregar profissionais:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, [tenant]);

  // Filtros desativados, exibindo todos da base real
  const categories = ['Todos'];
  const filteredStaff = dbStaff;

  useEffect(() => {
    console.log("=== [AgendamentoProfissionais] Montado/Atualizado ===");
    console.log("bookingData atual:", bookingData);
  }, [bookingData]);

  useEffect(() => {
    if (!autoProcessed && dbStaff.length > 0 && location.state?.preselectedStaffId) {
      const staff = dbStaff.find(s => s.id === location.state.preselectedStaffId);
      if (staff) {
        updateBooking('professional', staff);
        setAutoProcessed(true);
        navigate(`/${tenant_slug}/agendar/horarios`);
      }
    }
  }, [dbStaff, location.state, autoProcessed, navigate, tenant_slug, updateBooking]);

  const handleSelectStaff = (staff) => {
    console.log("=== [AgendamentoProfissionais] handleSelectStaff chamado ===", staff);
    updateBooking('professional', staff);
    navigate(`/${tenant_slug}/agendar/horarios`);
  };

  const handleAnyStaff = () => {
    console.log("=== [AgendamentoProfissionais] handleAnyStaff chamado ===");
    updateBooking('professional', null);
    navigate(`/${tenant_slug}/agendar/horarios`);
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
        <div className="mb-[40px] text-center md:text-left animate-fade-in-up">
          <h2 className="font-serif text-[28px] md:text-[32px] font-semibold text-on-surface mb-2">Escolha o Profissional</h2>
          <p className="font-sans text-[16px] text-secondary">Selecione o especialista ideal para o seu momento de cuidado.</p>
        </div>

        {/* Sem preferência button */}
        <div className="mb-[24px] flex justify-center md:justify-start">
            <button 
              onClick={handleAnyStaff}
              className="bg-white border-2 border-primary text-primary px-[24px] py-[12px] rounded-xl font-semibold shadow-sm hover:bg-primary hover:text-white transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined">groups</span>
              Sem preferência de profissional
            </button>
        </div>

        <div className="flex gap-[8px] overflow-x-auto pb-[24px] no-scrollbar">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-none px-6 py-2 rounded-full font-semibold text-[14px] transition-all duration-300 shadow-sm ${
                activeCategory === cat 
                  ? 'bg-primary text-on-primary' 
                  : 'bg-[#e8b4b8]/30 text-[#6b4448] hover:bg-[#e8b4b8]/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px]">
          {loading ? (
             <div className="col-span-3 text-center py-10"><span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span></div>
          ) : filteredStaff.length === 0 ? (
             <div className="col-span-3 text-center py-10 text-secondary">Nenhum profissional cadastrado no momento.</div>
          ) : (
            filteredStaff.map(staff => {
              // Pegar as iniciais do nome para o avatar
              const initials = staff.name
                .split(' ')
                .filter(Boolean)
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div 
                  key={staff.id}
                  onClick={() => handleSelectStaff(staff)}
                  className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/40 p-[16px] flex items-center justify-between group cursor-pointer hover:border-primary hover:-translate-y-0.5 transition-all duration-300 gap-md"
                >
                  <div className="flex items-center gap-md min-w-0">
                    {/* Avatar Redondo com iniciais do profissional */}
                    <div className="w-12 h-12 rounded-full bg-primary-fixed text-on-primary-fixed font-semibold text-[16px] flex items-center justify-center shrink-0 shadow-inner group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                      {initials || <span className="material-symbols-outlined text-[20px]">person</span>}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-xs">
                        <h3 className="font-serif text-[18px] md:text-[20px] font-semibold text-on-surface group-hover:text-primary transition-colors truncate">{staff.name}</h3>
                        <span className="text-primary material-symbols-outlined text-[16px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                      </div>
                      <p className="font-semibold text-[13px] text-secondary mt-0.5 truncate">{staff.role === 'manager' ? 'Especialista Sênior' : 'Profissional'}</p>
                    </div>
                  </div>
                  
                  {/* Botão compacto de selecionar */}
                  <div className="flex items-center shrink-0">
                    <button className="bg-primary-container text-on-primary-container group-hover:bg-primary group-hover:text-on-primary px-[16px] py-[8px] rounded-full font-semibold text-[13px] transition-all shadow-sm flex items-center gap-xs">
                      Selecionar <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* Espaçador de segurança para a BottomNavBar móvel */}
        <div className="h-24 md:hidden"></div>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <ClienteBottomNavBar activeTab="home" tenantSlug={tenant_slug} />
    </div>
  );
};

export default AgendamentoProfissionais;
