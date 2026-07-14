import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationProvider';
import ClienteBottomNavBar from '../components/ClienteBottomNavBar';

const HistoricoAgendamentos = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, session } = useTenant();
  const [activeTab, setActiveTab] = useState('proximos');
  const [appointments, setAppointments] = useState({ proximos: [], concluidos: [] });
  const [loading, setLoading] = useState(true);
  const { showSuccess, showError, confirm } = useNotification();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCancel = async (appointmentId) => {
    if (!(await confirm("Tem certeza que deseja cancelar este agendamento?"))) {
      return;
    }

    try {
      await api.appointments.update(appointmentId, { status: 'cancelled' });

      showSuccess("Agendamento cancelado com sucesso!");
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Erro ao cancelar agendamento:", err);
      showError("Erro ao cancelar o agendamento. Tente novamente.");
    }
  };

  useEffect(() => {
    if (!tenant || !session) return;
    
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const data = await api.appointments.list({ client_id: session.id, tenant_id: tenant.id });
        
        if (data) {
          const proximos = data.filter(a => ['scheduled', 'in-progress'].includes(a.status));
          const concluidos = data.filter(a => ['completed', 'cancelled'].includes(a.status));
          
          // order concluidos descending (most recent first)
          concluidos.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
          
          setAppointments({ proximos, concluidos });
        }
      } catch (err) {
        console.error("Erro ao buscar agendamentos", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [tenant, session, refreshTrigger]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
  };


  return (
    <div className="bg-[#f9f9f9] text-on-background font-body-md min-h-screen pb-[120px]">
      <header className="w-full top-0 sticky z-40 bg-surface shadow-sm transition-all duration-300 ease-in-out pt-[calc(env(safe-area-inset-top,0px)+28px)] pb-2 md:pt-4">
        <div className="flex justify-between items-center px-gutter py-sm w-full max-w-7xl mx-auto">
          <div className="w-10"></div>{/* Spacer to keep title centered */}
          <div className="flex items-center justify-center gap-2 flex-1">
            {tenant?.logo_url ? (
              <img 
                src={tenant.logo_url} 
                alt={tenant.name} 
                className="h-8 md:h-10 object-contain rounded-md" 
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <span className="material-symbols-outlined text-primary font-headline-md text-headline-md shrink-0">spa</span>
            )}
            <h1 className="font-headline-md text-headline-md-mobile md:text-headline-md text-primary tracking-tight">
              {tenant?.name || 'Carregando...'}
            </h1>
          </div>
          <div className="w-10"></div>{/* Spacer to keep title centered */}
        </div>
      </header>

      <main className="px-[16px] mt-[16px] max-w-[672px] mx-auto">
        <div className="mb-md">
          <h2 className="font-headline-lg-mobile md:text-headline-lg text-on-surface">
            Minha Agenda
          </h2>
          <p className="text-secondary">Acompanhe seus horários agendados.</p>
        </div>
        
        <div className="flex gap-[24px] border-b border-[#d4c2c3] mb-[24px] mt-sm">
          <button 
            onClick={() => setActiveTab('proximos')}
            className={`pb-[16px] font-semibold text-[14px] transition-all relative ${
              activeTab === 'proximos' 
                ? 'text-primary' 
                : 'text-secondary'
            }`}
          >
            Próximos
            {activeTab === 'proximos' && (
              <span className="absolute bottom-[-1px] left-0 right-0 height-[2px] bg-primary rounded-[2px] border-b-2 border-primary"></span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('concluidos')}
            className={`pb-[16px] font-semibold text-[14px] transition-all relative ${
              activeTab === 'concluidos' 
                ? 'text-primary' 
                : 'text-secondary'
            }`}
          >
            Concluídos
            {activeTab === 'concluidos' && (
              <span className="absolute bottom-[-1px] left-0 right-0 height-[2px] bg-primary rounded-[2px] border-b-2 border-primary"></span>
            )}
          </button>
        </div>

        {activeTab === 'proximos' && (
          <section className="space-y-[16px] animate-fade-in-up">
            {loading ? (
              <div className="flex justify-center py-10"><span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span></div>
            ) : appointments.proximos.length === 0 ? (
              <div className="text-center py-10 text-secondary">Nenhum agendamento futuro encontrado.</div>
            ) : appointments.proximos.map(item => (
              <div key={item.id} className="bg-white rounded-xl p-[16px] shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-[#e2e2e2]/30">
                <div className="flex justify-between items-start mb-[16px]">
                  <div className="flex gap-[16px]">
                    <div className="w-12 h-12 rounded-lg bg-[#ffdadc] flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">spa</span>
                    </div>
                    <div>
                      <h3 className="font-serif text-[24px] font-semibold text-on-surface">{item.service_name || 'Serviço'}</h3>
                      <p className="font-sans text-[14px] font-semibold text-secondary">Profissional: {item.staff_name || 'Não informado'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-[16px] py-[16px] border-y border-[#e2e2e2]/50 mb-[16px]">
                  <div className="flex items-center gap-[4px] text-primary">
                    <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                    <span className="font-semibold text-[14px] capitalize">{formatDate(item.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-[4px] text-primary">
                    <span className="material-symbols-outlined text-[18px]">schedule</span>
                    <span className="font-semibold text-[14px]">{formatTime(item.start_time)}</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleCancel(item.id)}
                  className="w-full py-[16px] rounded-lg font-semibold text-[14px] text-[#ba1a1a] hover:bg-[#ffdad6]/20 transition-colors border border-[#ba1a1a]/20 active:scale-[0.98] duration-150"
                >
                  Cancelar Agendamento
                </button>
              </div>
            ))}
          </section>
        )}

        {activeTab === 'concluidos' && (
          <section className="space-y-[16px] animate-fade-in-up">
            {loading ? (
              <div className="flex justify-center py-10"><span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span></div>
            ) : appointments.concluidos.length === 0 ? (
              <div className="text-center py-10 text-secondary">Nenhum agendamento concluído encontrado.</div>
            ) : appointments.concluidos.map(item => (
              <div key={item.id} className="bg-white rounded-xl p-[16px] shadow-[0px_4px_20px_rgba(0,0,0,0.04)] flex justify-between items-center group cursor-pointer hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-[#e8b4b8]">
                <div className="flex gap-[16px] items-center">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-variant flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[24px]">done_all</span>
                  </div>
                  <div>
                    <h4 className="font-serif text-[24px] font-semibold text-on-surface line-clamp-1">{item.service_name || 'Serviço'}</h4>
                    <p className="font-semibold text-[14px] text-secondary capitalize">{formatDate(item.start_time)}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end shrink-0 pl-2">
                  <span className="block font-serif text-[20px] font-semibold text-primary mb-1">R$ {parseFloat(item.total_price).toFixed(2).replace('.', ',')}</span>
                  <span className={`font-medium text-[12px] px-2 py-[2px] rounded-full ${item.status === 'cancelled' ? 'bg-error-container text-on-error-container' : 'bg-surface-variant text-on-surface-variant'}`}>
                    {item.status === 'cancelled' ? 'Cancelado' : 'Concluído'}
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}
        {/* Espaçador de segurança para a BottomNavBar móvel */}
        <div className="h-24 md:hidden"></div>
      </main>

      {/* Bottom Navigation */}
      <ClienteBottomNavBar activeTab="agenda" tenantSlug={tenant_slug} />
    </div>
  );
};

export default HistoricoAgendamentos;

