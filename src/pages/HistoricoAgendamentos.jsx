import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  User,
  Coffee,
  CheckCircle,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Info,
  MapPin,
  X,
  Star
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { useBooking } from '../context/BookingContext';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationProvider';
import ClienteBottomNavBar from '../components/ClienteBottomNavBar';
import ReviewModal from '../components/ReviewModal';
import { TelaCliente } from '../components/ui/TelaCliente';

// Formatar data abreviada para o badge da Home (ex: diaSem: 'TER', diaNum: '20')
function parseDateBadge(dateString) {
  try {
    const date = new Date(dateString);
    const diaSem = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase().slice(0, 3);
    const diaNum = date.getDate().toString().padStart(2, '0');
    return { diaSem, diaNum };
  } catch (e) {
    return { diaSem: 'AGEN', diaNum: '00' };
  }
}

// Formatar data por extenso (Ex: "Terça-feira, 20 de Outubro de 2026")
function formatDateFull(dateString) {
  try {
    const date = new Date(dateString);
    const diaSem = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const diaSemCap = diaSem.charAt(0).toUpperCase() + diaSem.slice(1);
    const formatada = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date);
    return `${diaSemCap}, ${formatada}`;
  } catch (e) {
    return dateString;
  }
}

// Formatar hora (Ex: "11:30")
function formatTime(dateString) {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (e) {
    return '';
  }
}

function isToday(dateString) {
  const today = new Date();
  const date = new Date(dateString);
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

const HistoricoAgendamentos = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, session } = useTenant();
  const { updateBooking } = useBooking();
  const { showSuccess, showError, confirm } = useNotification();

  const [activeTab, setActiveTab] = useState('proximos');
  const [appointments, setAppointments] = useState({ proximos: [], concluidos: [] });
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Paginação para Concluídos
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Modal de Detalhes
  const [selectedApptDetails, setSelectedApptDetails] = useState(null);
  const [selectedApptToReview, setSelectedApptToReview] = useState(null);

  // Modal de Check-in de Mimos
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [selectedAppointmentForCheckin, setSelectedAppointmentForCheckin] = useState(null);
  const [selectedDrink, setSelectedDrink] = useState('');

  // Carrega agendamentos do cliente
  useEffect(() => {
    if (!tenant || !session) return;

    let isMounted = true;
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const data = await api.appointments.list({
          client_id: session.id,
          tenant_id: tenant.id
        });

        if (data && isMounted) {
          const proximos = data.filter((a) =>
            ['scheduled', 'in-progress'].includes(a.status)
          );
          const concluidos = data.filter((a) =>
            ['completed', 'cancelled', 'no_show'].includes(a.status)
          );

          concluidos.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
          proximos.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

          setAppointments({ proximos, concluidos });
        }
      } catch (err) {
        console.error('Erro ao buscar agendamentos:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAppointments();
    return () => {
      isMounted = false;
    };
  }, [tenant, session, refreshTrigger]);

  // Cancelamento de agendamento com confirmação amigável e política de antecedência (D8)
  const handleCancel = async (appointmentId) => {
    const confirmed = await confirm(
      'Deseja realmente cancelar este agendamento? Esta ação liberará o horário para outros clientes.'
    );
    if (!confirmed) return;

    try {
      await api.appointments.update(appointmentId, { 
        status: 'cancelled',
        cancellation_reason: 'Cancelado pelo cliente via histórico de agendamentos'
      });
      showSuccess('Agendamento cancelado com sucesso.');
      setSelectedApptDetails(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error('Erro ao cancelar agendamento:', err);
      const isWindowExpired = 
        err.code === 'CANCELLATION_WINDOW_EXPIRED' || 
        (err.message && err.message.includes('antecedência mínima'));
      
      if (isWindowExpired) {
        showError(err.message || 'Prazo de cancelamento online expirado. Por favor, entre em contato diretamente com a nossa recepção.');
      } else {
        showError(err.message || 'Não foi possível cancelar o agendamento. Tente novamente.');
      }
    }
  };

  // Confirmação de Check-in presencial
  const handleConfirmCheckin = async () => {
    if (!selectedAppointmentForCheckin || !selectedDrink) return;

    try {
      await api.appointments.update(selectedAppointmentForCheckin.id, {
        checkin_status: 'checked_in',
        checkin_request: selectedDrink
      });
      showSuccess('Check-in realizado com sucesso! Seu mimo está sendo preparado.');
      setShowCheckinModal(false);
      setSelectedAppointmentForCheckin(null);
      setSelectedDrink('');
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      showError('Erro ao realizar o check-in. Tente novamente.');
    }
  };

  // Ação "Remarcar em 1 toque" (D6 P1)
  const handleRemarcar = (item) => {
    updateBooking({
      rescheduleAppointmentId: item.id,
      originalAppointment: item,
      service: item.service_id
        ? {
            id: item.service_id,
            name: item.service_name || 'Serviço',
            price: item.total_price || 0,
            duration: 60
          }
        : null,
      services: item.service_id
        ? [
            {
              id: item.service_id,
              name: item.service_name || 'Serviço',
              price: item.total_price || 0,
              duration_minutes: 60
            }
          ]
        : [],
      professional: item.staff_id
        ? { id: item.staff_id, name: item.staff_name || 'Profissional' }
        : { id: 'any', name: 'Qualquer profissional' }
    });
    navigate(`/${tenant_slug}/agendar/horarios`);
  };

  const initialLetter = tenant?.name ? tenant.name.trim().charAt(0).toUpperCase() : (tenant_slug ? tenant_slug.charAt(0).toUpperCase() : 'O');

  return (
    <TelaCliente temNavegacaoInferior className="selection:bg-brand-tint selection:text-brand">
      {/* 1. Cabeçalho Fixo Sticky Rosé Editorial */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-line/60 pt-3 pb-3 px-5">
        <div className="max-w-[420px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-ink border border-gold flex items-center justify-center overflow-hidden shadow-xs shrink-0 select-none">
              {tenant?.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={tenant.name}
                  className="w-full h-full object-cover p-0.5 rounded-full"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <span className="font-serif italic text-gold text-[17px] leading-none">
                  {initialLetter}
                </span>
              )}
            </div>
            <span className="font-serif text-[18px] font-semibold text-brand tracking-tight truncate max-w-[200px]">
              {tenant?.name || (tenant_slug ? tenant_slug.toUpperCase() : 'OperaBeauty')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/${tenant_slug}/agendar/servicos`)}
            className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
            aria-label="Novo agendamento"
            title="Agendar novo horário"
          >
            <Plus size={18} strokeWidth={2.4} />
          </button>
        </div>
      </header>

      {/* 2. Conteúdo Principal Mobile Centralizado */}
      <main className="w-full max-w-[420px] mx-auto px-5 pt-4 flex-1 flex flex-col">
        {/* Título da Página Editorial */}
        <div className="pb-4">
          <h1 className="font-serif text-[28px] font-bold text-ink leading-tight tracking-tight">
            Minha Agenda
          </h1>
          <p className="text-sm text-ink-soft mt-0.5">
            Seus momentos de cuidado e bem-estar.
          </p>
        </div>

        {/* 3. Segmented Control Rosé Editorial */}
        <div className="bg-line/50 p-1 rounded-full flex gap-1 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('proximos')}
            className={`flex-1 py-2 px-4 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'proximos'
                ? 'bg-brand text-white shadow-xs'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            <span>Próximos</span>
            {appointments.proximos.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'proximos'
                    ? 'bg-white/20 text-white'
                    : 'bg-brand-tint text-brand'
                }`}
              >
                {appointments.proximos.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('concluidos')}
            className={`flex-1 py-2 px-4 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'concluidos'
                ? 'bg-brand text-white shadow-xs'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            <span>Concluídos</span>
            {appointments.concluidos.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'concluidos'
                    ? 'bg-white/20 text-white'
                    : 'bg-brand-tint text-brand'
                }`}
              >
                {appointments.concluidos.length}
              </span>
            )}
          </button>
        </div>

        {/* 4. Lista da Aba "Próximos" */}
        {activeTab === 'proximos' && (
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-32 bg-surface rounded-[24px] border border-line/60 animate-pulse"
                  />
                ))}
              </div>
            ) : appointments.proximos.length === 0 ? (
              /* Estado Vazio Acolhedor */
              <div className="bg-surface rounded-[24px] border border-line/60 p-8 text-center my-6 flex flex-col items-center shadow-xs">
                <div className="w-16 h-16 rounded-full bg-brand-tint text-brand flex items-center justify-center mb-4">
                  <Calendar size={28} />
                </div>
                <h3 className="font-serif text-xl font-bold text-ink mb-1">
                  Nenhum horário agendado
                </h3>
                <p className="text-xs text-ink-soft max-w-[260px] mb-5 leading-relaxed">
                  Que tal tirar um momento só seu? Escolha seu serviço favorito e reserve sua vaga.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/${tenant_slug}/agendar/servicos`)}
                  className="h-11 px-6 bg-brand text-white rounded-full font-medium text-sm hover:opacity-95 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <Sparkles size={16} />
                  <span>Agendar novo horário</span>
                </button>
              </div>
            ) : (
              appointments.proximos.map((item) => {
                const { diaSem, diaNum } = parseDateBadge(item.start_time);
                return (
                  <div
                    key={item.id}
                    className="bg-surface rounded-[24px] border border-line/80 shadow-xs p-5 space-y-4 hover:border-brand/40 transition-all"
                  >
                    {/* Bloco Superior: Data + Serviço + Horário + Profissional */}
                    <div className="flex items-start gap-3.5">
                      {/* Badge da Data Estilizado Rosé */}
                      <div className="w-[58px] h-[58px] rounded-[18px] bg-brand-tint text-brand flex flex-col items-center justify-center shrink-0 border border-brand/10">
                        <span className="text-[10px] font-bold tracking-wider leading-none">
                          {diaSem}
                        </span>
                        <span className="font-serif text-2xl font-bold leading-none mt-0.5">
                          {diaNum}
                        </span>
                      </div>

                      {/* Informações do Serviço */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-serif text-[19px] font-bold text-ink truncate leading-tight">
                            {item.service_name || 'Serviço'}
                          </h3>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-brand-tint/70 text-brand shrink-0">
                            Confirmado
                          </span>
                        </div>

                        <p className="text-xs text-ink font-semibold flex items-center gap-1.5 mt-1.5">
                          <Clock size={13} className="text-brand shrink-0" />
                          <span>Às {formatTime(item.start_time)}</span>
                          <span className="text-ink-soft font-normal truncate">
                            · {item.staff_name || 'Equipe do salão'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-line/60" />

                    {/* Check-in de Mimos se for hoje */}
                    {tenant?.waiting_menu_enabled && isToday(item.start_time) && (
                      <div className="pt-0.5">
                        {item.checkin_status === 'checked_in' ? (
                          <div className="w-full py-2.5 px-3 rounded-xl bg-success/10 border border-success/20 text-success text-xs font-semibold flex items-center justify-center gap-2">
                            <CheckCircle size={15} />
                            <span>
                              Check-in realizado! ({item.checkin_request || 'Mimo solicitado'})
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAppointmentForCheckin(item);
                              setShowCheckinModal(true);
                            }}
                            className="w-full py-2.5 px-4 rounded-full bg-brand text-white font-medium text-xs hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                          >
                            <Coffee size={15} />
                            <span>Fazer Check-in presencial (Mimos)</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Ações em Formato Pílula Editorial */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRemarcar(item)}
                          className="h-8 px-4 rounded-full border border-line hover:border-brand text-ink text-xs font-semibold hover:bg-brand-tint/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <RotateCcw size={12} className="text-brand" />
                          <span>Remarcar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedApptDetails(item)}
                          className="h-8 px-3.5 rounded-full border border-line text-ink-soft hover:text-ink text-xs font-semibold hover:bg-bg active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Info size={13} />
                          <span>Detalhes</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCancel(item.id)}
                        className="text-xs font-semibold text-danger/80 hover:text-danger hover:underline transition-all cursor-pointer px-1 py-1"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 5. Lista da Aba "Concluídos" */}
        {activeTab === 'concluidos' && (
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 bg-surface rounded-[24px] border border-line/60 animate-pulse"
                  />
                ))}
              </div>
            ) : appointments.concluidos.length === 0 ? (
              <div className="bg-surface rounded-[24px] border border-line/60 p-8 text-center my-6 flex flex-col items-center shadow-xs">
                <div className="w-14 h-14 rounded-full bg-line/40 text-ink-soft flex items-center justify-center mb-3">
                  <CheckCircle size={24} />
                </div>
                <h3 className="font-serif text-lg font-bold text-ink mb-1">
                  Nenhum histórico anterior
                </h3>
                <p className="text-xs text-ink-soft max-w-[240px]">
                  Seus procedimentos concluídos ou cancelados aparecerão arquivados aqui.
                </p>
              </div>
            ) : (
              (() => {
                const totalPages =
                  itemsPerPage === 'todos'
                    ? 1
                    : Math.ceil(appointments.concluidos.length / itemsPerPage);
                const currentConcluidos =
                  itemsPerPage === 'todos'
                    ? appointments.concluidos
                    : appointments.concluidos.slice(
                        (currentPage - 1) * itemsPerPage,
                        currentPage * itemsPerPage
                      );

                return (
                  <>
                    {currentConcluidos.map((item) => (
                      <div
                        key={item.id}
                        className="bg-surface rounded-[22px] border border-line/70 p-4 shadow-xs flex items-center justify-between gap-3 hover:border-brand/30 transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-serif text-base font-bold text-ink truncate">
                              {item.service_name || 'Serviço'}
                            </h4>
                            <span
                              className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                                item.status === 'cancelled'
                                  ? 'bg-line text-ink-soft'
                                  : item.status === 'no_show'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-brand-tint/60 text-brand'
                              }`}
                            >
                              {item.status === 'cancelled' ? 'Cancelado' : item.status === 'no_show' ? 'Não Compareceu' : 'Concluído'}
                            </span>
                          </div>

                          <p className="text-xs text-ink-soft mt-0.5 truncate">
                            {formatDateFull(item.start_time)} · {item.staff_name || 'Profissional'}
                          </p>

                          <p className="font-serif text-sm font-bold text-brand mt-1 tabular-nums">
                            R$ {parseFloat(item.total_price || 0).toFixed(2).replace('.', ',')}
                          </p>
                        </div>

                        {/* Ações: Avaliar (se concluído) + Remarcar */}
                        <div className="flex items-center gap-2 shrink-0">
                          {item.status === 'completed' && (
                            <button
                              type="button"
                              onClick={() => setSelectedApptToReview(item)}
                              className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 active:scale-95 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                              title="Deixar avaliação sobre o atendimento"
                            >
                              <Star size={12} className="fill-amber-400 text-amber-400" />
                              <span>Avaliar</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemarcar(item)}
                            className="px-3.5 py-1.5 rounded-full border border-brand/60 text-brand hover:bg-brand/5 active:scale-95 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Agendar este mesmo serviço novamente"
                          >
                            <RotateCcw size={12} />
                            <span>Remarcar</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Controles de Paginação */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-3 pb-2 text-xs text-ink-soft">
                        <span>
                          Página {currentPage} de {totalPages}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="w-8 h-8 rounded-full border border-line bg-surface flex items-center justify-center text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-tint/30 transition-all cursor-pointer"
                            aria-label="Página anterior"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCurrentPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={currentPage === totalPages}
                            className="w-8 h-8 rounded-full border border-line bg-surface flex items-center justify-center text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-tint/30 transition-all cursor-pointer"
                            aria-label="Próxima página"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()
            )}
          </div>
        )}
      </main>

      {/* 6. Barra de Navegação Inferior (Ativa em 'agenda') */}
      <ClienteBottomNavBar activeTab="agenda" tenantSlug={tenant_slug} />

      {/* 7. Modal de Detalhes do Agendamento */}
      {selectedApptDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-surface rounded-3xl w-full max-w-[380px] p-6 shadow-xl border border-line/70 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line/50">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Detalhes do Agendamento
              </span>
              <button
                type="button"
                onClick={() => setSelectedApptDetails(null)}
                className="p-1 rounded-full text-ink-soft hover:text-ink cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-ink-soft block">Procedimento</span>
                <p className="font-serif text-xl font-bold text-ink">
                  {selectedApptDetails.service_name}
                </p>
              </div>

              <div>
                <span className="text-xs text-ink-soft block">Profissional</span>
                <p className="font-semibold text-ink">
                  {selectedApptDetails.staff_name || 'Equipe do salão'}
                </p>
              </div>

              <div>
                <span className="text-xs text-ink-soft block">Data e Horário</span>
                <p className="font-semibold text-ink">
                  {formatDateFull(selectedApptDetails.start_time)} às {formatTime(selectedApptDetails.start_time)}
                </p>
              </div>

              {tenant?.address && (
                <div>
                  <span className="text-xs text-ink-soft block">Local do Salão</span>
                  <p className="font-medium text-ink flex items-center gap-1.5 mt-0.5">
                    <MapPin size={14} className="text-brand shrink-0" />
                    <span>{tenant.address}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={() => setSelectedApptDetails(null)}
                className="flex-1 h-11 rounded-full border border-line text-ink-soft hover:text-ink font-medium text-sm transition-all cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => handleCancel(selectedApptDetails.id)}
                className="flex-1 h-11 rounded-full border border-danger/30 text-danger hover:bg-danger/5 font-medium text-sm transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal de Check-in (Mimos de Espera) */}
      {showCheckinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-surface rounded-3xl w-full max-w-[380px] p-6 shadow-xl border border-line/70 animate-scale-up space-y-4">
            <div>
              <h3 className="font-serif text-2xl font-bold text-ink">
                Check-in presencial
              </h3>
              <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                Você já chegou ao salão? Escolha um mimo cortesia para aproveitar enquanto preparamos seu momento.
              </p>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {tenant?.waiting_menu_items && tenant.waiting_menu_items.length > 0 ? (
                tenant.waiting_menu_items.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDrink(item)}
                    className={`w-full p-3.5 rounded-2xl border text-left text-sm font-medium flex justify-between items-center transition-all cursor-pointer ${
                      selectedDrink === item
                        ? 'border-brand bg-brand-tint/30 text-brand font-bold'
                        : 'border-line hover:border-brand/40 text-ink bg-bg'
                    }`}
                  >
                    <span>{item}</span>
                    {selectedDrink === item && (
                      <CheckCircle size={17} className="text-brand shrink-0" />
                    )}
                  </button>
                ))
              ) : (
                <div className="text-xs text-ink-soft italic p-3 text-center bg-bg rounded-xl">
                  Café expresso, água aromatizada ou chá.
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCheckinModal(false);
                  setSelectedDrink('');
                  setSelectedAppointmentForCheckin(null);
                }}
                className="flex-1 h-11 rounded-full border border-line text-ink-soft hover:text-ink font-medium text-sm transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={!selectedDrink}
                onClick={handleConfirmCheckin}
                className="flex-1 h-11 rounded-full bg-brand text-white font-medium text-sm hover:opacity-95 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Avaliação D16 */}
      {selectedApptToReview && (
        <ReviewModal
          reviewData={selectedApptToReview}
          onClose={() => setSelectedApptToReview(null)}
          onReviewSubmitted={() => {
            setSelectedApptToReview(null);
            showSuccess('Avaliação enviada com sucesso! Muito obrigado.');
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}

      {/* 9. Navegação Inferior Rosé Editorial */}
      <ClienteBottomNavBar activeTab="agenda" tenantSlug={tenant_slug} />
    </TelaCliente>
  );
};

export default HistoricoAgendamentos;
