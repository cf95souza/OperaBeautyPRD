import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  X, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  ChevronRight, 
  CheckCircle2, 
  Loader2,
  UserCheck,
  Check,
  MessageCircle,
  ChevronLeft,
  ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { format, addMinutes, parse, isBefore, isAfter, startOfDay, endOfDay, addDays } from 'date-fns';

const NewAppointmentModal = ({ isOpen, onClose, initialDate, editAppointment, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [successState, setSuccessState] = useState(null);
  
  // Data State
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]); // ARRAY PARA MULTI-SERVIÇOS
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
      if (editAppointment) {
        setSelectedClient(editAppointment.cap_clients);
        // Carrega serviços múltiplos do agendamento
        if (editAppointment.cap_appointment_services && editAppointment.cap_appointment_services.length > 0) {
          setSelectedServices(editAppointment.cap_appointment_services.map(cas => cas.cap_services));
        } else if (editAppointment.cap_services) {
          setSelectedServices([editAppointment.cap_services]);
        }
        setSelectedProfessional(editAppointment.cap_profiles || { id: editAppointment.professional_id, full_name: 'Profissional' });
        setSelectedDate(new Date(editAppointment.start_time));
        setStep(1);
      } else {
        setSelectedServices([]);
        setSelectedClient(null);
        setSelectedProfessional(null);
        setSelectedSlot(null);
        setSelectedDate(initialDate || new Date());
        setStep(1);
      }
    }
  }, [isOpen]);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: cls } = await supabase.from('cap_clients').select('*').order('name');
    const { data: srvs } = await supabase.from('cap_services').select('*').eq('is_active', true).order('name');
    const { data: pros } = await supabase.from('cap_profiles').select('*').eq('role', 'professional').eq('is_active', true).order('full_name');
    
    setClients(cls || []);
    setServices(srvs || []);
    setProfessionals(pros || []);
    setLoading(false);
  };

  const calculateSlots = async (date, proId, servicesList) => {
    if (!date || !proId || !servicesList || servicesList.length === 0) return;
    setLoading(true);
    
    // Calcula duração total do combo
    const totalDuration = servicesList.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);

    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const { data: blocked } = await supabase.from('cap_blocked_dates').select('*').eq('blocked_date', formattedDate).maybeSingle();
      const { data: hours } = await supabase.from('cap_business_hours').select('*').eq('day_of_week', date.getDay()).maybeSingle();

      if (blocked || !hours || hours.is_closed) {
        setAvailableSlots([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('cap_appointments')
        .select('id, start_time, end_time')
        .eq('professional_id', proId)
        .eq('status', 'scheduled')
        .gte('start_time', startOfDay(date).toISOString())
        .lte('start_time', endOfDay(date).toISOString());
      
      if (editAppointment) {
        query = query.neq('id', editAppointment.id);
      }

      const { data: apps } = await query;
      const openTime = parse(hours.open_time, 'HH:mm:ss', date);
      const closeTime = parse(hours.close_time, 'HH:mm:ss', date);
      
      const candidates = [];
      let current = openTime;

      while (isBefore(addMinutes(current, totalDuration), closeTime) || current.getTime() + (totalDuration * 60000) === closeTime.getTime()) {
        const slotStart = current;
        const slotEnd = addMinutes(current, totalDuration);
        const overlap = apps?.some(app => {
          const appStart = new Date(app.start_time);
          const appEnd = new Date(app.end_time);
          return (isBefore(slotStart, appEnd) && isAfter(slotEnd, appStart));
        });

        if (!overlap) {
          const now = new Date();
          const isTodayCheck = format(now, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
          
          if (isTodayCheck) {
             const minTime = addMinutes(now, 15);
             if (isAfter(slotStart, minTime)) candidates.push(slotStart);
          } else {
             candidates.push(slotStart);
          }
        }
        current = addMinutes(current, 30);
      }
      setAvailableSlots(candidates);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const toggleService = (service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) return prev.filter(s => s.id !== service.id);
      return [...prev, service];
    });
  };

  const handleNextStep = () => {
    if (selectedClient && selectedServices.length > 0 && selectedProfessional) {
      setSelectedSlot(null);
      calculateSlots(selectedDate, selectedProfessional.id, selectedServices);
      setStep(2);
    }
  };

  const handleSave = async () => {
    if (!selectedSlot || selectedServices.length === 0) return;
    setLoading(true);

    const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration_minutes, 0);
    const totalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);
    const startTime = selectedSlot;
    const endTime = addMinutes(selectedSlot, totalDuration);

    try {
      let appointmentId;

      if (editAppointment) {
        const { error: appError } = await supabase
          .from('cap_appointments')
          .update({
            professional_id: selectedProfessional.id,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            total_price: totalPrice,
            status: 'scheduled'
          })
          .eq('id', editAppointment.id);

        if (appError) throw appError;
        appointmentId = editAppointment.id;
        await supabase.from('cap_appointment_services').delete().eq('appointment_id', appointmentId);
      } else {
        const { data: newApp, error: appError } = await supabase
          .from('cap_appointments')
          .insert([{
            client_id: selectedClient.id,
            professional_id: selectedProfessional.id,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            total_price: totalPrice,
            status: 'scheduled'
          }])
          .select()
          .single();

        if (appError) throw appError;
        appointmentId = newApp.id;
      }

      const servicesToInsert = selectedServices.map(s => ({
        appointment_id: appointmentId,
        service_id: s.id,
        price_at_time: s.price,
        duration_at_time: s.duration_minutes
      }));

      await supabase.from('cap_appointment_services').insert(servicesToInsert);

      setSuccessState({ client: selectedClient, services: selectedServices, professional: selectedProfessional, time: selectedSlot, totalPrice });
      onSuccess?.();
    } catch (err) {
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsApp = () => {
    const list = successState.services.map(s => s.name).join(', ');
    const msg = `Olá! 👑 Agendamento confirmado no Capelli:\n\n📅 Data: ${format(successState.time, 'dd/MM/yyyy')}\n⏰ Hora: ${format(successState.time, 'HH:mm')}\n✨ Procedimentos: ${list}\n💰 Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(successState.totalPrice)}`;
    window.open(`https://wa.me/55${successState.client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 text-left">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[650px] animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 text-accent rounded-lg"><Calendar size={20} /></div>
              <h3 className="text-lg font-bold text-slate-900">{editAppointment ? 'Reagendar Atendimento' : 'Novo Agendamento'}</h3>
           </div>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-900"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {successState ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
               <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center"><CheckCircle2 size={40} /></div>
               <h3 className="text-2xl font-bold text-slate-900">Agendamento Realizado!</h3>
               <div className="bg-slate-50 p-6 rounded-2xl w-full space-y-3">
                  <div className="flex justify-between text-xs"><span>Cliente</span><span className="font-bold uppercase">{successState.client.name}</span></div>
                  <div className="flex justify-between text-xs"><span>Procedimentos</span><span className="font-bold">{successState.services.map(s => s.name).join(', ')}</span></div>
                  <div className="flex justify-between text-xs"><span>Hora</span><span className="font-bold">{format(successState.time, 'HH:mm')}</span></div>
                  <div className="flex justify-between text-xs border-t pt-3"><span>Total</span><span className="text-accent font-bold text-lg">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(successState.totalPrice)}</span></div>
               </div>
               <button onClick={sendWhatsApp} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"><MessageCircle size={20} /> WhatsApp</button>
               <button onClick={onClose} className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fechar</button>
            </div>
          ) : step === 1 ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">1. Selecionar Cliente</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder="Buscar cliente..." className="input-base !pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  {searchTerm && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-100 mt-1 rounded-lg shadow-xl z-20 max-h-32 overflow-y-auto">
                      {clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                        <div key={c.id} className="p-3 hover:bg-slate-50 cursor-pointer text-sm uppercase" onClick={() => { setSelectedClient(c); setSearchTerm(''); }}>{c.name}</div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedClient && <div className="p-3 bg-accent/5 rounded-lg border border-accent/10 font-bold text-sm text-slate-900 flex justify-between"><span className="uppercase">{selectedClient.name}</span><Check size={16} className="text-accent" /></div>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">2. Selecionar Procedimentos (Combos)</label>
                <div className="grid grid-cols-2 gap-3">
                  {services.map(s => {
                    const isSelected = selectedServices.find(x => x.id === s.id);
                    return (
                      <button key={s.id} onClick={() => toggleService(s)} className={`p-3 text-left rounded-lg border text-sm transition-all relative ${isSelected ? 'border-accent bg-accent/5 ring-1 ring-accent/20 font-bold' : 'border-slate-100'}`}>
                        {isSelected && <div className="absolute top-1 right-1"><CheckCircle2 size={12} className="text-accent" /></div>}
                        <p className="text-slate-900">{s.name}</p>
                        <p className="text-[10px] text-slate-500">{s.duration_minutes} min</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">3. Profissional</label>
                 <div className="flex gap-3 overflow-x-auto pb-2">
                    {professionals.map(pro => (
                      <button key={pro.id} onClick={() => setSelectedProfessional(pro)} className={`flex flex-col items-center p-3 min-w-[100px] rounded-xl border transition-all ${selectedProfessional?.id === pro.id ? 'border-accent bg-accent/5' : 'border-slate-100'}`}>
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${selectedProfessional?.id === pro.id ? 'bg-accent text-white' : 'bg-slate-100 text-slate-400'}`}>{pro.full_name[0]}</div>
                         <span className="text-[10px] font-bold mt-1">{pro.full_name.split(' ')[0]}</span>
                      </button>
                    ))}
                 </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-center">
               <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between">
                  <button onClick={() => { const d = addDays(selectedDate, -1); setSelectedDate(d); calculateSlots(d, selectedProfessional.id, selectedServices); }} className="p-2 hover:bg-white rounded-lg"><ChevronLeft size={20}/></button>
                  <p className="font-bold text-accent">{format(selectedDate, 'dd/MM')}</p>
                  <button onClick={() => { const d = addDays(selectedDate, 1); setSelectedDate(d); calculateSlots(d, selectedProfessional.id, selectedServices); }} className="p-2 hover:bg-white rounded-lg"><ChevronRight size={20}/></button>
               </div>
               <div className="bg-accent/5 p-3 rounded-lg text-[10px] font-bold text-accent uppercase tracking-widest">
                  {selectedServices.length} Procedimentos • {selectedServices.reduce((acc,s)=>acc+s.duration_minutes,0)} min total
               </div>
               <div className="grid grid-cols-4 gap-2">
                  {loading ? <div className="col-span-4 py-10"><Loader2 className="animate-spin mx-auto text-accent"/></div> : availableSlots.length === 0 ? <p className="col-span-4 py-10 text-xs text-slate-400 font-bold uppercase tracking-widest">Sem horários para este combo</p> : availableSlots.map(slot => (
                    <button key={slot.toISOString()} onClick={() => setSelectedSlot(slot)} className={`py-2 px-1 rounded-lg border text-xs font-bold transition-all ${selectedSlot?.getTime() === slot.getTime() ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20 scale-105' : 'bg-white text-slate-600 border-slate-100 hover:border-accent/30'}`}>{format(slot, 'HH:mm')}</button>
                  ))}
               </div>
            </div>
          )}
        </div>

        {!successState && (
          <div className="p-6 border-t border-slate-100 flex gap-4">
             <button onClick={onClose} className="flex-1 py-3 text-slate-400 text-sm font-bold uppercase tracking-widest border border-slate-100 rounded-xl">Cancelar</button>
             {step === 1 ? (
               <button disabled={!selectedClient || selectedServices.length === 0 || !selectedProfessional} onClick={handleNextStep} className="flex-2 py-3 bg-slate-900 text-white rounded-xl font-bold px-8 flex items-center gap-2">Escolher Horário <ChevronRight size={16}/></button>
             ) : (
               <button disabled={!selectedSlot} onClick={handleSave} className="flex-2 py-3 bg-accent text-white rounded-xl font-bold px-8 shadow-lg shadow-accent/20">Finalizar Agendamento</button>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewAppointmentModal;
