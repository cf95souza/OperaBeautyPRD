import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Crown, 
  Phone, 
  Calendar, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  ArrowLeft,
  Scissors,
  User,
  Heart,
  MessageCircle,
  Globe,
  Loader2,
  Check,
  Star,
  Sparkles,
  ChevronLeft,
  MapPin,
  Trash2,
  CalendarDays,
  History
} from 'lucide-react';
import { 
  format, 
  addMinutes, 
  parse, 
  isBefore, 
  isAfter, 
  startOfDay, 
  endOfDay,
  isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNotification } from '../context/NotificationProvider';

const PublicBooking = ({ branding }) => {
  const { showSuccess, showError } = useNotification();
  const [step, setStep] = useState('welcome'); 
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({ salon_name: 'Capelli', primary_color: '#be185d', logo_url: '' });
  
  const [phone, setPhone] = useState('');
  const [client, setClient] = useState(null);
  const [registrationData, setRegistrationData] = useState({ name: '', birth_date: '' });
  
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedPro, setSelectedPro] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  const [myAppointments, setMyAppointments] = useState([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('cap_settings').select('*').maybeSingle();
    if (data) {
      setSettings(data);
      document.title = `${data.salon_name} - Agendamento`;
    }
  };

  const handleIdentify = async (e) => {
    e.preventDefault();
    if (phone.length < 10) return;
    setLoading(true);
    const { data } = await supabase.from('cap_clients').select('*').eq('phone', phone).maybeSingle();
    if (data) {
      setClient(data);
      setStep('action');
    } else {
      setStep('register');
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.from('cap_clients').insert([{ name: registrationData.name, phone, birth_date: registrationData.birth_date || null }]).select().maybeSingle();
    
    if (data) {
      showSuccess(`Bem-vindo(a), ${data.name}!`);
      setClient(data);
      setStep('action');
    } else {
      showError('Erro ao realizar cadastro: ' + error.message);
    }
    setLoading(false);
  };

  const viewMyHistory = async () => {
    setLoading(true);
    try {
      // 🌟 BUSCA REFORÇADA: Traz o serviço do plano antigo e do novo plano de combos
      const { data } = await supabase
        .from('cap_appointments')
        .select(`
          *,
          cap_profiles (*),
          cap_services (*), 
          cap_appointment_services (
            id,
            service_id,
            cap_services (*)
          )
        `)
        .eq('client_id', client.id)
        .order('start_time', { ascending: false });
      
      console.log('Dados do histórico:', data);
      setMyAppointments(data || []);
      setStep('view');
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    }
    setLoading(false);
  };

  const startBooking = async () => {
    setLoading(true);
    const { data } = await supabase.from('cap_services').select('*').eq('is_active', true);
    setServices(data || []);
    setSelectedServices([]);
    setSelectedPro(null);
    setStep('book_service');
    setLoading(false);
  };

  const toggleService = (service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) {
        if (prev.length === 1) return prev;
        return prev.filter(s => s.id !== service.id);
      }
      return [...prev, service];
    });
  };

  const goToProSelection = async () => {
    setLoading(true);
    const { data: pros } = await supabase.from('cap_profiles').select('*').eq('role', 'professional').eq('is_active', true);
    setProfessionals(pros || []);
    setStep('book_pro');
    setLoading(false);
  };

  const selectPro = async (pro) => {
    setSelectedPro(pro);
    setStep('book_time');
    calculateSlots(selectedDate, pro.id, selectedServices);
  };

  const calculateSlots = async (date, proId, servicesList) => {
    setLoading(true);
    const totalDuration = servicesList.reduce((acc, s) => acc + s.duration_minutes, 0);
    try {
      const { data: blocked } = await supabase.from('cap_blocked_dates').select('*').eq('blocked_date', format(date, 'yyyy-MM-dd')).maybeSingle();
      const { data: hours } = await supabase.from('cap_business_hours').select('*').eq('day_of_week', date.getDay()).maybeSingle();
      
      if (blocked || !hours || hours.is_closed) {
        setAvailableSlots([]);
        setLoading(false);
        return;
      }

      const { data: apps } = await supabase.from('cap_appointments').select('id, start_time, end_time').eq('professional_id', proId).eq('status', 'scheduled').gte('start_time', startOfDay(date).toISOString()).lte('start_time', endOfDay(date).toISOString());

      const openTime = parse(hours.open_time, 'HH:mm:ss', date);
      const closeTime = parse(hours.close_time, 'HH:mm:ss', date);
      const duration = totalDuration;
      const candidates = [];
      let current = openTime;

      while (isBefore(addMinutes(current, duration), closeTime) || current.getTime() + (duration * 60000) === closeTime.getTime()) {
        const slotStart = current;
        const slotEnd = addMinutes(current, duration);
        const overlap = apps?.some(app => {
          const appStart = new Date(app.start_time);
          const appEnd = new Date(app.end_time);
          return (isBefore(slotStart, appEnd) && isAfter(slotEnd, appStart));
        });

        if (!overlap) {
          const now = new Date();
          if (isSameDay(now, date)) {
             if (isAfter(slotStart, addMinutes(now, 15))) candidates.push(slotStart);
          } else {
             candidates.push(slotStart);
          }
        }
        current = addMinutes(current, 30);
      }
      setAvailableSlots(candidates);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const finalizeBooking = async () => {
    if (!selectedSlot || !selectedPro || selectedServices.length === 0) return;
    setLoading(true);
    const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration_minutes, 0);
    const totalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);
    const startTime = selectedSlot;
    const endTime = addMinutes(startTime, totalDuration);

    try {
      const { data: newApp, error: appError } = await supabase.from('cap_appointments').insert([{ 
        client_id: client.id, 
        professional_id: selectedPro.id, 
        service_id: selectedServices[0].id, // Mantemos por compatibilidade legada
        start_time: startTime.toISOString(), 
        end_time: endTime.toISOString(), 
        total_price: totalPrice, 
        status: 'scheduled' 
      }]).select().single();
      if (appError) throw appError;

      const servicesToInsert = selectedServices.map(s => ({ appointment_id: newApp.id, service_id: s.id, price_at_time: s.price, duration_at_time: s.duration_minutes }));
      await supabase.from('cap_appointment_services').insert(servicesToInsert);
      showSuccess('Horário reservado com sucesso!');
      setStep('success');
    } catch (err) { showError(err.message); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFD] font-sans text-slate-800 pb-20">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100/50 p-5 md:px-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white">
            <Crown size={20} />
          </div>
          <div>
            <h1 className="text-xl font-serif text-slate-900 tracking-tight leading-none">{branding?.salonName || 'Capelli'}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Agendamento Oficial</p>
          </div>
        </div>
        {client && <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-xs font-black text-slate-600 uppercase tracking-tighter shadow-sm">{client.name.split(' ')[0]}</div>}
      </nav>

      <main className="max-w-xl mx-auto px-6 py-12">
        {step === 'welcome' && (
          <div className="text-center py-10 space-y-12 animate-in fade-in zoom-in duration-700">
             <div className="w-24 h-24 bg-accent/5 text-accent rounded-[2.5rem] flex items-center justify-center mx-auto border border-accent/10 shadow-inner"><Crown size={48} /></div>
             <div className="space-y-4">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-[0.9]">BEM-VINDO(A) AO <br/> <span className="text-accent">{branding?.salonName || 'Capelli'}</span></h2>
                <p className="text-slate-500 font-medium text-lg max-w-xs mx-auto">Sua jornada de beleza começa agora.</p>
             </div>
             <button onClick={() => setStep('identify')} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-lg shadow-2xl active:scale-95 transition-all uppercase">Iniciar Agendamento</button>
          </div>
        )}

        {step === 'identify' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-12 duration-500">
             <div className="text-center space-y-2"><h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase leading-none">Identificação</h2><p className="text-slate-400 font-medium">Informe seu celular para continuarmos.</p></div>
             <form onSubmit={handleIdentify} className="space-y-6">
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="w-full bg-white border border-slate-200 p-6 rounded-[1.8rem] text-xl font-black shadow-sm outline-none focus:border-accent transition-all" />
                <button disabled={loading || phone.length < 10} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black shadow-xl"> {loading ? <Loader2 className="animate-spin mx-auto" /> : 'PROSSEGUIR'} </button>
             </form>
          </div>
        )}

        {step === 'register' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-12 duration-500">
             <div className="text-center space-y-2">
                <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase leading-none">Novo(a) por aqui?</h2>
                <p className="text-slate-400 font-medium">Complete seu cadastro para continuar agora.</p>
             </div>
             <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">Nome Completo</label>
                    <input 
                      type="text" 
                      required
                      value={registrationData.name} 
                      onChange={(e) => setRegistrationData({...registrationData, name: e.target.value})} 
                      placeholder="Como deseja ser chamada?" 
                      className="w-full bg-white border border-slate-200 p-6 rounded-[1.8rem] text-xl font-black shadow-sm outline-none focus:border-accent transition-all uppercase placeholder:normal-case" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1 block">Data de Nascimento (Opcional)</label>
                    <input 
                      type="date" 
                      value={registrationData.birth_date} 
                      onChange={(e) => setRegistrationData({...registrationData, birth_date: e.target.value})} 
                      className="w-full bg-white border border-slate-200 p-6 rounded-[1.8rem] text-lg font-black shadow-sm outline-none focus:border-accent transition-all" 
                    />
                    <p className="text-[9px] font-medium text-slate-400 ml-4 mt-2 italic">* Usamos para lhe enviar mimos no seu aniversário!</p>
                  </div>
                </div>
                <button 
                  disabled={loading || !registrationData.name} 
                  className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black shadow-xl active:scale-95 transition-all uppercase tracking-tight flex items-center justify-center gap-2"
                > 
                  {loading ? <Loader2 className="animate-spin" /> : 'Finalizar Cadastro'} 
                </button>
                <button type="button" onClick={() => setStep('identify')} className="w-full text-slate-400 font-black text-xs uppercase tracking-widest">Voltar para Identificação</button>
             </form>
          </div>
        )}

        {step === 'action' && (
          <div className="grid gap-6 animate-in fade-in duration-500 py-6">
             <div className="text-left space-y-1 mb-4"><p className="text-accent font-black text-xs uppercase tracking-widest leading-none">Bem-vindo(a) de volta</p><h2 className="text-4xl font-black tracking-tighter text-slate-900 uppercase leading-none">Olá, {client?.name.split(' ')[0]}!</h2></div>
             <button onClick={startBooking} className="flex flex-col items-start gap-4 p-8 bg-white border border-slate-100 rounded-[2.5rem] hover:border-accent hover:shadow-2xl transition-all group text-left shadow-sm">
                <div className="w-14 h-14 bg-accent/10 text-accent rounded-2xl flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all"><Calendar size={28} /></div>
                <div><h4 className="font-black text-slate-900 text-xl uppercase leading-tight">Novo Agendamento</h4><p className="text-sm text-slate-400 font-medium mt-1">Reserve seu próximo horário na agenda.</p></div>
                <div className="mt-4 flex items-center gap-2 text-accent font-black text-xs uppercase border-b-2 border-accent/20 tracking-tighter">RESERVAR AGORA <ChevronRight size={14} /></div>
             </button>
             <button onClick={viewMyHistory} className="flex flex-col items-start gap-4 p-8 bg-slate-900 rounded-[2.5rem] shadow-xl hover:bg-slate-800 transition-all group text-left">
                <div className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center"><History size={28} /></div>
                <div><h4 className="font-black text-white text-xl uppercase leading-tight">Meus Agendamentos</h4><p className="text-sm text-white/50 font-medium mt-1">Consulte seus momentos de beleza.</p></div>
                <div className="mt-4 flex items-center gap-2 text-white/40 font-black text-xs uppercase border-b-2 border-white/10 tracking-tighter">VER HISTÓRICO <ChevronRight size={14} /></div>
             </button>
          </div>
        )}

        {step === 'book_service' && (
          <div className="space-y-8 animate-in slide-in-from-right duration-500 pb-32">
             <div className="flex items-center justify-between"><button onClick={() => setStep('action')} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm"><ArrowLeft size={20}/></button><div className="text-right"><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">SERVIÇOS</h2><p className="text-[10px] font-black text-accent tracking-widest uppercase">Monte seu combo</p></div></div>
             <div className="grid gap-4">
                {services.map(s => {
                  const isSelected = selectedServices.some(x => x.id === s.id);
                  return (
                    <button key={s.id} onClick={() => toggleService(s)} className={`w-full p-5 rounded-[2.5rem] border-2 text-left transition-all ${isSelected ? 'border-accent bg-accent/[0.03] shadow-md ring-4 ring-accent/5' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                       <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isSelected ? 'bg-accent text-white' : 'bg-slate-50 text-slate-400'}`}><Scissors size={22} /></div>
                             <div><h4 className="font-black text-slate-900 text-lg uppercase leading-tight">{s.name}</h4><div className="flex items-center gap-3 mt-1"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none"><Clock size={12} /> {s.duration_minutes} min</span><span className="text-sm font-black text-accent">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.price)}</span></div></div>
                          </div>
                          {isSelected ? <div className="w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center shadow-lg"><Check size={18} strokeWidth={3} /></div> : <div className="w-8 h-8 border-2 border-dashed border-slate-100 rounded-full" />}
                       </div>
                    </button>
                  );
                })}
             </div>
             <div className="fixed bottom-8 left-6 right-6 z-50"><button onClick={() => setStep('review_booking')} className="w-full bg-slate-900 text-white p-2 rounded-[2.2rem] font-black shadow-2xl flex items-center justify-between border-4 border-white/10 active:scale-95 transition-all"><div className="flex items-center gap-3 pl-4"><div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-sm font-black">{selectedServices.length}</div><span className="text-sm uppercase tracking-tighter">REVISAR</span></div><div className="bg-white text-slate-900 px-8 py-4 rounded-[1.8rem] flex items-center gap-2"><span>PRÓXIMO</span><ChevronRight size={20} /></div></button></div>
          </div>
        )}

        {step === 'review_booking' && (
          <div className="space-y-8 animate-in slide-in-from-right duration-500">
            <div className="flex items-center gap-4"><button onClick={() => setStep('book_service')} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-500"><ArrowLeft size={20}/></button><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Revisão</h2></div>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
               <div className="bg-slate-900 p-6 flex justify-between items-center text-white"><span className="text-xs font-black uppercase tracking-widest">Resumo do Pedido</span></div>
               <div className="p-8 space-y-6">
                  {selectedServices.map(s => (
                    <div key={s.id} className="flex justify-between items-center"><div className="text-left"><p className="font-black text-slate-900 text-lg uppercase underline decoration-accent/10 underline-offset-4 leading-none">{s.name}</p><p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest leading-none">{s.duration_minutes} min</p></div><p className="font-black text-slate-900 text-lg">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.price)}</p></div>
                  ))}
               </div>
            </div>
            <button onClick={goToProSelection} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-lg shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase">Escolher Profissional <ChevronRight size={22}/></button>
          </div>
        )}

        {step === 'book_pro' && (
          <div className="space-y-10 animate-in slide-in-from-right duration-500">
            <div className="flex items-center gap-4"><button onClick={() => setStep('review_booking')} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-500"><ArrowLeft size={20}/></button><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Quem irá atender?</h2></div>
            <div className="grid grid-cols-2 gap-5">
              {professionals.map(pro => (
                <button key={pro.id} onClick={() => selectPro(pro)} className="flex flex-col items-center p-8 rounded-[2.5rem] border-2 border-white bg-white hover:border-accent hover:shadow-xl transition-all group relative overflow-hidden shadow-sm"><div className="w-20 h-20 bg-slate-100 text-slate-200 rounded-3xl flex items-center justify-center mb-5 group-hover:bg-accent group-hover:text-white transition-all duration-500 font-black text-3xl shadow-inner uppercase">{pro.full_name[0]}</div><h4 className="font-black text-slate-900 text-lg uppercase group-hover:text-accent transition-colors">{pro.full_name.split(' ')[0]}</h4><p className="text-[10px] font-black text-slate-300 uppercase mt-1 tracking-widest">Especialista</p></button>
              ))}
            </div>
          </div>
        )}

        {step === 'book_time' && (
          <div className="space-y-8 animate-in slide-in-from-right duration-500 pb-32">
            <div className="flex items-center gap-4"><button onClick={() => setStep('book_pro')} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-500"><ArrowLeft size={20}/></button><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Data e Hora</h2></div>
            <div className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-xl flex items-center justify-between"><button onClick={() => { const d = addMinutes(selectedDate, -1440); setSelectedDate(d); calculateSlots(d, selectedPro.id, selectedServices); }} className="p-3 text-slate-300 hover:text-accent"><ChevronLeft size={28}/></button><div className="text-center"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 leading-none">DIA</p><h3 className="text-xl font-black text-accent uppercase leading-none">{format(selectedDate, "dd 'DE' MMMM", { locale: ptBR })}</h3></div><button onClick={() => { const d = addMinutes(selectedDate, 1440); setSelectedDate(d); calculateSlots(d, selectedPro.id, selectedServices); }} className="p-3 text-slate-300 hover:text-accent"><ChevronRight size={28}/></button></div>
            <div className="grid grid-cols-3 gap-3">
              {loading ? <div className="col-span-3 py-24 text-center"><Loader2 className="animate-spin text-accent w-10 h-10 mx-auto"/></div> : availableSlots.length === 0 ? <div className="col-span-3 py-16 text-center text-slate-300 font-black uppercase tracking-widest text-[10px]">Sem horários disponíveis</div> : availableSlots.map(slot => (
                <button key={slot.toISOString()} onClick={() => setSelectedSlot(slot)} className={`py-5 rounded-2xl border-2 font-black transition-all text-lg shadow-sm ${selectedSlot?.getTime() === slot.getTime() ? 'bg-accent text-white border-accent shadow-xl scale-105' : 'bg-white text-slate-700 border-white hover:border-slate-100 hover:bg-slate-50'}`}>{format(slot, 'HH:mm')}</button>
              ))}
            </div>
            {selectedSlot && <div className="fixed bottom-8 left-6 right-6 z-50 animate-in slide-in-from-bottom-20"><button onClick={finalizeBooking} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-lg shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all border-4 border-white/10 uppercase tracking-tight">Confirmar Agendamento</button></div>}
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-20 animate-in zoom-in-95 duration-700 space-y-10">
            <div className="w-32 h-32 bg-emerald-50 text-emerald-500 rounded-[3rem] flex items-center justify-center mx-auto border border-emerald-100 shadow-inner"><CheckCircle2 size={64} /></div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight uppercase">Agendado com Sucesso!</h2>
            <p className="text-slate-500 font-medium text-lg max-w-xs mx-auto leading-relaxed">Sua jornada de beleza foi reservada com sucesso.</p>
            <div className="pt-8"><button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-lg shadow-xl hover:bg-accent transition-all uppercase">Ver histórico</button></div>
          </div>
        )}

        {step === 'view' && (
          <div className="space-y-8 animate-in slide-in-from-left duration-500 pb-20">
            <div className="flex items-center justify-between"><button onClick={() => setStep('action')} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-500"><ArrowLeft size={20}/></button><div className="text-right"><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">MEUS AGENDAMENTOS</h2><p className="text-[10px] font-black text-accent uppercase tracking-widest mt-1 tracking-tighter leading-none">Sua jornada de beleza</p></div></div>
            <div className="grid gap-6">
              {myAppointments.length === 0 ? (
                <div className="py-24 text-center bg-white rounded-[2.5rem] border border-slate-100 text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhum registro encontrado</div>
              ) : myAppointments.map(app => (
                <div key={app.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 space-y-6 relative overflow-hidden group">
                   <div className="flex justify-between items-start">
                      <div className="space-y-3">
                         <p className="text-[10px] font-black text-accent uppercase tracking-[0.2em] leading-none">{format(new Date(app.start_time), "dd '[DE]' MMMM", { locale: ptBR })}</p>
                         
                         <div className="flex flex-wrap gap-2 mt-2">
                           {app.cap_appointment_services && app.cap_appointment_services.length > 0 ? (
                              app.cap_appointment_services.map(cas => (
                                <div key={cas.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
                                   <Scissors size={10} className="text-accent" />
                                   <span className="text-[9px] font-black text-slate-700 uppercase tracking-tighter leading-none">{cas.cap_services?.name || 'Procedimento'}</span>
                                </div>
                              ))
                           ) : (
                              app.cap_services ? (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
                                   <Scissors size={10} className="text-accent" />
                                   <span className="text-[9px] font-black text-slate-700 uppercase tracking-tighter leading-none">{app.cap_services.name}</span>
                                </div>
                              ) : (
                                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest italic leading-none">Consultando detalhes...</p>
                              )
                           )}
                         </div>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${app.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>{app.status === 'completed' ? 'CONCLUÍDO' : app.status === 'cancelled' ? 'CANCELADO' : 'AGENDADO'}</span>
                   </div>
                   <div className="flex items-center justify-between text-[11px] font-black text-slate-400 border-t border-slate-50 pt-5 mt-2">
                      <div className="flex items-center gap-2 uppercase leading-none"><User size={14} className="text-accent" /> {app.cap_profiles?.full_name.split(' ')[0]}</div>
                      <div className="flex items-center gap-2 leading-none uppercase"><Clock size={14} className="text-accent" /> {format(new Date(app.start_time), 'HH:mm')}H</div>
                   </div>
                   {app.status === 'scheduled' && (
                     <div className="flex items-center gap-2 p-3 bg-slate-50/50 rounded-xl mt-4 border border-slate-100">
                        <Sparkles size={12} className="text-accent shrink-0" />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-normal">Fale com o salão para reagendar ou cancelar.</p>
                     </div>
                   )}
                </div>
              ))}
            </div>
            <div className="text-center pt-8"><Crown size={24} className="mx-auto text-slate-200" /></div>
          </div>
        )}
      </main>
      <footer className="text-center py-6 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
        &copy; {new Date().getFullYear()} {branding?.salonName || 'Capelli'}. Todos os direitos reservados.
      </footer>
    </div>
  );
};

export default PublicBooking;
