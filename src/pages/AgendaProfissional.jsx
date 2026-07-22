import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { format, addDays, startOfWeek, isSameDay, parseISO, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import WaitlistManagerModal from '../components/WaitlistManagerModal';

const START_HOUR = 8;
const END_HOUR = 20;

const AgendaProfissional = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, session, logout } = useTenant();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('me'); // 'me' or 'all'
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState(0);

  const [weekStart, setWeekStart] = useState(() => startOfDay(new Date()));

  // Generate 7 days for the scroller based on weekStart
  const daysScroller = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  }, [weekStart]);

  useEffect(() => {
    // If the user is just a professional, force 'me' view
    if (session?.role === 'professional') {
      setViewMode('me');
    }
  }, [session]);

  useEffect(() => {
    if (tenant?.id && session?.id) {
      fetchAgenda();
    }
  }, [tenant, session, selectedDate, viewMode]);

  const fetchAgenda = async () => {
    setLoading(true);
    try {
      const start = startOfDay(selectedDate).toISOString();
      const end = endOfDay(selectedDate).toISOString();

      let filters = {
        tenant_id: tenant.id,
        start_date: start,
        end_date: end
      };

      if (viewMode === 'me') {
        filters.staff_id = session.id;
      }

      const data = await api.appointments.list(filters);
      setAppointments(data || []);

      if (session?.role === 'manager' || session?.role === 'superadmin') {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const waitData = await api.request('/waitlist', { params: { date: dateStr } });
        setWaitlistCount(waitData ? waitData.length : 0);
      }
    } catch (err) {
      console.error("Erro ao carregar agenda:", err);
    } finally {
      setLoading(false);
    }
  };

  // Group appointments by hour
  const appointmentsByHour = useMemo(() => {
    const grouped = {};
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      grouped[h] = [];
    }

    appointments.forEach(appt => {
      const start = new Date(appt.start_time);
      const h = start.getHours();
      // If appointment is outside business hours, clamp it or ignore it.
      // Here we place it in the closest bucket or let it map to the exact hour.
      if (grouped[h] !== undefined) {
        grouped[h].push(appt);
      } else {
        // If outside 8-20h, just add it to the ends
        if (h < START_HOUR) grouped[START_HOUR].push(appt);
        if (h > END_HOUR) grouped[END_HOUR].push(appt);
      }
    });

    return grouped;
  }, [appointments]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'in-progress': return 'bg-tertiary text-on-tertiary';
      case 'completed': return 'bg-[#2e7d32] text-white';
      case 'cancelled': return 'bg-error text-white';
      default: return 'bg-secondary text-on-secondary'; // scheduled
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'in-progress': return 'Em andamento';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return 'Agendado';
    }
  };

  return (
    <>
      <div className="max-w-[1200px] mx-auto py-lg animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl px-container-margin md:px-0">
          <div>
            <div className="flex items-center gap-2 mb-xs">
              <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
                 Agenda
              </h2>
              <div className="relative">
                <button className="p-2 text-primary hover:bg-primary-container hover:text-on-primary-container rounded-full transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined">calendar_month</span>
                </button>
                <input 
                  type="date" 
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  onChange={(e) => {
                    if (e.target.value) {
                      const selected = new Date(e.target.value + 'T00:00:00');
                      setWeekStart(selected);
                      setSelectedDate(selected);
                    }
                  }}
                />
              </div>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant capitalize">
               {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          
          {/* Context Toggle (Somente Gestor) */}
          {session?.role === 'manager' && (
            <div className="inline-flex bg-surface-container-high rounded-full p-1 self-start md:self-auto">
              <button 
                onClick={() => setViewMode('me')}
                className={`px-6 py-2 rounded-full font-label-md text-label-md transition-all ${viewMode === 'me' ? 'bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.04)] text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Minha Agenda
              </button>
              <button 
                onClick={() => setViewMode('all')}
                className={`px-6 py-2 rounded-full font-label-md text-label-md transition-all ${viewMode === 'all' ? 'bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.04)] text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Agenda do Salão
              </button>
            </div>
          )}

          {/* Waitlist Badge (Somente Gestores) */}
          {(session?.role === 'manager' || session?.role === 'superadmin') && tenant?.features?.waitlist && (
            <button
              onClick={() => setShowWaitlist(true)}
              className="flex items-center gap-2 bg-surface-container-high hover:bg-surface-variant px-4 py-2 rounded-full transition-colors border border-outline-variant relative"
            >
              <span className="material-symbols-outlined text-[20px] text-primary">hourglass_empty</span>
              <span className="font-label-md text-on-surface">Fila de Espera</span>
              {waitlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-error text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                  {waitlistCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Date Scroller */}
        <div className="flex items-center gap-2 mb-lg px-container-margin md:px-0">
          <button 
            onClick={() => setWeekStart(prev => addDays(prev, -7))}
            className="shrink-0 w-10 h-10 bg-surface-container-high text-on-surface hover:bg-surface-variant rounded-full transition-colors flex items-center justify-center shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          
          <div className="flex gap-sm overflow-x-auto pb-sm no-scrollbar flex-1">
            {daysScroller.map((day, i) => {
              const isSelected = isSameDay(day, selectedDate);
              return (
                <button 
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={`shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-xl transition-colors ${
                    isSelected 
                      ? 'bg-primary text-on-primary shadow-[0px_4px_20px_rgba(0,0,0,0.1)]' 
                      : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
                  }`}
                >
                  <span className="font-label-sm text-label-sm uppercase mb-1">{format(day, 'EEE', { locale: ptBR })}</span>
                  <span className="font-headline-md text-headline-md">{format(day, 'dd')}</span>
                </button>
              );
            })}
          </div>

          <button 
            onClick={() => setWeekStart(prev => addDays(prev, 7))}
            className="shrink-0 w-10 h-10 bg-surface-container-high text-on-surface hover:bg-surface-variant rounded-full transition-colors flex items-center justify-center shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>

        {/* Timeline Grid (Lista Unificada) */}
        <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-md md:p-lg mx-container-margin md:mx-0">
          
          {loading ? (
            <div className="flex justify-center py-xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-0">
              {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, idx) => {
                const hour = START_HOUR + idx;
                const hourAppointments = appointmentsByHour[hour];

                return (
                  <div key={hour} className="flex relative min-h-[80px] border-b border-surface-variant border-opacity-50 last:border-0">
                    <div className="w-14 shrink-0 py-sm">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {hour.toString().padStart(2, '0')}:00
                      </span>
                    </div>
                    
                    <div className="flex-1 relative py-sm flex flex-col gap-2">
                      {hourAppointments.length === 0 ? (
                        <div className="w-full h-full min-h-[40px] border border-dashed border-surface-variant rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                          <span className="material-symbols-outlined text-surface-variant">add</span>
                        </div>
                      ) : (
                        hourAppointments.map(appt => {
                          const start = new Date(appt.start_time);
                          const end = new Date(appt.end_time);
                          const duration = differenceInMinutes(end, start);
                          
                          // Alternar cores baseado na duração ou serviço para visualização da equipe, mas manteremos o layout Stitch.
                          return (
                            <Link 
                              key={appt.id}
                              to={`/${tenant_slug}/staff/agendamento/${appt.id}`} 
                              className="w-full bg-secondary-container bg-opacity-40 border-l-4 border-secondary rounded-r-lg p-sm flex justify-between items-start cursor-pointer hover:bg-opacity-60 transition-colors"
                            >
                              <div className="flex-1 overflow-hidden pr-2">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h3 className="font-label-md text-label-md text-on-surface truncate">{appt.service_name || 'Serviço'}</h3>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${getStatusColor(appt.status)}`}>
                                    {getStatusLabel(appt.status)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-on-surface-variant truncate">
                                  <span className="font-medium">{appt.client_name || 'Cliente'}</span>
                                  {viewMode === 'all' && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-surface-variant"></span>
                                      <span className="text-xs flex items-center gap-1 bg-surface-variant/50 px-1.5 py-0.5 rounded-md text-secondary">
                                        <span className="material-symbols-outlined text-[12px]">person</span>
                                        {appt.staff_name}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end shrink-0">
                                <span className="font-label-sm text-label-sm text-on-surface">{format(start, 'HH:mm')}</span>
                                <span className="text-xs text-secondary">{duration}m</span>
                              </div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showWaitlist && (
        <WaitlistManagerModal
          selectedDate={selectedDate}
          onClose={() => {
            setShowWaitlist(false);
            fetchAgenda();
          }}
        />
      )}
    </>
  );
};

export default AgendaProfissional;
