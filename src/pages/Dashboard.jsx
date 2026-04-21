import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, 
  Calendar, 
  Users, 
  Package, 
  ChevronRight, 
  Filter, 
  Loader2,
  Clock,
  AlertTriangle,
  Scissors
} from 'lucide-react';
import { startOfMonth, endOfMonth, format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const Dashboard = ({ profile: propProfile }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(propProfile);
  
  // Stats
  const [stats, setStats] = useState({
    revenue: 0,
    appointmentsCount: 0,
    clientsCount: 0,
    ticketMedio: 0,
    retentionRate: 0
  });

  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [inventoryAlerts, setInventoryAlerts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      let userProfile = profile;
      let userId = profile?.id;

      if (!userProfile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: fetchedProfile } = await supabase
            .from('cap_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          userProfile = fetchedProfile;
          userId = user.id;
          setProfile(userProfile);
        }
      }

      const isAdmin = userProfile?.role === 'admin';

      // Date Range: Mês Atual
      const start = startOfMonth(new Date()).toISOString();
      const end = endOfMonth(new Date()).toISOString();

      // 2. Fetch Stats (Completed apps in current month)
      let revenueQuery = supabase
        .from('cap_appointments')
        .select('total_price, client_id, status')
        .eq('status', 'completed')
        .gte('start_time', start)
        .lte('start_time', end);
      
      if (!isAdmin) revenueQuery = revenueQuery.eq('professional_id', userId);

      // 3. Fetch Clients (Total for context)
      const clientsQuery = supabase.from('cap_clients').select('id', { count: 'exact' });

      // 4. Fetch Upcoming Appointments
      let upcomingQuery = supabase
        .from('cap_appointments')
        .select(`
          id,
          start_time,
          status,
          cap_clients (name),
          cap_services (name)
        `)
        .eq('status', 'scheduled')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5);

      if (!isAdmin) upcomingQuery = upcomingQuery.eq('professional_id', userId);

      // 5. Fetch Inventory Alerts
      const inventoryQuery = supabase
        .from('cap_inventory')
        .select('*')
        .order('quantity', { ascending: true });

      const [revRes, cliRes, upRes, invRes] = await Promise.all([
        revenueQuery,
        clientsQuery,
        upcomingQuery,
        inventoryQuery
      ]);

      // Calculate Revenue Metrics
      const completedApps = revRes.data || [];
      const totalRevenue = completedApps.reduce((acc, curr) => acc + (curr.total_price || 0), 0);
      const appCount = completedApps.length;
      const ticket = appCount > 0 ? totalRevenue / appCount : 0;

      // Retention Calculation (Quick approach: clients with more than 1 completed app / total clients in month)
      const clientAppCounts = {};
      completedApps.forEach(app => {
        clientAppCounts[app.client_id] = (clientAppCounts[app.client_id] || 0) + 1;
      });
      const recurringClients = Object.values(clientAppCounts).filter(count => count > 1).length;
      const totalClientsInMonth = Object.keys(clientAppCounts).length;
      const retention = totalClientsInMonth > 0 ? (recurringClients / totalClientsInMonth) * 100 : 0;

      setStats({
        revenue: totalRevenue,
        appointmentsCount: appCount,
        clientsCount: cliRes.count || 0,
        ticketMedio: ticket,
        retentionRate: Math.round(retention)
      });

      setUpcomingAppointments(upRes.data || []);
      
      // Filter inventory alerts (quantity <= min_quantity)
      const alerts = (invRes.data || []).filter(item => item.quantity <= item.min_quantity);
      setInventoryAlerts(alerts);

    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-accent mb-4" size={40} />
        <p className="text-slate-400 font-serif">Preparando relatório de performance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl text-slate-900 tracking-tight leading-none">Resumo da Operação</h2>
          <p className="text-sm text-slate-500 mt-1">Dados reais de {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchDashboardData} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
            Atualizar Dados
          </button>
          <button onClick={() => navigate('/agenda')} className="btn-accent text-xs px-5 py-2 rounded-xl">
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Faturamento Mensal" value={formatCurrency(stats.revenue)} icon={<TrendingUp size={16}/>} />
        <StatCard label="Atendimentos Mês" value={stats.appointmentsCount} icon={<Scissors size={16}/>} />
        <StatCard label="Ticket Médio" value={formatCurrency(stats.ticketMedio)} icon={<TrendingUp size={16}/>} />
        <StatCard label="Taxa de Retenção" value={`${stats.retentionRate}%`} icon={<Users size={16}/>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Services */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-bold text-slate-900 leading-none">Próximos Agendamentos</h3>
            <button onClick={() => navigate('/agenda')} className="text-xs font-bold text-accent hover:underline flex items-center gap-1 uppercase tracking-tighter">
              Ver Agenda Completa <ChevronRight size={12} />
            </button>
          </div>
          <div className="card-base divide-y divide-slate-100 overflow-hidden bg-white">
            {upcomingAppointments.length === 0 ? (
              <div className="p-10 text-center text-slate-400 italic text-sm">Nenhum agendamento pendente.</div>
            ) : (
              upcomingAppointments.map((app) => (
                <div key={app.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                    {app.cap_clients?.name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 uppercase">{app.cap_clients?.name}</p>
                    <p className="text-xs text-slate-500">{app.cap_services?.name} • {format(parseISO(app.start_time), 'HH:mm')}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${isToday(parseISO(app.start_time)) ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'}`}>
                      {isToday(parseISO(app.start_time)) ? 'Hoje' : format(parseISO(app.start_time), 'dd/MM')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Inventory Alerts */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 leading-none px-2">Alertas de Estoque</h3>
          <div className="card-base p-6 space-y-6 bg-white">
            {inventoryAlerts.length === 0 ? (
              <div className="text-center py-4 text-emerald-600 space-y-2">
                 <Package size={32} className="mx-auto opacity-20" />
                 <p className="text-xs font-bold">Estoque em Dia!</p>
              </div>
            ) : (
              inventoryAlerts.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-xs items-center">
                    <span className="font-bold text-slate-700">{item.name}</span>
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded uppercase">{Math.round((item.quantity/item.min_quantity)*100)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full bg-rose-500 transition-all duration-500`} style={{ width: `${Math.min((item.quantity / item.min_quantity) * 100, 100)}%` }}></div>
                  </div>
                  <p className="text-[10px] text-slate-400">Resta apenas {item.quantity}{item.unit}</p>
                </div>
              ))
            )}
            <button onClick={() => navigate('/estoque')} className="w-full py-2.5 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors uppercase tracking-widest">
              Reabastecer Agora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon }) => (
  <div className="card-base p-6 bg-white group hover:border-slate-300 transition-all border-slate-100">
    <div className="flex items-center justify-between mb-4">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{label}</p>
      <div className="text-slate-300 group-hover:text-accent transition-colors">
        {icon}
      </div>
    </div>
    <div className="flex items-end justify-between">
      <span className="text-2xl font-bold text-slate-900 tracking-tight">{value}</span>
    </div>
  </div>
);

export default Dashboard;
