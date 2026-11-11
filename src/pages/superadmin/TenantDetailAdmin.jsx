import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { formatCurrency } from '../../utils/formatters';
import EstadoVazio from '../../components/ui/EstadoVazio';

const getStatusLabel = (status) => {
  switch (status?.toLowerCase()) {
    case 'scheduled': return 'Agendado';
    case 'in-progress': return 'Em Andamento';
    case 'completed': return 'Concluído';
    case 'cancelled': return 'Cancelado';
    default: return status || '';
  }
};

const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'scheduled':
      return 'bg-primary-container text-on-primary-container';
    case 'in-progress':
      return 'bg-[#3b82f6]/10 text-[#3b82f6]';
    case 'completed':
      return 'bg-[#10b981]/10 text-[#10b981]';
    case 'cancelled':
      return 'bg-error-container text-error';
    default:
      return 'bg-surface-container-high text-secondary';
  }
};

const ModalSuspenderSalao = ({ isOpen, onClose, tenant, onConfirm, isSubmitting }) => {
  const [confirmName, setConfirmName] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmName('');
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen || !tenant) return null;

  const isNameMatch = confirmName.trim().toLowerCase() === (tenant.name || '').trim().toLowerCase();
  const isReasonValid = reason.trim().length >= 5;
  const canSubmit = isNameMatch && isReasonValid && !isSubmitting;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirm({ confirm_tenant_name: confirmName.trim(), reason: reason.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-white w-full max-w-lg rounded-[28px] shadow-2xl border border-stone-200 overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-suspend-title"
      >
        {/* Cabeçalho de Alerta */}
        <div className="bg-rose-50 border-b border-rose-100 p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[28px]">gavel</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="modal-suspend-title" className="font-display font-bold text-xl text-stone-900 leading-tight">
              Suspender Conta do Salão
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Esta ação bloqueia o salão imediatamente em toda a plataforma.
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-full transition-colors"
            aria-label="Fechar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Corpo Informativo & Formulário */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs text-stone-600 space-y-2">
            <div className="font-semibold text-stone-800 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-rose-600 text-base">warning</span>
              Impacto imediato da suspensão:
            </div>
            <ul className="list-disc list-inside space-y-1 text-stone-600 pl-1">
              <li>Página pública de agendamento fica indisponível para clientes.</li>
              <li>Gestores e equipe do salão perdem acesso ao painel administrativo.</li>
              <li>Sessões ativas no aplicativo e web são revogadas em tempo real.</li>
              <li>A conta poderá ser reativada a qualquer momento nesta tela em 1 clique.</li>
            </ul>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Motivo da Suspensão <span className="text-rose-600">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo (ex: Inadimplência há mais de 30 dias / Violação das diretrizes)..."
              className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
            />
            <div className="flex justify-between items-center mt-1 text-[11px] text-stone-500">
              <span>Mínimo 5 caracteres obrigatório</span>
              <span className={reason.trim().length >= 5 ? 'text-emerald-600 font-medium' : 'text-stone-400'}>
                {reason.trim().length} chars
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Confirmação de Segurança <span className="text-rose-600">*</span>
            </label>
            <p className="text-xs text-stone-600 mb-2">
              Para confirmar, digite exatamente <strong className="text-stone-900 font-semibold select-all bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">"{tenant.name}"</strong> abaixo:
            </p>
            <input
              type="text"
              required
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={`Digite "${tenant.name}"`}
              className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
            {confirmName && !isNameMatch && (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">error</span>
                O nome digitado não coincide com o nome oficial do salão.
              </p>
            )}
            {isNameMatch && (
              <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                Nome confirmado com sucesso.
              </p>
            )}
          </div>

          {/* Rodapé com Ações */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium text-sm hover:bg-stone-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-all shadow-sm hover:shadow disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Suspendendo...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">lock</span>
                  <span>Confirmar Suspensão</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PaginationControls = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 25, 50],
  itemLabel = 'registros'
}) => {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="p-4 border-t border-stone-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-stone-50/50">
      <div className="flex items-center gap-3 text-xs text-stone-500">
        <span>
          Mostrando <strong className="font-semibold text-stone-700">{startItem}</strong> a{' '}
          <strong className="font-semibold text-stone-700">{endItem}</strong> de{' '}
          <strong className="font-semibold text-stone-700">{totalItems}</strong> {itemLabel}
        </span>
        {itemsPerPageOptions && itemsPerPageOptions.length > 1 && (
          <div className="flex items-center gap-1.5 ml-2 border-l border-stone-200 pl-3">
            <span>Exibir:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="bg-white border border-stone-200 text-stone-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#7C3A4D]"
            >
              {itemsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          Anterior
        </button>

        <span className="text-xs text-stone-600 px-2">
          Página <strong className="font-semibold text-stone-900">{currentPage}</strong> de{' '}
          <strong className="font-semibold text-stone-900">{totalPages}</strong>
        </span>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          Próxima
        </button>
      </div>
    </div>
  );
};

const ModalResetClientPassword = ({ isOpen, onClose, client, onConfirm, isSubmitting }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen || !client) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password || password.length < 6 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorMsg('A senha deve ter no mínimo 6 caracteres, com pelo menos 1 letra e 1 número (ex: cliente123).');
      return;
    }
    setErrorMsg('');
    onConfirm(password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white w-full max-w-md rounded-[28px] shadow-2xl border border-stone-200 overflow-hidden flex flex-col"
        role="dialog"
      >
        <div className="p-6 border-b border-stone-100 flex items-start justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-stone-900">
              Redefinir Senha do Cliente
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Cliente: <strong className="text-stone-800">{client.name}</strong> ({client.phone})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-full transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
              Nova Senha Provisória *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Ex: cliente123"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-none focus:border-[#7C3A4D] focus:ring-1 focus:ring-[#7C3A4D]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
            <p className="text-[11px] text-stone-500 mt-1.5">
              Mínimo de 6 caracteres, contendo pelo menos 1 letra e 1 número.
            </p>
            {errorMsg && (
              <p className="text-xs text-rose-600 font-medium mt-1">
                {errorMsg}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-full bg-[#7C3A4D] text-white hover:bg-[#682F40] text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Nova Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TenantDetailAdmin = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError, confirm } = useNotification();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  // States for sub-data
  const [staff, setStaff] = useState([]);
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [plans, setPlans] = useState([]);

  // Paginação - Clientes
  const [clientsPage, setClientsPage] = useState(1);
  const [clientsPerPage, setClientsPerPage] = useState(10);
  const totalClientsPages = Math.ceil(clients.length / clientsPerPage) || 1;
  const paginatedClients = clients.slice((clientsPage - 1) * clientsPerPage, clientsPage * clientsPerPage);

  // Paginação - Faturamento / Agendamentos
  const [billingPage, setBillingPage] = useState(1);
  const [billingPerPage, setBillingPerPage] = useState(10);
  const totalBillingPages = Math.ceil(appointments.length / billingPerPage) || 1;
  const paginatedAppointments = appointments.slice((billingPage - 1) * billingPerPage, billingPage * billingPerPage);

  // Paginação - Faturas SaaS
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoicesPerPage, setInvoicesPerPage] = useState(10);
  const totalInvoicesPages = Math.ceil(invoices.length / invoicesPerPage) || 1;
  const paginatedInvoices = invoices.slice((invoicesPage - 1) * invoicesPerPage, invoicesPage * invoicesPerPage);

  // Modal Reset Senha do Cliente
  const [clientForResetModal, setClientForResetModal] = useState(null);
  const [isResettingClientPwd, setIsResettingClientPwd] = useState(false);

  // States for Editing
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    primary_color: '',
    secondary_color: '',
    status: '',
    plan_price: 59.90,
    plan_id: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // States for Suspend & Reactivate (Item H7)
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [isSlugUnlocked, setIsSlugUnlocked] = useState(false);

  useEffect(() => {
    fetchTenantData();
    fetchPlans();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'staff' && staff.length === 0) fetchStaff();
    if (activeTab === 'clients' && clients.length === 0) fetchClients();
    if (activeTab === 'billing' && appointments.length === 0) fetchAppointments();
    if (activeTab === 'invoices') fetchInvoices();
  }, [activeTab]);

  const fetchPlans = async () => {
    try {
      const data = await api.plans.list();
      if (data) setPlans(data);
    } catch (err) {
      console.error('Erro ao buscar planos', err);
    }
  };

  const fetchTenantData = async () => {
    setLoading(true);
    try {
      const data = await api.superadmin.getTenant(id);
      setTenant(data);
      setEditForm({
        name: data.name || '',
        slug: data.slug || '',
        primary_color: data.primary_color || '',
        secondary_color: data.secondary_color || '',
        status: data.status || 'active',
        plan_price: data.plan_price || 59.90,
        plan_id: data.plan_id || ''
      });
    } catch (error) {
      console.error('Error fetching tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const data = await api.staff.list(id);
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const data = await api.clients.list(id);
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const data = await api.appointments.list({ tenant_id: id, limit: 500 });
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const data = await api.invoices.list(id);
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const handleGenerateInvoice = async () => {
    const referenceMonth = prompt('Mês de referência (ex: Julho / 2026):');
    if (!referenceMonth) return;

    try {
      await api.invoices.create({
        tenant_id: id,
        amount: tenant.plan_price || 59.90,
        status: 'pending',
        due_date: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0], // vence em 5 dias
        reference_month: referenceMonth
      });
      showSuccess('Fatura gerada com sucesso!');
      fetchInvoices();
    } catch (err) {
      console.error(err);
      showError('Erro ao gerar fatura.');
    }
  };

  const handleMarkAsPaid = async (invoiceId) => {
    if (!(await confirm('Marcar esta fatura como paga manualmente?'))) return;
    try {
      await api.invoices.pay(invoiceId, 'manual');
      showSuccess('Fatura baixada com sucesso!');
      fetchInvoices();
    } catch (err) {
      console.error(err);
      showError('Erro ao dar baixa na fatura.');
    }
  };

  const handlePlanChange = (planId) => {
    const selectedPlan = plans.find(p => p.id === planId);
    if (selectedPlan) {
      setEditForm({
        ...editForm,
        plan_id: planId,
        plan_price: Number(selectedPlan.price)
      });
    } else {
      setEditForm({
        ...editForm,
        plan_id: '',
        plan_price: 59.90
      });
    }
  };

  const handleConfirmSuspend = async ({ confirm_tenant_name, reason }) => {
    setIsSuspending(true);
    try {
      await api.superadmin.suspendTenant(id, { confirm_tenant_name, reason });
      showSuccess('Salão suspenso com sucesso.');
      setIsSuspendModalOpen(false);
      await fetchTenantData();
    } catch (err) {
      console.error('Erro ao suspender salão:', err);
      showError(err.message || 'Erro ao suspender salão.');
    } finally {
      setIsSuspending(false);
    }
  };

  const handleReactivate = async () => {
    if (!(await confirm(`Tem certeza que deseja reativar o salão "${tenant?.name}"? O acesso dos profissionais, gestores e clientes será restabelecido imediatamente.`))) {
      return;
    }
    setIsReactivating(true);
    try {
      await api.superadmin.reactivateTenant(id);
      showSuccess('Salão reativado com sucesso!');
      await fetchTenantData();
    } catch (err) {
      console.error('Erro ao reativar salão:', err);
      showError(err.message || 'Erro ao reativar salão.');
    } finally {
      setIsReactivating(false);
    }
  };

  const handleUpdateTenant = async () => {
    if (editForm.status === 'suspended' && tenant?.status !== 'suspended') {
      showError('Para suspender o salão, utilize o botão seguro "Suspender conta..." na Zona de Risco.');
      setIsSuspendModalOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      await api.superadmin.updateTenant(id, {
        name: editForm.name,
        slug: editForm.slug,
        primary_color: editForm.primary_color,
        secondary_color: editForm.secondary_color,
        status: editForm.status,
        plan_price: Number(editForm.plan_price),
        plan_id: editForm.plan_id || null
      });
      showSuccess('Salão atualizado com sucesso!');
      fetchTenantData();
    } catch (error) {
      console.error('Error updating tenant:', error);
      showError(error.message || 'Erro ao atualizar salão.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetStaffPassword = async (staffId) => {
    const newPassword = prompt("Digite a nova senha para este profissional:");
    if (!newPassword) return;

    try {
      await api.superadmin.updateStaffPassword(staffId, newPassword);
      showSuccess('Senha do profissional redefinida com sucesso!');
    } catch (err) {
      console.error('Erro ao resetar senha do staff', err);
      showError('Falha ao resetar senha.');
    }
  };

  const handleOpenResetClientModal = (client) => {
    setClientForResetModal(client);
  };

  const handleConfirmResetClientPassword = async (newPassword) => {
    if (!clientForResetModal) return;
    setIsResettingClientPwd(true);
    try {
      await api.clients.updatePassword(clientForResetModal.id, newPassword);
      showSuccess(`Senha de ${clientForResetModal.name} redefinida com sucesso!`);
      setClientForResetModal(null);
    } catch (err) {
      console.error('Erro ao resetar senha do cliente', err);
      showError(err.message || 'Falha ao resetar senha do cliente.');
    } finally {
      setIsResettingClientPwd(false);
    }
  };

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span className="material-symbols-outlined text-3xl text-stone-400 animate-spin">progress_activity</span>
        <p className="text-xs text-stone-500 font-medium">Carregando dados do salão...</p>
      </div>
    </div>
  );

  if (!tenant) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <span className="material-symbols-outlined text-4xl text-rose-500 mb-2">error</span>
        <p className="text-sm font-semibold text-stone-800">Salão não encontrado.</p>
        <button
          onClick={() => navigate('/superadmin/tenants')}
          className="mt-4 text-xs font-semibold text-[#7C3A4D] hover:underline"
        >
          ← Voltar para Salões e Clientes
        </button>
      </div>
    </div>
  );

  const selectedPlanObj = plans.find(p => p.id === editForm.plan_id) || {
    name: tenant.plan_name || 'Enterprise',
    price: tenant.plan_price || 99.90
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-7xl mx-auto pb-12">
      
      {/* 1. NAVEGAÇÃO E CABEÇALHO (Fidelidade 1:1 com Mockup S3) */}
      <div className="flex flex-col gap-3">
        <button 
          type="button"
          onClick={() => navigate('/superadmin/tenants')} 
          className="text-stone-500 hover:text-stone-800 text-xs font-medium flex items-center gap-1.5 transition-colors w-fit cursor-pointer"
        >
          <span>← Salões e clientes</span>
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display font-bold text-3xl md:text-[36px] text-stone-900 leading-tight">
                {tenant.name}
              </h1>
              {tenant.status === 'active' ? (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs px-3 py-1 rounded-full font-medium">
                  Ativo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-xs px-3 py-1 rounded-full font-medium">
                  Suspenso
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="bg-stone-100 text-stone-600 px-2.5 py-1 rounded-lg text-xs font-mono font-medium">
                /{tenant.slug}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/${tenant.slug}`);
                  showSuccess('Link do salão copiado para a área de transferência!');
                }}
                className="text-xs text-stone-500 hover:text-stone-800 font-medium flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                <span>Copiar link</span>
              </button>
            </div>
          </div>

          <a 
            href={`/${tenant.slug}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="border border-stone-300 text-stone-800 hover:border-[#7C3A4D] hover:text-[#7C3A4D] bg-white px-5 py-2.5 rounded-full font-medium text-xs md:text-sm flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs shrink-0"
            title="Abrir painel ou vitrine do salão"
          >
            <span>Abrir painel do salão</span>
            <span className="material-symbols-outlined text-base">north_east</span>
          </a>
        </div>
      </div>

      {/* 2. ABAS DE NAVEGAÇÃO EDITORIAL (Mockup S3) */}
      <div className="flex overflow-x-auto gap-8 border-b border-stone-200/80 text-xs font-medium pb-px">
        {[
          { key: 'overview', label: 'Visão geral' },
          { key: 'staff', label: 'Equipe' },
          { key: 'clients', label: 'Clientes' },
          { key: 'billing', label: 'Faturamento' },
          { key: 'invoices', label: 'Faturas SaaS' }
        ].map(tab => (
          <button 
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 whitespace-nowrap transition-all cursor-pointer font-medium text-sm ${
              activeTab === tab.key 
                ? 'text-[#7C3A4D] border-b-2 border-[#7C3A4D] font-semibold' 
                : 'text-stone-500 hover:text-stone-900 border-b-2 border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. CONTEÚDO DA ABA */}
      <div className="flex-1">
        
        {/* TAB: VISÃO GERAL (§9.5·H6 - Fidelidade 1:1 com Mockup S3) */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Coluna Esquerda (8 cols): Card Informações base */}
            <div className="lg:col-span-8 bg-white rounded-[24px] border border-stone-200/80 p-7 shadow-2xs">
              <h3 className="font-display font-bold text-2xl text-stone-900 mb-6">
                Informações base
              </h3>

              <div className="flex flex-col gap-5">
                
                {/* Nome do Salão */}
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Nome do salão
                  </label>
                  <input 
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    placeholder="Ex: Studio Thais"
                    className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7C3A4D]/20 focus:border-[#7C3A4D] transition-all"
                  />
                </div>

                {/* Endereço (slug) com Desbloqueio Seguro (§9.5·H9) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-stone-700">
                      Endereço único (slug)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isSlugUnlocked) {
                          if (window.confirm('Atenção: Alterar o link (slug) do salão invalidará links anteriores compartilhados com clientes. Esta ação será registrada no Audit Trail. Deseja desbloquear a edição?')) {
                            setIsSlugUnlocked(true);
                          }
                        } else {
                          setIsSlugUnlocked(false);
                          setEditForm({ ...editForm, slug: tenant.slug });
                        }
                      }}
                      className="text-xs text-brand hover:underline font-medium cursor-pointer"
                    >
                      {isSlugUnlocked ? 'Cancelar alteração' : 'Desbloquear slug...'}
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <input 
                      type="text"
                      disabled={!isSlugUnlocked}
                      value={editForm.slug}
                      onChange={e => setEditForm({...editForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')})}
                      className={`w-full rounded-xl px-4 py-3 text-sm font-mono transition-all ${
                        isSlugUnlocked 
                          ? 'bg-amber-50/50 border-2 border-amber-400 text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500/20' 
                          : 'bg-stone-50 border border-stone-200 text-stone-700 cursor-not-allowed select-all'
                      }`}
                    />
                    {!isSlugUnlocked && (
                      <span className="absolute right-3.5 text-xs text-stone-400 font-normal pointer-events-none">
                        Bloqueado · alterar quebra os links
                      </span>
                    )}
                  </div>
                  {isSlugUnlocked && (
                    <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-xs">warning</span>
                      Modo de alteração ativado. A troca será gravada com destaque em logs de auditoria.
                    </p>
                  )}
                </div>

                {/* Cores Primária e Secundária lado a lado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1.5">
                      Cor primária
                    </label>
                    <div className="flex items-center gap-3 border border-stone-200 rounded-xl px-3.5 py-2.5 bg-white">
                      <div className="relative w-7 h-7 rounded-full shrink-0 shadow-2xs overflow-hidden border border-stone-200">
                        <input 
                          type="color"
                          value={editForm.primary_color || '#7C3A4D'}
                          onChange={e => setEditForm({...editForm, primary_color: e.target.value})}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div 
                          className="w-full h-full rounded-full"
                          style={{ backgroundColor: editForm.primary_color || '#7C3A4D' }}
                        />
                      </div>
                      <input 
                        type="text"
                        value={editForm.primary_color || '#7C3A4D'}
                        onChange={e => setEditForm({...editForm, primary_color: e.target.value})}
                        className="font-mono text-xs text-stone-800 uppercase focus:outline-none w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1.5">
                      Cor secundária
                    </label>
                    <div className="flex items-center gap-3 border border-stone-200 rounded-xl px-3.5 py-2.5 bg-white">
                      <div className="relative w-7 h-7 rounded-full shrink-0 shadow-2xs overflow-hidden border border-stone-200">
                        <input 
                          type="color"
                          value={editForm.secondary_color || '#EBB4B8'}
                          onChange={e => setEditForm({...editForm, secondary_color: e.target.value})}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div 
                          className="w-full h-full rounded-full"
                          style={{ backgroundColor: editForm.secondary_color || '#EBB4B8' }}
                        />
                      </div>
                      <input 
                        type="text"
                        value={editForm.secondary_color || '#EBB4B8'}
                        onChange={e => setEditForm({...editForm, secondary_color: e.target.value})}
                        className="font-mono text-xs text-stone-800 uppercase focus:outline-none w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Status da Conta: Segmented Control em Pílula (Mockup S3) */}
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Status da conta
                  </label>
                  <div className="inline-flex items-center bg-stone-100 p-1 rounded-full text-xs">
                    <button
                      type="button"
                      onClick={() => setEditForm({...editForm, status: 'active'})}
                      className={`px-5 py-2 rounded-full font-medium transition-all cursor-pointer ${
                        editForm.status === 'active'
                          ? 'bg-[#7C3A4D] text-white shadow-2xs font-semibold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Ativo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (tenant.status !== 'suspended') {
                          setIsSuspendModalOpen(true);
                        } else {
                          setEditForm({...editForm, status: 'suspended'});
                        }
                      }}
                      className={`px-5 py-2 rounded-full font-medium transition-all cursor-pointer ${
                        editForm.status === 'suspended'
                          ? 'bg-[#7C3A4D] text-white shadow-2xs font-semibold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Suspenso
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({...editForm, status: 'cancelled'})}
                      className={`px-5 py-2 rounded-full font-medium transition-all cursor-pointer ${
                        editForm.status === 'cancelled'
                          ? 'bg-[#7C3A4D] text-white shadow-2xs font-semibold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Cancelado
                    </button>
                  </div>
                </div>

                {/* Plano de Assinatura */}
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Plano de assinatura
                  </label>
                  <div className="relative">
                    <select 
                      value={editForm.plan_id}
                      onChange={e => handlePlanChange(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 pr-10 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#7C3A4D]/20 focus:border-[#7C3A4D] transition-all cursor-pointer appearance-none"
                    >
                      <option value="">Selecione um plano...</option>
                      {plans.map(plan => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} · {formatCurrency(plan.price)}/{plan.interval === 'year' ? 'ano' : 'mês'}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none text-xl">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Botão de Salvar Alterações */}
                <div className="pt-2">
                  <button 
                    type="button"
                    onClick={handleUpdateTenant}
                    disabled={isSaving}
                    className="bg-[#7C3A4D] hover:bg-[#682F40] text-white py-2.5 px-6 rounded-full text-xs font-semibold shadow-2xs hover:shadow transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? 'Salvando alterações...' : 'Salvar alterações'}
                  </button>
                </div>

              </div>
            </div>

            {/* Coluna Direita (4 cols): Card Assinatura + Card Zona de Risco */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Card 1: Assinatura (Fidelidade 1:1 com Mockup S3) */}
              <div className="bg-white rounded-[24px] border border-stone-200/80 p-6 shadow-2xs flex flex-col gap-4">
                <h3 className="font-display font-bold text-xl text-stone-900">
                  Assinatura
                </h3>

                <div className="flex flex-col gap-3 text-xs pt-1 border-t border-stone-100">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-stone-500 font-medium">Plano</span>
                    <strong className="text-stone-900 font-bold text-sm">
                      {selectedPlanObj.name}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-stone-500 font-medium">Valor</span>
                    <strong className="text-stone-900 font-bold text-sm tabular-nums lining-nums">
                      {formatCurrency(editForm.plan_price)}/mês
                    </strong>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-stone-500 font-medium">Faturas</span>
                    {Number(tenant.overdue_invoices_count || 0) > 0 ? (
                      <span className="bg-rose-50 text-rose-700 px-3 py-0.5 rounded-full text-xs font-semibold">
                        Vencida
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-700 px-3 py-0.5 rounded-full text-xs font-semibold">
                        Em dia
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: Zona de Risco (§9.3, §9.5 - Item H7 - Fidelidade 1:1 com Mockup S3) */}
              <div className="bg-white rounded-[24px] border border-stone-200/80 p-6 shadow-2xs flex flex-col gap-3">
                <h3 className="font-display font-bold text-xl text-[#7C3A4D]">
                  Zona de risco
                </h3>

                <p className="text-xs text-stone-600 leading-relaxed">
                  Ao suspender, ninguém do salão (gestor, profissionais e clientes) consegue acessar. Use em caso de inadimplência ou cancelamento. A ação pede o nome do salão e um motivo, e fica registrada na auditoria.
                </p>

                <div className="pt-2">
                  {tenant.status === 'active' ? (
                    <button 
                      type="button"
                      onClick={() => setIsSuspendModalOpen(true)}
                      className="w-full py-2.5 px-4 rounded-full border border-stone-300 text-stone-800 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Suspender conta...</span>
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={handleReactivate}
                      disabled={isReactivating}
                      className="w-full py-2.5 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isReactivating ? (
                        <span>Reativando salão...</span>
                      ) : (
                        <span>Reativar conta do salão (1 clique)</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: STAFF (§9.6·J7 - EstadoVazio Integrado) */}
        {activeTab === 'staff' && (
          <div className="bg-white rounded-[24px] border border-stone-200/80 shadow-2xs overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-xl text-stone-900">
                  Equipe e Gestores ({staff.length})
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Profissionais com credenciais de acesso ao painel ou app da equipe deste salão.
                </p>
              </div>
            </div>

            {staff.length === 0 ? (
              <div className="py-12">
                <EstadoVazio
                  titulo="Nenhum profissional cadastrado"
                  descricao="Este salão ainda não possui membros da equipe cadastrados."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-100 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                      <th className="py-3 px-4">Nome</th>
                      <th className="py-3 px-4">Telefone</th>
                      <th className="py-3 px-4">E-mail</th>
                      <th className="py-3 px-4">Cargo</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ação Mestre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100/80">
                    {staff.map(s => (
                      <tr key={s.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-xs text-stone-900">{s.name}</td>
                        <td className="py-3.5 px-4 text-xs text-stone-600 tabular-nums">{s.phone}</td>
                        <td className="py-3.5 px-4 text-xs text-stone-600">{s.email}</td>
                        <td className="py-3.5 px-4">
                          <span className="bg-[#F6E4E4] text-[#7C3A4D] px-2.5 py-0.5 rounded-full text-xs font-medium">
                            {s.role === 'manager' ? 'Gestor' : 'Profissional'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                            s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {s.is_active ? 'Ativo' : 'Desativado'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button 
                            type="button"
                            onClick={() => resetStaffPassword(s.id)} 
                            className="text-xs text-[#7C3A4D] hover:underline font-semibold cursor-pointer"
                          >
                            Resetar Senha
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: CLIENTS (§9.6·J7 - EstadoVazio Integrado) */}
        {activeTab === 'clients' && (
          <div className="bg-white rounded-[24px] border border-stone-200/80 shadow-2xs overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-xl text-stone-900">
                  Clientes Cadastrados ({clients.length})
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Base de clientes associada exclusivamente ao endereço deste salão.
                </p>
              </div>
            </div>

            {clients.length === 0 ? (
              <div className="py-12">
                <EstadoVazio
                  titulo="Nenhum cliente cadastrado"
                  descricao="Este salão ainda não possui clientes finais registrados na base."
                />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-stone-100 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                        <th className="py-3 px-4">Nome</th>
                        <th className="py-3 px-4">Telefone</th>
                        <th className="py-3 px-4 text-right">Ação Mestre</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100/80">
                      {paginatedClients.map(c => (
                        <tr key={c.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-xs text-stone-900">{c.name}</td>
                          <td className="py-3.5 px-4 text-xs text-stone-600 tabular-nums">{c.phone}</td>
                          <td className="py-3.5 px-4 text-right">
                            <button 
                              type="button"
                              onClick={() => handleOpenResetClientModal(c)} 
                              className="text-xs text-[#7C3A4D] hover:underline font-semibold cursor-pointer"
                            >
                              Resetar Senha
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <PaginationControls
                  currentPage={clientsPage}
                  totalPages={totalClientsPages}
                  totalItems={clients.length}
                  itemsPerPage={clientsPerPage}
                  onPageChange={setClientsPage}
                  onItemsPerPageChange={(val) => { setClientsPerPage(val); setClientsPage(1); }}
                  itemsPerPageOptions={[10, 25, 50]}
                  itemLabel="clientes"
                />
              </>
            )}
          </div>
        )}

        {/* TAB: BILLING (§9.6·J7 - EstadoVazio Integrado) */}
        {activeTab === 'billing' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-6 rounded-[22px] border border-stone-200/80 shadow-2xs">
                <span className="block text-xs font-medium text-stone-500 mb-1">Total de Agendamentos</span>
                <span className="font-display font-bold text-3xl text-stone-900 tabular-nums">{appointments.length}</span>
              </div>
              <div className="bg-white p-6 rounded-[22px] border border-stone-200/80 shadow-2xs">
                <span className="block text-xs font-medium text-stone-500 mb-1">Volume Processado</span>
                <span className="font-display font-bold text-3xl text-emerald-700 tabular-nums lining-nums">
                  {formatCurrency(appointments.reduce((sum, app) => sum + (Number(app.total_price) || 0), 0))}
                </span>
              </div>
              <div className="bg-white p-6 rounded-[22px] border border-stone-200/80 shadow-2xs">
                <span className="block text-xs font-medium text-stone-500 mb-1">Comissões da Equipe</span>
                <span className="font-display font-bold text-3xl text-stone-800 tabular-nums lining-nums">
                  {formatCurrency(appointments.reduce((sum, app) => sum + (Number(app.staff_commission_value) || 0), 0))}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-[24px] border border-stone-200/80 shadow-2xs overflow-hidden">
              <div className="p-6 border-b border-stone-100">
                <h3 className="font-display font-bold text-xl text-stone-900">
                  Agendamentos e Faturamento ({appointments.length})
                </h3>
              </div>

              {appointments.length === 0 ? (
                <div className="py-12">
                  <EstadoVazio
                    titulo="Nenhum agendamento encontrado"
                    descricao="Este salão ainda não possui agendamentos registrados no sistema."
                  />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-stone-100 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                          <th className="py-3 px-4">Data e Hora</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Valor Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100/80">
                        {paginatedAppointments.map(app => (
                          <tr key={app.id} className="hover:bg-stone-50/70 transition-colors">
                            <td className="py-3.5 px-4 text-xs text-stone-800">{new Date(app.start_time).toLocaleString('pt-BR')}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(app.status)}`}>
                                {getStatusLabel(app.status)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right text-xs font-semibold text-stone-900 tabular-nums lining-nums">
                              {formatCurrency(app.total_price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <PaginationControls
                    currentPage={billingPage}
                    totalPages={totalBillingPages}
                    totalItems={appointments.length}
                    itemsPerPage={billingPerPage}
                    onPageChange={setBillingPage}
                    onItemsPerPageChange={(val) => { setBillingPerPage(val); setBillingPage(1); }}
                    itemsPerPageOptions={[10, 25, 50]}
                    itemLabel="agendamentos"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB: INVOICES SaaS (§9.6·J7 - EstadoVazio Integrado) */}
        {activeTab === 'invoices' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[22px] border border-stone-200/80 shadow-2xs">
              <div>
                <h3 className="font-display font-bold text-xl text-stone-900">Cobrança da Plataforma</h3>
                <p className="text-stone-500 text-xs mt-0.5">Gerencie as faturas e mensalidades deste salão no SaaS.</p>
              </div>
              <button 
                type="button"
                onClick={handleGenerateInvoice}
                className="bg-[#7C3A4D] hover:bg-[#682F40] text-white px-5 py-2.5 rounded-full text-xs font-semibold transition-all shadow-2xs hover:shadow cursor-pointer shrink-0"
              >
                Gerar fatura manual
              </button>
            </div>

            <div className="bg-white rounded-[24px] border border-stone-200/80 shadow-2xs overflow-hidden">
              {invoices.length === 0 ? (
                <div className="py-12">
                  <EstadoVazio
                    titulo="Nenhuma fatura encontrada"
                    descricao="Este salão ainda não possui faturas geradas ou registradas."
                    textoAcao="Gerar primeira fatura"
                    aoClicarAcao={handleGenerateInvoice}
                  />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-stone-100 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                          <th className="py-3 px-4">Mês / Referência</th>
                          <th className="py-3 px-4">Vencimento</th>
                          <th className="py-3 px-4">Valor</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100/80">
                        {paginatedInvoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-stone-50/70 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-xs text-stone-900">{inv.reference_month}</td>
                            <td className="py-3.5 px-4 text-xs text-stone-600">{new Date(inv.due_date).toLocaleDateString('pt-BR')}</td>
                            <td className="py-3.5 px-4 text-xs font-semibold text-stone-900 tabular-nums lining-nums">{formatCurrency(inv.amount)}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 
                                inv.status === 'pending' ? 'bg-amber-50 text-amber-700' : 
                                'bg-rose-50 text-rose-700'
                              }`}>
                                {inv.status === 'paid' ? 'Pago' : inv.status === 'pending' ? 'Pendente' : 'Vencida'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {inv.status !== 'paid' ? (
                                <button 
                                  type="button"
                                  onClick={() => handleMarkAsPaid(inv.id)}
                                  className="text-xs text-[#7C3A4D] hover:underline font-semibold cursor-pointer"
                                >
                                  Dar Baixa Manual
                                </button>
                              ) : (
                                <span className="text-stone-400 text-xs">Pago em {new Date(inv.paid_at).toLocaleDateString('pt-BR')}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <PaginationControls
                    currentPage={invoicesPage}
                    totalPages={totalInvoicesPages}
                    totalItems={invoices.length}
                    itemsPerPage={invoicesPerPage}
                    onPageChange={setInvoicesPage}
                    onItemsPerPageChange={(val) => { setInvoicesPerPage(val); setInvoicesPage(1); }}
                    itemsPerPageOptions={[10, 25]}
                    itemLabel="faturas"
                  />
                </>
              )}
            </div>
          </div>
        )}

      </div>

      <ModalSuspenderSalao
        isOpen={isSuspendModalOpen}
        onClose={() => setIsSuspendModalOpen(false)}
        tenant={tenant}
        onConfirm={handleConfirmSuspend}
        isSubmitting={isSuspending}
      />

      {/* Modal: Redefinir Senha de Cliente pelo Super Admin */}
      <ModalResetClientPassword
        isOpen={Boolean(clientForResetModal)}
        onClose={() => setClientForResetModal(null)}
        client={clientForResetModal}
        onConfirm={handleConfirmResetClientPassword}
        isSubmitting={isResettingClientPwd}
      />
    </div>
  );
};

export default TenantDetailAdmin;
