import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ComissoesProfissional = () => {
  const { tenant_slug } = useParams();
  const { tenant, session } = useTenant();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [periodo, setPeriodo] = useState('mes_atual'); // mes_atual, mes_anterior, todos
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    if (tenant?.id && session?.id) {
      setCurrentPage(1);
      fetchComissoes();
    }
  }, [tenant, session, periodo]);

  const fetchComissoes = async () => {
    setLoading(true);
    try {
      const today = new Date();
      let start_date = undefined;
      let end_date = undefined;

      if (periodo === 'mes_atual') {
        start_date = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        end_date = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      } else if (periodo === 'mes_anterior') {
        start_date = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString();
        end_date = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999).toISOString();
      }

      const data = await api.appointments.list({
        start_date,
        end_date,
        staff_id: session?.id
      });

      // Filtra apenas atendimentos concluídos
      const completed = (data || []).filter(appt => appt.status === 'completed');
      
      // Ordenar por data decrescente
      completed.sort((a, b) => new Date(b.end_time || b.start_time) - new Date(a.end_time || a.start_time));

      setAppointments(completed);
    } catch (err) {
      console.error("Erro ao buscar comissões do profissional:", err);
    } finally {
      setLoading(false);
    }
  };

  const { comissaoPendente, comissaoPaga, totalProduzido } = useMemo(() => {
    let pendente = 0;
    let paga = 0;
    let produzido = 0;

    appointments.forEach(appt => {
      const valorComissao = Number(appt.staff_commission_value || 0);
      const valorTotal = Number(appt.total_price || 0);

      produzido += valorTotal;
      if (appt.commission_status === 'paid') {
        paga += valorComissao;
      } else {
        pendente += valorComissao;
      }
    });

    return { comissaoPendente: pendente, comissaoPaga: paga, totalProduzido: produzido };
  }, [appointments]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return dateStr;
    }
  };

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch (e) {
      return dateStr;
    }
  };

  const totalPages = itemsPerPage === 'todos' ? 1 : Math.ceil(appointments.length / itemsPerPage);
  const currentAppointments = useMemo(() => {
    if (itemsPerPage === 'todos') return appointments;
    const startIdx = (currentPage - 1) * itemsPerPage;
    return appointments.slice(startIdx, startIdx + itemsPerPage);
  }, [appointments, currentPage, itemsPerPage]);

  return (
    <div className="max-w-[1100px] mx-auto py-lg px-container-margin md:px-0 animate-fade-in-up">
      {/* Header e Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md mb-xl border-b border-surface-variant/30 pb-lg">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            <span>Painel do Profissional</span>
          </div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">
            Minhas Comissões
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Acompanhe a evolução dos seus ganhos e o histórico de repasses financeiros.
          </p>
        </div>

        {/* Seletor de Período */}
        <div className="flex items-center bg-surface-variant/40 p-1 rounded-xl border border-outline-variant/30 self-start md:self-auto">
          <button
            onClick={() => setPeriodo('mes_atual')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              periodo === 'mes_atual'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Mês Atual
          </button>
          <button
            onClick={() => setPeriodo('mes_anterior')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              periodo === 'mes_anterior'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Mês Anterior
          </button>
          <button
            onClick={() => setPeriodo('todos')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              periodo === 'todos'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Todo Período
          </button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-xl">
        {/* Card 1: A Receber / Pendente */}
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-lg shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between mb-sm">
            <span className="font-bold text-sm text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[20px] text-amber-600">pending_actions</span>
              A Receber (Pendente)
            </span>
          </div>
          <p className="text-3xl font-black text-on-surface mb-1 tracking-tight">
            {formatCurrency(comissaoPendente)}
          </p>
          <p className="text-xs text-on-surface-variant flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse"></span>
            Aguardando fechamento do gestor
          </p>
        </div>

        {/* Card 2: Recebidas / Pagas */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-lg shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-sm">
            <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
              Já Recebido (Pago)
            </span>
          </div>
          <p className="text-3xl font-black text-on-surface mb-1 tracking-tight">
            {formatCurrency(comissaoPaga)}
          </p>
          <p className="text-xs text-on-surface-variant flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Repassado pelo salão
          </p>
        </div>

        {/* Card 3: Total Produzido */}
        <div className="bg-slate-900 text-white rounded-2xl p-lg shadow-xl relative overflow-hidden group hover:bg-slate-800 transition-all">
          <div className="flex items-center justify-between mb-sm">
            <span className="font-bold text-sm text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[20px] text-slate-400">payments</span>
              Faturamento Gerado
            </span>
          </div>
          <p className="text-3xl font-black text-white mb-1 tracking-tight">
            {formatCurrency(totalProduzido)}
          </p>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">analytics</span>
            {appointments.length} atendimento(s) concluído(s)
          </p>
        </div>
      </div>

      {/* Tabela de Extrato */}
      <div className="bg-white rounded-2xl shadow-[0px_4px_25px_rgba(0,0,0,0.03)] border border-surface-variant/20 overflow-hidden">
        <div className="p-lg border-b border-surface-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-variant/10">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
              Extrato de Atendimentos
            </h3>
            <p className="text-xs text-on-surface-variant">
              Detalhamento de cada serviço prestado e sua respectiva comissão no período selecionado.
            </p>
          </div>
          <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold self-start sm:self-auto">
            {appointments.length} registro(s)
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-2">progress_activity</span>
            <p className="text-sm font-medium">Carregando seus ganhos...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant text-center px-4">
            <div className="w-16 h-16 rounded-full bg-surface-variant/40 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/60">receipt_long</span>
            </div>
            <p className="font-bold text-on-surface mb-1">Nenhum atendimento concluído encontrado</p>
            <p className="text-sm max-w-md text-on-surface-variant">
              Não houve atendimentos finalizados para o período selecionado. À medida em que seus agendamentos forem concluídos, eles aparecerão aqui.
            </p>
          </div>
        ) : (
          <>
            {/* Visualização Mobile (Cards) - Otimizado para Celulares */}
            <div className="p-4 md:hidden space-y-3.5">
              {currentAppointments.map((appt) => {
                const isPaid = appt.commission_status === 'paid';
                const valorServico = Number(appt.total_price || 0);
                const valorComissao = Number(appt.staff_commission_value || 0);
                const porcentagem = valorServico > 0 ? Math.round((valorComissao / valorServico) * 100) : 0;

                return (
                  <div key={appt.id} className="bg-surface-variant/10 rounded-2xl p-4 border border-surface-variant/30 shadow-sm hover:border-primary/40 transition-all flex flex-col gap-3">
                    {/* Top: Serviço e Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[20px]">content_cut</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-on-surface text-base leading-snug">
                            {appt.service_name || 'Serviço Personalizado'}
                          </h4>
                          <div className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[14px]">person</span>
                            <span className="font-medium">{appt.client_name || 'Não informado'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Badge Status */}
                      <div className="shrink-0">
                        {isPaid ? (
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="material-symbols-outlined text-[13px]">check_circle</span>
                              Pago
                            </span>
                            {appt.commission_paid_at && (
                              <span className="text-[10px] text-secondary font-medium mt-0.5">
                                {formatDateOnly(appt.commission_paid_at)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            <span className="material-symbols-outlined text-[13px]">schedule</span>
                            Pendente
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meio: Data e Hora */}
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-variant/25 px-3 py-2 rounded-xl">
                      <span className="material-symbols-outlined text-[16px] text-secondary">event</span>
                      <span className="font-semibold">{formatDateTime(appt.end_time || appt.start_time)}</span>
                    </div>

                    {/* Fundo: Valores Financeiros */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-surface-variant/30">
                      <div>
                        <span className="text-[10px] text-on-surface-variant block uppercase font-bold tracking-wider">Valor do Serviço</span>
                        <span className="text-sm font-semibold text-on-surface">{formatCurrency(valorServico)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-primary block uppercase font-black tracking-wider">Sua Comissão</span>
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-lg font-black text-on-surface">{formatCurrency(valorComissao)}</span>
                          {porcentagem > 0 && (
                            <span className="text-xs text-secondary font-bold">({porcentagem}%)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visualização Desktop / Tablet (Tabela) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-variant/20 bg-surface-variant/20 text-on-surface-variant text-xs font-black uppercase tracking-wider">
                    <th className="py-4 px-6">Data & Hora</th>
                    <th className="py-4 px-6">Serviço / Cliente</th>
                    <th className="py-4 px-6 text-right">Valor do Serviço</th>
                    <th className="py-4 px-6 text-right">Sua Comissão</th>
                    <th className="py-4 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant/10 font-body-md text-sm">
                  {currentAppointments.map((appt) => {
                    const isPaid = appt.commission_status === 'paid';
                    const valorServico = Number(appt.total_price || 0);
                    const valorComissao = Number(appt.staff_commission_value || 0);
                    const porcentagem = valorServico > 0 ? Math.round((valorComissao / valorServico) * 100) : 0;

                    return (
                      <tr key={appt.id} className="hover:bg-surface-variant/10 transition-colors">
                        <td className="py-4 px-6 text-on-surface font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary text-[18px]">event</span>
                            <span>{formatDateTime(appt.end_time || appt.start_time)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-on-surface flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-primary">content_cut</span>
                            <span>{appt.service_name || 'Serviço Personalizado'}</span>
                          </div>
                          <div className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">person</span>
                            <span>Cliente: {appt.client_name || 'Não informado'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right font-medium text-on-surface-variant">
                          {formatCurrency(valorServico)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="font-bold text-on-surface text-base">
                            {formatCurrency(valorComissao)}
                          </div>
                          {porcentagem > 0 && (
                            <div className="text-[11px] text-secondary font-semibold">
                              ({porcentagem}%)
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          {isPaid ? (
                            <div className="inline-flex flex-col items-center justify-center">
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                Pago
                              </span>
                              {appt.commission_paid_at && (
                                <span className="text-[10px] text-secondary mt-1">
                                  em {formatDateOnly(appt.commission_paid_at)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <span className="material-symbols-outlined text-[14px]">schedule</span>
                              Pendente
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-surface-variant/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-on-surface-variant">Itens por página:</span>
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => {
                    setItemsPerPage(e.target.value === 'todos' ? 'todos' : Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-surface-variant p-1.5 rounded-lg text-sm border-none outline-none text-on-surface focus:ring-2 focus:ring-primary/50"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value="todos">Todos</option>
                </select>
              </div>

              {itemsPerPage !== 'todos' && totalPages > 1 && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-on-surface-variant hidden sm:inline">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, appointments.length)} de {appointments.length} registros
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-surface-variant text-on-surface hover:bg-surface-variant/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                    </button>
                    <span className="text-sm font-semibold px-2">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-surface-variant text-on-surface hover:bg-surface-variant/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ComissoesProfissional;
