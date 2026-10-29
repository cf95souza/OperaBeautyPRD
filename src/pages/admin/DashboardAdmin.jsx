import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ShoppingBag, 
  RotateCcw, 
  MessageCircle, 
  Cake, 
  Clock, 
  AlertTriangle, 
  Check, 
  X, 
  ChevronRight,
  ExternalLink,
  PackageCheck,
  User,
  Sparkles,
  QrCode,
  Lock
} from 'lucide-react';
import { format, isToday, parseISO, addDays, isWithinInterval, setYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { formatarTelefoneBR } from '../../components/ui/CampoTelefone';
import NewAppointmentModal from '../../components/NewAppointmentModal';
import CardOnboarding from '../../components/admin/CardOnboarding';
import ModalCatalogoModelo from '../../components/admin/ModalCatalogoModelo';
import ModalDisplayMesaQRCode from '../../components/admin/ModalDisplayMesaQRCode';

/**
 * Modal Rápido de Reposição de Estoque
 */
const ModalReporEstoque = ({ isOpen, item, onClose, onSuccess }) => {
  const [quantidadeAdicionar, setQuantidadeAdicionar] = useState(5);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuantidadeAdicionar(5);
      setErro('');
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const handleConfirmar = async (e) => {
    e.preventDefault();
    const qtdNum = Number(quantidadeAdicionar);
    if (isNaN(qtdNum) || qtdNum <= 0) {
      setErro('Informe uma quantidade válida maior que zero.');
      return;
    }

    setSalvando(true);
    setErro('');

    try {
      const novaQuantidade = Number(item.quantity) + qtdNum;
      await api.inventory.update(item.id, {
        name: item.name,
        quantity: novaQuantidade,
        unit: item.unit,
        min_quantity: Number(item.min_quantity),
        type: item.type || 'professional',
        price: item.price ? Number(item.price) : 0,
        is_active: true
      });

      onSuccess(item.name, novaQuantidade);
      onClose();
    } catch (err) {
      console.error('Erro ao repor estoque:', err);
      setErro(err.message || 'Erro ao atualizar o estoque.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-[24px] border border-line shadow-2xl p-6 sm:p-7 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 transition-colors p-1 rounded-full hover:bg-stone-100 cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-brand-tint/60 text-brand flex items-center justify-center">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-stone-900">Repor Estoque</h3>
            <p className="text-xs text-stone-500">{item.name}</p>
          </div>
        </div>

        <div className="p-3.5 bg-stone-50 rounded-xl border border-line/60 mb-5 flex items-center justify-between text-xs">
          <div>
            <span className="text-stone-500 block">Estoque atual</span>
            <span className="font-bold text-stone-900 text-sm tabular-nums lining-nums">
              {item.quantity} {item.unit}
            </span>
          </div>
          <div className="text-right">
            <span className="text-stone-500 block">Mínimo ideal</span>
            <span className="font-medium text-amber-700 tabular-nums lining-nums">
              {item.min_quantity} {item.unit}
            </span>
          </div>
        </div>

        <form onSubmit={handleConfirmar} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Quantidade a adicionar ({item.unit})
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                step="1"
                value={quantidadeAdicionar}
                onChange={(e) => setQuantidadeAdicionar(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-line focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 text-stone-900 text-base font-semibold tabular-nums"
                autoFocus
              />
              <div className="flex gap-1.5">
                {[1, 5, 10].map((qtd) => (
                  <button
                    key={qtd}
                    type="button"
                    onClick={() => setQuantidadeAdicionar(prev => Number(prev || 0) + qtd)}
                    className="px-2.5 py-2.5 bg-stone-100 hover:bg-brand-tint/50 text-stone-700 hover:text-brand rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    +{qtd}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {erro && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="flex-1 py-2.5 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 py-2.5 rounded-full bg-brand text-white hover:brightness-110 font-medium text-sm transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {salvando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Confirmar reposição</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * Dashboard do Gestor (Item J2 - P1)
 * Implementação 1:1 baseada na imagem canônica: G1 · Gestor — Dashboard@2x.png
 */
const DashboardAdmin = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant, session } = useTenant();

  const [loading, setLoading] = useState(true);
  const [faturamentoHoje, setFaturamentoHoje] = useState(0);
  const [totalConcluidosHoje, setTotalConcluidosHoje] = useState(0);
  const [faturamentoMes, setFaturamentoMes] = useState(0);
  const [totalConcluidosMes, setTotalConcluidosMes] = useState(0);
  const [totalAtendimentosHoje, setTotalAtendimentosHoje] = useState(0);
  const [atendimentosHoje, setAtendimentosHoje] = useState([]);
  const [estoqueBaixo, setEstoqueBaixo] = useState([]);
  const [aniversariantes, setAniversariantes] = useState([]);
  const [retornos, setRetornos] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [monthlyImpact, setMonthlyImpact] = useState(null);
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [saasBillingStatus, setSaasBillingStatus] = useState(null);

  // Estados de modais e toasts
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [itemParaRepor, setItemParaRepor] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Notificação flutuante com auto-dispensação
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Saudação contextual baseada no horário
  const saudacao = useMemo(() => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  // Primeiro nome para saudação editorial
  const primeiroNomeGestor = useMemo(() => {
    if (session?.name) {
      return session.name.trim().split(' ')[0];
    }
    if (tenant?.name) {
      // Remove prefixos comuns como "Studio" se houver
      const limpo = tenant.name.replace(/^Studio\s+/i, '').trim();
      return limpo.split(' ')[0];
    }
    return 'Gestor';
  }, [session, tenant]);

  // Data de hoje por extenso formatada em pt-BR (ex: "Segunda-feira, 19 de outubro")
  const dataHojeExtenso = useMemo(() => {
    const dataFormatada = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
    return dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
  }, []);

  // Ticket Médio no Mês
  const ticketMedio = useMemo(() => {
    if (totalConcluidosMes > 0 && faturamentoMes > 0) {
      return faturamentoMes / totalConcluidosMes;
    }
    if (totalConcluidosHoje > 0 && faturamentoHoje > 0) {
      return faturamentoHoje / totalConcluidosHoje;
    }
    return 0;
  }, [faturamentoMes, totalConcluidosMes, faturamentoHoje, totalConcluidosHoje]);

  useEffect(() => {
    if (tenant?.id) {
      fetchDashboardData();
    }
  }, [tenant]);

  const fetchDashboardData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

      // Avisos da Plataforma
      try {
        const platformAnnouncements = await api.platform.getActiveAnnouncements();
        setAnnouncements(platformAnnouncements || []);
      } catch (err) {
        console.error('Erro ao buscar avisos da plataforma:', err);
      }

      // 1. Agenda e Faturamento de Hoje
      try {
        const apptHoje = await api.appointments.list({
          start_date: startOfToday,
          end_date: endOfToday
        });

        const concluidosHoje = (apptHoje || []).filter(appt => appt.status === 'completed');
        const faturamentoHojeVal = concluidosHoje.reduce((sum, appt) => sum + Number(appt.total_price || 0), 0);
        
        setFaturamentoHoje(faturamentoHojeVal);
        setTotalConcluidosHoje(concluidosHoje.length);
        setTotalAtendimentosHoje((apptHoje || []).length);
        
        // Ordena os atendimentos de hoje por horário
        const apptsOrdenados = (apptHoje || []).slice().sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        setAtendimentosHoje(apptsOrdenados);
      } catch (errHoje) {
        console.error('Erro ao buscar atendimentos de hoje:', errHoje);
      }

      // 2. Financeiro: Faturamento Mês
      try {
        const apptMes = await api.appointments.list({
          start_date: startOfMonth,
          end_date: endOfMonth
        });

        const concluidosMes = (apptMes || []).filter(appt => appt.status === 'completed');
        const faturamentoMesVal = concluidosMes.reduce((sum, appt) => sum + Number(appt.total_price || 0), 0);
        setFaturamentoMes(faturamentoMesVal);
        setTotalConcluidosMes(concluidosMes.length);
      } catch (errMes) {
        console.error('Erro ao buscar faturamento do mês:', errMes);
      }

      // 3. Estoque Baixo: quantity <= min_quantity
      try {
        const invData = await api.inventory.list();
        if (invData && Array.isArray(invData)) {
          const baixos = invData.filter(item => Number(item.quantity) <= Number(item.min_quantity));
          setEstoqueBaixo(baixos);
        }
      } catch (errInv) {
        console.error('Erro ao buscar estoque:', errInv);
      }

      // 4. Aniversariantes: próximos 30 dias
      try {
        const clientes = await api.clients.list(tenant.id);
        if (clientes && Array.isArray(clientes)) {
          const todayDate = new Date();
          const limitDate = addDays(todayDate, 30);
          
          const parseLocalBirthDate = (dateStr) => {
            if (!dateStr) return null;
            const [year, month, day] = String(dateStr).split('T')[0].split('-');
            return new Date(year, month - 1, day);
          };
          
          const aniversariantesFiltrados = clientes.filter(cliente => {
            if (!cliente.birth_date) return false;
            const dataNascimento = parseLocalBirthDate(cliente.birth_date);
            if (!dataNascimento || isNaN(dataNascimento.getTime())) return false;

            let niverEsteAno = setYear(dataNascimento, todayDate.getFullYear());
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
      } catch (errCli) {
        console.error('Erro ao buscar clientes aniversariantes:', errCli);
      }

      // 5. Retornos de Manutenção (Próximos 30 dias)
      try {
        const apptsMaint = await api.appointments.list();
        if (apptsMaint && Array.isArray(apptsMaint)) {
          const todayDate = new Date();
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
      } catch (errRet) {
        console.error('Erro ao buscar retornos de manutenção:', errRet);
      }

      // 6. Impacto OperaBeauty no Mês (Fase 44 - D9 P1)
      try {
        const impactRes = await api.reports.getMonthlyImpact();
        if (impactRes && impactRes.impact) {
          setMonthlyImpact(impactRes);
        }
      } catch (errImp) {
        console.error('Erro ao buscar impacto OperaBeauty no dashboard:', errImp);
      }

      // 7. Onboarding Guiado do Salão (Fase 44 - D11 P1)
      try {
        const onbRes = await api.onboarding.getStatus();
        if (onbRes) {
          setOnboardingStatus(onbRes);
        }
      } catch (errOnb) {
        console.error('Erro ao buscar status de onboarding:', errOnb);
      }

      // 8. Cobrança SaaS & Tolerância/Bloqueio (Fase 44 - D18 P1)
      try {
        const billingRes = await api.invoices.getBillingStatus();
        if (billingRes) {
          setSaasBillingStatus(billingRes);
        }
      } catch (errBill) {
        // Silencioso se não houver faturas
      }

    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Helper para gerar link de WhatsApp seguro
  const getWhatsAppLink = (phone, text) => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    const fullNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${fullNumber}?text=${encodeURIComponent(text)}`;
  };

  // Helper para badge de status do agendamento na paleta Rosé Editorial
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F0EAE6] text-[#63534B]">
            Concluído
          </span>
        );
      case 'in-progress':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32]">
            Em atendimento
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FDE8E8] text-[#C62828]">
            Cancelado
          </span>
        );
      case 'scheduled':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32]">
            Confirmado
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-3 border-brand/20 border-t-brand rounded-full animate-spin" />
        <p className="text-sm font-medium text-stone-500">Carregando painel gerencial...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-12">
      
      {/* Toast Flutuante de Sucesso */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-white border border-brand/30 shadow-card text-stone-900 px-4 py-3 rounded-2xl flex items-center gap-3 animate-fade-in">
          <div className="w-7 h-7 rounded-full bg-brand-tint flex items-center justify-center text-brand">
            <Check className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Avisos Ativos da Plataforma (se houver) */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map((aviso) => (
            <div 
              key={aviso.id} 
              className="flex items-start gap-3 p-4 rounded-2xl border bg-brand-tint/30 border-brand/20 text-stone-900 shadow-2xs"
            >
              <AlertTriangle className="w-5 h-5 text-brand shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm">{aviso.title}</h4>
                <p className="text-xs text-stone-600 mt-0.5 whitespace-pre-wrap">{aviso.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cabeçalho Editorial com Saudação e Ações Rápidas */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            {saudacao}, {primeiroNomeGestor}
          </h1>
          <p className="text-sm font-medium text-stone-500 mt-1">
            {dataHojeExtenso}
          </p>
        </div>

        {/* Ações Rápidas do Topo */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {onboardingStatus?.summary?.dismissed && (
            <button
              onClick={async () => {
                await api.onboarding.dismiss(false);
                fetchDashboardData();
              }}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-full bg-brand-tint/60 hover:bg-brand-tint text-brand text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
              title="Reabrir Guia de Ativação do Salão"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span>Guia ({onboardingStatus.summary.completed_steps}/{onboardingStatus.summary.total_steps})</span>
            </button>
          )}

          <button
            onClick={() => setIsQrModalOpen(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full border border-stone-300 text-stone-700 hover:border-brand hover:text-brand hover:bg-brand-tint/30 text-sm font-medium transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
            title="Visualizar e imprimir Display de Balcão com QR Code"
          >
            <QrCode className="w-4 h-4 text-brand" />
            <span className="hidden sm:inline">Display Balcão</span>
          </button>

          <button
            onClick={() => navigate(`/${tenant_slug}/staff/admin/pdv`)}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-full border border-stone-300 text-brand hover:border-brand hover:bg-brand-tint/30 text-sm font-medium transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2"
          >
            Venda rápida
          </button>
          
          <button
            onClick={() => setIsAppointmentModalOpen(true)}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-full bg-brand text-white hover:brightness-110 text-sm font-medium transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo agendamento</span>
          </button>
        </div>
      </div>

      {/* Alerta de Carência / Bloqueio SaaS (Fase 44 - D18 P1) */}
      {saasBillingStatus?.is_blocked ? (
        <div className="p-4 sm:p-5 rounded-[22px] bg-rose-50 border border-rose-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-rose-950">
                Novos agendamentos online suspensos (Inadimplência SaaS)
              </h3>
              <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                A carência de 5 dias expirou ({saasBillingStatus.days_overdue} dias em atraso). O sistema opera em modo de leitura. Regularize a fatura para <strong>reativação imediata</strong>.
              </p>
            </div>
          </div>
          <Link
            to={`/${tenant.slug}/staff/admin/assinatura`}
            className="px-4 py-2 rounded-full bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Pagar via PIX</span>
          </Link>
        </div>
      ) : saasBillingStatus?.is_grace_period ? (
        <div className="p-4 sm:p-5 rounded-[22px] bg-amber-50 border border-amber-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-amber-950">
                Fatura da plataforma em atraso — Período de tolerância
              </h3>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Restam <strong>{saasBillingStatus.remaining_grace_days} {saasBillingStatus.remaining_grace_days === 1 ? 'dia' : 'dias'}</strong> de tolerância sem interrupção de operações.
              </p>
            </div>
          </div>
          <Link
            to={`/${tenant.slug}/staff/admin/assinatura`}
            className="px-4 py-2 rounded-full bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Ver Fatura PIX</span>
          </Link>
        </div>
      ) : null}

      {/* Card de Onboarding Guiado do Salão (Fase 44 - D11 P1) */}
      {onboardingStatus && !onboardingStatus.summary?.dismissed && (
        <CardOnboarding
          statusData={onboardingStatus}
          onRefresh={() => fetchDashboardData(false)}
          onOpenCatalogModal={() => setIsCatalogModalOpen(true)}
          onOpenQrModal={() => setIsQrModalOpen(true)}
        />
      )}

      {/* Grade de 4 KPIs Compactos (Conforme Imagem Oficial G1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        
        {/* KPI 1: Faturamento Hoje */}
        <div className="rounded-[22px] border border-line bg-white p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Faturamento Hoje
          </p>
          <div className="my-2">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-stone-900 tabular-nums lining-nums">
              {formatCurrency(faturamentoHoje)}
            </h2>
          </div>
          <p className="text-xs text-stone-500">
            {totalConcluidosHoje} {totalConcluidosHoje === 1 ? 'atendimento concluído' : 'atendimentos concluídos'}
          </p>
        </div>

        {/* KPI 2: Faturamento do Mês */}
        <div className="rounded-[22px] border border-line bg-white p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Faturamento do Mês
          </p>
          <div className="my-2">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-stone-900 tabular-nums lining-nums">
              {formatCurrency(faturamentoMes)}
            </h2>
          </div>
          <p className="text-xs text-stone-500">
            Mês atual
          </p>
        </div>

        {/* KPI 3: Agenda de Hoje */}
        <div 
          onClick={() => navigate(`/${tenant_slug}/staff/agenda-profissional`)}
          className="rounded-[22px] border border-line bg-white p-5 sm:p-6 shadow-2xs flex flex-col justify-between hover:border-brand/40 transition-colors cursor-pointer group"
        >
          <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider group-hover:text-brand transition-colors">
            Agenda de Hoje
          </p>
          <div className="my-2">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-stone-900 tabular-nums lining-nums">
              {formatNumber(totalAtendimentosHoje)}
            </h2>
          </div>
          <p className="text-xs text-stone-500">
            {totalAtendimentosHoje === 1 ? 'atendimento marcado' : 'atendimentos marcados'}
          </p>
        </div>

        {/* KPI 4: Ticket Médio */}
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
            no mês
          </p>
        </div>

      </div>

      {/* Banner Comemorativo de Impacto OperaBeauty no Mês (Fase 44 - D9 P1) */}
      {monthlyImpact?.impact && (
        <div className="rounded-[22px] bg-gradient-to-r from-stone-900 via-[#311c24] to-[#25151b] text-white p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-brand-tint flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-brand-tint" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-tint">
                  Impacto OperaBeauty • {monthlyImpact.period?.label}
                </span>
              </div>
              <p className="text-sm sm:text-base font-semibold mt-0.5 text-stone-100">
                Seu salão já economizou <strong className="text-brand-tint font-bold">{monthlyImpact.impact.time_saved?.hours_saved || 0}h</strong> de atendimento e protegeu <strong className="text-brand-tint font-bold">{formatCurrency(monthlyImpact.impact.no_shows_prevented?.prevented_loss_revenue || 0)}</strong> contra faltas.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/${tenant_slug}/staff/admin/relatorios-bi`)}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 self-start md:self-center"
          >
            <span>Ver Relatório Completo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Layout Principal: 2 Colunas (7/12 e 5/12 ou 8/12 e 4/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Coluna Esquerda: Próximos Atendimentos */}
        <div className="lg:col-span-8 bg-white rounded-[22px] border border-line p-6 sm:p-7 shadow-2xs min-h-[460px] flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-line/60">
            <h2 className="font-display text-2xl font-bold text-stone-900 tracking-tight">
              Próximos atendimentos
            </h2>
            {atendimentosHoje.length > 0 && (
              <Link
                to={`/${tenant_slug}/staff/agenda-profissional`}
                className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
              >
                <span>Ver agenda</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {/* Estado Vazio (conforme imagem oficial G1) */}
          {atendimentosHoje.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-brand-tint/60 text-brand flex items-center justify-center mb-3 shadow-2xs">
                <CalendarIcon className="w-6 h-6 stroke-[1.75]" />
              </div>
              <p className="text-sm font-medium text-stone-600 mb-4">
                Nenhum atendimento para hoje.
              </p>
              <button
                onClick={() => setIsAppointmentModalOpen(true)}
                className="px-5 py-2 rounded-full border border-brand text-brand hover:bg-brand-tint/40 text-sm font-medium transition-colors cursor-pointer shadow-2xs"
              >
                Agendar manualmente
              </button>
            </div>
          ) : (
            /* Lista de Atendimentos de Hoje */
            <div className="flex-1 divide-y divide-line/60 pt-2 overflow-y-auto max-h-[540px] pr-1">
              {atendimentosHoje.map((appt) => {
                const horaInicio = format(parseISO(appt.start_time), 'HH:mm');
                const horaFim = appt.end_time ? format(parseISO(appt.end_time), 'HH:mm') : null;

                return (
                  <div key={appt.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-stone-50/60 rounded-xl px-2.5 transition-colors">
                    <div className="flex items-start sm:items-center gap-3">
                      {/* Horário em Badge Rosé */}
                      <div className="px-3 py-1.5 rounded-xl bg-brand-tint/50 text-brand font-bold text-sm tabular-nums lining-nums shrink-0 text-center">
                        {horaInicio}
                        {horaFim && <span className="text-[11px] font-normal block opacity-80">{horaFim}</span>}
                      </div>

                      {/* Informações do Cliente e Serviço */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link 
                            to={appt.client_id ? `/${tenant_slug}/staff/ficha-cliente/${appt.client_id}` : '#'}
                            className="text-sm font-semibold text-stone-900 hover:text-brand transition-colors truncate"
                          >
                            {appt.client_name || 'Cliente sem nome'}
                          </Link>
                          {renderStatusBadge(appt.status)}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500 mt-0.5">
                          <span className="font-medium text-stone-700">{appt.service_name}</span>
                          {appt.staff_name && (
                            <span className="flex items-center gap-1 text-stone-500">
                              <span className="w-1 h-1 rounded-full bg-stone-300" />
                              com {appt.staff_name}
                            </span>
                          )}
                          <span className="font-semibold text-stone-900 tabular-nums lining-nums">
                            {formatCurrency(appt.total_price)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ações Rápidas no Atendimento */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {appt.client_phone && (
                        <a
                          href={getWhatsAppLink(
                            appt.client_phone, 
                            `Olá, ${appt.client_name}! Confirmamos seu atendimento de ${appt.service_name} hoje às ${horaInicio} no ${tenant?.name || 'salão'}. Até breve!`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-line/60"
                          title="Falar no WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                      {appt.client_id && (
                        <Link
                          to={`/${tenant_slug}/staff/ficha-cliente/${appt.client_id}`}
                          className="px-3 py-1.5 rounded-lg border border-line text-stone-700 hover:text-brand hover:border-brand/40 text-xs font-medium transition-colors"
                        >
                          Ver ficha
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna Direita: Cards Laterais de Gestão (Estoque, Aniversariantes, Retornos) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card 1: Estoque Baixo (Conforme Imagem Oficial G1) */}
          <div className="rounded-[22px] border border-line bg-white p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-stone-900">
                Estoque baixo
              </h3>
              <span className="bg-[#FDF3E7] text-[#9A6224] rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums lining-nums">
                {estoqueBaixo.length} {estoqueBaixo.length === 1 ? 'item' : 'itens'}
              </span>
            </div>

            {estoqueBaixo.length === 0 ? (
              <p className="text-sm text-stone-500 py-1">
                Nenhum produto com estoque crítico.
              </p>
            ) : (
              <div className="space-y-3">
                {estoqueBaixo.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-stone-50/70 rounded-xl border border-line/60 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <h4 className="text-sm font-medium text-stone-900 truncate">
                        {item.name}
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5 tabular-nums">
                        Mínimo ideal: {item.min_quantity} {item.unit}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-brand tabular-nums lining-nums">
                        {item.quantity} {item.unit}
                      </span>
                      <button
                        onClick={() => setItemParaRepor(item)}
                        className="px-3 py-1 rounded-full border border-stone-300 text-stone-700 hover:border-brand hover:text-brand text-xs font-medium transition-colors cursor-pointer"
                      >
                        Repor
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Aniversariantes · 30 dias (Conforme Imagem Oficial G1) */}
          <div className="rounded-[22px] border border-line bg-white p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-stone-900">
                Aniversariantes · 30 dias
              </h3>
              <span className="bg-stone-100 text-stone-600 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums lining-nums">
                {aniversariantes.length}
              </span>
            </div>

            {aniversariantes.length === 0 ? (
              <p className="text-sm text-stone-500 py-1">
                Nenhum aniversário próximo.
              </p>
            ) : (
              <div className="space-y-3">
                {aniversariantes.slice(0, 5).map((cliente) => {
                  const dataRaw = String(cliente.birth_date).split('T')[0].split('-');
                  const dataNiver = new Date(new Date().getFullYear(), Number(dataRaw[1]) - 1, Number(dataRaw[2]));
                  const formatado = format(dataNiver, "d 'de' MMMM", { locale: ptBR });

                  return (
                    <div
                      key={cliente.id}
                      className="p-3 bg-stone-50/70 rounded-xl border border-line/60 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-full bg-brand-tint text-brand flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {cliente.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-stone-900 truncate">
                            {cliente.name}
                          </p>
                          <p className="text-xs text-stone-500">
                            {formatado}
                          </p>
                        </div>
                      </div>

                      {cliente.phone && (
                        <a
                          href={getWhatsAppLink(
                            cliente.phone,
                            `Olá, ${cliente.name}! Parabéns pelo seu aniversário! 🎉 Preparamos um presente especial para você comemorar aqui no ${tenant?.name || 'salão'}. Venha nos visitar!`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-line/60 shrink-0"
                          title="Enviar parabéns no WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card 3: Retornos · 30 dias (Conforme Imagem Oficial G1) */}
          <div className="rounded-[22px] border border-line bg-white p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-stone-900">
                Retornos · 30 dias
              </h3>
              <span className="bg-stone-100 text-stone-600 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums lining-nums">
                {retornos.length}
              </span>
            </div>

            {retornos.length === 0 ? (
              <p className="text-sm text-stone-500 py-1">
                Nenhum retorno de manutenção previsto.
              </p>
            ) : (
              <div className="space-y-3">
                {retornos.slice(0, 5).map((ret) => (
                  <div
                    key={ret.id}
                    className="p-3 bg-stone-50/70 rounded-xl border border-line/60 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-sm font-semibold text-stone-900 truncate">
                        {ret.client_name}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {ret.service_name} · Retorno em {format(ret.dataRetorno, 'dd/MM')}
                      </p>
                    </div>

                    {ret.client_phone && (
                      <a
                        href={getWhatsAppLink(
                          ret.client_phone,
                          `Olá, ${ret.client_name}! Seu retorno de manutenção para ${ret.service_name} está previsto para breve no ${tenant?.name || 'salão'}. Deseja agendar seu horário?`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-line/60 shrink-0"
                        title="Enviar lembrete de retorno no WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Modal de Novo Agendamento (Integrado Canonicamente) */}
      {isAppointmentModalOpen && (
        <NewAppointmentModal
          isOpen={isAppointmentModalOpen}
          onClose={() => setIsAppointmentModalOpen(false)}
          onSuccess={() => {
            fetchDashboardData();
            setToastMessage('Agendamento criado com sucesso!');
          }}
        />
      )}

      {/* Modal de Repor Estoque */}
      {itemParaRepor && (
        <ModalReporEstoque
          isOpen={!!itemParaRepor}
          item={itemParaRepor}
          onClose={() => setItemParaRepor(null)}
          onSuccess={(nome, novaQtd) => {
            fetchDashboardData();
            setToastMessage(`Estoque de "${nome}" atualizado para ${novaQtd} un.`);
          }}
        />
      )}

      {/* Modal de Catálogo Modelo (Fase 44 - D11 P1) */}
      {isCatalogModalOpen && (
        <ModalCatalogoModelo
          isOpen={isCatalogModalOpen}
          onClose={() => setIsCatalogModalOpen(false)}
          onSuccess={() => {
            fetchDashboardData();
            setToastMessage('Catálogo modelo adicionado com sucesso!');
          }}
        />
      )}

      {/* Modal de Display de Balcão e QR Code (Fase 44 - D11 P1) */}
      {isQrModalOpen && (
        <ModalDisplayMesaQRCode
          isOpen={isQrModalOpen}
          tenant={tenant}
          onClose={() => setIsQrModalOpen(false)}
          onQrGenerated={() => {
            fetchDashboardData(false);
          }}
        />
      )}

    </div>
  );
};

export default DashboardAdmin;
