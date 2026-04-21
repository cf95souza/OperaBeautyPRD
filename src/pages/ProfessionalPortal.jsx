import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Clock, 
  User, 
  CheckCircle2, 
  Play, 
  History, 
  LogOut, 
  Scissors,
  Calendar,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
  X,
  Camera,
  Image as ImageIcon,
  Check,
  Plus,
  UserCircle,
  Package
} from 'lucide-react';
import { format, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NavLink } from 'react-router-dom';
import { useNotification } from '../context/NotificationProvider';

const ProfessionalPortal = ({ profile, onLogout }) => {
  const { showSuccess, showError } = useNotification();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  
  // Date Swipe
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Prontuário VIP
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [clientNotes, setClientNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  
  // CRM Form
  const [newNote, setNewNote] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const fileInputRef = useRef(null);
  const carouselRef = useRef(null);

  const datesList = useMemo(() => {
    const dates = [];
    for(let i = -7; i <= 30; i++) {
        dates.push(addDays(new Date(), i));
    }
    return dates;
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-scroll the date carousel on mount/date change
    setTimeout(() => {
      if (carouselRef.current) {
        const activeBtn = carouselRef.current.querySelector('.active-date-btn');
        if (activeBtn) {
          activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      }
    }, 100);
  }, [selectedDate, profile]); // Re-fetch on date or profile change

  const fetchData = async () => {
    setLoading(true);
    const userId = profile?.id || profile?.user_id;
    if (!userId) {
      setLoading(false);
      return;
    }

    // Normalização de Datas para UTC (Início e Fim do Dia Selecionado)
    const startOfDayStr = new Date(selectedDate);
    startOfDayStr.setHours(0,0,0,0);
    const endOfDayStr = new Date(selectedDate);
    endOfDayStr.setHours(23,59,59,999);

    const { data: apps, error } = await supabase
      .from('cap_appointments')
      .select(`
        *,
        cap_clients (id, name, phone, birth_date),
        cap_appointment_services (
          price_at_time,
          cap_services (name)
        ),
        cap_services (name)
      `)
      .eq('professional_id', userId)
      .gte('start_time', startOfDayStr.toISOString())
      .lte('start_time', endOfDayStr.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error("Erro ao buscar agenda:", error);
      showError('Erro ao carregar agenda');
    } else {
      setAppointments(apps || []);
    }
    setLoading(false);
  };

  const handleOpenProntuario = async (app) => {
    setSelectedAppointment(app);
    setNewNote('');
    setSelectedFile(null);
    setLoadingNotes(true);
    
    const { data } = await supabase
      .from('cap_timeline_notes')
      .select('*, cap_profiles(full_name)')
      .eq('client_id', app.client_id)
      .order('created_at', { ascending: false });
      
    setClientNotes(data || []);
    setLoadingNotes(false);
  };

  const submitProntuarioNote = async () => {
    if (!newNote.trim() && !selectedFile) return;
    setIsSubmittingNote(true);
    
    let publicImageUrl = null;

    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${selectedAppointment.client_id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-media')
        .upload(filePath, selectedFile);
        
      if (uploadError) {
        showError('Erro ao enviar foto: ' + uploadError.message);
        setIsSubmittingNote(false);
        return;
      }
      
      const { data } = supabase.storage.from('client-media').getPublicUrl(filePath);
      publicImageUrl = data.publicUrl;
    }

    const { error } = await supabase
      .from('cap_timeline_notes')
      .insert([{
        client_id: selectedAppointment.client_id,
        professional_id: profile.id,
        appointment_id: selectedAppointment.id,
        content: newNote.trim(),
        image_path: publicImageUrl,
        type: 'comment'
      }]);

    if (!error) {
      setNewNote('');
      setSelectedFile(null);
      // Recarrega notas
      const { data } = await supabase
        .from('cap_timeline_notes')
        .select('*, cap_profiles(full_name)')
        .eq('client_id', selectedAppointment.client_id)
        .order('created_at', { ascending: false });
      setClientNotes(data || []);
      showSuccess('Anotação salva com sucesso!');
    } else {
      showError('Erro ao salvar anotação: ' + error.message);
    }
    
    setIsSubmittingNote(false);
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    setUpdatingId(appointmentId);
    const { error } = await supabase
      .from('cap_appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId);

    if (error) {
      showError('Erro ao atualizar status: ' + error.message);
    } else {
      showSuccess(`Status atualizado para: ${newStatus === 'completed' ? 'Concluído' : newStatus === 'in_progress' ? 'Em Atendimento' : 'Agendado'}`);
      await fetchData();
      if (selectedAppointment && selectedAppointment.id === appointmentId) {
        setSelectedAppointment(prev => ({ ...prev, status: newStatus }));
      }
    }
    setUpdatingId(null);
  };

  const handleLogoutLocal = async () => {
    if (onLogout) await onLogout();
  };

  return (
    <div className="max-w-lg mx-auto pb-24">
      <main className="w-full">
        {/* Carrossel de Datas */}
        <div className="bg-white border-b border-slate-100 py-4 px-6 shadow-sm mb-6 sticky top-0 z-30">
           <div className="flex justify-between items-end mb-4">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                {format(selectedDate, "MMM, yyyy", { locale: ptBR })}
              </h3>
              {isSameDay(selectedDate, new Date()) && <span className="bg-accent/10 border border-accent/20 text-accent px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Hoje</span>}
           </div>
           <div ref={carouselRef} className="flex gap-2.5 overflow-x-auto pb-4 snap-x hide-scrollbar scroll-smooth">
              {datesList.map(dt => {
                 const isSelected = isSameDay(dt, selectedDate);
                 return (
                   <button 
                     key={dt.toISOString()} 
                     onClick={() => setSelectedDate(dt)} 
                     className={`shrink-0 w-16 h-20 rounded-[1.5rem] flex flex-col items-center justify-center transition-all snap-center border-2 ${isSelected ? 'active-date-btn' : ''} ${
                       isSelected 
                         ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' 
                         : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'
                     }`}
                   >
                     <span className="text-[9px] font-black uppercase tracking-widest leading-none mb-1.5 opacity-80">{format(dt, 'EEE', {locale: ptBR})}</span>
                     <span className="text-2xl font-black leading-none tracking-tighter">{format(dt, 'dd')}</span>
                   </button>
                 )
              })}
           </div>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="py-24 flex justify-center"><Loader2 className="animate-spin text-slate-300" size={32} /></div>
          ) : appointments.length === 0 ? (
            <div className="py-16 text-center space-y-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
              <Calendar size={40} className="mx-auto text-slate-200" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Não há clientes na data</p>
            </div>
          ) : (
            appointments.map((app, index) => (
              <div 
                key={app.id} 
                style={{ animationDelay: `${index * 50}ms` }}
                className={`bg-white rounded-[2rem] border transition-all animate-in slide-in-from-bottom-8 fill-mode-both relative overflow-hidden ${
                  app.status === 'completed' ? 'border-emerald-100 opacity-70 grayscale-[0.3]' : 
                  app.status === 'in_progress' ? 'border-accent/30 shadow-lg shadow-accent/5 ring-4 ring-accent/5' : 
                  'border-slate-100 shadow-sm'
                }`}
              >
                {app.status === 'in_progress' && <div className="absolute top-0 inset-x-0 h-1 bg-accent animate-pulse" />}
                
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center text-center w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl">
                      <span className="text-lg font-black text-slate-900 tracking-tighter leading-none">{format(new Date(app.start_time), 'HH:mm')}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                          app.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                          app.status === 'in_progress' ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' : 
                          'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                           {app.status === 'completed' ? 'Concluído' : app.status === 'in_progress' ? 'Em Atendimento' : 'Próximo'}
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-tight">{app.cap_clients?.name.split(' ')[0]}</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {app.cap_appointment_services?.length > 0 
                          ? app.cap_appointment_services.map((cas, i) => (
                              <span key={i} className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{cas.cap_services?.name}</span>
                            ))
                          : app.cap_services && <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{app.cap_services.name}</span>
                        }
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleOpenProntuario(app)}
                    className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Modal / Tela de Prontuário VIP */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 animate-in slide-in-from-bottom duration-300">
          <header className="bg-white border-b border-slate-100 p-5 flex items-center justify-between sticky top-0 z-10 shrink-0">
             <div className="flex items-center gap-4">
                <button onClick={() => setSelectedAppointment(null)} className="w-10 h-10 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 bg-white shadow-sm active:scale-95"><ChevronLeft size={20} /></button>
                <div>
                   <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">{selectedAppointment.cap_clients?.name}</h2>
                   <p className="text-[10px] font-black uppercase text-slate-400 mt-1.5 tracking-widest leading-normal">
                     {format(new Date(selectedAppointment.start_time), 'HH:mm')} • {
                       selectedAppointment.cap_appointment_services?.length > 0 
                         ? selectedAppointment.cap_appointment_services.map(s => s.cap_services?.name).join(', ')
                         : selectedAppointment.cap_services?.name || 'Procedimento'
                     }
                   </p>
                   {selectedAppointment.cap_clients?.birth_date && (
                      <div className="inline-flex mt-2 px-2 py-1 bg-accent/10 border border-accent/20 rounded-md">
                        <p className="text-[9px] font-black text-accent uppercase tracking-widest leading-none">Nascimento: {format(new Date(selectedAppointment.cap_clients.birth_date + 'T12:00:00'), 'dd/MM/yyyy')}</p>
                      </div>
                    )}
                 </div>
              </div>
              <button 
                onClick={() => setSelectedAppointment(null)}
                className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
           </header>

           <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Botões de Ação de Status */}
              <div className="flex gap-3">
              {selectedAppointment.status === 'scheduled' && (
                <button 
                   onClick={() => handleStatusChange(selectedAppointment.id, 'in_progress')}
                   disabled={updatingId}
                   className="flex-1 bg-slate-900 text-white py-3.5 rounded-xl font-black shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 uppercase tracking-tight text-[11px] active:scale-95 transition-transform disabled:opacity-50"
                >
                  {updatingId ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} fill="currentColor" />} Iniciar Atendimento
                </button>
              )}
              {selectedAppointment.status === 'in_progress' && (
                <button 
                  onClick={() => handleStatusChange(selectedAppointment.id, 'completed')}
                  disabled={updatingId}
                  className="flex-1 bg-accent text-white py-3.5 rounded-xl font-black shadow-lg shadow-accent/20 flex items-center justify-center gap-2 uppercase tracking-tight text-[11px] active:scale-95 transition-transform disabled:opacity-50"
                >
                  {updatingId ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={18} />} Finalizar Atendimento
                </button>
              )}
              {selectedAppointment.status === 'completed' && (
                <button 
                  onClick={() => handleStatusChange(selectedAppointment.id, 'scheduled')}
                  disabled={updatingId}
                  className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-black border border-slate-200 flex items-center justify-center gap-2 uppercase tracking-tight text-[11px] active:scale-95 transition-transform disabled:opacity-50"
                >
                  {updatingId ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} className="rotate-45" />} Reabrir Atendimento
                </button>
              )}
            </div>

            <div className="space-y-4">
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest pl-2">Adicionar Notas & Fotos</h3>
               <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
                  <textarea 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Escreva detalhes técnicos do procedimento..."
                    className="w-full text-sm font-medium text-slate-700 bg-transparent border-none outline-none resize-none h-20 placeholder:text-slate-300"
                  />
                  
                  {/* Image Preview Area */}
                  {selectedFile && (
                    <div className="relative mb-4 inline-block">
                      <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="h-20 w-20 object-cover rounded-2xl border-2 border-slate-100 shadow-sm" />
                      <button onClick={() => setSelectedFile(null)} className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-1 shadow-md"><X size={12} /></button>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                     <div className="flex gap-2">
                        <input 
                           type="file" 
                           accept="image/*" 
                           className="hidden" 
                           ref={fileInputRef} 
                           onChange={(e) => {
                             if(e.target.files && e.target.files.length > 0) {
                               setSelectedFile(e.target.files[0]);
                             }
                           }}
                        />
                        <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-100 transition-colors">
                           <Camera size={18} />
                        </button>
                     </div>
                     <button 
                       onClick={submitProntuarioNote}
                       disabled={isSubmittingNote || (!newNote.trim() && !selectedFile)}
                       className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
                     >
                       {isSubmittingNote ? <><Loader2 className="animate-spin" size={14} /> Enviando...</> : <><Check size={14} /> Salvar Tudo</>}
                     </button>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest pl-2">Histórico Resumido</h3>
              <div className="space-y-4">
                {loadingNotes ? (
                  <div className="py-8 text-center text-slate-300"><Loader2 className="animate-spin mx-auto mb-2" /><p className="text-[10px] font-black uppercase tracking-widest">Buscando...</p></div>
                ) : clientNotes.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-[2rem] border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sem registros anteriores</p></div>
                ) : (
                  clientNotes.map((note) => (
                    <div key={note.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-slate-900 text-white rounded flex items-center justify-center text-[10px] font-black">
                            {note.cap_profiles?.full_name?.[0]}
                          </div>
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{note.cap_profiles?.full_name}</span>
                        </div>
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest bg-slate-50 px-2 py-1 rounded">{format(new Date(note.created_at), 'dd MMM, yy', { locale: ptBR })}</span>
                      </div>
                      
                      {note.content && <p className="text-sm font-medium text-slate-600 leading-relaxed">{note.content}</p>}
                      
                      {note.image_path && (
                        <div className="mt-4">
                           <img src={note.image_path} alt="Registro Técnico" className="w-full h-40 object-cover rounded-xl border border-slate-100" />
                        </div>
                      )}
                    </div>
                  ))
                )}
             </div>
           </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default ProfessionalPortal;
