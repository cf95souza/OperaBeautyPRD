import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { 
  Layers, 
  Plus, 
  Search, 
  X, 
  Edit2, 
  Sparkles, 
  Clock, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  UserCheck, 
  Calendar, 
  Percent, 
  DollarSign,
  TrendingUp,
  ShoppingBag,
  MoreHorizontal
} from 'lucide-react';
import { EstadoVazio } from '../../components/ui/EstadoVazio';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const GestaoPacotes = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { showSuccess, showError, confirm } = useNotification();

  const [packages, setPackages] = useState([]);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Estados dos Modais
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [packageForm, setPackageForm] = useState({
    name: '',
    description: '',
    service_id: '',
    total_sessions: 10,
    price: '',
    validity_days: 90,
    min_interval_days: 0
  });

  const [showSellModal, setShowSellModal] = useState(false);
  const [sellForm, setSellForm] = useState({
    client_id: '',
    package_id: '',
    payment_method: 'pix',
    installments: 1,
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    loadData();
  }, [tenant]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pkgs, srvs, rep, cls] = await Promise.all([
        api.packages.list(tenant.id),
        api.services.list(tenant.id),
        api.packages.getReport().catch(() => null),
        api.clients.list(tenant.id).catch(() => [])
      ]);
      setPackages(pkgs || []);
      setServices((srvs || []).filter(s => s.is_active));
      setReport(rep);
      setClients(cls || []);
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar dados de pacotes de sessões.');
    } finally {
      setLoading(false);
    }
  };

  // Filtragem de pacotes
  const filteredPackages = useMemo(() => {
    if (!searchTerm.trim()) return packages;
    const term = searchTerm.toLowerCase().trim();
    return packages.filter(p => 
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.service_name && p.service_name.toLowerCase().includes(term))
    );
  }, [packages, searchTerm]);

  // Abertura do modal de criação
  const handleOpenCreate = () => {
    setEditingId(null);
    setPackageForm({
      name: '',
      description: '',
      service_id: services[0]?.id || '',
      total_sessions: 10,
      price: '',
      validity_days: 90,
      min_interval_days: 0
    });
    setShowPackageModal(true);
  };

  // Abertura do modal de edição
  const handleOpenEdit = (pkg) => {
    setEditingId(pkg.id);
    setPackageForm({
      name: pkg.name,
      description: pkg.description || '',
      service_id: pkg.service_id,
      total_sessions: pkg.total_sessions,
      price: pkg.price,
      validity_days: pkg.validity_days,
      min_interval_days: pkg.min_interval_days || 0
    });
    setShowPackageModal(true);
  };

  // Abertura do modal de venda
  const handleOpenSell = (pkg = null) => {
    setSellForm({
      client_id: clients[0]?.id || '',
      package_id: pkg ? pkg.id : (packages[0]?.id || ''),
      payment_method: 'pix',
      installments: 1,
      notes: ''
    });
    setShowSellModal(true);
  };

  // Salvar pacote (Criar ou Atualizar)
  const handleSavePackage = async (e) => {
    e.preventDefault();
    if (!packageForm.name || !packageForm.service_id || !packageForm.price || !packageForm.total_sessions) {
      showError('Preencha os campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: packageForm.name,
        description: packageForm.description,
        service_id: packageForm.service_id,
        total_sessions: parseInt(packageForm.total_sessions, 10),
        price: parseFloat(packageForm.price),
        validity_days: parseInt(packageForm.validity_days, 10) || 90,
        min_interval_days: parseInt(packageForm.min_interval_days || 0, 10)
      };

      if (editingId) {
        await api.packages.update(editingId, payload);
        showSuccess('Pacote atualizado com sucesso!');
      } else {
        await api.packages.create(payload);
        showSuccess('Pacote cadastrado com sucesso!');
      }

      setShowPackageModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao salvar pacote.');
    } finally {
      setSubmitting(false);
    }
  };

  // Desativar pacote
  const handleDeletePackage = async (id, name) => {
    const confirmed = await confirm({
      title: 'Desativar Pacote',
      message: `Tem certeza que deseja desativar o pacote "${name}"? Ele deixará de ser ofertado, mas as clientes que já compraram mantêm seu saldo ativo.`
    });
    if (!confirmed) return;

    try {
      await api.packages.delete(id);
      showSuccess(`Pacote "${name}" desativado.`);
      loadData();
    } catch (err) {
      console.error(err);
      showError('Erro ao desativar pacote.');
    }
  };

  // Concluir venda de pacote para cliente
  const handleCompleteSell = async (e) => {
    e.preventDefault();
    if (!sellForm.client_id || !sellForm.package_id) {
      showError('Selecione a cliente e o pacote.');
      return;
    }

    setSubmitting(true);
    try {
      await api.packages.sell({
        client_id: sellForm.client_id,
        package_id: sellForm.package_id,
        payment_method: sellForm.payment_method,
        installments: parseInt(sellForm.installments || 1, 10),
        notes: sellForm.notes
      });

      const selectedClient = clients.find(c => c.id === sellForm.client_id);
      const selectedPkg = packages.find(p => p.id === sellForm.package_id);

      showSuccess(`Pacote "${selectedPkg?.name || 'Sessões'}" creditado para ${selectedClient?.name || 'a cliente'}!`);
      setShowSellModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao realizar venda do pacote.');
    } finally {
      setSubmitting(false);
    }
  };

  // Cálculos no formulário de pacote para prévia visual
  const selectedServiceObj = services.find(s => s.id === packageForm.service_id);
  const unitPricePerSession = (packageForm.price && packageForm.total_sessions > 0)
    ? (parseFloat(packageForm.price) / parseInt(packageForm.total_sessions, 10)).toFixed(2)
    : '0.00';
  const normalTotalPrice = selectedServiceObj ? (parseFloat(selectedServiceObj.price) * (parseInt(packageForm.total_sessions, 10) || 0)).toFixed(2) : '0.00';
  const estimatedSavings = (parseFloat(normalTotalPrice) - (parseFloat(packageForm.price) || 0)).toFixed(2);

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-8 max-w-7xl mx-auto">
      {/* 1. Cabeçalho Editorial Rosé */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line/60">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-tint text-brand text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Retenção & Receita Antecipada · D13</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink tracking-tight">
            Pacotes de Sessões
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Modelos de pacotes pré-pagos, venda avulsa, controle de saldo e validade.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleOpenSell()}
            disabled={packages.length === 0}
            className="px-4 py-2.5 rounded-full border border-brand text-brand hover:bg-brand-tint/40 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Vender para Cliente</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-full bg-brand text-white hover:bg-brand-hover text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-xs active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Pacote</span>
          </button>
        </div>
      </div>

      {/* 2. Grid de KPIs Executivos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Modelos de Pacotes */}
        <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-line shadow-xs">
          <div className="flex items-center justify-between text-ink-soft mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Modelos Ativos</span>
            <Layers className="w-4 h-4 text-brand" />
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-ink tabular-nums">
            {report?.total_package_models || packages.length}
          </p>
          <span className="text-[11px] text-ink-soft/80 mt-1 block">
            Formatos configurados
          </span>
        </div>

        {/* KPI 2: Pacotes Vendidos */}
        <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-line shadow-xs">
          <div className="flex items-center justify-between text-ink-soft mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pacotes Vendidos</span>
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-ink tabular-nums">
            {report?.total_sold || 0}
          </p>
          <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
            {report?.active_packages_count || 0} ativos no momento
          </span>
        </div>

        {/* KPI 3: Sessões Pendentes */}
        <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-line shadow-xs">
          <div className="flex items-center justify-between text-ink-soft mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Sessões a Realizar</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-ink tabular-nums">
            {report?.total_sessions_remaining || 0}
          </p>
          <span className="text-[11px] text-ink-soft mt-1 block">
            {report?.usage_rate_percentage || 0}% das sessões já utilizadas
          </span>
        </div>

        {/* KPI 4: Faturamento Antecipado */}
        <div className="bg-surface p-4 sm:p-5 rounded-2xl border border-line shadow-xs">
          <div className="flex items-center justify-between text-ink-soft mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Receita Antecipada</span>
            <DollarSign className="w-4 h-4 text-brand" />
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-brand tabular-nums">
            {formatCurrency(report?.total_revenue || 0)}
          </p>
          <span className="text-[11px] text-ink-soft/80 mt-1 block">
            Garantidos no caixa
          </span>
        </div>
      </div>

      {/* 3. Barra de Busca e Filtros */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            placeholder="Buscar por pacote ou procedimento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface border border-line rounded-xl text-xs sm:text-sm text-ink placeholder:text-ink-soft/70 focus:border-brand outline-none shadow-2xs"
          />
        </div>
      </div>

      {/* 4. Lista de Pacotes (Tabela Desktop & Cards Mobile) */}
      <div className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-soft">
            <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto mb-2" />
            <span>Carregando pacotes de sessões...</span>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="p-8">
            <EstadoVazio
              icone={Layers}
              titulo="Nenhum pacote cadastrado"
              descricao="Crie pacotes promocionais com 5, 10 ou mais sessões (ex: Drenagem Linfática, Massagens, Limpeza de Pele) para fidelizar suas clientes e antecipar receita."
              textoBotao="Criar Primeiro Pacote"
              aoClicar={handleOpenCreate}
            />
          </div>
        ) : (
          <>
            {/* Tabela Desktop (md:table) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-ink divide-y divide-line/60">
                <thead className="bg-stone-50/70 text-xs font-bold uppercase tracking-wider text-ink-soft">
                  <tr>
                    <th className="px-6 py-4">PACOTE / PROCEDIMENTO</th>
                    <th className="px-6 py-4">SESSÕES</th>
                    <th className="px-6 py-4">VALOR TOTAL</th>
                    <th className="px-6 py-4">POR SESSÃO</th>
                    <th className="px-6 py-4">VALIDADE</th>
                    <th className="px-6 py-4">INTERVALO MÍN.</th>
                    <th className="px-6 py-4 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredPackages.map((pkg) => {
                    const unitPrice = (parseFloat(pkg.price) / pkg.total_sessions).toFixed(2);
                    const hasSavings = parseFloat(pkg.estimated_savings) > 0;
                    return (
                      <tr key={pkg.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-brand-tint text-brand flex items-center justify-center shrink-0">
                              <Layers className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-ink leading-tight">{pkg.name}</p>
                              <span className="text-xs text-ink-soft flex items-center gap-1.5 mt-0.5">
                                <span>Procedimento:</span>
                                <strong className="text-ink font-medium">{pkg.service_name}</strong>
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-tint text-brand tabular-nums">
                            {pkg.total_sessions} sessões
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div>
                            <span className="font-serif text-base font-bold text-brand tabular-nums">
                              {formatCurrency(pkg.price)}
                            </span>
                            {hasSavings && (
                              <span className="block text-[11px] text-emerald-700 font-medium">
                                Economia de {formatCurrency(pkg.estimated_savings)}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold text-ink-soft tabular-nums">
                            {formatCurrency(unitPrice)} / sessão
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-xs text-ink-soft tabular-nums">
                            {pkg.validity_days} dias
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-xs text-ink-soft tabular-nums">
                            {pkg.min_interval_days > 0 ? `${pkg.min_interval_days} dias` : 'Livre'}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenSell(pkg)}
                              className="px-3 py-1.5 rounded-lg border border-brand/40 text-brand hover:bg-brand-tint/60 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                              title="Vender para cliente"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Vender</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(pkg)}
                              className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-ink-soft hover:text-ink hover:bg-stone-50 cursor-pointer transition-colors"
                              title="Editar pacote"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                              className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                              title="Desativar pacote"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards Mobile (< md) */}
            <div className="md:hidden divide-y divide-line/60">
              {filteredPackages.map((pkg) => (
                <div key={pkg.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-base text-ink">{pkg.name}</h3>
                      <p className="text-xs text-ink-soft mt-0.5">
                        Procedimento: <strong className="text-ink">{pkg.service_name}</strong>
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-tint text-brand text-xs font-semibold shrink-0">
                      {pkg.total_sessions} sessões
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="font-serif text-xl font-bold text-brand tabular-nums">
                        {formatCurrency(pkg.price)}
                      </span>
                      <span className="text-xs text-ink-soft ml-2 tabular-nums">
                        ({formatCurrency(pkg.price / pkg.total_sessions)} / sessão)
                      </span>
                    </div>
                    <span className="text-xs text-ink-soft">
                      Validade: {pkg.validity_days} dias
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-line/40">
                    <button
                      type="button"
                      onClick={() => handleOpenSell(pkg)}
                      className="flex-1 py-2 rounded-xl bg-brand text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Vender</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(pkg)}
                      className="px-3 py-2 rounded-xl border border-line text-xs font-semibold text-ink-soft hover:text-ink cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                      className="px-3 py-2 rounded-xl border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 5. Modal: Criar ou Editar Modelo de Pacote */}
      {showPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
          <div className="bg-surface w-full max-w-lg rounded-2xl border border-line shadow-2xl p-6 relative animate-scale-up my-8">
            <div className="flex items-center justify-between pb-4 border-b border-line mb-5">
              <h2 className="font-serif text-2xl font-bold text-ink">
                {editingId ? 'Editar Pacote de Sessões' : 'Novo Pacote de Sessões'}
              </h2>
              <button
                type="button"
                onClick={() => setShowPackageModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:text-ink hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Nome Comercial do Pacote *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Pacote 10 Sessões Drenagem Linfática"
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                  className="w-full border border-line rounded-xl px-4 py-2.5 bg-surface text-sm text-ink focus:border-brand outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Procedimento Coberto *
                </label>
                <select
                  required
                  value={packageForm.service_id}
                  onChange={(e) => setPackageForm({ ...packageForm, service_id: e.target.value })}
                  className="w-full border border-line rounded-xl px-4 py-2.5 bg-surface text-sm text-ink focus:border-brand outline-none shadow-2xs"
                >
                  <option value="">Selecione o serviço...</option>
                  {services.map((svc) => (
                    <option key={svc.id} value={svc.id}>
                      {svc.name} — Avulso: {formatCurrency(svc.price)} ({svc.duration_minutes} min)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Total de Sessões *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={packageForm.total_sessions}
                    onChange={(e) => setPackageForm({ ...packageForm, total_sessions: e.target.value })}
                    className="w-full border border-line rounded-xl px-4 py-2.5 bg-surface text-sm text-ink focus:border-brand outline-none tabular-nums shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Valor Total do Pacote (R$) *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="800,00"
                    value={packageForm.price}
                    onChange={(e) => setPackageForm({ ...packageForm, price: e.target.value })}
                    className="w-full border border-line rounded-xl px-4 py-2.5 bg-surface text-sm text-ink focus:border-brand outline-none tabular-nums shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Validade em Dias *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={packageForm.validity_days}
                    onChange={(e) => setPackageForm({ ...packageForm, validity_days: e.target.value })}
                    className="w-full border border-line rounded-xl px-4 py-2.5 bg-surface text-sm text-ink focus:border-brand outline-none tabular-nums shadow-2xs"
                  />
                  <span className="text-[11px] text-ink-soft mt-1 block">
                    Padrão: 90 dias
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Intervalo Mínimo (Dias)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={packageForm.min_interval_days}
                    onChange={(e) => setPackageForm({ ...packageForm, min_interval_days: e.target.value })}
                    className="w-full border border-line rounded-xl px-4 py-2.5 bg-surface text-sm text-ink focus:border-brand outline-none tabular-nums shadow-2xs"
                  />
                  <span className="text-[11px] text-ink-soft mt-1 block">
                    Ex: 3 dias entre drenagens
                  </span>
                </div>
              </div>

              {/* Card de Prévia Financeira */}
              {selectedServiceObj && packageForm.price && (
                <div className="bg-brand-tint/30 border border-brand/20 rounded-xl p-3.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-semibold text-ink">
                    <span>Custo unitário por sessão:</span>
                    <strong className="text-brand font-bold text-sm">R$ {unitPricePerSession}</strong>
                  </div>
                  <div className="flex items-center justify-between text-ink-soft">
                    <span>Avulso correspondente:</span>
                    <span className="line-through">R$ {normalTotalPrice}</span>
                  </div>
                  {parseFloat(estimatedSavings) > 0 && (
                    <div className="flex items-center justify-between text-emerald-700 font-semibold pt-1 border-t border-brand/20">
                      <span>Economia para a cliente:</span>
                      <span>R$ {estimatedSavings} de desconto</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Descrição (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Instruções, benefícios do protocolo ou condições de uso..."
                  value={packageForm.description}
                  onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                  className="w-full border border-line rounded-xl px-4 py-2.5 bg-surface text-sm text-ink focus:border-brand outline-none shadow-2xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowPackageModal(false)}
                  className="px-5 py-2.5 rounded-full border border-line text-xs font-semibold text-ink-soft hover:text-ink cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full bg-brand text-white text-xs font-semibold hover:bg-brand-hover cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Criar Pacote')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Vender Pacote para Cliente */}
      {showSellModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
          <div className="bg-surface w-full max-w-lg rounded-2xl border border-line shadow-2xl p-6 relative animate-scale-up my-8">
            <div className="flex items-center justify-between pb-4 border-b border-line mb-5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand" />
                <h2 className="font-serif text-2xl font-bold text-ink">
                  Vender Pacote para Cliente
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSellModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:text-ink hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSell} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Selecione a Cliente *
                </label>
                <select
                  required
                  value={sellForm.client_id}
                  onChange={(e) => setSellForm({ ...sellForm, client_id: e.target.value })}
                  className="w-full border border-line rounded-xl px-4 py-2.5 bg-surface text-sm text-ink focus:border-brand outline-none shadow-2xs"
                >
                  <option value="">Selecione a cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Pacote Contratado *
                </label>
                <select
                  required
                  value={sellForm.package_id}
                  onChange={(e) => setSellForm({ ...sellForm, package_id: e.target.value })}
                  className="w-full border border-line rounded-xl px-4 py-2.5 bg-surface text-sm text-ink focus:border-brand outline-none shadow-2xs"
                >
                  <option value="">Selecione o pacote...</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.total_sessions} sessões por {formatCurrency(p.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Forma de Pagamento
                  </label>
                  <select
                    value={sellForm.payment_method}
                    onChange={(e) => setSellForm({ ...sellForm, payment_method: e.target.value })}
                    className="w-full border border-line rounded-xl px-4 py-2.5 bg-surface text-sm text-ink focus:border-brand outline-none shadow-2xs"
                  >
                    <option value="pix">PIX</option>
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="debit_card">Cartão de Débito</option>
                    <option value="cash">Dinheiro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Parcelas
                  </label>
                  <select
                    value={sellForm.installments}
                    onChange={(e) => setSellForm({ ...sellForm, installments: parseInt(e.target.value, 10) })}
                    className="w-full border border-line rounded-xl px-4 py-2.5 bg-surface text-sm text-ink focus:border-brand outline-none shadow-2xs"
                  >
                    {[1, 2, 3, 4, 5, 6, 10, 12].map((n) => (
                      <option key={n} value={n}>
                        {n === 1 ? '1x à vista' : `${n}x parcelas`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Observações da Venda
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais de negociação..."
                  value={sellForm.notes}
                  onChange={(e) => setSellForm({ ...sellForm, notes: e.target.value })}
                  className="w-full border border-line rounded-xl px-4 py-2.5 bg-surface text-sm text-ink focus:border-brand outline-none shadow-2xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowSellModal(false)}
                  className="px-5 py-2.5 rounded-full border border-line text-xs font-semibold text-ink-soft hover:text-ink cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full bg-brand text-white text-xs font-semibold hover:bg-brand-hover cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Processando...' : 'Confirmar Venda e Creditar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestaoPacotes;
