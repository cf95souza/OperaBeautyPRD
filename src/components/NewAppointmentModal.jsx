import React, { useState, useEffect } from 'react';
import { 
  X, Search, Calendar, Clock, User, ChevronRight, CheckCircle2, Loader2,
  UserCheck, Check, MessageCircle, ChevronLeft
} from 'lucide-react';
import { format, addMinutes, parse, isBefore, isAfter, startOfDay, endOfDay, addDays } from 'date-fns';
import { useNotification } from '../context/NotificationProvider';
import { api } from '../lib/api';

const NewAppointmentModal = ({ isOpen, onClose, initialDate, editAppointment, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [successState, setSuccessState] = useState(null);
  const { showSuccess, showError } = useNotification();
  
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
      if (editAppointment) {
        setSelectedClient(editAppointment.cap_clients || { id: editAppointment.client_id, name: 'Cliente' });
        setSelectedService(editAppointment.cap_services || { id: editAppointment.service_id, name: 'Serviço', duration_minutes: 0, price: 0 });
        setSelectedProfessional(editAppointment.cap_profiles || { id: editAppointment.professional_id, full_name: 'Profissional' });
        setSelectedDate(new Date(editAppointment.start_time));
        setStep(1);
      } else {
        setSelectedService(null);
        setSelectedClient(null);
        setSelectedProfessional(null);
        setSelectedSlot(null);
        setSelectedDate(initialDate || new Date());
        setStep(1);
        setSuccessState(null);
      }
    }
  }, [isOpen]);

  const fetchInitialData = async () => {
    setLoading(true);
    const user = JSON.parse(localStorage.getItem('operabeauty_user') || '{}');
    const tenantId = user.tenant_id;
    try {
      const cls = await api.clients.list(tenantId);
      const srvs = await api.services.list(tenantId);
      const pros = await api.staff.list(tenantId);
      
      setClients(cls || []);
      setServices(srvs || []);
      setProfessionals(pros.filter(p => p.role === 'professional') || []);
    } catch (e) {
      console.error(e);
      showError('Erro ao carregar dados iniciais');
    }
    setLoading(false);
  };

  const calculateSlots = async (date, proId, service) => {
    if (!date || !proId || !service) return;
    setLoading(true);
    const user = JSON.parse(localStorage.getItem('operabeauty_user') || '{}');
    const tenantId = user.tenant_id;
    const totalDuration = service.duration_minutes || 0;

    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      const [allExceptions, allHours, allApps] = await Promise.all([
        api.settings.getExceptions(tenantId),
        api.settings.getBusinessHours(tenantId),
        api.appointments.list({ start_date: formattedDate, end_date: formattedDate, staff_id: proId, tenant_id: tenantId })
      ]);

      const exception = allExceptions.find(e => e.exception_date.startsWith(formattedDate));
      const defaultHours = allHours.find(h => h.day_of_week === date.getDay());

      let hours = null;
      if (exception) {
        if (exception.is_closed) {
          setAvailableSlots([]);
          setLoading(false);
          return;
        }
        hours = { open_time: exception.open_time, close_time: exception.close_time };
      } else if (defaultHours && !defaultHours.is_closed) {
        hours = defaultHours;
      } else {
        setAvailableSlots([]);
        setLoading(false);
        return;
      }

      let apps = allApps.filter(app => app.status === 'scheduled');
      if (editAppointment) {
        apps = apps.filter(app => app.id !== editAppointment.id);
      }

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

  const handleNextStep = () => {
    if (selectedClient && selectedService && selectedProfessional) {
      setSelectedSlot(null);
      calculateSlots(selectedDate, selectedProfessional.id, selectedService);
      setStep(2);
    }
  };

  const handleSave = async () => {
    if (!selectedSlot || !selectedService) return;
    setLoading(true);

    const user = JSON.parse(localStorage.getItem('operabeauty_user') || '{}');
    const tenantId = user.tenant_id;

    const totalPrice = selectedService.price;
    const startTime = selectedSlot;

    try {
      if (editAppointment) {
         await api.appointments.update(editAppointment.id, {
            staff_id: selectedProfessional.id,
            service_id: selectedService.id,
            start_time: startTime.toISOString(),
            total_price: totalPrice,
            status: 'scheduled'
         });
      } else {
         await api.appointments.create({
            client_id: selectedClient.id,
            staff_id: selectedProfessional.id,
            service_id: selectedService.id,
            start_time: startTime.toISOString(),
            total_price: totalPrice
         });
      }

      setSuccessState({ client: selectedClient, service: selectedService, professional: selectedProfessional, time: selectedSlot, totalPrice });
      onSuccess?.();
    } catch (err) {
      showError('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsApp = () => {
    const msg = `Olá! 👑 Agendamento confirmado no OperaBeauty:\n\n📅 Data: ${format(successState.time, 'dd/MM/yyyy')}\n⏰ Hora: ${format(successState.time, 'HH:mm')}\n✨ Procedimento: ${successState.service.name}\n💰 Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(successState.totalPrice)}`;
    window.open(`https://wa.me/55${successState.client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 text-left">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[672px] overflow-hidden flex flex-col h-[650px] animate-in zoom-in-95 duration-200">
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
                  <div className="flex justify-between text-xs"><span>Procedimento</span><span className="font-bold">{successState.service.name}</span></div>
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
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">2. Selecionar Procedimento</label>
                <div className="grid grid-cols-2 gap-3">
                  {services.map(s => {
                    const isSelected = selectedService?.id === s.id;
                    return (
                      <button key={s.id} onClick={() => setSelectedService(s)} className={`p-3 text-left rounded-lg border text-sm transition-all relative ${isSelected ? 'border-accent bg-accent/5 ring-1 ring-accent/20 font-bold' : 'border-slate-100'}`}>
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
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${selectedProfessional?.id === pro.id ? 'bg-accent text-white' : 'bg-slate-100 text-slate-400'}`}>{pro.name ? pro.name[0] : 'P'}</div>
                         <span className="text-[10px] font-bold mt-1">{pro.name ? pro.name.split(' ')[0] : 'Profissional'}</span>
                      </button>
                    ))}
                 </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-center">
               <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between">
                  <button onClick={() => { const d = addDays(selectedDate, -1); setSelectedDate(d); calculateSlots(d, selectedProfessional.id, selectedService); }} className="p-2 hover:bg-white rounded-lg"><ChevronLeft size={20}/></button>
                  <p className="font-bold text-accent">{format(selectedDate, 'dd/MM')}</p>
                  <button onClick={() => { const d = addDays(selectedDate, 1); setSelectedDate(d); calculateSlots(d, selectedProfessional.id, selectedService); }} className="p-2 hover:bg-white rounded-lg"><ChevronRight size={20}/></button>
               </div>
               <div className="bg-accent/5 p-3 rounded-lg text-[10px] font-bold text-accent uppercase tracking-widest">
                  1 Procedimento • {selectedService.duration_minutes} min total
               </div>
               <div className="grid grid-cols-4 gap-2">
                  {loading ? <div className="col-span-4 py-10"><Loader2 className="animate-spin mx-auto text-accent"/></div> : availableSlots.length === 0 ? <p className="col-span-4 py-10 text-xs text-slate-400 font-bold uppercase tracking-widest">Sem horários para este procedimento</p> : availableSlots.map(slot => (
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
               <button disabled={!selectedClient || !selectedService || !selectedProfessional} onClick={handleNextStep} className="flex-2 py-3 bg-slate-900 text-white rounded-xl font-bold px-8 flex items-center gap-2">Escolher Horário <ChevronRight size={16}/></button>
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
