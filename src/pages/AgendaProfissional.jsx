import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { 
  format, 
  addDays, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  startOfDay, 
  endOfDay, 
  differenceInMinutes,
  setHours,
  setMinutes
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Scissors, 
  Check, 
  X, 
  ExternalLink, 
  MessageCircle, 
  Hourglass, 
  AlertTriangle,
  MoreVertical,
  CheckCircle2,
  UserX,
  RotateCcw,
  Send
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import NewAppointmentModal from '../components/NewAppointmentModal';
import WaitlistManagerModal from '../components/WaitlistManagerModal';

const START_HOUR = 8;
const END_HOUR = 20;
const ROW_HEIGHT = 72; // 72px por hora exatos como especificado no Plano §9.4 e §9.6

const HOURS_LIST = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

const AgendaProfissional = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, session } = useTenant();

  const isManager = !session || session?.role === 'manager' || session?.role === 'admin';

  // Estados principais
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState(isManager ? 'all' : 'me'); // 'all' (Salão) | 'me' (Minha agenda)
  const [periodMode, setPeriodMode] = useState('day'); // 'day' (Dia) | 'week' (Semana)
  
  const [staffList, setStaffList] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Linha do agora em tempo real
  const [now, setNow] = useState(new Date());

  // Modais e ações rápidas
  const [newModalConfig, setNewModalConfig] = useState({ isOpen: false, initialDate: null, initialProfessionalId: null });
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState(0);

  // Atualizar hora atual a cada 30 segundos
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Forçar 'me' se for somente profissional
  useEffect(() => {
    if (!isManager) {
      setViewMode('me');
    }
  }, [isManager]);

  // Carregar lista de profissionais do salão
  useEffect(() => {
    if (tenant?.id) {
      fetchStaff();
    }
  }, [tenant]);

  const fetchStaff = async () => {
    try {
      const data = await api.staff.list(tenant.id);
      if (Array.isArray(data)) {
        // Filtrar ativos
        setStaffList(data.filter(s => s.is_active !== false));
      }
    } catch (err) {
      console.error('Erro ao carregar equipe na agenda:', err);
    }
  };

  // Carregar agendamentos
  useEffect(() => {
    if (tenant?.id && session?.id) {
      fetchAgenda();
    }
  }, [tenant, session, selectedDate, viewMode, periodMode]);

  const fetchAgenda = async () => {
    setLoading(true);
    try {
      let start, end;
      if (periodMode === 'week') {
        start = startOfWeek(selectedDate, { weekStartsOn: 1 });
        end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      } else {
        start = startOfDay(selectedDate);
        end = endOfDay(selectedDate);
      }

      const filters = {
        tenant_id: tenant.id,
        start_date: start.toISOString(),
        end_date: end.toISOString()
      };

      if (viewMode === 'me') {
        filters.staff_id = session.id;
      }

      const data = await api.appointments.list(filters);
      setAppointments(data || []);

      if (isManager && tenant?.features?.waitlist) {
        try {
          const dateStr = format(selectedDate, 'yyyy-MM-dd');
          const waitData = await api.waitlist.list({ date: dateStr }).catch(() => []);
          setWaitlistCount(Array.isArray(waitData) ? waitData.length : 0);
        } catch {
          setWaitlistCount(0);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar agenda:', err);
    } finally {
      setLoading(false);
    }
  };

  // Alterar status rápido do agendamento
  const handleUpdateStatus = async (apptId, newStatus) => {
    setActionLoading(true);
    try {
      await api.appointments.update(apptId, { status: newStatus });
      setSelectedAppointment(null);
      await fetchAgenda();
    } catch (err) {
      console.error('Erro ao atualizar status do agendamento:', err);
      alert('Não foi possível atualizar o status. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  // Registrar falta (No-Show) - D8 P1
  const handleMarkNoShow = async (apptId) => {
    if (!window.confirm('Tem certeza de que deseja registrar falta para este cliente? O contador de faltas no CRM será atualizado e a vaga será marcada como Não Compareceu.')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.appointments.markNoShow(apptId);
      if (res?.penalty_applied === 'blocked') {
        alert('Falta registrada! O cliente atingiu o limite de faltas e foi bloqueado para agendamentos online.');
      } else if (res?.penalty_applied === 'deposit_required') {
        alert('Falta registrada! O cliente atingiu o limite de faltas e precisará pagar sinal PIX nas próximas reservas.');
      }
      setSelectedAppointment(null);
      await fetchAgenda();
    } catch (err) {
      console.error('Erro ao marcar falta:', err);
      alert(err.message || 'Não foi possível registrar a falta.');
    } finally {
      setActionLoading(false);
    }
  };

  // Desfazer falta (Reverter) - D8 P1
  const handleUndoNoShow = async (apptId) => {
    setActionLoading(true);
    try {
      await api.appointments.undoNoShow(apptId);
      setSelectedAppointment(null);
      await fetchAgenda();
    } catch (err) {
      console.error('Erro ao desfazer falta:', err);
      alert(err.message || 'Não foi possível reverter a falta.');
    } finally {
      setActionLoading(false);
    }
  };

  // Enviar lembrete WhatsApp sob demanda (Teste e Homologação de Linha)
  const [sendingReminderId, setSendingReminderId] = useState(null);

  const handleSendWhatsAppReminder = async (apptId) => {
    setSendingReminderId(apptId);
    try {
      const res = await api.whatsapp.sendAppointmentReminder(apptId);
      alert(res?.message || 'Lembrete de WhatsApp enviado com sucesso!');
    } catch (err) {
      alert(err.message || 'Falha ao enviar lembrete via WhatsApp.');
    } finally {
      setSendingReminderId(null);
    }
  };

  // Navegação de datas
  const handlePrev = () => {
    if (periodMode === 'week') {
      setSelectedDate(prev => subDays(prev, 7));
    } else {
      setSelectedDate(prev => subDays(prev, 1));
    }
  };

  const handleNext = () => {
    if (periodMode === 'week') {
      setSelectedDate(prev => addDays(prev, 7));
    } else {
      setSelectedDate(prev => addDays(prev, 1));
    }
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Capitalização correta do texto da data (ex: "Seg, 20 de outubro")
  const formattedDateTitle = useMemo(() => {
    if (periodMode === 'week') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(start, 'dd', { locale: ptBR })} – ${format(end, "dd 'de' MMMM", { locale: ptBR })}`;
    }
    const raw = format(selectedDate, "EEE, dd 'de' MMMM", { locale: ptBR });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [selectedDate, periodMode]);

  // Colunas a renderizar na grade
  const columns = useMemo(() => {
    if (periodMode === 'week') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => {
        const day = addDays(start, i);
        return {
          id: format(day, 'yyyy-MM-dd'),
          title: format(day, "EEE, dd/MM", { locale: ptBR }),
          subtitle: format(day, 'dd'),
          date: day,
          isCurrentDay: isSameDay(day, new Date())
        };
      });
    }

    if (viewMode === 'me') {
      return [{
        id: session?.id || 'me',
        title: session?.name || 'Minha Agenda',
        role: 'Profissional',
        avatar_url: session?.avatar_url,
        isMe: true
      }];
    }

    // Salão completo: profissionais da equipe
    if (staffList.length > 0) {
      return staffList.map(s => ({
        id: s.id,
        title: s.name,
        role: s.role === 'manager' ? 'Gestor' : 'Profissional',
        avatar_url: s.avatar_url,
        isMe: s.id === session?.id
      }));
    }

    // Fallback se equipe vazia
    return [{
      id: session?.id || 'default',
      title: session?.name || 'Profissional',
      role: 'Staff',
      isMe: true
    }];
  }, [periodMode, viewMode, staffList, selectedDate, session]);

  // Cálculo da Linha do "Agora" (em tempo real)
  const isCurrentViewingDateToday = isSameDay(selectedDate, now);
  const nowTopPosition = useMemo(() => {
    if (!isCurrentViewingDateToday) return null;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    if (hours < START_HOUR || hours > END_HOUR) return null;
    const totalMinutes = (hours - START_HOUR) * 60 + minutes;
    return (totalMinutes / 60) * ROW_HEIGHT;
  }, [now, isCurrentViewingDateToday]);

  // Mapear agendamentos para a coluna correta e posições absolutas com resolução de sobreposição (lanes)
  const columnAppointments = useMemo(() => {
    const map = {};
    columns.forEach(col => { map[col.id] = []; });

    // 1. Distribuir agendamentos por coluna
    appointments.forEach(appt => {
      const start = new Date(appt.start_time);
      const end = new Date(appt.end_time);

      let colKey;
      if (periodMode === 'week') {
        colKey = format(start, 'yyyy-MM-dd');
      } else if (viewMode === 'me') {
        colKey = session?.id || 'me';
      } else {
        colKey = appt.staff_id;
      }

      if (map[colKey]) {
        const startHours = start.getHours();
        const startMins = start.getMinutes();
        const duration = Math.max(differenceInMinutes(end, start), 30);
        
        // Posição vertical relativa
        const offsetMinutes = (startHours - START_HOUR) * 60 + startMins;
        const top = (offsetMinutes / 60) * ROW_HEIGHT + 2;
        const height = Math.max((duration / 60) * ROW_HEIGHT - 4, 42);

        map[colKey].push({
          ...appt,
          start,
          end,
          top,
          height,
          duration
        });
      }
    });

    // 2. Resolver sobreposições em cada coluna (Calendar Packing Algorithm)
    Object.keys(map).forEach(colKey => {
      const list = map[colKey];
      if (!list || list.length === 0) return;

      // Ordenar por horário de início asc, e duração desc para desempate
      list.sort((a, b) => a.start.getTime() - b.start.getTime() || b.duration - a.duration);

      // Agrupar em clusters de sobreposição
      const clusters = [];
      let currentCluster = [];
      let clusterEnd = null;

      list.forEach(item => {
        if (!clusterEnd || item.start.getTime() < clusterEnd.getTime()) {
          // Sobrepõe ao cluster atual
          currentCluster.push(item);
          if (!clusterEnd || item.end.getTime() > clusterEnd.getTime()) {
            clusterEnd = item.end;
          }
        } else {
          // Novo cluster
          if (currentCluster.length > 0) {
            clusters.push(currentCluster);
          }
          currentCluster = [item];
          clusterEnd = item.end;
        }
      });
      if (currentCluster.length > 0) {
        clusters.push(currentCluster);
      }

      // Para cada cluster, calcular as lanes (sub-colunas)
      clusters.forEach(cluster => {
        const lanes = []; // Guarda o horário de término do último item de cada lane

        cluster.forEach(item => {
          let placed = false;
          for (let i = 0; i < lanes.length; i++) {
            if (lanes[i].getTime() <= item.start.getTime()) {
              lanes[i] = item.end;
              item.laneIndex = i;
              placed = true;
              break;
            }
          }
          if (!placed) {
            lanes.push(item.end);
            item.laneIndex = lanes.length - 1;
          }
        });

        const totalLanes = lanes.length;
        cluster.forEach(item => {
          item.totalLanes = totalLanes;
          if (totalLanes > 1) {
            const laneWidth = 100 / totalLanes;
            item.leftStyle = `calc(${item.laneIndex * laneWidth}% + 4px)`;
            item.widthStyle = `calc(${laneWidth}% - 8px)`;
          } else {
            item.leftStyle = '8px';
            item.widthStyle = 'calc(100% - 16px)';
          }
        });
      });
    });

    return map;
  }, [appointments, columns, periodMode, viewMode, session]);

  // Helper para cores do status alinhadas 1:1 com G2 Gestor Agenda
  const getStatusStyles = (status) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-[#EFEAE6]',
          border: 'border-[#DDD4CE]',
          textTitle: 'text-ink',
          textSub: 'text-ink-soft',
          badge: 'bg-[#F0EAE6] text-[#6B5E62] border-[#E0D6D0]',
          label: 'Concluído'
        };
      case 'in-progress':
        return {
          bg: 'bg-[#FFF9E6]',
          border: 'border-[#FFE7A3]',
          textTitle: 'text-[#8A5E00]',
          textSub: 'text-[#9E6C00]',
          badge: 'bg-[#FFF8E1] text-[#B78103] border-[#FFE082]',
          label: 'Em andamento'
        };
      case 'cancelled':
        return {
          bg: 'bg-[#FDE8E8]',
          border: 'border-[#F8B4B4]',
          textTitle: 'text-[#B81D1D] line-through',
          textSub: 'text-[#D32F2F]',
          badge: 'bg-[#FDE8E8] text-[#D32F2F] border-[#F8B4B4]',
          label: 'Cancelado'
        };
      case 'no_show':
        return {
          bg: 'bg-[#FFF3E0]',
          border: 'border-[#FFE0B2]',
          textTitle: 'text-[#E65100] font-semibold',
          textSub: 'text-[#F57C00]',
          badge: 'bg-[#FFE0B2] text-[#E65100] border-[#FFCC80]',
          label: 'Falta (Não compareceu)'
        };
      case 'scheduled':
      case 'confirmed':
      default:
        return {
          bg: 'bg-[#E8F5E9]',
          border: 'border-[#C8E6C9]',
          textTitle: 'text-[#1E5224]',
          textSub: 'text-[#2E7D32]',
          badge: 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]',
          label: 'Confirmado'
        };
    }
  };

  // Ao clicar em slot vazio
  const handleEmptySlotClick = (hour, col) => {
    let targetDate = new Date(selectedDate);
    if (periodMode === 'week' && col.date) {
      targetDate = new Date(col.date);
    }
    targetDate = setHours(targetDate, hour);
    targetDate = setMinutes(targetDate, 0);

    const proId = (periodMode === 'day' && viewMode === 'all') ? col.id : (session?.id || null);

    setNewModalConfig({
      isOpen: true,
      initialDate: targetDate,
      initialProfessionalId: proId
    });
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 font-sans text-ink selection:bg-brand-tint selection:text-brand animate-fade-in-up">
      
      {/* 1. Cabeçalho Superior Editorial (1:1 com G2 · Gestor — Agenda@2x.png) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-4">
        
        {/* Título & Navegação de Data */}
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink font-normal tracking-tight mb-3">
            Agenda
          </h1>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Seta Anterior */}
            <button
              onClick={handlePrev}
              aria-label="Dia anterior"
              className="w-9 h-9 rounded-full border border-line bg-surface text-ink flex items-center justify-center hover:bg-brand-tint/40 transition-colors shadow-2xs active:scale-95 cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Texto da Data com Capitalização Correta */}
            <span className="font-medium text-sm sm:text-base text-ink px-1 min-w-[170px]">
              {formattedDateTitle}
            </span>

            {/* Seta Próxima */}
            <button
              onClick={handleNext}
              aria-label="Próximo dia"
              className="w-9 h-9 rounded-full border border-line bg-surface text-ink flex items-center justify-center hover:bg-brand-tint/40 transition-colors shadow-2xs active:scale-95 cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>

            {/* Botão Hoje */}
            <button
              onClick={handleToday}
              className="px-3.5 py-1.5 rounded-full bg-[#F5ECE8] text-brand text-xs font-semibold hover:bg-[#EBDCD6] transition-colors active:scale-95 cursor-pointer ml-1"
            >
              Hoje
            </button>
          </div>
        </div>

        {/* Controles do Lado Direito */}
        <div className="flex items-center gap-3 flex-wrap self-start xl:self-auto">
          
          {/* Segmented Control 1: Dia | Semana */}
          <div className="inline-flex bg-surface border border-line rounded-full p-1 shadow-2xs">
            <button
              onClick={() => setPeriodMode('day')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                periodMode === 'day' 
                  ? 'bg-brand text-white shadow-xs' 
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              Dia
            </button>
            <button
              onClick={() => setPeriodMode('week')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                periodMode === 'week' 
                  ? 'bg-brand text-white shadow-xs' 
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              Semana
            </button>
          </div>

          {/* Segmented Control 2: Minha agenda | Salão (Apenas Gestor) */}
          {isManager && periodMode === 'day' && (
            <div className="inline-flex bg-surface border border-line rounded-full p-1 shadow-2xs">
              <button
                onClick={() => setViewMode('me')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'me' 
                    ? 'bg-brand text-white shadow-xs' 
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                Minha agenda
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'all' 
                    ? 'bg-brand text-white shadow-xs' 
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                Salão
              </button>
            </div>
          )}

          {/* Badge Fila de Espera (se houver) */}
          {isManager && tenant?.features?.waitlist && (
            <button
              onClick={() => setShowWaitlist(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-line bg-surface hover:bg-bg transition-colors text-xs font-medium text-ink relative"
            >
              <Hourglass size={14} className="text-brand" />
              <span>Fila</span>
              {waitlistCount > 0 && (
                <span className="bg-brand text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {waitlistCount}
                </span>
              )}
            </button>
          )}

          {/* Botão Primário Dominante: + Novo agendamento */}
          <button
            onClick={() => setNewModalConfig({ isOpen: true, initialDate: selectedDate, initialProfessionalId: null })}
            className="bg-brand hover:opacity-95 active:scale-95 text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Novo agendamento</span>
          </button>
        </div>

      </div>

      {/* 2. Legenda de Status (Pílulas Refinadas Rosé Editorial) */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 text-xs select-none">
        <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-medium bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] shadow-2xs">
          Confirmado
        </span>
        <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-medium bg-[#FFF8E1] text-[#B78103] border border-[#FFE082] shadow-2xs">
          Pendente
        </span>
        <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-medium bg-[#F0EAE6] text-[#6B5E62] border border-[#E0D6D0] shadow-2xs">
          Concluído
        </span>
        <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-medium bg-[#FDE8E8] text-[#D32F2F] border border-[#F8B4B4] shadow-2xs">
          Cancelado
        </span>
      </div>

      {/* 3. Grade Principal da Agenda (1:1 com G2 · Gestor — Agenda@2x.png) */}
      <div className="bg-surface rounded-[22px] border border-line shadow-xs overflow-hidden relative">
        
        {loading && (
          <div className="absolute inset-0 bg-surface/60 backdrop-blur-2xs z-40 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand border-t-transparent" />
          </div>
        )}

        <div className="overflow-x-auto hide-scrollbar">
          <div className="min-w-[760px]">
            
            {/* Cabeçalho das Colunas (Profissionais da Equipe ou Dias da Semana) */}
            <div className="flex border-b border-line bg-surface sticky top-0 z-20">
              
              {/* Célula do canto esquerdo (sobre o eixo das horas) */}
              <div className="w-16 sm:w-20 shrink-0 border-r border-line py-3 px-2 flex items-center justify-center bg-surface">
                <span className="text-[11px] font-medium text-ink-soft/60 uppercase">Hora</span>
              </div>

              {/* Colunas dos Profissionais / Dias */}
              {columns.map(col => {
                const initial = col.title.trim().charAt(0).toUpperCase();
                return (
                  <div 
                    key={col.id} 
                    className="flex-1 min-w-[200px] py-3 px-4 border-r border-line last:border-r-0 flex items-center gap-2.5 bg-surface"
                  >
                    {/* Monograma ou Avatar */}
                    <div className="w-8 h-8 rounded-full bg-brand-tint border border-gold/60 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                      {col.avatar_url ? (
                        <img src={col.avatar_url} alt={col.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-serif italic text-brand text-xs font-bold leading-none">
                          {initial}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <span className="font-medium text-sm text-ink truncate block">
                        {col.title}
                      </span>
                      {col.role && (
                        <span className="text-[10px] text-ink-soft uppercase tracking-wider block">
                          {col.role}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Corpo da Grade Horária */}
            <div className="relative">
              
              {/* Linha do "Agora" (Current Time Indicator) */}
              {nowTopPosition !== null && (
                <div 
                  className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                  style={{ top: `${nowTopPosition}px` }}
                >
                  <div className="w-16 sm:w-20 shrink-0 flex items-center justify-end pr-2">
                    <span className="text-[10px] font-bold text-[#D32F2F] bg-white px-1 rounded shadow-2xs">
                      {format(now, 'HH:mm')}
                    </span>
                  </div>
                  <div className="flex-1 relative flex items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#D32F2F] absolute -left-1 shadow-xs" />
                    <div className="w-full h-[2px] bg-[#D32F2F]" />
                  </div>
                </div>
              )}

              {/* Linhas de Horário (08:00 às 20:00) */}
              {HOURS_LIST.map(hour => {
                const hourFormatted = `${hour.toString().padStart(2, '0')}:00`;
                return (
                  <div 
                    key={hour} 
                    className="flex border-b border-[#F0EAE6] last:border-b-0 relative group"
                    style={{ height: `${ROW_HEIGHT}px` }}
                  >
                    {/* Eixo Y: Rótulo da Hora */}
                    <div className="w-16 sm:w-20 shrink-0 border-r border-line p-2 text-right select-none bg-surface/50">
                      <span className="text-xs font-medium text-ink-soft/75 tabular-nums lining-nums">
                        {hourFormatted}
                      </span>
                    </div>

                    {/* Slots Horários por Coluna */}
                    {columns.map(col => (
                      <div 
                        key={col.id} 
                        onClick={() => handleEmptySlotClick(hour, col)}
                        className="flex-1 min-w-[200px] border-r border-line last:border-r-0 relative hover:bg-brand-tint/15 transition-colors cursor-pointer group/slot"
                      >
                        {/* Indicador de Adicionar ao Hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity pointer-events-none">
                          <span className="w-6 h-6 rounded-full bg-brand-tint text-brand flex items-center justify-center shadow-2xs text-xs font-bold">
                            +
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Camada Absoluta de Cards de Agendamento */}
              <div className="absolute inset-0 pointer-events-none flex">
                <div className="w-16 sm:w-20 shrink-0" />
                
                {columns.map(col => {
                  const appts = columnAppointments[col.id] || [];
                  return (
                    <div key={col.id} className="flex-1 min-w-[200px] relative">
                      {appts.map(appt => {
                        const styles = getStatusStyles(appt.status);
                        const startStr = format(appt.start, 'HH:mm');
                        const endStr = format(appt.end, 'HH:mm');
                        const isNarrow = (appt.totalLanes || 1) > 1;

                        return (
                          <div
                            key={appt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAppointment(appt);
                            }}
                            style={{
                              top: `${appt.top}px`,
                              height: `${appt.height}px`,
                              left: appt.leftStyle || '8px',
                              width: appt.widthStyle || 'calc(100% - 16px)'
                            }}
                            className={`absolute rounded-xl p-2 sm:p-2.5 border transition-all pointer-events-auto cursor-pointer shadow-xs hover:shadow-lg hover:z-30 hover:scale-[1.02] overflow-hidden flex flex-col justify-between ${styles.bg} ${styles.border} ${isNarrow ? 'ring-1 ring-black/5' : ''}`}
                          >
                            {isNarrow ? (
                              /* Card Estreito (Sub-coluna / Sobreposição): 3 linhas limpas sem cortes */
                              <div className="flex flex-col justify-between h-full min-w-0">
                                {/* Linha 1: Nome do Serviço + Preço em destaque no topo */}
                                <div className="flex items-center justify-between gap-1 leading-tight">
                                  <h4 className={`font-semibold text-xs truncate ${styles.textTitle}`}>
                                    {appt.service_name || 'Procedimento'}
                                  </h4>
                                  <span className="font-serif font-bold text-xs text-ink shrink-0 tabular-nums lining-nums">
                                    {formatCurrency(appt.total_price || 0)}
                                  </span>
                                </div>

                                {/* Linha 2: Cliente */}
                                <p className={`text-[11px] truncate leading-tight font-medium ${styles.textSub}`}>
                                  {appt.client_name || 'Cliente'}
                                </p>

                                {/* Linha 3: Horário + Status */}
                                <div className="flex items-center justify-between gap-1 text-[10px] tabular-nums leading-tight">
                                  <span className={`font-medium ${styles.textSub}`}>
                                    {startStr}–{endStr}
                                  </span>
                                  <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 ${styles.badge}`}>
                                    {styles.label}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              /* Card de Largura Total */
                              <div className="flex flex-col justify-between h-full min-w-0">
                                <div>
                                  <div className="flex items-start justify-between gap-1">
                                    <h4 className={`font-semibold text-xs truncate leading-tight ${styles.textTitle}`}>
                                      {appt.service_name || 'Procedimento'}
                                    </h4>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${styles.badge}`}>
                                      {styles.label}
                                    </span>
                                  </div>

                                  <p className={`text-[11px] truncate leading-tight mt-0.5 ${styles.textSub}`}>
                                    <span className="font-medium text-ink">{appt.client_name || 'Cliente'}</span>
                                    <span> · {startStr}–{endStr}</span>
                                  </p>
                                </div>

                                {appt.height >= 48 && (
                                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-black/5 mt-auto">
                                    <span className="font-serif font-bold text-ink tabular-nums lining-nums">
                                      {formatCurrency(appt.total_price || 0)}
                                    </span>
                                    <span className="text-[10px] text-ink-soft/75">
                                      {appt.duration} min
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* 4. Modal / Drawer de Detalhes e Ações Rápidas do Agendamento */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-surface rounded-[24px] border border-line shadow-2xl p-6 relative animate-scale-up">
            
            {/* Fechar */}
            <button
              onClick={() => setSelectedAppointment(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full border border-line text-ink-soft hover:text-ink flex items-center justify-center hover:bg-bg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Cabeçalho do Card de Detalhes */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-tint text-brand flex items-center justify-center shrink-0">
                <Scissors size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1 ${getStatusStyles(selectedAppointment.status).badge}`}>
                  {getStatusStyles(selectedAppointment.status).label}
                </span>
                <h3 className="font-serif text-xl text-ink font-semibold truncate">
                  {selectedAppointment.service_name || 'Serviço'}
                </h3>
              </div>
            </div>

            {/* Informações Centrais do Atendimento */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-bg/70 border border-line/60 text-xs text-ink mb-5">
              <div>
                <span className="text-[11px] text-ink-soft block uppercase font-medium">Cliente</span>
                <span className="font-semibold text-sm text-ink block mt-0.5">
                  {selectedAppointment.client_name || 'Não informado'}
                </span>
                {selectedAppointment.client_phone && (
                  <a
                    href={`https://wa.me/55${selectedAppointment.client_phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-brand font-medium hover:underline mt-1"
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                )}
              </div>

              <div>
                <span className="text-[11px] text-ink-soft block uppercase font-medium">Profissional</span>
                <span className="font-semibold text-sm text-ink block mt-0.5">
                  {selectedAppointment.staff_name || 'Equipe'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-ink-soft block uppercase font-medium">Horário</span>
                <span className="font-semibold text-sm text-ink block mt-0.5 tabular-nums lining-nums">
                  {format(selectedAppointment.start, 'HH:mm')} às {format(selectedAppointment.end, 'HH:mm')}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-ink-soft block uppercase font-medium">Valor Total</span>
                <span className="font-semibold text-sm text-ink block mt-0.5 tabular-nums lining-nums text-brand">
                  {formatCurrency(selectedAppointment.total_price || 0)}
                </span>
              </div>
            </div>

            {/* Ações Rápidas de Gestão */}
            <div className="space-y-2">
              
              {selectedAppointment.status === 'no_show' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserX size={16} className="text-amber-700 shrink-0" />
                    <span>Este atendimento foi marcado como <strong>Falta</strong>.</span>
                  </div>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUndoNoShow(selectedAppointment.id)}
                    className="px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Reverter</span>
                  </button>
                </div>
              )}

              {selectedAppointment.status !== 'completed' && selectedAppointment.status !== 'no_show' && selectedAppointment.status !== 'cancelled' && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus(selectedAppointment.id, 'completed')}
                  className="w-full h-11 bg-[#2E7D32] hover:bg-[#256828] text-white font-medium text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Check size={16} />
                  <span>Marcar como Concluído</span>
                </button>
              )}

              {selectedAppointment.status === 'scheduled' && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleUpdateStatus(selectedAppointment.id, 'in-progress')}
                  className="w-full h-11 bg-[#B78103] hover:bg-[#9B6D02] text-white font-medium text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Clock size={16} />
                  <span>Iniciar Atendimento (Em Andamento)</span>
                </button>
              )}

              {/* Botão Registrar Falta (No-Show) */}
              {selectedAppointment.status !== 'completed' && selectedAppointment.status !== 'cancelled' && selectedAppointment.status !== 'no_show' && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleMarkNoShow(selectedAppointment.id)}
                  className="w-full h-11 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <UserX size={16} className="text-amber-700" />
                  <span>Marcar Falta (Não Compareceu)</span>
                </button>
              )}

              {/* Botão Enviar Lembrete WhatsApp Agora (Disparo Imediato / Teste Real) */}
              {selectedAppointment.status !== 'cancelled' && selectedAppointment.status !== 'completed' && (
                <button
                  type="button"
                  disabled={sendingReminderId === selectedAppointment.id || actionLoading}
                  onClick={() => handleSendWhatsAppReminder(selectedAppointment.id)}
                  className="w-full h-11 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  title="Dispara imediatamente o modelo oficial de lembrete com as opções de confirmação para o WhatsApp do cliente"
                >
                  <Send size={15} className="text-emerald-700" />
                  <span>
                    {sendingReminderId === selectedAppointment.id
                      ? 'Enviando Lembrete...'
                      : 'Enviar Lembrete WhatsApp Agora (Disparo Imediato)'}
                  </span>
                </button>
              )}

              {selectedAppointment.client_id && (
                <Link
                  to={`/${tenant_slug}/staff/ficha-cliente/${selectedAppointment.client_id}`}
                  onClick={() => setSelectedAppointment(null)}
                  className="w-full h-11 border border-line bg-surface hover:bg-bg text-ink font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <User size={16} />
                  <span>Abrir Ficha da Cliente (CRM)</span>
                </Link>
              )}

              {selectedAppointment.status !== 'cancelled' && (
                <button
                  disabled={actionLoading}
                  onClick={() => {
                    if (window.confirm('Tem certeza de que deseja cancelar este agendamento?')) {
                      handleUpdateStatus(selectedAppointment.id, 'cancelled');
                    }
                  }}
                  className="w-full h-10 text-danger hover:bg-danger/10 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X size={15} />
                  <span>Cancelar Agendamento</span>
                </button>
              )}

            </div>

          </div>
        </div>
      )}

      {/* Modal de Novo Agendamento */}
      {newModalConfig.isOpen && (
        <NewAppointmentModal
          isOpen={newModalConfig.isOpen}
          initialDate={newModalConfig.initialDate}
          initialProfessionalId={newModalConfig.initialProfessionalId}
          onClose={() => setNewModalConfig({ isOpen: false, initialDate: null, initialProfessionalId: null })}
          onSuccess={() => {
            setNewModalConfig({ isOpen: false, initialDate: null, initialProfessionalId: null });
            fetchAgenda();
          }}
        />
      )}

      {/* Modal da Fila de Espera */}
      {showWaitlist && (
        <WaitlistManagerModal
          selectedDate={selectedDate}
          onClose={() => {
            setShowWaitlist(false);
            fetchAgenda();
          }}
        />
      )}

    </div>
  );
};

export default AgendaProfissional;
