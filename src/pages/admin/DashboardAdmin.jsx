import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { format, isToday, parseISO, addDays, isWithinInterval, setYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DashboardAdmin = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();

  const [loading, setLoading] = useState(true);
  const [faturamentoHoje, setFaturamentoHoje] = useState(0);
  const [faturamentoMes, setFaturamentoMes] = useState(0);
  const [totalAtendimentosHoje, setTotalAtendimentosHoje] = useState(0);
  const [estoqueBaixo, setEstoqueBaixo] = useState([]);
  const [aniversariantes, setAniversariantes] = useState([]);
  const [retornos, setRetornos] = useState([]);

  useEffect(() => {
    if (tenant?.id) {
      fetchDashboardData();
    }
  }, [tenant]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

      // 1. Agenda e Faturamento de Hoje
      const apptHoje = await api.appointments.list({
        start_date: startOfToday,
        end_date: endOfToday
      });

      const faturamentoHojeVal = apptHoje
        .filter(appt => appt.status === 'completed')
        .reduce((sum, appt) => sum + Number(appt.total_price), 0);
      setFaturamentoHoje(faturamentoHojeVal);
      setTotalAtendimentosHoje(apptHoje.length);

      // 2. Financeiro: Faturamento Mês
      const apptMes = await api.appointments.list({
        start_date: startOfMonth,
        end_date: endOfMonth
      });

      const faturamentoMesVal = apptMes
        .filter(appt => appt.status === 'completed')
        .reduce((sum, appt) => sum + Number(appt.total_price), 0);
      setFaturamentoMes(faturamentoMesVal);

      // 4. Estoque Baixo: quantity <= min_quantity
      const invData = await api.inventory.list();
      if (invData) {
        const baixos = invData.filter(item => Number(item.quantity) <= Number(item.min_quantity));
        setEstoqueBaixo(baixos);
      }

      // 5. Aniversariantes: próximos 30 dias
      const clientes = await api.clients.list(tenant.id);
      if (clientes) {
        const todayDate = new Date();
        const limitDate = addDays(todayDate, 30);
        
        const parseLocalBirthDate = (dateStr) => {
          if (!dateStr) return null;
          const [year, month, day] = String(dateStr).split('T')[0].split('-');
          return new Date(year, month - 1, day);
        };
        
        const aniversariantesFiltrados = clientes.filter(cliente => {
          if (!cliente.birth_date) return false;
          // Ignora o ano de nascimento e ajusta para o ano atual para comparar
          const dataNascimento = parseLocalBirthDate(cliente.birth_date);
          let niverEsteAno = setYear(dataNascimento, todayDate.getFullYear());
          
          // Se o aniversário deste ano já passou, joga pro ano que vem
          if (niverEsteAno < new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate())) {
             niverEsteAno = setYear(dataNascimento, todayDate.getFullYear() + 1);
          }

          return isWithinInterval(niverEsteAno, { start: todayDate, end: limitDate });
        }).sort((a, b) => {
           const dA = setYear(parseLocalBirthDate(a.birth_date), todayDate.getFullYear());
           const dB = setYear(parseLocalBirthDate(b.birth_date), todayDate.getFullYear());
           return dA - dB;
        });

        setAniversariantes(aniversariantesFiltrados);
      }

      // 6. Retornos de Manutenção (Próximos 30 dias)
      const apptsMaint = await api.appointments.list();
      if (apptsMaint) {
        const todayDate = new Date();
        // Zera as horas para comparar apenas os dias
        const startOfTodayZero = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
        const limitDate = addDays(startOfTodayZero, 30);
        
        const retornosFiltrados = apptsMaint.filter(appt => {
           if (appt.status !== 'completed') return false;
           if (!appt.maintenance_days) return false;
           const mDays = Number(appt.maintenance_days);
           if (mDays <= 0) return false;
           
           const dataServico = parseISO(appt.start_time);
           const dataRetorno = addDays(dataServico, mDays);
           
           return dataRetorno >= startOfTodayZero && dataRetorno <= limitDate;
        }).map(appt => {
           const dataRetorno = addDays(parseISO(appt.start_time), Number(appt.maintenance_days));
           return {
             id: appt.id,
             start_time: appt.start_time,
             client_name: appt.client_name,
             client_phone: appt.client_phone,
             service_name: appt.service_name,
             dataRetorno
           };
        }).sort((a, b) => a.dataRetorno - b.dataRetorno);
        
        setRetornos(retornosFiltrados);
      }

    } catch (err) {
      console.error("Erro ao carregar dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
        <div className="max-w-7xl mx-auto px-container-margin py-xl space-y-xl">
          
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
            <div>
              <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Visão Geral</h2>
              <p className="font-body-md text-body-md text-secondary mt-base">Bem-vindo ao painel gerencial do {tenant?.name}.</p>
            </div>
            <div className="flex gap-sm">
              <button className="px-md py-sm rounded-lg bg-surface-container-lowest border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-variant transition-colors flex items-center gap-xs">
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                Hoje, {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
              </button>
            </div>
          </div>

          {/* Bento Grid Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            
            {/* Revenue Card (Hoje) */}
            <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0px_4px_20px_rgba(0,0,0,0.04)] flex flex-col justify-between h-48 border border-white relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary-fixed opacity-20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Faturamento Hoje</p>
                  <h3 className="font-headline-md text-headline-md text-on-surface mt-xs">{formatCurrency(faturamentoHoje)}</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary-container/30 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">attach_money</span>
                </div>
              </div>
              <div className="relative z-10 flex items-end justify-between">
                <div className="flex items-center gap-xs text-sm text-secondary">
                  <span className="font-label-md text-xs">Agendamentos concluídos hoje</span>
                </div>
              </div>
            </div>

            {/* Revenue Card (Mes) */}
            <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0px_4px_20px_rgba(0,0,0,0.04)] flex flex-col justify-between h-48 border border-white relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-tertiary-container opacity-40 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Faturamento do Mês</p>
                  <h3 className="font-headline-md text-headline-md text-on-surface mt-xs">{formatCurrency(faturamentoMes)}</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-tertiary-container/30 flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-xs text-sm text-secondary">
                  <span className="font-label-md text-xs">Referente ao mês atual</span>
                </div>
              </div>
            </div>

            {/* Occupancy Card */}
            <div 
              onClick={() => navigate(`/${tenant_slug}/staff/agenda-profissional`)}
              className="bg-surface-container-lowest rounded-xl p-md shadow-[0px_4px_20px_rgba(0,0,0,0.04)] flex flex-col justify-between h-48 border border-white hover:border-primary cursor-pointer relative overflow-hidden group transition-colors"
            >
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-secondary-container opacity-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Agenda Hoje</p>
                  <h3 className="font-headline-md text-headline-md text-on-surface mt-xs">{totalAtendimentosHoje}</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined">event_seat</span>
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex justify-between font-label-sm text-label-sm text-secondary mb-xs">
                  <span>Atendimentos marcados</span>
                </div>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            {/* Low Stock Alert Widget */}
            <div className="bg-surface-container-lowest rounded-xl p-md shadow-sm border border-outline-variant flex flex-col h-80 overflow-hidden">
              <div className="flex justify-between items-center mb-md border-b border-outline-variant pb-3">
                <div className="flex items-center gap-2 text-error">
                  <span className="material-symbols-outlined">warning</span>
                  <h3 className="font-headline-sm text-on-surface">Alerta de Estoque Baixo</h3>
                </div>
                <span className="bg-error/10 text-error px-2 py-1 rounded-md text-xs font-bold">{estoqueBaixo.length} itens</span>
              </div>
              <div className="flex-1 overflow-y-auto pr-2">
                {estoqueBaixo.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-secondary opacity-70">
                    <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                    <p className="text-sm">Seu estoque está em dia!</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {estoqueBaixo.map((item, i) => (
                      <li key={i} className="flex justify-between items-center p-3 rounded-lg bg-surface-variant/30 border border-outline-variant/50">
                        <div className="flex flex-col">
                          <span className="font-body-md text-on-surface">{item.name}</span>
                          <span className="text-xs text-error font-medium">Mínimo ideal: {item.min_quantity} {item.unit}</span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="font-bold text-on-surface text-lg">{item.quantity}</span>
                          <span className="text-xs text-secondary">{item.unit}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Upcoming Birthdays Widget */}
            <div className="bg-surface-container-lowest rounded-xl p-md shadow-sm border border-outline-variant flex flex-col h-80 overflow-hidden">
              <div className="flex justify-between items-center mb-md border-b border-outline-variant pb-3">
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined">cake</span>
                  <h3 className="font-headline-sm text-on-surface">Aniversariantes (Próximos 30 dias)</h3>
                </div>
                <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-bold">{aniversariantes.length} clientes</span>
              </div>
              <div className="flex-1 overflow-y-auto pr-2">
                {aniversariantes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-secondary opacity-70">
                    <span className="material-symbols-outlined text-4xl mb-2">sentiment_satisfied</span>
                    <p className="text-sm">Nenhum aniversário próximo.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {aniversariantes.map((cli, i) => (
                      <li key={i} className="flex justify-between items-center p-3 rounded-lg bg-surface-variant/30 hover:bg-surface-variant/50 transition-colors cursor-default border border-outline-variant/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm uppercase">
                            {cli.name.substring(0, 2)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-body-md text-on-surface">{cli.name}</span>
                            <span className="text-xs text-secondary">{cli.phone}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="bg-white border border-outline-variant px-2 py-1 rounded-md text-xs font-bold text-primary">
                            {format(new Date(String(cli.birth_date).split('T')[0].split('-')[0], String(cli.birth_date).split('T')[0].split('-')[1] - 1, String(cli.birth_date).split('T')[0].split('-')[2]), "dd/MMM", { locale: ptBR })}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Retornos de Manutenção Widget */}
            <div className="bg-surface-container-lowest rounded-xl p-md shadow-sm border border-outline-variant flex flex-col h-80 overflow-hidden">
              <div className="flex justify-between items-center mb-md border-b border-outline-variant pb-3">
                <div className="flex items-center gap-2 text-tertiary">
                  <span className="material-symbols-outlined">event_repeat</span>
                  <h3 className="font-headline-sm text-on-surface">Retornos (30 dias)</h3>
                </div>
                <span className="bg-tertiary/10 text-tertiary px-2 py-1 rounded-md text-xs font-bold">{retornos.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto pr-2">
                {retornos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-secondary opacity-70">
                    <span className="material-symbols-outlined text-4xl mb-2">task_alt</span>
                    <p className="text-sm text-center">Nenhum retorno de<br/>manutenção previsto.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {retornos.map((ret, i) => (
                      <li key={i} className="flex flex-col gap-2 p-3 rounded-lg bg-surface-variant/30 hover:bg-surface-variant/50 transition-colors border border-outline-variant/50">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <span className="font-body-md text-on-surface font-bold">{ret.client_name}</span>
                            <span className="text-xs text-secondary">{ret.client_phone}</span>
                          </div>
                          <span className="bg-tertiary/10 border border-tertiary/20 px-2 py-1 rounded-md text-xs font-bold text-tertiary whitespace-nowrap">
                            {format(ret.dataRetorno, "dd/MMM", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-secondary bg-surface-bright px-2 py-1 rounded w-fit border border-outline-variant/30">
                          <span className="material-symbols-outlined text-[14px]">spa</span>
                          {ret.service_name}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
    </>
  );
};

export default DashboardAdmin;
