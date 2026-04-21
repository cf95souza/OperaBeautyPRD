import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Cake, 
  Search, 
  Loader2, 
  MessageCircle, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  CalendarDays
} from 'lucide-react';

const Birthdays = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [salonName, setSalonName] = useState('Capelli');
  const navigate = useNavigate();

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  useEffect(() => {
    fetchSettings();
    fetchBirthdays();
  }, [selectedMonth]);

  const fetchSettings = async () => {
    const { data } = await supabase.from('cap_settings').select('salon_name').single();
    if (data?.salon_name) setSalonName(data.salon_name);
  };

  const fetchBirthdays = async () => {
    setLoading(true);
    // Exttrair o mês da birth_date via SQL fragment no Supabase
    const { data, error } = await supabase
      .from('cap_clients')
      .select('*')
      .filter('birth_date', 'not.is', null);

    if (error) {
      console.error('Error fetching birthdays:', error);
    } else {
      // Filtrar no cliente para garantir compatibilidade entre formatos de data
      const filtered = data.filter(client => {
        const date = new Date(client.birth_date + 'T12:00:00');
        return (date.getMonth() + 1) === selectedMonth;
      }).sort((a, b) => {
        const dayA = new Date(a.birth_date + 'T12:00:00').getDate();
        const dayB = new Date(b.birth_date + 'T12:00:00').getDate();
        return dayA - dayB;
      });
      setClients(filtered);
    }
    setLoading(false);
  };

  const sendGreeting = (client) => {
    const message = `Olá ${client.name}! 👑 A equipe ${salonName} passa por aqui com um carinho especial: este é o seu mês! Desejamos um ciclo radiante. Como presente de aniversário, temos um mimo exclusivo te esperando na sua próxima visita deste mês. Parabéns! 🎉`;
    const whatsappUrl = `https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl text-slate-900 tracking-tight leading-none">Aniversariantes</h2>
          <p className="text-sm text-slate-500 mt-1">Planeje o marketing e encante seus clientes.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
          {months.map((m) => (
            <button
              key={m.value}
              onClick={() => setSelectedMonth(m.value)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                selectedMonth === m.value 
                ? 'bg-accent text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              } ${m.value > 6 && 'hidden lg:block'} ${m.value <= 6 && 'hidden sm:block'}`}
            >
              {m.label.substring(0, 3)}
            </button>
          ))}
          <select 
            className="sm:hidden bg-transparent text-xs font-bold text-slate-600 outline-none px-2"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <div className="lg:hidden hidden sm:flex items-center gap-1 px-2 border-l border-slate-100 ml-1">
             <Filter size={14} className="text-slate-400" />
             <select 
               className="bg-transparent text-xs font-bold text-slate-600 outline-none"
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
             >
               <option value="">Outros meses...</option>
               {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
             </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="animate-spin text-accent mx-auto mb-4" size={32} />
            <p className="text-slate-400 font-serif">Consultando aniversariantes...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="col-span-full bg-white p-20 rounded-lg border border-slate-100 text-center space-y-4">
             <CalendarDays className="mx-auto text-slate-200" size={64} />
             <p className="text-slate-400 text-lg font-serif">Nesta lua, não temos aniversariantes registrados.</p>
             <button onClick={() => setSelectedMonth(new Date().getMonth() + 1)} className="text-accent font-bold text-sm hover:underline">Voltar para o mês atual</button>
          </div>
        ) : (
          clients.map((client) => {
            const birth = new Date(client.birth_date + 'T12:00:00');
            const isToday = new Date().getDate() === birth.getDate() && (new Date().getMonth() + 1) === selectedMonth;
            
            return (
              <div key={client.id} className={`card-base p-6 relative overflow-hidden group transition-all duration-300 hover:translate-y-[-4px] ${isToday ? 'border-accent/30 ring-1 ring-accent/10' : ''}`}>
                {isToday && (
                  <div className="absolute top-0 right-0 bg-accent text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                    <Cake size={10} /> É HOJE!
                  </div>
                )}
                
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-2 ${isToday ? 'bg-rose-50 border-accent text-accent' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    {client.name.substring(0, 1)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight uppercase">{client.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Cake size={12} className="text-rose-400" /> 
                      Dia {birth.getDate()} de {months[selectedMonth - 1].label}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-50">
                  <button 
                    onClick={() => sendGreeting(client)}
                    className="w-full btn-primary !bg-emerald-600 hover:!bg-emerald-700 py-2.5 text-xs flex items-center justify-center gap-2 group-hover:shadow-lg transition-all"
                  >
                    <MessageCircle size={16} /> Enviar Mimo via WhatsApp
                  </button>
                  <button 
                    onClick={() => navigate(`/clientes/${client.id}`)}
                    className="w-full py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    Ver Perfil Completo
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!loading && clients.length > 0 && (
        <div className="text-center pt-8">
           <p className="text-xs text-slate-400 italic">Total de {clients.length} aniversariantes em {months[selectedMonth - 1].label}.</p>
        </div>
      )}
    </div>
  );
};

export default Birthdays;
