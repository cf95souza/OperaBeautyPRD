import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Bell, 
  MessageCircle, 
  Calendar, 
  User, 
  Scissors, 
  Loader2,
  Search,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { format, differenceInDays, addDays, isPast, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Maintenance = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMaintenanceAlerts();
  }, []);

  const fetchMaintenanceAlerts = async () => {
    setLoading(true);
    try {
      // 1. Buscar todos os agendamentos completados com dados de clientes e serviços
      const { data: appointments, error } = await supabase
        .from('cap_appointments')
        .select(`
          id,
          start_time,
          status,
          cap_clients (id, name, phone),
          cap_services (id, name, maintenance_days)
        `)
        .eq('status', 'completed')
        .order('start_time', { ascending: false });

      if (error) throw error;

      // 2. Agrupar por Cliente + Serviço para pegar apenas a ÚLTIMA vez de cada procedimento
      const latestByClientService = {};
      
      appointments.forEach(app => {
        if (!app.cap_clients || !app.cap_services || !app.cap_services.maintenance_days) return;
        
        const key = `${app.cap_clients.id}-${app.cap_services.id}`;
        if (!latestByClientService[key]) {
          latestByClientService[key] = app;
        }
      });

      // 3. Calcular alertas baseados na regra de 20 dias de antecedência
      const now = new Date();
      const alertList = Object.values(latestByClientService).map(app => {
        const lastDate = new Date(app.start_time);
        const maintenanceDays = app.cap_services.maintenance_days;
        const dueDate = addDays(lastDate, maintenanceDays);
        const alertStartDate = addDays(dueDate, -20); // 20 dias antes da data ideal de retorno
        
        // Status do alerta
        let status = 'upcoming'; // No futuro
        if (isPast(dueDate)) status = 'overdue'; // Vencido
        else if (isPast(alertStartDate)) status = 'due_soon'; // Na hora de chamar (janela de 20 dias)

        return {
          id: app.id,
          client: app.cap_clients,
          service: app.cap_services,
          lastDate,
          dueDate,
          alertStartDate,
          status,
          daysLeft: differenceInDays(dueDate, now)
        };
      }).filter(item => item.status !== 'upcoming'); // Só mostramos quem já entrou na janela de 20 dias ou venceu

      setAlerts(alertList.sort((a, b) => a.daysLeft - b.daysLeft));
    } catch (err) {
      console.error('Erro ao buscar alertas:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = (alert) => {
    const firstName = alert.client.name.split(' ')[0];
    const message = `Olá ${firstName}! 👑 Passando para lembrar que já faz ${differenceInDays(new Date(), alert.lastDate)} dias desde seu último procedimento de ${alert.service.name}. Nossa agenda está aberta e adoraríamos te receber novamente em nossa corte para manter o brilho! Vamos agendar sua volta? ✨`;
    const whatsappUrl = `https://wa.me/55${alert.client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const filteredAlerts = alerts.filter(a => 
    a.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl text-slate-900 tracking-tight leading-none">Ações Proativas</h2>
          <p className="text-sm text-slate-500 mt-1">Antecipe o retorno das clientes com inteligência.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={14} /> Ciclo de 20 Dias Ativado
           </div>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por cliente ou serviço..." 
            className="w-full bg-slate-50 border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-accent/50 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="animate-spin text-accent mx-auto mb-4" size={32} />
            <p className="text-slate-400 font-serif">Consultando cronograma de beleza...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="col-span-full bg-white p-20 rounded-2xl border border-dashed border-slate-200 text-center space-y-4">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                <Bell className="text-slate-200" size={32} />
             </div>
             <p className="text-slate-400 font-serif">Nenhuma cliente precisa de manutenção nos próximos dias.</p>
          </div>
        ) : (
          filteredAlerts.map((item) => (
            <div key={item.id} className={`card-base p-6 relative overflow-hidden group hover:translate-y-[-4px] transition-all duration-300 ${item.status === 'overdue' ? 'border-rose-100' : 'border-amber-100'}`}>
              <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-lg text-[10px] font-bold uppercase tracking-wider ${item.status === 'overdue' ? 'bg-rose-500 text-white' : 'bg-amber-400 text-white'}`}>
                {item.status === 'overdue' ? 'Vencido' : 'Hora de Agendar'}
              </div>

              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-bold shrink-0">
                  {item.client.name.substring(0, 1)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-accent transition-colors">{item.client.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <Scissors size={12} className="text-accent" />
                    {item.service.name}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-50 text-[11px]">
                 <div className="flex justify-between items-center text-slate-500">
                    <span className="flex items-center gap-1"><Calendar size={12} /> Última Visita:</span>
                    <span className="font-medium">{format(item.lastDate, 'dd/MM/yyyy')}</span>
                 </div>
                 <div className="flex justify-between items-center text-slate-500">
                    <span className="flex items-center gap-1"><AlertCircle size={12} /> Data Ideal:</span>
                    <span className={`font-bold ${item.status === 'overdue' ? 'text-rose-500' : 'text-slate-900'}`}>
                      {format(item.dueDate, 'dd/MM/yyyy')}
                    </span>
                 </div>
              </div>

              <div className="mt-6 pt-4">
                <button 
                  onClick={() => sendInvitation(item)}
                  className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${item.status === 'overdue' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white shadow-lg`}
                >
                  <MessageCircle size={16} />
                  Convidar p/ Manutenção
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Maintenance;
