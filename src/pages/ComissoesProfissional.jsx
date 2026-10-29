import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Calendar, 
  Scissors, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Receipt
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters';

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
    <div className="space-y-8 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Cabeçalho Editorial Rosé */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink tracking-tight">
            Minhas comissões
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Acompanhe a evolução dos seus ganhos, serviços realizados e o histórico de repasses.
          </p>
        </div>

        {/* Seletor de Período em Pílula Rosé */}
        <div className="inline-flex items-center p-1 bg-stone-100 rounded-full border border-line self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPeriodo('mes_atual')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              periodo === 'mes_atual'
                ? 'bg-brand text-white shadow-xs'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            Mês atual
          </button>
          <button
            type="button"
            onClick={() => setPeriodo('mes_anterior')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              periodo === 'mes_anterior'
                ? 'bg-brand text-white shadow-xs'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            Mês anterior
          </button>
          <button
            type="button"
            onClick={() => setPeriodo('todos')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              periodo === 'todos'
                ? 'bg-brand text-white shadow-xs'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            Todo o período
          </button>
        </div>
      </div>

      {/* Grade de 3 KPIs Compactos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* KPI 1: A Receber (Pendente) */}
        <div className="rounded-[22px] border border-line bg-white shadow-xs p-5 sm:p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF8E1] flex items-center justify-center text-[#B78103] shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-ink-soft tracking-wider">A Receber (Pendente)</p>
            <h3 className="font-display font-bold text-2xl sm:text-3xl text-ink mt-0.5 tabular-nums">
              {formatCurrency(comissaoPendente)}
            </h3>
            <p className="text-xs text-ink-soft mt-0.5">
              {comissaoPendente > 0 ? 'Aguardando fechamento do gestor' : 'Tudo em dia'}
            </p>
          </div>
        </div>

        {/* KPI 2: Já Recebido (Pago) */}
        <div className="rounded-[22px] border border-line bg-white shadow-xs p-5 sm:p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E8F5E9] flex items-center justify-center text-[#2E7D32] shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-ink-soft tracking-wider">Já Recebido (Pago)</p>
            <h3 className="font-display font-bold text-2xl sm:text-3xl text-ink mt-0.5 tabular-nums">
              {formatCurrency(comissaoPaga)}
            </h3>
            <p className="text-xs text-ink-soft mt-0.5">Repassado pelo salão</p>
          </div>
        </div>

        {/* KPI 3: Faturamento Gerado */}
        <div className="rounded-[22px] border border-line bg-white shadow-xs p-5 sm:p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-tint flex items-center justify-center text-brand shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase font-semibold text-ink-soft tracking-wider">Faturamento Gerado</p>
            <h3 className="font-display font-bold text-2xl sm:text-3xl text-ink mt-0.5 tabular-nums">
              {formatCurrency(totalProduzido)}
            </h3>
            <p className="text-xs text-ink-soft mt-0.5">
              {appointments.length} {appointments.length === 1 ? 'atendimento concluído' : 'atendimentos concluídos'}
            </p>
          </div>
        </div>
      </div>

      {/* Card da Tabela de Extrato de Atendimentos */}
      <div className="rounded-[22px] border border-line bg-white shadow-xs overflow-hidden">
        
        {/* Cabeçalho do Card */}
        <div className="p-6 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-xl text-ink">Extrato de atendimentos</h2>
            <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
              Detalhamento de cada serviço prestado e a respectiva comissão no período.
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-ink-soft tabular-nums self-start sm:self-auto">
            {appointments.length} {appointments.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
            <div className="w-9 h-9 border-3 border-brand/20 border-t-brand rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">Carregando seus atendimentos...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-tint flex items-center justify-center text-brand mb-3">
              <Receipt className="w-7 h-7" />
            </div>
            <h3 className="font-display font-bold text-lg text-ink mb-1">
              Nenhum atendimento concluído encontrado
            </h3>
            <p className="text-xs text-ink-soft max-w-md">
              Não houve atendimentos finalizados para o período selecionado. À medida que seus agendamentos forem concluídos na agenda, eles aparecerão aqui.
            </p>
          </div>
        ) : (
          <>
            {/* Visualização Mobile (Cards Rosé) */}
            <div className="p-4 md:hidden space-y-3">
              {currentAppointments.map((appt) => {
                const isPaid = appt.commission_status === 'paid';
                const valorServico = Number(appt.total_price || 0);
                const valorComissao = Number(appt.staff_commission_value || 0);
                const porcentagem = valorServico > 0 ? Math.round((valorComissao / valorServico) * 100) : 0;

                return (
                  <div key={appt.id} className="rounded-[18px] border border-line bg-stone-50/50 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-brand-tint flex items-center justify-center text-brand shrink-0">
                          <Scissors className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-ink leading-snug">
                            {appt.service_name || 'Serviço Personalizado'}
                          </h4>
                          <p className="text-xs text-ink-soft flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-stone-400" />
                            <span>{appt.client_name || 'Não informado'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {isPaid ? (
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8F5E9] text-[#2E7D32]">
                              Pago
                            </span>
                            {appt.commission_paid_at && (
                              <span className="text-[10px] text-ink-soft mt-0.5">
                                {formatDateOnly(appt.commission_paid_at)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF8E1] text-[#B78103]">
                            Pendente
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-ink-soft bg-white px-3 py-1.5 rounded-xl border border-line/60">
                      <Calendar className="w-3.5 h-3.5 text-brand" />
                      <span>{formatDateTime(appt.end_time || appt.start_time)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-line/60">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-ink-soft tracking-wider block">Valor do Serviço</span>
                        <span className="text-xs font-medium text-ink tabular-nums">{formatCurrency(valorServico)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-semibold text-brand tracking-wider block">Sua Comissão</span>
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-base font-bold text-ink tabular-nums">{formatCurrency(valorComissao)}</span>
                          {porcentagem > 0 && (
                            <span className="text-[11px] text-ink-soft font-semibold">({porcentagem}%)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visualização Desktop / Tablet (Tabela Corporativa) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line bg-stone-50/60 text-ink-soft text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-6">Data & Hora</th>
                    <th className="py-3.5 px-6">Serviço & Cliente</th>
                    <th className="py-3.5 px-6 text-right">Valor do Serviço</th>
                    <th className="py-3.5 px-6 text-right">Sua Comissão</th>
                    <th className="py-3.5 px-6 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 text-sm">
                  {currentAppointments.map((appt) => {
                    const isPaid = appt.commission_status === 'paid';
                    const valorServico = Number(appt.total_price || 0);
                    const valorComissao = Number(appt.staff_commission_value || 0);
                    const porcentagem = valorServico > 0 ? Math.round((valorComissao / valorServico) * 100) : 0;

                    return (
                      <tr key={appt.id} className="hover:bg-stone-50/40 transition-colors">
                        <td className="py-4 px-6 text-ink whitespace-nowrap text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-brand shrink-0" />
                            <span className="font-medium tabular-nums">{formatDateTime(appt.end_time || appt.start_time)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-ink flex items-center gap-1.5">
                            <Scissors className="w-3.5 h-3.5 text-brand" />
                            <span>{appt.service_name || 'Serviço Personalizado'}</span>
                          </div>
                          <div className="text-xs text-ink-soft mt-0.5 flex items-center gap-1">
                            <User className="w-3 h-3 text-stone-400" />
                            <span>Cliente: {appt.client_name || 'Não informado'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right text-ink-soft tabular-nums">
                          {formatCurrency(valorServico)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="font-bold text-ink text-base tabular-nums">
                            {formatCurrency(valorComissao)}
                          </div>
                          {porcentagem > 0 && (
                            <div className="text-[11px] text-ink-soft font-semibold">
                              ({porcentagem}%)
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          {isPaid ? (
                            <div className="inline-flex flex-col items-center justify-center">
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Pago
                              </span>
                              {appt.commission_paid_at && (
                                <span className="text-[10px] text-ink-soft mt-1">
                                  em {formatDateOnly(appt.commission_paid_at)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF8E1] text-[#B78103]">
                              <Clock className="w-3.5 h-3.5" />
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

            {/* Paginação */}
            <div className="p-4 sm:p-5 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-soft">Itens por página:</span>
                <div className="relative">
                  <select 
                    value={itemsPerPage} 
                    onChange={(e) => {
                      setItemsPerPage(e.target.value === 'todos' ? 'todos' : Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-stone-50 border border-line px-3 py-1.5 pr-8 rounded-xl text-xs text-ink font-semibold outline-none focus:border-brand focus:ring-1 focus:ring-brand cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value="todos">Todos</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-ink-soft absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {itemsPerPage !== 'todos' && totalPages > 1 && (
                <div className="flex items-center gap-4">
                  <span className="text-xs text-ink-soft hidden sm:inline tabular-nums">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, appointments.length)} de {appointments.length} registros
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-line text-ink hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Página anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-semibold px-2 text-ink tabular-nums">
                      {currentPage} de {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-line text-ink hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Próxima página"
                    >
                      <ChevronRight className="w-4 h-4" />
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
