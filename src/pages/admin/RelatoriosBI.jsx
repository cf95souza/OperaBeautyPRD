import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';

const RelatoriosBI = () => {
  const { tenant } = useTenant();
  const { showError } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [retention, setRetention] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [heatmap, setHeatmap] = useState([]);

  useEffect(() => {
    if (tenant?.id) {
      fetchData();
    }
  }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [retData, rankData, heatData] = await Promise.all([
        api.request('/reports/bi/retention'),
        api.request('/reports/bi/staff-ranking'),
        api.request('/reports/bi/heatmap')
      ]);
      setRetention(retData);
      setRanking(rankData || []);
      setHeatmap(heatData || []);
    } catch (err) {
      console.error(err);
      showError("Erro ao carregar relatórios BI.");
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (dayNumber) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    return days[dayNumber] || '';
  };

  const getHeatmapColor = (count) => {
    if (count === 0) return 'bg-success-container text-success-on-container border border-success/30'; // Ocioso (bom pra promo)
    if (count <= 2) return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    if (count <= 5) return 'bg-orange-100 text-orange-800 border border-orange-200';
    return 'bg-error-container text-error-on-container border border-error/30'; // Muito ocupado
  };

  if (loading) return <div className="p-xl flex justify-center text-primary">Gerando relatórios...</div>;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto pb-xl animate-fade-in-up">
      <div className="mb-xl flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-4xl">insights</span> Inteligência de Negócio
          </h1>
          <p className="font-body-md text-body-md text-secondary">
            Visão estratégica dos últimos 30 dias para apoiar suas decisões.
          </p>
        </div>
        <button onClick={fetchData} className="w-10 h-10 flex items-center justify-center bg-surface-variant/30 text-on-surface rounded-full hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined">refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Widget 1: Retenção */}
        <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-6 flex flex-col">
          <h2 className="font-headline-sm text-primary mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined">how_to_reg</span> Retenção de Clientes
          </h2>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-48 h-48 mb-6">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <path
                  className="text-surface-variant"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="text-primary transition-all duration-1000 ease-out"
                  strokeDasharray={`${retention?.retainedPercentage || 0}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-primary">{retention?.retainedPercentage || 0}%</span>
                <span className="text-xs text-secondary uppercase tracking-widest">Retidos</span>
              </div>
            </div>
            
            <div className="flex justify-center gap-8 w-full border-t border-surface-variant pt-4">
              <div className="text-center">
                <p className="text-xs text-secondary mb-1">Novos (1ª Visita)</p>
                <p className="font-bold text-xl text-on-surface">{retention?.new || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-secondary mb-1">Recorrentes</p>
                <p className="font-bold text-xl text-primary">{retention?.retained || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 2: Ranking de Equipe */}
        <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-6">
          <h2 className="font-headline-sm text-primary mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined">leaderboard</span> Ranking da Equipe
          </h2>
          
          <div className="overflow-hidden">
            {ranking.length === 0 ? (
              <p className="text-secondary text-center py-8">Nenhum dado de equipe no período.</p>
            ) : (
              <div className="space-y-4">
                {ranking.map((staff, idx) => (
                  <div key={staff.id} className="flex items-center justify-between bg-surface-variant/10 p-4 rounded-xl border border-surface-variant/30">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-surface-variant text-secondary'}`}>
                        {idx + 1}º
                      </div>
                      <div>
                        <p className="font-bold text-on-surface">{staff.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-secondary flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check_circle</span> {staff.completed} Atend.</span>
                          <span className={`text-xs flex items-center gap-1 ${staff.cancellation_rate > 15 ? 'text-error font-bold' : 'text-secondary'}`}>
                            <span className="material-symbols-outlined text-[14px]">cancel</span> {staff.cancellation_rate}% Cancel.
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-secondary mb-1">Faturamento</p>
                      <p className="font-bold text-primary">R$ {staff.revenue.toFixed(2).replace('.', ',')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Widget 3: Mapa de Calor (Ociosidade) */}
      <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline-sm text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">calendar_month</span> Mapa de Ociosidade (Horários Vagos)
          </h2>
          <div className="flex items-center gap-3 text-xs text-secondary">
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-success-container border border-success/30"></div> Alta Ociosidade</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-error-container border border-error/30"></div> Alta Ocupação</span>
          </div>
        </div>
        
        <p className="text-sm text-secondary mb-6">Analise as cores verdes (horários ociosos) para criar promoções ou cupons estratégicos.</p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse min-w-[600px]">
            <thead>
              <tr>
                <th className="p-2 font-semibold text-secondary text-sm border-b border-surface-variant">Hora</th>
                {[1, 2, 3, 4, 5, 6, 7].map(day => (
                  <th key={day} className="p-2 font-semibold text-secondary text-sm border-b border-surface-variant w-1/8">
                    {getDayName(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(13)].map((_, i) => {
                const hour = i + 8; // Das 08:00 às 20:00
                return (
                  <tr key={hour}>
                    <td className="p-2 text-sm text-secondary font-medium">{hour}:00</td>
                    {[1, 2, 3, 4, 5, 6, 7].map(day => {
                      const dataPoint = heatmap.find(h => h.day === day && h.hour === hour);
                      const count = dataPoint ? dataPoint.count : 0;
                      return (
                        <td key={`${day}-${hour}`} className="p-1">
                          <div className={`rounded-lg py-2 text-xs font-bold ${getHeatmapColor(count)} transition-all hover:scale-105 cursor-default`}>
                            {count} agend.
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default RelatoriosBI;
