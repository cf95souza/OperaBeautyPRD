import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Download, 
  Printer, 
  Calendar, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  X,
  PieChart as PieIcon,
  BarChart3,
  Award,
  Wallet
} from 'lucide-react';
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  subDays, 
  startOfYear, 
  endOfYear,
  eachDayOfInterval,
  isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';
import { downloadCSV } from '../../utils/csv';

/**
 * Modal de Confirmação de Pagamento de Comissões
 */
const ModalPagarComissao = ({ isOpen, profissional, onClose, onConfirm, processando }) => {
  if (!isOpen || !profissional) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-[24px] border border-line shadow-2xl p-6 sm:p-7 overflow-hidden">
        <button
          onClick={onClose}
          disabled={processando}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 transition-colors p-1 rounded-full hover:bg-stone-100 cursor-pointer disabled:opacity-50"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-brand-tint/60 text-brand flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-stone-900">Pagar Comissões</h3>
            <p className="text-xs text-stone-500">{profissional.name}</p>
          </div>
        </div>

        <div className="p-4 bg-stone-50 rounded-2xl border border-line/60 mb-6 text-center">
          <span className="text-xs text-stone-500 block mb-1">Valor pendente a quitar</span>
          <span className="font-display font-bold text-2xl text-stone-900 tabular-nums lining-nums text-brand">
            {formatCurrency(profissional.pending)}
          </span>
          <p className="text-xs text-stone-500 mt-2">
            Todas as comissões pendentes deste profissional neste período serão marcadas como pagas.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={processando}
            className="flex-1 py-2.5 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(profissional.id, profissional.pending)}
            disabled={processando}
            className="flex-1 py-2.5 rounded-full bg-brand text-white hover:brightness-110 font-medium text-sm transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processando ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Confirmar quitação</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Gestão Financeira do Salão (Item J3 - P1)
 * Implementação alinhada aos tokens Rosé Editorial, regras 9.1.2 e 9.1.4
 */
const GestaoFinanceira = () => {
  const { tenant_slug } = useParams();
  const { tenant } = useTenant();

  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('este_mes'); // 'este_mes', 'mes_passado', 'ultimos_30', 'este_ano', 'custom'
  const [dataInicioCustom, setDataInicioCustom] = useState('');
  const [dataFimCustom, setDataFimCustom] = useState('');

  // Métricas agregadas
  const [entradasMes, setEntradasMes] = useState(0);
  const [descontosMes, setDescontosMes] = useState(0);
  const [ticketMedio, setTicketMedio] = useState(0);
  const [comissoesTotal, setComissoesTotal] = useState(0);
  const [comissoesPagar, setComissoesPagar] = useState(0);
  const [transacoes, setTransacoes] = useState([]);
  const [comissoesPorProfissional, setComissoesPorProfissional] = useState([]);
  const [rankingServicos, setRankingServicos] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState({});
  const [dadosReceitaPorDia, setDadosReceitaPorDia] = useState([]);

  // Paginação da tabela
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Estados de modais e feedbacks
  const [profissionalParaPagar, setProfissionalParaPagar] = useState(null);
  const [pagandoComissao, setPagandoComissao] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Calcula o intervalo de datas conforme o período selecionado
  const { intervaloInicio, intervaloFim, rotuloPeriodo } = useMemo(() => {
    const hoje = new Date();
    let inicio = startOfMonth(hoje);
    let fim = endOfMonth(hoje);
    let rotulo = format(hoje, "MMMM 'de' yyyy", { locale: ptBR });

    if (periodo === 'mes_passado') {
      const mesPassado = subMonths(hoje, 1);
      inicio = startOfMonth(mesPassado);
      fim = endOfMonth(mesPassado);
      rotulo = format(mesPassado, "MMMM 'de' yyyy", { locale: ptBR });
    } else if (periodo === 'ultimos_30') {
      inicio = subDays(hoje, 30);
      fim = hoje;
      rotulo = 'Últimos 30 dias';
    } else if (periodo === 'este_ano') {
      inicio = startOfYear(hoje);
      fim = endOfYear(hoje);
      rotulo = `Ano de ${hoje.getFullYear()}`;
    } else if (periodo === 'custom' && dataInicioCustom && dataFimCustom) {
      inicio = new Date(`${dataInicioCustom}T00:00:00`);
      fim = new Date(`${dataFimCustom}T23:59:59.999`);
      rotulo = `${format(inicio, 'dd/MM/yyyy')} até ${format(fim, 'dd/MM/yyyy')}`;
    }

    return {
      intervaloInicio: inicio.toISOString(),
      intervaloFim: fim.toISOString(),
      rotuloPeriodo: rotulo.charAt(0).toUpperCase() + rotulo.slice(1)
    };
  }, [periodo, dataInicioCustom, dataFimCustom]);

  useEffect(() => {
    if (tenant?.id) {
      fetchFinanceData();
    }
  }, [tenant, intervaloInicio, intervaloFim]);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const data = await api.appointments.list({
        start_date: intervaloInicio,
        end_date: intervaloFim
      });

      const appointments = (data || []).filter(appt => appt.status === 'completed');

      if (appointments.length > 0) {
        const totalEntradas = appointments.reduce((sum, appt) => sum + Number(appt.total_price || 0), 0);
        setEntradasMes(totalEntradas);

        const totalDescontos = appointments.reduce((sum, appt) => sum + Number(appt.discount_applied || 0), 0);
        setDescontosMes(totalDescontos);

        setTicketMedio(totalEntradas / appointments.length);

        const totalComissoes = appointments.reduce((sum, appt) => sum + Number(appt.staff_commission_value || 0), 0);
        setComissoesTotal(totalComissoes);

        // Ranking de Serviços
        const revenueByService = {};
        appointments.forEach(appt => {
          const sName = appt.service_name || 'Serviço Personalizado';
          revenueByService[sName] = (revenueByService[sName] || 0) + Number(appt.total_price || 0);
        });

        const servicosOrdenados = Object.entries(revenueByService)
          .map(([name, value]) => ({ name, value, percent: totalEntradas > 0 ? (value / totalEntradas) * 100 : 0 }))
          .sort((a, b) => b.value - a.value);
        setRankingServicos(servicosOrdenados);

        // Comissões por Profissional
        const comissoesMap = {};
        appointments.forEach(appt => {
          const pId = appt.staff_id || 'unknown';
          const pName = appt.staff_name || 'Profissional';
          if (!comissoesMap[pId]) {
            comissoesMap[pId] = { id: pId, name: pName, commission: 0, revenue: 0, pending: 0 };
          }
          const valComissao = Number(appt.staff_commission_value || 0);
          comissoesMap[pId].commission += valComissao;
          if (appt.commission_status === 'pending') {
            comissoesMap[pId].pending += valComissao;
          }
          comissoesMap[pId].revenue += Number(appt.total_price || 0);
        });

        const comissoesArray = Object.values(comissoesMap).sort((a, b) => b.commission - a.commission);
        setComissoesPorProfissional(comissoesArray);

        const totalPendente = comissoesArray.reduce((acc, curr) => acc + curr.pending, 0);
        setComissoesPagar(totalPendente);

        // Quebra por Forma de Pagamento
        const paymentMap = {
          pix: { label: 'Pix', total: 0, count: 0, color: 'bg-emerald-500' },
          credit_card: { label: 'Cartão de Crédito', total: 0, count: 0, color: 'bg-brand' },
          debit_card: { label: 'Cartão de Débito', total: 0, count: 0, color: 'bg-blue-600' },
          cash: { label: 'Dinheiro', total: 0, count: 0, color: 'bg-amber-500' },
          other: { label: 'Outros / Vale', total: 0, count: 0, color: 'bg-purple-500' },
        };

        appointments.forEach(appt => {
          const method = appt.payment_method || 'credit_card';
          const target = paymentMap[method] || paymentMap.other;
          target.total += Number(appt.total_price || 0);
          target.count += 1;
        });

        setFormasPagamento(paymentMap);

        // Receita por Dia para o Gráfico
        const dataInicioObj = parseISO(intervaloInicio);
        const dataFimObj = parseISO(intervaloFim);
        
        let diasNoIntervalo = [];
        try {
          diasNoIntervalo = eachDayOfInterval({ start: dataInicioObj, end: dataFimObj });
        } catch {
          diasNoIntervalo = [dataInicioObj];
        }

        // Limita a exibição diária para no máximo 31 dias para legibilidade perfeita
        const diasParaGrafico = diasNoIntervalo.slice(0, 31).map(dia => {
          const diaFormatado = format(dia, 'yyyy-MM-dd');
          const diaRotulo = format(dia, 'dd/MM');
          const diaNome = format(dia, 'EEE', { locale: ptBR });

          const totalDia = appointments
            .filter(a => format(parseISO(a.start_time), 'yyyy-MM-dd') === diaFormatado)
            .reduce((sum, a) => sum + Number(a.total_price || 0), 0);

          return {
            diaFormatado,
            diaRotulo,
            diaNome,
            total: totalDia
          };
        });

        setDadosReceitaPorDia(diasParaGrafico);

        // Ordenar transações por data decrescente
        const appointmentsSorted = appointments.slice().sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
        setTransacoes(appointmentsSorted);
      } else {
        setEntradasMes(0);
        setDescontosMes(0);
        setTicketMedio(0);
        setComissoesTotal(0);
        setComissoesPagar(0);
        setRankingServicos([]);
        setComissoesPorProfissional([]);
        setFormasPagamento({});
        setDadosReceitaPorDia([]);
        setTransacoes([]);
      }

    } catch (err) {
      console.error("Erro ao carregar dados financeiros:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayCommission = async (staffId, amount) => {
    if (amount <= 0) {
      setToastMessage('Não há comissões pendentes para este profissional.');
      return;
    }

    setPagandoComissao(true);
    try {
      await api.appointments.payCommissions(staffId);
      setToastMessage('Comissões quitadas com sucesso!');
      setProfissionalParaPagar(null);
      fetchFinanceData();
    } catch (error) {
      console.error('Erro ao quitar comissões:', error);
      alert(error.message || 'Erro ao pagar comissões.');
    } finally {
      setPagandoComissao(false);
    }
  };

  const handleExportCSV = () => {
    if (!transacoes || transacoes.length === 0) {
      alert('Não há dados para exportar no período selecionado.');
      return;
    }

    const csvData = transacoes.map(t => ({
      Data: format(parseISO(t.start_time), 'dd/MM/yyyy HH:mm'),
      Cliente: t.client_name || 'Cliente Avulso',
      Serviço: t.service_name || 'Serviço',
      Profissional: t.staff_name || 'Equipe',
      Forma_Pagamento: t.payment_method || 'Cartão de Crédito',
      Valor_Cobrado: Number(t.total_price || 0).toFixed(2),
      Desconto_Aplicado: Number(t.discount_applied || 0).toFixed(2),
      Comissao_Gerada: Number(t.staff_commission_value || 0).toFixed(2),
      Status_Comissao: t.commission_status === 'paid' ? 'Paga' : 'Pendente'
    }));

    const nomeArquivo = `relatorio_financeiro_${tenant_slug}_${periodo}.csv`;
    downloadCSV(csvData, nomeArquivo);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper para badge de forma de pagamento
  const renderPaymentBadge = (method) => {
    switch (method) {
      case 'pix':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800">Pix</span>;
      case 'debit_card':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800">Débito</span>;
      case 'cash':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800">Dinheiro</span>;
      case 'credit_card':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-tint/60 text-brand">Crédito</span>;
    }
  };

  // Maior valor diário para escala do gráfico
  const maxReceitaDiaria = useMemo(() => {
    if (!dadosReceitaPorDia || dadosReceitaPorDia.length === 0) return 100;
    const max = Math.max(...dadosReceitaPorDia.map(d => d.total));
    return max > 0 ? max : 100;
  }, [dadosReceitaPorDia]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-3 border-brand/20 border-t-brand rounded-full animate-spin" />
        <p className="text-sm font-medium text-stone-500">Carregando dados financeiros...</p>
      </div>
    );
  }

  // Faturamento líquido = Entradas - Comissões - Descontos
  const faturamentoLiquido = Math.max(0, entradasMes - comissoesTotal - descontosMes);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-12">
      
      {/* Toast Flutuante */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-white border border-brand/30 shadow-card text-stone-900 px-4 py-3 rounded-2xl flex items-center gap-3 animate-fade-in">
          <div className="w-7 h-7 rounded-full bg-brand-tint flex items-center justify-center text-brand">
            <Check className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Cabeçalho Editorial com Seletor de Período e Exportação */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 print:hidden">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            Financeiro
          </h1>
          <p className="text-sm font-medium text-stone-500 mt-1">
            Fluxo de caixa, comissões e desempenho financeiro · <span className="font-semibold text-stone-700">{rotuloPeriodo}</span>
          </p>
        </div>

        {/* Controles de Período e Ações */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Seletor de Período em Pílula com Rolagem Suave (§9.6·J8) */}
          <div className="bg-stone-100 p-1 rounded-full flex items-center text-xs font-semibold text-stone-600 max-w-full overflow-x-auto scrollbar-none flex-nowrap shrink-0">
            {[
              { id: 'este_mes', label: 'Este mês' },
              { id: 'mes_passado', label: 'Mês anterior' },
              { id: 'ultimos_30', label: '30 dias' },
              { id: 'este_ano', label: 'Este ano' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  periodo === p.id 
                    ? 'bg-white text-stone-900 shadow-2xs font-bold' 
                    : 'hover:text-stone-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Botão Exportar CSV */}
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-full border border-stone-300 text-stone-700 hover:border-brand hover:text-brand text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Exportar planilha CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          {/* Botão Imprimir / PDF */}
          <button 
            onClick={handlePrint}
            className="px-4 py-2 rounded-full border border-stone-300 text-stone-700 hover:border-brand hover:text-brand text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Imprimir ou Salvar PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Grade de 5 KPIs Limpos (Regra 9.1.2: sem sobreposição de ícones; Regra 9.1.4: cores semânticas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
        
        {/* KPI 1: Faturamento Bruto (Entradas) */}
        <div className="rounded-[22px] border border-line bg-white p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Faturamento Bruto
          </p>
          <div className="my-2">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-stone-900 tabular-nums lining-nums">
              {formatCurrency(entradasMes)}
            </h2>
          </div>
          <p className="text-xs text-stone-500">
            {transacoes.length} {transacoes.length === 1 ? 'atendimento concluído' : 'atendimentos concluídos'}
          </p>
        </div>

        {/* KPI 2: Faturamento Líquido (Margem) */}
        <div className="rounded-[22px] border border-line bg-white p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Faturamento Líquido
          </p>
          <div className="my-2">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-emerald-800 tabular-nums lining-nums">
              {formatCurrency(faturamentoLiquido)}
            </h2>
          </div>
          <p className="text-xs text-stone-500">
            Margem livre do salão
          </p>
        </div>

        {/* KPI 3: Ticket Médio */}
        <div className="rounded-[22px] border border-line bg-white p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Ticket Médio
          </p>
          <div className="my-2">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-stone-900 tabular-nums lining-nums">
              {formatCurrency(ticketMedio)}
            </h2>
          </div>
          <p className="text-xs text-stone-500">
            Gasto médio por cliente
          </p>
        </div>

        {/* KPI 4: Comissões a Pagar (Regra 9.1.4: cores semânticas, neutro quando 0) */}
        <div className="rounded-[22px] border border-line bg-white p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Comissões Pendentes
          </p>
          <div className="my-2">
            <h2 className={`font-display font-bold text-2xl sm:text-3xl tabular-nums lining-nums ${
              comissoesPagar > 0 ? 'text-amber-800' : 'text-stone-900'
            }`}>
              {formatCurrency(comissoesPagar)}
            </h2>
          </div>
          <p className="text-xs text-stone-500">
            {comissoesPagar > 0 ? 'Pendente de quitação' : 'Tudo em dia'}
          </p>
        </div>

        {/* KPI 5: Descontos Concedidos */}
        <div className="rounded-[22px] border border-line bg-white p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Descontos Aplicados
          </p>
          <div className="my-2">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-stone-900 tabular-nums lining-nums">
              {formatCurrency(descontosMes)}
            </h2>
          </div>
          <p className="text-xs text-stone-500">
            Cupons e abatimentos
          </p>
        </div>

      </div>

      {/* Seção Principal 1: Gráfico de Receita por Dia + Formas de Pagamento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Coluna Esquerda (8/12): Gráfico de Receita por Dia */}
        <div className="lg:col-span-8 bg-white rounded-[22px] border border-line p-6 sm:p-7 shadow-2xs min-h-[360px] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-line/60">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-5 h-5 text-brand" />
              <h2 className="font-display text-xl font-bold text-stone-900 tracking-tight">
                Receita por dia
              </h2>
            </div>
            <span className="text-xs font-semibold text-stone-500">
              {rotuloPeriodo}
            </span>
          </div>

          {/* Gráfico de Barras em SVG / Flexbox */}
          {dadosReceitaPorDia.length === 0 || entradasMes === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-2">
                <BarChart3 className="w-6 h-6 stroke-[1.75]" />
              </div>
              <p className="text-sm font-medium text-stone-500">
                Nenhuma receita registrada neste período.
              </p>
            </div>
          ) : (
            <div className="pt-6 pb-2">
              <div className="h-48 flex items-end gap-1.5 sm:gap-2 justify-between">
                {dadosReceitaPorDia.map((dia, idx) => {
                  const alturaPercent = maxReceitaDiaria > 0 
                    ? Math.max(8, (dia.total / maxReceitaDiaria) * 100) 
                    : 8;

                  return (
                    <div 
                      key={idx} 
                      className="flex-1 flex flex-col items-center gap-1.5 group relative h-full justify-end"
                    >
                      {/* Tooltip flutuante no hover */}
                      <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-stone-900 text-white text-[11px] py-1 px-2.5 rounded-lg whitespace-nowrap shadow-md pointer-events-none">
                        <span className="font-semibold tabular-nums">{formatCurrency(dia.total)}</span>
                        <span className="text-[9px] text-stone-300">{dia.diaRotulo}</span>
                      </div>

                      {/* Barra */}
                      <div 
                        style={{ height: `${alturaPercent}%` }}
                        className={`w-full max-w-[20px] rounded-t-lg transition-all ${
                          dia.total > 0 
                            ? 'bg-brand/80 group-hover:bg-brand' 
                            : 'bg-stone-100 group-hover:bg-stone-200'
                        }`}
                      />

                      {/* Rótulo do Dia (a cada 3 dias ou quando poucos dias) */}
                      {(dadosReceitaPorDia.length <= 15 || idx % 2 === 0) && (
                        <span className="text-[10px] text-stone-400 tabular-nums">
                          {dia.diaRotulo.split('/')[0]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Coluna Direita (4/12): Quebra por Forma de Pagamento */}
        <div className="lg:col-span-4 bg-white rounded-[22px] border border-line p-6 sm:p-7 shadow-2xs min-h-[360px] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-line/60">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand" />
              <h2 className="font-display text-xl font-bold text-stone-900 tracking-tight">
                Formas de pagamento
              </h2>
            </div>
          </div>

          {entradasMes === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-stone-400">
              <CreditCard className="w-8 h-8 mb-2 stroke-[1.5]" />
              <p className="text-sm">Sem movimentações no período.</p>
            </div>
          ) : (
            <div className="space-y-4 py-3 flex-1 flex flex-col justify-center">
              {Object.entries(formasPagamento).map(([key, item]) => {
                const percentual = entradasMes > 0 ? (item.total / entradasMes) * 100 : 0;
                if (item.total === 0 && entradasMes > 0) return null;

                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-stone-700">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 tabular-nums lining-nums">
                          {formatCurrency(item.total)}
                        </span>
                        <span className="text-stone-400 tabular-nums text-[11px]">
                          ({percentual.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                    {/* Barra de Progresso */}
                    <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                      <div 
                        style={{ width: `${Math.min(100, Math.max(3, percentual))}%` }}
                        className={`h-full rounded-full ${item.color}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Seção Principal 2: Extrato de Transações + Ranking e Comissões */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Coluna Esquerda (8/12): Extrato de Transações */}
        <div className="lg:col-span-8 bg-white rounded-[22px] border border-line p-6 sm:p-7 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-line/60 mb-3">
            <h2 className="font-display text-xl font-bold text-stone-900 tracking-tight">
              Extrato de transações
            </h2>
            <span className="bg-stone-100 text-stone-600 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums">
              {transacoes.length} {transacoes.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          {transacoes.length === 0 ? (
            <div className="py-16 text-center text-stone-500">
              <p className="text-sm">Nenhuma transação concluída neste período.</p>
            </div>
          ) : (
            (() => {
              const totalPages = itemsPerPage === 'todos' ? 1 : Math.ceil(transacoes.length / itemsPerPage);
              const currentTransacoes = itemsPerPage === 'todos'
                ? transacoes
                : transacoes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

              return (
                <div>
                  <div className="divide-y divide-line/60">
                    {currentTransacoes.map((t) => {
                      const dataFormatada = format(parseISO(t.start_time), 'dd/MM · HH:mm');

                      return (
                        <div 
                          key={t.id} 
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-stone-50/70 px-2 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-tint/50 text-brand flex items-center justify-center font-bold text-xs shrink-0">
                              {(t.client_name || 'C').charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Link
                                  to={t.client_id ? `/${tenant_slug}/staff/ficha-cliente/${t.client_id}` : '#'}
                                  className="text-sm font-semibold text-stone-900 hover:text-brand transition-colors truncate"
                                >
                                  {t.client_name || 'Cliente Avulso'}
                                </Link>
                                {renderPaymentBadge(t.payment_method)}
                              </div>
                              <p className="text-xs text-stone-500 truncate mt-0.5">
                                {t.service_name} {t.staff_name && `· com ${t.staff_name}`}
                              </p>
                            </div>
                          </div>

                          <div className="text-right self-end sm:self-center shrink-0">
                            <span className="font-display font-bold text-base text-emerald-800 tabular-nums lining-nums block">
                              +{formatCurrency(t.total_price)}
                            </span>
                            <span className="text-[11px] text-stone-400 tabular-nums">
                              {dataFormatada}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Controles de Paginação */}
                  <div className="flex flex-col sm:flex-row items-center justify-between pt-4 mt-3 border-t border-line/60 gap-3 text-xs text-stone-600">
                    <div className="flex items-center gap-2">
                      <span>Exibir:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(e.target.value === 'todos' ? 'todos' : Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-stone-50 border border-line rounded-lg px-2 py-1 text-xs outline-none focus:border-brand"
                      >
                        <option value={5}>5 por página</option>
                        <option value={10}>10 por página</option>
                        <option value={20}>20 por página</option>
                        <option value="todos">Todos</option>
                      </select>
                    </div>

                    {itemsPerPage !== 'todos' && totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-1 rounded-lg border border-line hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="tabular-nums font-semibold">
                          {currentPage} de {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-1 rounded-lg border border-line hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* Coluna Direita (4/12): Comissões da Equipe + Ranking de Serviços */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card: Comissões da Equipe */}
          <div className="bg-white rounded-[22px] border border-line p-6 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-line/60 mb-3">
              <h3 className="font-display font-bold text-lg text-stone-900">
                Comissões da equipe
              </h3>
            </div>

            {comissoesPorProfissional.length === 0 ? (
              <p className="text-xs text-stone-500 py-3">Sem comissões geradas no período.</p>
            ) : (
              <div className="space-y-3">
                {comissoesPorProfissional.map((prof) => (
                  <div
                    key={prof.id}
                    className="p-3 bg-stone-50/70 rounded-xl border border-line/60 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className="w-7 h-7 rounded-full bg-brand-tint text-brand flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {prof.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-stone-900 truncate">
                            {prof.name}
                          </p>
                          <p className="text-[10px] text-stone-500 tabular-nums">
                            Faturou {formatCurrency(prof.revenue)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`font-bold text-xs tabular-nums lining-nums block ${
                          prof.pending > 0 ? 'text-amber-800' : 'text-stone-500'
                        }`}>
                          {formatCurrency(prof.pending)}
                        </span>
                        <span className="text-[10px] text-stone-400 block tabular-nums">
                          Total: {formatCurrency(prof.commission)}
                        </span>
                      </div>
                    </div>

                    {prof.pending > 0 && (
                      <div className="flex justify-end pt-1 border-t border-line/40">
                        <button
                          onClick={() => setProfissionalParaPagar(prof)}
                          className="px-3 py-1 rounded-full bg-brand text-white hover:brightness-110 text-[11px] font-semibold transition-all shadow-2xs cursor-pointer"
                        >
                          Pagar pendência
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card: Serviços Mais Rentáveis */}
          <div className="bg-white rounded-[22px] border border-line p-6 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-line/60 mb-3">
              <h3 className="font-display font-bold text-lg text-stone-900">
                Serviços mais rentáveis
              </h3>
            </div>

            {rankingServicos.length === 0 ? (
              <p className="text-xs text-stone-500 py-3">Sem serviços no período.</p>
            ) : (
              <div className="space-y-3">
                {rankingServicos.slice(0, 5).map((serv, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-stone-800 truncate pr-2">
                        {serv.name}
                      </span>
                      <span className="font-bold text-stone-900 tabular-nums lining-nums shrink-0">
                        {formatCurrency(serv.value)}
                      </span>
                    </div>
                    {/* Barra de Progresso Rosé */}
                    <div className="w-full h-1.5 rounded-full bg-stone-100 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, Math.max(5, serv.percent))}%` }}
                        className="h-full rounded-full bg-brand"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Modal de Confirmação de Pagamento */}
      {profissionalParaPagar && (
        <ModalPagarComissao
          isOpen={!!profissionalParaPagar}
          profissional={profissionalParaPagar}
          onClose={() => setProfissionalParaPagar(null)}
          onConfirm={handlePayCommission}
          processando={pagandoComissao}
        />
      )}

    </div>
  );
};

export default GestaoFinanceira;
