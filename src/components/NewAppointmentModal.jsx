import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Loader2,
  Check, 
  MessageCircle,
  Scissors,
  Sparkles,
  Phone,
  AlertCircle
} from 'lucide-react';
import { format, addMinutes, parse, isBefore, isAfter, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTenant } from '../context/TenantContext';
import { useNotification } from '../context/NotificationProvider';
import { api } from '../lib/api';
import { formatCurrency } from '../utils/formatters';

const NewAppointmentModal = ({ 
  isOpen, 
  onClose, 
  initialDate, 
  initialProfessionalId, 
  initialClient,
  editAppointment, 
  onSuccess 
}) => {
  const { tenant } = useTenant();
  const { showError } = useNotification();

  const [step, setStep] = useState(1); // 1 = Cliente/Serviço/Pro, 2 = Horário
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [successState, setSuccessState] = useState(null);
  
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
  const [fetchError, setFetchError] = useState(null);

  const tenantId = tenant?.id;

  // Carregar dados iniciais ao abrir o modal
  useEffect(() => {
    if (isOpen && tenantId) {
      setFetchError(null);
      fetchInitialData();

      if (editAppointment) {
        setSelectedClient(editAppointment.cap_clients || { 
          id: editAppointment.client_id, 
          name: editAppointment.client_name || 'Cliente',
          phone: editAppointment.client_phone || ''
        });
        setSelectedService(editAppointment.cap_services || { 
          id: editAppointment.service_id, 
          name: editAppointment.service_name || 'Serviço', 
          duration_minutes: editAppointment.duration_minutes || 30, 
          price: editAppointment.total_price || 0 
        });
        setSelectedProfessional(editAppointment.cap_profiles || { 
          id: editAppointment.staff_id, 
          name: editAppointment.staff_name || 'Profissional' 
        });
        setSelectedDate(new Date(editAppointment.start_time));
        setStep(1);
      } else {
        setSelectedService(null);
        setSelectedClient(initialClient || null);
        setSelectedProfessional(null);
        setSelectedSlot(null);
        setSelectedDate(initialDate || new Date());
        setStep(1);
        setSuccessState(null);
      }
    }
  }, [isOpen, tenantId, initialDate, initialProfessionalId, initialClient, editAppointment]);

  const fetchInitialData = async () => {
    if (!tenantId) return;
    setLoading(true);
    setFetchError(null);

    try {
      const [cls, srvs, pros] = await Promise.all([
        api.clients.list(tenantId).catch(err => {
          console.warn('Aviso ao buscar clientes:', err);
          return [];
        }),
        api.services.list(tenantId).catch(err => {
          console.warn('Aviso ao buscar serviços:', err);
          return [];
        }),
        api.staff.list(tenantId).catch(err => {
          console.warn('Aviso ao buscar equipe:', err);
          return [];
        })
      ]);
      
      const activePros = (pros || []).filter(p => p.role === 'professional' || p.role === 'manager');
      const activeServices = (srvs || []).filter(s => s.is_active !== false);

      setClients(Array.isArray(cls) ? cls : []);
      setServices(Array.isArray(activeServices) ? activeServices : []);
      setProfessionals(activePros);

      // Pré-selecionar profissional se veio como initialProfessionalId
      if (initialProfessionalId && activePros.length > 0) {
        const found = activePros.find(p => p.id === initialProfessionalId);
        if (found) {
          setSelectedProfessional(found);
        }
      }
    } catch (e) {
      console.error('Erro ao buscar dados iniciais no modal:', e);
      setFetchError('Não foi possível carregar os dados. Verifique a conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Calcular horários livres para o profissional e data selecionados
  const calculateSlots = async (date, proId, service) => {
    if (!date || !proId || !service || !tenantId) return;
    setSlotsLoading(true);
    const totalDuration = service.duration_minutes || 30;

    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      const [allExceptions, allHours, allApps] = await Promise.all([
        api.settings.getExceptions(tenantId).catch(() => []),
        api.settings.getBusinessHours(tenantId).catch(() => []),
        api.appointments.list({ 
          start_date: formattedDate, 
          end_date: formattedDate, 
          staff_id: proId, 
          tenant_id: tenantId 
        }).catch(() => [])
      ]);

      const exception = (allExceptions || []).find(e => e.exception_date?.startsWith(formattedDate));
      const defaultHours = (allHours || []).find(h => h.day_of_week === date.getDay());

      let hours = null;
      if (exception) {
        if (exception.is_closed) {
          setAvailableSlots([]);
          setSlotsLoading(false);
          return;
        }
        hours = { open_time: exception.open_time, close_time: exception.close_time };
      } else if (defaultHours && !defaultHours.is_closed) {
        hours = defaultHours;
      } else {
        // Fallback padrão comercial: 08:00 às 20:00
        hours = { open_time: '08:00:00', close_time: '20:00:00' };
      }

      let apps = (allApps || []).filter(app => app.status !== 'cancelled');
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
             const minTime = addMinutes(now, 10);
             if (isAfter(slotStart, minTime)) candidates.push(slotStart);
          } else {
             candidates.push(slotStart);
          }
        }
        current = addMinutes(current, 30);
      }
      setAvailableSlots(candidates);
    } catch (err) {
      console.error('Erro ao calcular horários livres:', err);
      // Fallback amigável de slots de 30 em 30 min
      const fallbackSlots = [];
      const base = parse('09:00:00', 'HH:mm:ss', date);
      for (let i = 0; i < 18; i++) {
        fallbackSlots.push(addMinutes(base, i * 30));
      }
      setAvailableSlots(fallbackSlots);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleNextStep = () => {
    if (selectedClient && selectedService && selectedProfessional) {
      setSelectedSlot(null);
      calculateSlots(selectedDate, selectedProfessional.id, selectedService);
      setStep(2);
    }
  };

  const handleSave = async () => {
    if (!selectedSlot || !selectedService || !selectedClient || !selectedProfessional || !tenantId) return;
    setLoading(true);

    const totalPrice = Number(selectedService.price) || 0;
    const startTime = selectedSlot;

    try {
      if (editAppointment) {
        await api.appointments.update(editAppointment.id, {
          staff_id: selectedProfessional.id,
          service_id: selectedService.id,
          start_time: startTime.toISOString(),
          total_price: totalPrice,
          status: 'scheduled',
          tenant_id: tenantId
        });
      } else {
        await api.appointments.create({
          client_id: selectedClient.id,
          staff_id: selectedProfessional.id,
          service_id: selectedService.id,
          start_time: startTime.toISOString(),
          total_price: totalPrice,
          tenant_id: tenantId
        });
      }

      setSuccessState({ 
        client: selectedClient, 
        service: selectedService, 
        professional: selectedProfessional, 
        time: selectedSlot, 
        totalPrice 
      });
      onSuccess?.();
    } catch (err) {
      console.error('Erro ao salvar agendamento:', err);
      showError('Erro: ' + (err.message || 'Falha ao salvar agendamento'));
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsApp = () => {
    if (!successState?.client?.phone) return;
    const msg = `Olá, ${successState.client.name}! ✨\n\nConfirmamos o seu agendamento no ${tenant?.name || 'Salão'}:\n\n📅 Data: ${format(successState.time, "dd/MM/yyyy (EEEE)", { locale: ptBR })}\n⏰ Horário: ${format(successState.time, 'HH:mm')}\n💇 Procedimento: ${successState.service.name}\n👤 Profissional: ${successState.professional.name}\n💰 Valor: ${formatCurrency(successState.totalPrice)}\n\nEsperamos por você com muito carinho! ✨`;
    window.open(`https://wa.me/55${successState.client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-ink/50 backdrop-blur-md animate-fade-in font-sans text-ink selection:bg-brand-tint selection:text-brand">
      
      {/* Container Rosé Editorial */}
      <div className="bg-[#FAF8F5] rounded-[28px] sm:rounded-[32px] border border-line shadow-[0_24px_70px_rgba(42,39,42,0.18)] w-full max-w-[660px] overflow-hidden flex flex-col max-h-[92vh] animate-scale-up">
        
        {/* Cabeçalho de Luxo com Stepper */}
        <div className="px-6 sm:px-8 py-5 border-b border-line bg-surface/90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-brand-tint border border-gold/40 text-brand flex items-center justify-center shrink-0 shadow-2xs">
              <CalendarIcon size={20} className="text-brand" />
            </div>
            <div>
              <h3 className="font-serif text-xl sm:text-2xl text-ink font-semibold tracking-tight leading-snug">
                {editAppointment ? 'Reagendar Horário' : 'Novo Agendamento'}
              </h3>
              <p className="text-[12px] text-ink-soft">
                {successState 
                  ? 'Atendimento confirmado com sucesso' 
                  : step === 1 
                    ? 'Etapa 1 de 2: Cliente, Procedimento & Profissional' 
                    : 'Etapa 2 de 2: Escolha de Data & Horário'
                }
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="w-9 h-9 rounded-full border border-line bg-surface hover:bg-bg text-ink-soft hover:text-ink flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <X size={17} />
          </button>
        </div>

        {/* Stepper Visual (quando não estiver em tela de sucesso) */}
        {!successState && (
          <div className="px-6 sm:px-8 py-3 bg-surface/50 border-b border-line/60 flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center gap-2 font-medium transition-colors cursor-pointer ${
                step === 1 ? 'text-brand font-semibold' : 'text-ink-soft hover:text-ink'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 1 ? 'bg-brand text-white shadow-2xs' : 'bg-line text-ink-soft'
              }`}>
                1
              </span>
              <span>Procedimento & Profissional</span>
            </button>

            <ChevronRight size={14} className="text-ink-soft/40" />

            <button
              type="button"
              disabled={!selectedClient || !selectedService || !selectedProfessional}
              onClick={handleNextStep}
              className={`flex items-center gap-2 font-medium transition-colors ${
                step === 2 
                  ? 'text-brand font-semibold cursor-pointer' 
                  : selectedClient && selectedService && selectedProfessional 
                    ? 'text-ink-soft hover:text-ink cursor-pointer' 
                    : 'text-ink-soft/40 cursor-not-allowed'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 2 ? 'bg-brand text-white shadow-2xs' : 'bg-line text-ink-soft'
              }`}>
                2
              </span>
              <span>Data & Horário</span>
            </button>
          </div>
        )}

        {/* Mensagem de Erro de Conexão se houver */}
        {fetchError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">{fetchError}</span>
            <button 
              type="button" 
              onClick={fetchInitialData}
              className="font-semibold underline hover:text-red-900 cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Corpo com Scroll Delicado */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
          {/* TELA DE SUCESSO */}
          {successState ? (
            <div className="py-4 flex flex-col items-center justify-center text-center space-y-5 animate-fade-in">
              <div className="w-16 h-16 bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] rounded-full flex items-center justify-center shadow-sm">
                <CheckCircle2 size={38} />
              </div>

              <div>
                <h3 className="font-serif text-2xl font-semibold text-ink mb-1">
                  Atendimento Reservado!
                </h3>
                <p className="text-xs text-ink-soft max-w-sm">
                  O agendamento já está confirmado na grade da equipe e registrado com sucesso.
                </p>
              </div>

              {/* Recibo de Alta Costura */}
              <div className="bg-surface p-6 rounded-2xl border border-line shadow-xs w-full space-y-3 text-xs text-left">
                <div className="flex justify-between items-center pb-2.5 border-b border-line/60">
                  <span className="text-ink-soft">Cliente:</span>
                  <span className="font-semibold text-sm text-ink">{successState.client.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-soft">Procedimento:</span>
                  <span className="font-semibold text-ink">{successState.service.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-soft">Profissional:</span>
                  <span className="font-semibold text-ink">{successState.professional.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-soft">Data e Horário:</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {format(successState.time, "dd/MM/yyyy 'às' HH:mm")}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-line/60">
                  <span className="font-medium text-ink-soft">Valor Total:</span>
                  <span className="font-serif text-lg font-bold text-brand tabular-nums">
                    {formatCurrency(successState.totalPrice)}
                  </span>
                </div>
              </div>

              {/* Ações pós-sucesso */}
              <div className="w-full space-y-2.5 pt-2">
                {successState.client.phone && (
                  <button 
                    type="button"
                    onClick={sendWhatsApp} 
                    className="w-full h-12 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-full font-medium text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    <MessageCircle size={18} />
                    <span>Enviar Confirmação no WhatsApp</span>
                  </button>
                )}

                <button 
                  type="button"
                  onClick={onClose} 
                  className="w-full h-11 border border-line bg-surface hover:bg-bg text-ink text-xs font-semibold rounded-full transition-all cursor-pointer"
                >
                  Fechar e Voltar à Agenda
                </button>
              </div>
            </div>
          ) : step === 1 ? (
            
            /* PASSO 1: CLIENTE, PROCEDIMENTO E PROFISSIONAL */
            <div className="space-y-6 animate-fade-in">
              
              {/* 1. SELEÇÃO DE CLIENTE */}
              <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-line shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
                    <User size={13} className="text-gold" />
                    <span>1. Cliente</span>
                    <span className="text-brand">*</span>
                  </label>
                  {selectedClient && (
                    <button
                      type="button"
                      onClick={() => setSelectedClient(null)}
                      className="text-xs text-brand hover:underline font-medium cursor-pointer"
                    >
                      Trocar cliente
                    </button>
                  )}
                </div>

                {selectedClient ? (
                  <div className="p-3.5 bg-brand-tint/30 rounded-xl border border-brand/20 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-brand-tint border border-gold/40 text-brand flex items-center justify-center font-serif text-sm font-bold shrink-0">
                        {selectedClient.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-ink truncate block">
                          {selectedClient.name}
                        </span>
                        {selectedClient.phone && (
                          <span className="text-[11px] text-ink-soft flex items-center gap-1 mt-0.5">
                            <Phone size={10} />
                            {selectedClient.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-white rounded-full text-[10px] font-medium text-brand border border-brand/20 shadow-2xs">
                      Selecionado
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative flex items-center h-12 bg-bg/50 border border-line rounded-xl px-3.5 transition-all focus-within:border-brand focus-within:bg-surface focus-within:ring-2 focus-within:ring-brand-tint/60">
                      <Search size={16} className="text-ink-soft/60 shrink-0" />
                      <input 
                        type="text" 
                        placeholder="Buscar cliente por nome ou telefone..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-full bg-transparent pl-2.5 text-xs text-ink placeholder:text-ink-soft/50 outline-none" 
                      />
                      {searchTerm && (
                        <button 
                          type="button"
                          onClick={() => setSearchTerm('')} 
                          className="text-xs text-ink-soft hover:text-ink"
                        >
                          Limpar
                        </button>
                      )}
                    </div>

                    {/* Dropdown de Clientes */}
                    {searchTerm.trim().length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-surface border border-line mt-1.5 rounded-xl shadow-xl z-30 max-h-52 overflow-y-auto p-1 divide-y divide-line/40 animate-fade-in">
                        {clients
                          .filter(c => 
                            c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.phone?.includes(searchTerm)
                          )
                          .map(c => (
                            <div 
                              key={c.id} 
                              onClick={() => { setSelectedClient(c); setSearchTerm(''); }}
                              className="p-2.5 hover:bg-brand-tint/30 rounded-lg cursor-pointer text-xs flex items-center justify-between transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-brand-tint text-brand text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {c.name?.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-semibold text-ink">{c.name}</span>
                              </div>
                              <span className="text-[11px] text-ink-soft">{c.phone || ''}</span>
                            </div>
                          ))}
                        {clients.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                          <div className="p-3 text-center text-xs text-ink-soft">
                            Nenhum cliente cadastrado com esse nome.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. SELEÇÃO DE PROCEDIMENTO */}
              <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-line shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
                    <Scissors size={13} className="text-gold" />
                    <span>2. Procedimento</span>
                    <span className="text-brand">*</span>
                  </label>
                  {selectedService && (
                    <span className="text-xs text-brand font-semibold">
                      {formatCurrency(selectedService.price || 0)}
                    </span>
                  )}
                </div>

                {loading ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin text-brand" />
                    <span className="text-xs text-ink-soft">Carregando catálogo de procedimentos...</span>
                  </div>
                ) : services.length === 0 ? (
                  <div className="p-4 rounded-xl border border-line bg-bg/50 text-center text-xs text-ink-soft">
                    Nenhum serviço disponível cadastrado neste salão.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {services.map(s => {
                      const isSelected = selectedService?.id === s.id;
                      return (
                        <button 
                          key={s.id} 
                          type="button"
                          onClick={() => setSelectedService(s)} 
                          className={`p-3 text-left rounded-xl border text-xs transition-all cursor-pointer relative flex flex-col justify-between ${
                            isSelected 
                              ? 'border-brand bg-brand-tint/30 ring-1 ring-brand shadow-2xs' 
                              : 'border-line bg-surface hover:border-brand/40 hover:bg-bg/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <span className="font-semibold text-ink text-xs line-clamp-1">
                              {s.name}
                            </span>
                            {isSelected && (
                              <CheckCircle2 size={14} className="text-brand shrink-0" />
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between text-[11px] text-ink-soft">
                            <span className="font-serif font-bold text-brand tabular-nums">
                              {formatCurrency(s.price || 0)}
                            </span>
                            <span className="text-[10px] bg-bg px-2 py-0.5 rounded-full border border-line/60">
                              {s.duration_minutes || 30} min
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. SELEÇÃO DE PROFISSIONAL */}
              <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-line shadow-2xs">
                <label className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-gold" />
                  <span>3. Profissional Responsável</span>
                  <span className="text-brand">*</span>
                </label>

                {loading ? (
                  <div className="py-6 flex items-center justify-center">
                    <Loader2 size={18} className="animate-spin text-brand" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {professionals.map(pro => {
                      const isSelected = selectedProfessional?.id === pro.id;
                      const initial = pro.name?.trim().charAt(0).toUpperCase() || 'P';
                      return (
                        <button 
                          key={pro.id} 
                          type="button"
                          onClick={() => setSelectedProfessional(pro)} 
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                            isSelected 
                              ? 'border-brand bg-brand-tint/40 ring-1 ring-brand shadow-2xs' 
                              : 'border-line bg-surface hover:border-brand/30 hover:bg-bg/40'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-serif text-xs font-bold shrink-0 ${
                            isSelected ? 'bg-brand text-white' : 'bg-brand-tint text-brand border border-gold/40'
                          }`}>
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-ink block truncate leading-tight">
                              {pro.name}
                            </span>
                            <span className="text-[10px] text-ink-soft block uppercase truncate">
                              {pro.role === 'manager' ? 'Gestor' : 'Profissional'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          ) : (
            
            /* PASSO 2: SELEÇÃO DE DATA E HORÁRIO */
            <div className="space-y-6 animate-fade-in">
              
              {/* Card Resumo do Procedimento */}
              <div className="bg-surface p-4 rounded-2xl border border-line shadow-2xs flex items-center justify-between text-xs">
                <div>
                  <span className="text-ink-soft block text-[11px]">Procedimento Selecionado:</span>
                  <span className="font-semibold text-ink text-sm block">
                    {selectedService?.name}
                  </span>
                  <span className="text-[11px] text-ink-soft">
                    {selectedService?.duration_minutes} min com <strong className="text-ink">{selectedProfessional?.name}</strong>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-ink-soft block text-[11px]">Total:</span>
                  <span className="font-serif font-bold text-base text-brand tabular-nums">
                    {formatCurrency(selectedService?.price || 0)}
                  </span>
                </div>
              </div>

              {/* Barra Seletora de Data com Navegação */}
              <div className="bg-surface p-3.5 rounded-2xl border border-line shadow-2xs flex items-center justify-between">
                <button 
                  type="button"
                  onClick={() => { 
                    const d = addDays(selectedDate, -1); 
                    setSelectedDate(d); 
                    calculateSlots(d, selectedProfessional?.id, selectedService); 
                  }} 
                  className="w-9 h-9 rounded-full border border-line bg-surface hover:bg-bg flex items-center justify-center text-ink transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="text-center">
                  <span className="font-serif text-base sm:text-lg font-semibold text-ink capitalize block">
                    {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </span>
                  <span className="text-[11px] text-ink-soft">
                    Selecione um horário disponível abaixo
                  </span>
                </div>

                <button 
                  type="button"
                  onClick={() => { 
                    const d = addDays(selectedDate, 1); 
                    setSelectedDate(d); 
                    calculateSlots(d, selectedProfessional?.id, selectedService); 
                  }} 
                  className="w-9 h-9 rounded-full border border-line bg-surface hover:bg-bg flex items-center justify-center text-ink transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Grade de Horários Disponíveis */}
              <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-line shadow-2xs">
                <label className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock size={13} className="text-gold" />
                  <span>Horários Livres:</span>
                </label>

                {slotsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2">
                    <Loader2 size={24} className="animate-spin text-brand" />
                    <span className="text-xs text-ink-soft">Verificando disponibilidade na agenda...</span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="py-10 p-4 rounded-xl bg-bg/50 border border-line text-center text-xs text-ink-soft">
                    Nenhum horário livre encontrado para este profissional nesta data. Tente navegar para o próximo dia nas setas acima.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
                    {availableSlots.map(slot => {
                      const isSelected = selectedSlot?.getTime() === slot.getTime();
                      return (
                        <button 
                          key={slot.toISOString()} 
                          type="button"
                          onClick={() => setSelectedSlot(slot)} 
                          className={`py-2.5 px-1 rounded-xl border text-xs font-semibold tabular-nums transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-brand text-white border-brand shadow-sm scale-105' 
                              : 'bg-surface text-ink border-line hover:border-brand/40 hover:bg-brand-tint/20'
                          }`}
                        >
                          {format(slot, 'HH:mm')}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Rodapé de Ações Fixo */}
        {!successState && (
          <div className="px-6 sm:px-8 py-4 border-t border-line flex items-center justify-between gap-3 bg-surface sticky bottom-0 z-20">
            {step === 1 ? (
              <>
                <button 
                  type="button"
                  onClick={onClose} 
                  className="px-5 py-2.5 text-xs font-semibold text-ink-soft hover:text-ink border border-line rounded-full hover:bg-bg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button 
                  type="button"
                  disabled={!selectedClient || !selectedService || !selectedProfessional} 
                  onClick={handleNextStep} 
                  className="bg-brand text-white text-xs font-semibold px-6 py-2.5 rounded-full shadow-sm hover:opacity-95 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Escolher Horário</span>
                  <ChevronRight size={14} />
                </button>
              </>
            ) : (
              <>
                <button 
                  type="button"
                  onClick={() => setStep(1)} 
                  className="px-5 py-2.5 text-xs font-semibold text-ink-soft hover:text-ink border border-line rounded-full hover:bg-bg transition-colors cursor-pointer"
                >
                  ← Voltar
                </button>

                <button 
                  type="button"
                  disabled={!selectedSlot || loading} 
                  onClick={handleSave} 
                  className="bg-brand text-white text-xs font-semibold px-6 py-2.5 rounded-full shadow-sm hover:opacity-95 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={13} className="animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Confirmar Agendamento</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

      </div>

    </div>
  );
};

export default NewAppointmentModal;
