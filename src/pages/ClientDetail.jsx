import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  User, 
  Phone, 
  Cake, 
  Calendar, 
  ChevronLeft, 
  History, 
  MessageSquare,
  TrendingUp,
  Scissors,
  DollarSign,
  Loader2
} from 'lucide-react';
import Timeline from '../components/crm/Timeline';

const ClientDetail = () => {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' or 'history'

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const fetchClientData = async () => {
    // Validação de UUID para evitar erro 400 no Supabase
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      setClient(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch client basic info
      const { data: clientData, error: clientError } = await supabase
        .from('cap_clients')
        .select('*')
        .eq('id', id)
        .single();

      if (clientError) {
        console.error('Error fetching client:', clientError);
      } else {
        setClient(clientData);
      }

      // Fetch appointments history
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('cap_appointments')
        .select(`
          *,
          cap_services(name),
          cap_profiles(full_name)
        `)
        .eq('client_id', id)
        .order('start_time', { ascending: false });

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
      } else {
        setAppointments(appointmentsData || []);
      }
    } catch (err) {
      console.error('Unexpected error in fetchClientData:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-10 text-center text-slate-400">
        <p>Cliente não encontrado.</p>
        <Link to="/clientes" className="text-accent underline mt-4 block">Voltar para a lista</Link>
      </div>
    );
  }

  const totalSpent = appointments.reduce((acc, curr) => acc + (parseFloat(curr.total_price) || 0), 0);
  const lastVisit = appointments[0]?.start_time;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header / Navigation */}
      <div className="flex items-center gap-4">
        <Link to="/clientes" className="p-2 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors shadow-sm">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl text-slate-900 tracking-tight leading-none">Perfil do Cliente</h2>
          <p className="text-sm text-slate-500 mt-1">Gestão 360 e histórico personalizado.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Sidebar: Client Info & Stats */}
        <div className="space-y-6">
          <div className="card-base p-8 text-center bg-white">
            <div className="w-24 h-24 rounded-full bg-slate-50 border-4 border-slate-100 flex items-center justify-center text-3xl font-bold text-slate-400 mx-auto mb-4">
              {client.name.substring(0, 1).toUpperCase()}
            </div>
            <h3 className="text-xl font-bold text-slate-900 leading-tight uppercase">{client.name}</h3>
            <p className="text-sm text-slate-400 mb-6 font-medium">Cliente Premium</p>
            
            <div className="flex items-center justify-center gap-4 border-t border-slate-50 pt-6">
              <a href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`} target="_blank" className="p-2.5 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 transition-colors">
                 <Phone size={18} />
              </a>
              <button className="p-2.5 bg-rose-50 text-accent rounded-full hover:bg-rose-100 transition-colors">
                 <Cake size={18} />
              </button>
            </div>
          </div>

          <div className="card-base p-6 space-y-4 bg-white border-slate-100">
             <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ">Indicadores de Performance</h4>
             <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                   <p className="text-[10px] text-slate-400 font-bold uppercase truncate">Total Investido</p>
                   <p className="text-sm font-bold text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent)}</p>
                </div>
                <div className="space-y-1 text-right">
                   <p className="text-[10px] text-slate-400 font-bold uppercase truncate">Frequência</p>
                   <p className="text-sm font-bold text-slate-900">{appointments.length} Visitas</p>
                </div>
                <div className="col-span-2 space-y-1 pt-2 border-t border-slate-50">
                   <p className="text-[10px] text-slate-400 font-bold uppercase">Última Visita</p>
                   <p className="text-sm font-bold text-slate-900">{lastVisit ? new Date(lastVisit).toLocaleDateString('pt-BR') : 'Sem registro'}</p>
                </div>
             </div>
          </div>

          <div className="space-y-2 px-1">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Informações de Contato</p>
             <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone size={14} className="text-slate-300" /> {client.phone}
             </div>
             <div className="flex items-center gap-3 text-sm text-slate-600">
                <Cake size={14} className="text-slate-300" /> {client.birth_date ? new Date(client.birth_date + 'T12:00:00').toLocaleDateString('pt-BR') : '--/--'}
             </div>
          </div>
        </div>

        {/* Right Content Area: Tabs & Views */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center gap-2 border-b border-slate-100">
              <button 
                onClick={() => setActiveTab('timeline')}
                className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'timeline' ? 'border-accent text-accent' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Timeline Interativa
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'history' ? 'border-accent text-accent' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Histórico de Procedimentos
              </button>
           </div>

           <div className="pt-4">
              {activeTab === 'timeline' ? (
                <Timeline clientId={client.id} />
              ) : (
                <div className="card-base overflow-hidden border-slate-100 bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 font-bold text-[10px] text-slate-400 uppercase tracking-widest">
                        <th className="px-6 py-3 border-b border-slate-100">Data</th>
                        <th className="px-6 py-3 border-b border-slate-100">Serviço</th>
                        <th className="px-6 py-3 border-b border-slate-100">Profissional</th>
                        <th className="px-6 py-3 border-b border-slate-100 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                       {appointments.length === 0 ? (
                         <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-400">Nenhum procedimento registrado ainda.</td></tr>
                       ) : (
                         appointments.map((app) => (
                           <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-900">{new Date(app.start_time).toLocaleDateString('pt-BR')}</td>
                              <td className="px-6 py-4">
                                <span className="flex items-center gap-2">
                                   <Scissors size={12} className="text-accent" /> {app.cap_services?.name || 'Serviço'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-500">{app.cap_profiles?.full_name || 'Profissional'}</td>
                              <td className="px-6 py-4 text-right font-bold text-slate-900">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(app.total_price)}
                              </td>
                           </tr>
                         ))
                       )}
                    </tbody>
                  </table>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetail;
