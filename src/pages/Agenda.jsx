import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle,
  X,
  CalendarDays,
  Search,
  Filter,
  FileText
} from 'lucide-react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths, isToday, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import NewAppointmentModal from '../components/NewAppointmentModal';

const Agenda = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState(null);
  const [appointmentNotes, setAppointmentNotes] = useState([]);
  const [pastAppointments, setPastAppointments] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [blockedDates, setBlockedDates] = useState([]);

  const handleOpenDetailModal = async (app) => {
    setSelectedAppointmentDetail(app);
    setLoadingNotes(true);
    const { data: notesData } = await supabase
       .from('cap_timeline_notes')
       .select('*, cap_profiles(full_name)')
       .eq('client_id', app.client_id)
       .order('created_at', { ascending: false });
       
    const { data: appsData } = await supabase
       .from('cap_appointments')
       .select('*, cap_appointment_services(cap_services(name)), cap_services(name)')
       .eq('client_id', app.client_id)
       .eq('status', 'completed')
       .lt('start_time', new Date().toISOString())
       .order('start_time', { ascending: false });

    setAppointmentNotes(notesData || []);
    setPastAppointments(appsData || []);
    setLoadingNotes(false);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const fetchInitialData = async () => {
    const { data: pros } = await supabase
      .from('cap_profiles')
      .select('*')
      .eq('role', 'professional')
      .eq('is_active', true);
    setProfessionals(pros || []);
  };

  const fetchAppointments = async () => {
    setLoading(true);
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);

    // Busca Agendamentos
    const { data, error } = await supabase
      .from('cap_appointments')
      .select(`
        *,
        cap_clients(*),
        cap_profiles(*),
        cap_appointment_services(*, cap_services(*))
      `)
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString());

    // Busca Bloqueios do Mês
    const { data: blockedData } = await supabase
      .from('cap_blocked_dates')
      .select('*')
      .gte('blocked_date', format(start, 'yyyy-MM-dd'))
      .lte('blocked_date', format(end, 'yyyy-MM-dd'));

    if (error) {
      console.error('Erro ao buscar agendamentos:', error);
    } else {
      setAppointments(data || []);
      setBlockedDates(blockedData || []);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (id, status) => {
    const { error } = await supabase
      .from('cap_appointments')
      .update({ status })
      .eq('id', id);

    if (error) alert('Erro ao atualizar: ' + error.message);
    else fetchAppointments();
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">AGENDA MESTRE</h1>
          <p className="text-slate-500 font-medium capitalize">{format(selectedDate, 'MMMM yyyy', { locale: ptBR })}</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
          <button onClick={() => setSelectedDate(subMonths(selectedDate, 1))} className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400"><ChevronLeft size={20} /></button>
          <button onClick={() => setSelectedDate(new Date())} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-accent transition-colors">Hoje</button>
          <button onClick={() => setSelectedDate(addMonths(selectedDate, 1))} className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400"><ChevronRight size={20} /></button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const dateFormat = "EEE";
    const days = [];
    let startDate = startOfWeek(selectedDate, { locale: ptBR });

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center py-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            {format(addDays(startDate, i), dateFormat, { locale: ptBR })}
          </span>
        </div>
      );
    }
    return <div className="grid grid-cols-7 border-b border-slate-100">{days}</div>;
  };

  const onDateClick = (day) => {
    setSelectedDate(day);
    setShowDayDetail(true);
  };

  const renderCells = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: ptBR });
    const endDate = addDays(startOfWeek(monthEnd, { locale: ptBR }), 7);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        const dayAppointments = appointments.filter(app => isSameDay(new Date(app.start_time), cloneDay));
        const isSelected = isSameDay(day, selectedDate);
        const isCurrentMonth = isSameDay(startOfMonth(day), monthStart);
        
        // Verifica se o dia está bloqueado
        const isBlocked = blockedDates.some(b => b.blocked_date === format(cloneDay, 'yyyy-MM-dd'));

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[120px] p-2 border-r border-b border-slate-50 transition-all cursor-pointer group relative ${
              !isCurrentMonth ? "bg-slate-50/30 opacity-30" : isBlocked ? "bg-slate-50/80" : "bg-white hover:bg-slate-50/50"
            } ${isSelected ? "ring-2 ring-inset ring-accent/30 bg-accent/[0.02]" : ""}`}
            onClick={() => onDateClick(cloneDay)}
          >
            {isBlocked && isCurrentMonth && (
               <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000, #000 1px, transparent 1px, transparent 10px)' }} />
            )}
            
            <div className="flex justify-between items-start mb-2">
               <span className={`text-xs font-bold leading-none w-7 h-7 flex items-center justify-center rounded-lg ${
                  isToday(day) ? "bg-accent text-white shadow-lg shadow-accent/20" : isBlocked ? "text-slate-300" : "text-slate-400"
               }`}>
                  {formattedDate}
               </span>
               {isBlocked && isCurrentMonth && (
                 <span className="text-[7px] font-black text-rose-500 bg-rose-50 px-1 py-0.5 rounded border border-rose-100 uppercase tracking-tighter">BLOQUEADO</span>
               )}
               {dayAppointments.length > 0 && !isBlocked && (
                 <span className="text-[9px] font-black text-accent bg-accent/10 px-1.5 py-0.5 rounded-md uppercase">
                   {dayAppointments.length} {dayAppointments.length === 1 ? 'Atendimento' : 'Atendimentos'}
                 </span>
               )}
            </div>
            <div className="space-y-1">
              {!isBlocked && dayAppointments.slice(0, 3).map((app) => (
                <div 
                  key={app.id} 
                  className={`text-[9px] px-2 py-1 rounded-md border truncate font-bold uppercase ${
                    app.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 line-through opacity-60' : 
                    app.status === 'cancelled' ? 'bg-slate-50 text-slate-400 border-slate-100' :
                    app.status === 'in_progress' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                    'bg-white text-slate-700 border-slate-100 shadow-sm border-l-2 border-l-accent'
                  }`}
                >
                  {format(new Date(app.start_time), 'HH:mm')} {app.cap_clients?.name}
                </div>
              ))}
              {!isBlocked && dayAppointments.length > 3 && (
                <div className="text-[8px] text-slate-400 font-bold text-center pt-1">
                  +{dayAppointments.length - 3} mais
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="bg-white rounded-b-3xl shadow-2xl shadow-slate-200/50 border-l border-t border-slate-50 overflow-hidden">{rows}</div>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      {renderHeader()}
      
      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 p-1 border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />
        
        {loading && (
          <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-sm flex items-center justify-center">
             <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronizando Agenda...</span>
             </div>
          </div>
        )}

        {renderDays()}
        {renderCells()}
      </div>

      {/* Slide-over de Detalhes do Dia */}
      {showDayDetail && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowDayDetail(false)} />
            <div className="relative w-full max-w-md bg-slate-50 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
               <div className="p-8 bg-white border-b border-slate-100 flex items-center justify-between">
                  <div>
                     <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{format(selectedDate, 'EEEE', { locale: ptBR })}</h2>
                     <p className="text-accent font-bold text-sm">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</p>
                  </div>
                  <button onClick={() => setShowDayDetail(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400"><X size={24} /></button>
               </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {professionals.length === 0 ? (
                    <div className="text-center py-20">
                       <User size={48} className="mx-auto text-slate-200 mb-4" />
                       <p className="text-slate-400 font-bold">Nenhum profissional habilitado.</p>
                    </div>
                  ) : (
                    professionals.map(pro => {
                      const proApps = appointments.filter(app => 
                        isSameDay(new Date(app.start_time), selectedDate) && app.professional_id === pro.id
                      ).sort((a,b) => new Date(a.start_time) - new Date(b.start_time));

                      return (
                        <div key={pro.id} className="space-y-4">
                           <div className="flex items-center gap-3 px-2">
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                 {pro.full_name.substring(0, 1)}
                              </div>
                              <h3 className="font-bold text-slate-800">{pro.full_name}</h3>
                              <span className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest">{proApps.length} {proApps.length === 1 ? 'Atendimento' : 'Atendimentos'}</span>
                           </div>

                           <div className="space-y-3">
                              {proApps.length === 0 ? (
                                <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sem agendamentos</p>
                                </div>
                              ) : (
                                proApps.map(app => (
                                  <div key={app.id} className={`card-base p-4 border-slate-100 transition-all group relative ${app.status === 'completed' ? 'bg-slate-50/50' : 'hover:border-accent/30 '}`}>
                                     <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                           <Clock size={12} className="text-slate-300" /> {format(new Date(app.start_time), 'HH:mm')} - {format(new Date(app.end_time), 'HH:mm')}
                                        </span>
                                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter ${
                                           app.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                           app.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                           app.status === 'in_progress' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                           'bg-slate-50 text-slate-400 border border-slate-100'
                                        }`}>
                                           {app.status === 'completed' ? 'Concluído' : app.status === 'cancelled' ? 'Cancelado' : app.status === 'in_progress' ? 'Em Atendimento' : 'Agendado'}
                                        </div>
                                     </div>
                                     <p className="text-sm font-bold text-slate-900 mb-1 uppercase">{app.cap_clients?.name}</p>
                                     
                                     {/* LISTA DE SERVIÇOS MULTIPLOS */}
                                     <div className="text-[11px] text-slate-500 space-y-1 mb-4">
                                        {app.cap_appointment_services?.length > 0 ? (
                                          app.cap_appointment_services.map(cas => (
                                            <p key={cas.id} className="flex items-center gap-1.5">
                                               <span className="w-1.5 h-1.5 rounded-full bg-accent" /> {cas.cap_services?.name}
                                            </p>
                                          ))
                                        ) : (
                                          <p className="flex items-center gap-1.5">
                                             <span className="w-1.5 h-1.5 rounded-full bg-accent" /> {app.cap_services?.name}
                                          </p>
                                        )}
                                     </div>

                                     <div className="flex flex-col gap-2 pt-3 border-t border-slate-100/50 mt-4">
                                         {(app.status === 'scheduled' || app.status === 'in_progress') && (
                                            <div className="flex items-center gap-2">
                                               <button 
                                                  onClick={() => handleUpdateStatus(app.id, 'completed')}
                                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-md hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
                                               >
                                                  <CheckCircle2 size={12} /> Finalizar
                                               </button>
                                               <button 
                                                  onClick={() => handleUpdateStatus(app.id, 'cancelled')}
                                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-bold uppercase rounded-md hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
                                               >
                                                  <AlertCircle size={12} /> Cancelar
                                               </button>
                                               <button 
                                                  onClick={() => {
                                                    setEditingAppointment(app);
                                                    setIsModalOpen(true);
                                                  }}
                                                  className="p-1.5 bg-slate-50 text-slate-400 hover:text-accent hover:bg-accent/5 rounded-md transition-all border border-slate-100"
                                                  title="Reagendar"
                                               >
                                                  <CalendarDays size={14} />
                                               </button>
                                            </div>
                                         )}
                                         
                                         <button 
                                            onClick={() => handleOpenDetailModal(app)}
                                            className="flex w-full items-center justify-center py-2 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase rounded-md hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 mb-1"
                                         >
                                            DETALHES
                                         </button>

                                         {app.status === 'completed' && (
                                            <div className="pt-1 space-y-2">
                                               <p className="text-[9px] text-emerald-500 font-bold flex items-center gap-1">
                                                  <CheckCircle2 size={10} /> Baixa de estoque realizada
                                               </p>
                                               <button 
                                                  onClick={() => handleUpdateStatus(app.id, 'scheduled')}
                                                  className="w-full py-1.5 bg-slate-100 text-slate-600 text-[9px] font-black uppercase rounded-md hover:bg-slate-200 transition-all border border-slate-200 flex items-center justify-center gap-2"
                                               >
                                                  <Plus size={12} className="rotate-45" /> Reabrir Atendimento
                                               </button>
                                            </div>
                                         )}
                                       </div>
                                  </div>
                                ))
                              )}
                           </div>
                        </div>
                      );
                    })
                  )}

                  <div className="pt-8 border-t border-slate-50">
                     <button 
                       onClick={() => setIsModalOpen(true)}
                       className="w-full btn-accent py-3 flex items-center justify-center gap-3 shadow-lg shadow-accent/10"
                     >
                        <Plus size={20} /> Novo Agendamento para {format(selectedDate, 'dd/MM')}
                     </button>
                  </div>
               </div>
            </div>
        </div>
      )}

      {/* POPUP DE DETALHAMENTO EXPRESSO */}
      {selectedAppointmentDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedAppointmentDetail(null)} />
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
              
              <div className="bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between">
                 <div>
                    <h3 className="text-xl font-black text-white">{selectedAppointmentDetail.cap_clients?.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Visão Detalhada</p>
                      {selectedAppointmentDetail.status === 'completed' && (
                        <button 
                          onClick={() => {
                            handleUpdateStatus(selectedAppointmentDetail.id, 'scheduled');
                            setSelectedAppointmentDetail(null);
                          }}
                          className="px-3 py-1 bg-rose-500/20 text-rose-300 text-[9px] font-black uppercase rounded-lg border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-1"
                        >
                          <Plus size={10} className="rotate-45" /> Estornar Finalização
                        </button>
                      )}
                    </div>
                 </div>
                 <button onClick={() => setSelectedAppointmentDetail(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                    <X size={20} />
                 </button>
              </div>

              <div className="p-6 overflow-y-auto bg-slate-100 space-y-8">
                 
                 {/* GRUPO 1: SOBRE O AGENDAMENTO */}
                 <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
                    <h4 className="text-[10px] font-black text-accent uppercase tracking-widest mb-4 flex items-center gap-2">
                       Sobre o Agendamento
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Data & Hora</p>
                          <p className="text-sm font-bold text-slate-800">{format(new Date(selectedAppointmentDetail.start_time), "dd/MM/yyyy 'às' HH:mm")}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Profissional</p>
                          <p className="text-sm font-bold text-slate-800">{selectedAppointmentDetail.cap_profiles?.full_name}</p>
                       </div>
                       <div className="col-span-2">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Procedimento a ser feito</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                             {selectedAppointmentDetail.cap_appointment_services?.length > 0 ? (
                                selectedAppointmentDetail.cap_appointment_services.map(cas => (
                                   <span key={cas.id} className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700">{cas.cap_services?.name}</span>
                                ))
                             ) : (
                                <span className="bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700">{selectedAppointmentDetail.cap_services?.name}</span>
                             )}
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* GRUPO 2: SOBRE O CLIENTE */}
                 <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                       <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                          Sobre o Cliente
                       </h4>
                       <div className="mt-4">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Data de Nascimento</p>
                          <p className="text-sm font-bold text-slate-800">
                             {selectedAppointmentDetail.cap_clients?.birth_date 
                               ? format(new Date(selectedAppointmentDetail.cap_clients.birth_date + 'T12:00:00'), 'dd/MM/yyyy') 
                               : 'Não informada'}
                          </p>
                       </div>
                    </div>

                    <div className="p-5">
                       {loadingNotes ? (
                          <div className="py-8 flex justify-center"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>
                       ) : (
                          <div className="space-y-6">
                             
                             {/* SUB TÓPICO PROCEDIMENTOS REALIZADOS */}
                             <div>
                                <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Procedimentos Já Realizados</h5>
                                {pastAppointments.length === 0 ? (
                                   <p className="text-xs text-slate-400 font-medium">Nenhum procedimento concluído anteriormente.</p>
                                ) : (
                                   <div className="space-y-3">
                                      {pastAppointments.map(app => (
                                         <div key={app.id} className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-slate-500">{format(new Date(app.start_time), "dd/MM/yyyy")}</span>
                                            <div className="flex flex-wrap gap-1">
                                               {app.cap_appointment_services?.length > 0 ? (
                                                  app.cap_appointment_services.map(cas => (
                                                     <span key={cas.id} className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{cas.cap_services?.name}</span>
                                                  ))
                                               ) : (
                                                  <span className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{app.cap_services?.name}</span>
                                               )}
                                            </div>
                                         </div>
                                      ))}
                                   </div>
                                )}
                             </div>

                             {/* SUB TÓPICO COMENTÁRIOS / CRM */}
                             <div>
                                <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Comentários (CRM)</h5>
                                {appointmentNotes.length === 0 ? (
                                   <p className="text-xs text-slate-400 font-medium">Nenhuma anotação manual registrada.</p>
                                ) : (
                                   <div className="space-y-3">
                                      {appointmentNotes.map(note => (
                                         <div key={note.id} className="bg-slate-50 border border-slate-100 p-3 rounded-lg">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{note.cap_profiles?.full_name || 'Sistema'}</span>
                                                <span className="text-[9px] font-bold text-slate-400">{format(new Date(note.created_at), "dd/MM/yy")}</span>
                                            </div>
                                            {note.content && <p className="text-xs text-slate-700 leading-relaxed mb-2">{note.content}</p>}
                                            {note.image_path && (
                                               <img src={note.image_path} alt="Anexo do CRM" className="w-20 h-20 object-cover rounded-lg border border-slate-200 mt-2 hover:w-full hover:h-48 transition-all duration-300" />
                                            )}
                                         </div>
                                      ))}
                                   </div>
                                )}
                             </div>

                          </div>
                       )}
                    </div>
                 </div>
                 
              </div>
           </div>
        </div>
      )}

      <NewAppointmentModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingAppointment(null);
        }} 
        initialDate={selectedDate}
        editAppointment={editingAppointment}
        onSuccess={() => {
          fetchAppointments();
          setIsModalOpen(false);
          setEditingAppointment(null);
        }}
      />
    </div>
  );
};

export default Agenda;
