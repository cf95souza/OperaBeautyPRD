import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { 
  Scissors, 
  Plus, 
  Search, 
  X, 
  Star, 
  Edit2, 
  MoreHorizontal, 
  Sparkles, 
  Clock, 
  Trash2, 
  Package,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Upload,
  FileSpreadsheet,
  SlidersHorizontal,
  Layers
} from 'lucide-react';
import { EstadoVazio } from '../../components/ui/EstadoVazio';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import ModalImportarPlanilha from '../../components/admin/ModalImportarPlanilha';
import ModalCatalogoModelo from '../../components/admin/ModalCatalogoModelo';

const GestaoServicos = () => {
  const { tenant_slug } = useParams();
  const { tenant } = useTenant();
  const { showSuccess, showError, confirm } = useNotification();

  const [services, setServices] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros e busca
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [searchTerm, setSearchTerm] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Estados dos Modais
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newService, setNewService] = useState({ 
    name: '', 
    short_description: '',
    category: '',
    duration_minutes: 60, 
    price: '', 
    is_starting_price: false,
    maintenance_days: 0,
    requires_deposit: false,
    deposit_type: 'percentage',
    deposit_amount: 30,
    has_variations: false,
    variations: [],
    has_extras: false,
    extras: [],
    use_inventory: false,
    inputs: []
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    fetchData();
  }, [tenant]);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.service-actions-dropdown')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const srvData = await api.services.list(tenant.id);
      if (srvData) setServices(srvData);

      const invData = await api.inventory.list();
      if (invData) setInventoryItems(invData.filter(i => i.is_active));
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar catálogo de serviços.');
    } finally {
      setLoading(false);
    }
  };

  // Métricas para os chips de filtro
  const totalCount = services.length;
  const activeCount = services.filter(s => s.is_active).length;
  const inactiveCount = services.filter(s => !s.is_active).length;

  // Filtragem e busca
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      // Filtro de status
      if (activeFilter === 'active' && !service.is_active) return false;
      if (activeFilter === 'inactive' && service.is_active) return false;

      // Filtro de busca
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesName = service.name && service.name.toLowerCase().includes(term);
        const matchesCategory = service.category && service.category.toLowerCase().includes(term);
        if (!matchesName && !matchesCategory) return false;
      }

      return true;
    });
  }, [services, activeFilter, searchTerm]);

  // Edição
  const handleEdit = (service) => {
    const vars = service.variations && service.variations.length > 0 ? [...service.variations] : [];
    const exts = service.extras && service.extras.length > 0 ? [...service.extras] : [];
    setNewService({
      name: service.name,
      short_description: service.short_description || '',
      category: service.category || '',
      duration_minutes: service.duration_minutes || 60,
      price: service.price || '',
      is_starting_price: service.is_starting_price || vars.length > 0,
      maintenance_days: service.maintenance_days || 0,
      requires_deposit: service.requires_deposit || false,
      deposit_type: service.deposit_type || 'percentage',
      deposit_amount: service.deposit_amount || 0,
      has_variations: vars.length > 0,
      variations: vars,
      has_extras: exts.length > 0,
      extras: exts,
      use_inventory: (service.inputs && service.inputs.length > 0) || service.reduces_stock || false,
      inputs: service.inputs && service.inputs.length > 0 ? [...service.inputs] : []
    });
    setEditingId(service.id);
    setShowModal(true);
    setOpenDropdownId(null);
  };

  // Alternar Status Ativo / Inativo
  const handleToggleActive = async (service) => {
    const newStatus = !service.is_active;
    try {
      const payload = {
        name: service.name,
        short_description: service.short_description || null,
        category: service.category || null,
        duration_minutes: service.duration_minutes,
        price: service.price,
        is_starting_price: service.is_starting_price,
        maintenance_days: service.maintenance_days || 0,
        reduces_stock: service.reduces_stock || false,
        requires_deposit: service.requires_deposit || false,
        deposit_type: service.deposit_type || 'percentage',
        deposit_amount: service.deposit_amount || 0,
        is_active: newStatus,
        inputs: service.inputs || []
      };
      await api.services.update(service.id, payload);
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, is_active: newStatus } : s));
      showSuccess(`Serviço "${service.name}" ${newStatus ? 'ativado' : 'desativado'}.`);
    } catch (err) {
      console.error(err);
      showError('Erro ao alterar status do serviço.');
    }
  };

  // Exclusão / Inativação Permanente
  const handleDelete = async (id, name) => {
    setOpenDropdownId(null);
    if (!(await confirm(`Tem certeza que deseja inativar permanentemente o serviço "${name}"?`))) return;

    try {
      await api.services.delete(id);
      showSuccess('Serviço inativado com sucesso.');
      fetchData();
    } catch (err) {
      console.error(err);
      showError('Erro ao excluir serviço.');
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setNewService({ 
      name: '', 
      short_description: '',
      category: '',
      duration_minutes: 60, 
      price: '', 
      is_starting_price: false, 
      maintenance_days: 0,
      requires_deposit: false,
      deposit_type: 'percentage',
      deposit_amount: 30,
      has_variations: false,
      variations: [],
      has_extras: false,
      extras: [],
      use_inventory: false, 
      inputs: []
    });
    setShowModal(true);
    setOpenDropdownId(null);
  };

  const handleAddVariation = () => {
    setNewService(prev => ({
      ...prev,
      has_variations: true,
      variations: [
        ...prev.variations,
        { name: '', price: prev.price || 0, duration_minutes: prev.duration_minutes || 30, order_index: prev.variations.length }
      ]
    }));
  };

  const handleRemoveVariation = (index) => {
    setNewService(prev => {
      const updated = [...prev.variations];
      updated.splice(index, 1);
      return {
        ...prev,
        variations: updated,
        has_variations: updated.length > 0
      };
    });
  };

  const handleVariationUpdate = (index, field, value) => {
    setNewService(prev => {
      const updated = [...prev.variations];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, variations: updated };
    });
  };

  const handleAddExtra = () => {
    setNewService(prev => ({
      ...prev,
      has_extras: true,
      extras: [
        ...prev.extras,
        { name: '', price: 15, duration_minutes: 0, order_index: prev.extras.length }
      ]
    }));
  };

  const handleRemoveExtra = (index) => {
    setNewService(prev => {
      const updated = [...prev.extras];
      updated.splice(index, 1);
      return {
        ...prev,
        extras: updated,
        has_extras: updated.length > 0
      };
    });
  };

  const handleExtraUpdate = (index, field, value) => {
    setNewService(prev => {
      const updated = [...prev.extras];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, extras: updated };
    });
  };

  const handleAddInput = () => {
    setNewService({
      ...newService,
      inputs: [...newService.inputs, { inventory_id: '', quantity_consumed: 1 }]
    });
  };

  const handleRemoveInput = (index) => {
    const newInputs = [...newService.inputs];
    newInputs.splice(index, 1);
    setNewService({ ...newService, inputs: newInputs });
  };

  const handleInputUpdate = (index, field, value) => {
    const newInputs = [...newService.inputs];
    newInputs[index][field] = value;
    setNewService({ ...newService, inputs: newInputs });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!tenant) return;
    
    if (newService.use_inventory && newService.inputs.length === 0) {
      showError("Adicione pelo menos um item de consumo do estoque.");
      return;
    }
    
    const invalidInputs = newService.inputs.filter(i => !i.inventory_id || i.quantity_consumed <= 0);
    if (newService.use_inventory && invalidInputs.length > 0) {
      showError("Preencha corretamente os insumos do estoque selecionados.");
      return;
    }

    const cleanedVariations = newService.has_variations && Array.isArray(newService.variations)
      ? newService.variations
          .filter(v => v.name && v.name.trim())
          .map((v, idx) => ({
            id: v.id || undefined,
            name: v.name.trim(),
            price: parseFloat(v.price) || 0,
            duration_minutes: parseInt(v.duration_minutes, 10) || parseInt(newService.duration_minutes, 10) || 30,
            order_index: idx
          }))
      : [];

    const cleanedExtras = newService.has_extras && Array.isArray(newService.extras)
      ? newService.extras
          .filter(e => e.name && e.name.trim())
          .map((e, idx) => ({
            id: e.id || undefined,
            name: e.name.trim(),
            price: parseFloat(e.price) || 0,
            duration_minutes: parseInt(e.duration_minutes, 10) || 0,
            order_index: idx
          }))
      : [];

    setSaving(true);
    try {
      const payload = {
        name: newService.name.trim(),
        short_description: newService.short_description?.trim() || null,
        category: newService.category.trim() || null,
        duration_minutes: parseInt(newService.duration_minutes) || 30,
        price: parseFloat(newService.price) || 0,
        is_starting_price: Boolean(newService.is_starting_price || cleanedVariations.length > 0),
        maintenance_days: parseInt(newService.maintenance_days) || 0,
        reduces_stock: newService.use_inventory,
        requires_deposit: newService.requires_deposit || false,
        deposit_type: newService.deposit_type || 'percentage',
        deposit_amount: parseFloat(newService.deposit_amount) || 0,
        variations: cleanedVariations,
        extras: cleanedExtras,
        is_active: true,
        inputs: newService.use_inventory ? newService.inputs.map(i => ({
          inventory_id: i.inventory_id,
          quantity_consumed: parseFloat(i.quantity_consumed) || 1
        })) : []
      };

      if (editingId) {
        await api.services.update(editingId, payload);
      } else {
        await api.services.create(payload);
      }
      
      showSuccess(`Serviço ${editingId ? 'atualizado' : 'cadastrado'} com sucesso!`);
      setShowModal(false);
      fetchData(); 
    } catch (err) {
      console.error(err);
      showError('Erro ao salvar serviço.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in text-ink">
      
      {/* 1. Cabeçalho Editorial (§9.6 J10 · Mockup G7) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">Serviços</h1>
          <p className="text-sm text-ink-soft mt-1">Catálogo, duração, preço e consumo de estoque.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button 
            type="button"
            onClick={() => setShowTemplateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-line bg-white hover:bg-stone-50 text-ink text-sm font-semibold shadow-2xs hover:shadow-xs transition-all active:scale-98 cursor-pointer shrink-0"
            title="Usar sugestões prontas de procedimentos por segmento"
          >
            <Sparkles className="w-4 h-4 text-brand" />
            <span>Catálogo modelo</span>
          </button>

          <button 
            type="button"
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-line bg-white hover:bg-stone-50 text-ink text-sm font-semibold shadow-2xs hover:shadow-xs transition-all active:scale-98 cursor-pointer shrink-0"
          >
            <Upload className="w-4 h-4 text-brand" />
            <span>Importar planilha</span>
          </button>

          <button 
            onClick={openNewModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo serviço</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Ferramentas: Filtros em Chips e Busca em Tempo Real */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Chips de Filtro */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-brand text-white shadow-xs'
                : 'bg-white text-ink-soft hover:bg-stone-50 border border-line'
            }`}
          >
            Todos ({totalCount})
          </button>

          <button
            onClick={() => setActiveFilter('active')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'active'
                ? 'bg-brand text-white shadow-xs'
                : 'bg-white text-ink-soft hover:bg-stone-50 border border-line'
            }`}
          >
            Ativos ({activeCount})
          </button>

          <button
            onClick={() => setActiveFilter('inactive')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeFilter === 'inactive'
                ? 'bg-brand text-white shadow-xs'
                : 'bg-white text-ink-soft hover:bg-stone-50 border border-line'
            }`}
          >
            Desativados ({inactiveCount})
          </button>
        </div>

        {/* Busca em Tempo Real */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-ink-soft absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar serviço"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-10 py-2 rounded-full border border-line bg-white text-sm text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-2xs transition-all placeholder:text-ink-soft/70"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink cursor-pointer p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>

      {/* 3. Conteúdo: Loading / Estado Vazio / Tabela */}
      {loading ? (
        <div className="py-20 text-center text-ink-soft flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
          <span className="text-sm">Carregando catálogo de serviços...</span>
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-[22px] border border-line p-8 shadow-xs">
          <EstadoVazio
            icone={<Sparkles className="w-8 h-8 text-brand" />}
            titulo="Nenhum serviço cadastrado"
            descricao="Crie procedimentos e serviços para permitir que suas clientes agendem online."
            textoAcao="+ Novo serviço"
            aoClicarAcao={openNewModal}
          />
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="bg-white rounded-[22px] border border-line p-12 text-center shadow-xs">
          <Scissors className="w-10 h-10 text-brand/40 mx-auto mb-3" />
          <p className="font-semibold text-ink text-base">Nenhum serviço encontrado</p>
          <p className="text-xs text-ink-soft mt-1">Tente ajustar a busca ou o filtro selecionado.</p>
          <button
            onClick={() => { setSearchTerm(''); setActiveFilter('all'); }}
            className="mt-4 px-4 py-1.5 rounded-full border border-line text-xs font-semibold text-brand hover:bg-brand-tint/20 transition-all cursor-pointer"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="rounded-[22px] border border-line bg-white shadow-xs overflow-hidden">
          
          {/* Tabela Corporativa Rosé Editorial (>= 768px Desktop e Tablet) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-stone-50/50 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  <th className="px-6 py-4">SERVIÇO</th>
                  <th className="px-6 py-4">DURAÇÃO</th>
                  <th className="px-6 py-4">CONSUMO</th>
                  <th className="px-6 py-4">RETORNO (DIAS)</th>
                  <th className="px-6 py-4">VALOR</th>
                  <th className="px-6 py-4">ATIVO</th>
                  <th className="px-6 py-4 text-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70 text-sm">
                {filteredServices.map((service) => {
                  const hasInventory = service.inputs && service.inputs.length > 0;
                  const inv = hasInventory ? service.inputs[0] : null;
                  const invDetail = inv ? inventoryItems.find(i => i.id === inv.inventory_id) : null;

                  return (
                    <tr 
                      key={service.id} 
                      className={`hover:bg-stone-50/60 transition-colors group ${
                        !service.is_active ? 'opacity-60 bg-stone-50/30' : ''
                      }`}
                    >
                      {/* Coluna: SERVIÇO */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-tint/60 text-brand flex items-center justify-center shrink-0 shadow-2xs">
                            <Scissors className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-semibold text-ink block group-hover:text-brand transition-colors">
                              {service.name}
                            </span>
                            {service.short_description && (
                              <p className="text-xs text-ink-soft line-clamp-1 max-w-sm mt-0.5">
                                {service.short_description}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-xs text-ink-soft">
                                {service.category || 'Sem categoria'}
                              </span>
                              {service.variations && service.variations.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand bg-brand-tint/80 px-1.5 py-0.5 rounded-md">
                                  <SlidersHorizontal className="w-2.5 h-2.5" />
                                  {service.variations.length} {service.variations.length === 1 ? 'variação' : 'variações'}
                                </span>
                              )}
                              {service.extras && service.extras.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-soft bg-stone-100 px-1.5 py-0.5 rounded-md">
                                  <Sparkles className="w-2.5 h-2.5 text-brand" />
                                  {service.extras.length} {service.extras.length === 1 ? 'extra' : 'extras'}
                                </span>
                              )}
                              {service.requires_deposit && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand bg-brand-tint/70 px-1.5 py-0.5 rounded-md">
                                  <CreditCard className="w-2.5 h-2.5" /> 
                                  Sinal {service.deposit_type === 'percentage' ? `${service.deposit_amount}%` : formatCurrency(service.deposit_amount)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Coluna: DURAÇÃO */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-stone-100 text-ink-soft tabular-nums">
                          {service.duration_minutes} min
                        </span>
                      </td>

                      {/* Coluna: CONSUMO */}
                      <td className="px-6 py-4 text-xs text-ink-soft">
                        {hasInventory && invDetail ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100/80 text-ink font-medium">
                            <Package className="w-3.5 h-3.5 text-brand" />
                            <span>{invDetail.name} ({inv.quantity_consumed} {invDetail.unit})</span>
                          </span>
                        ) : (
                          <span className="text-ink-soft/60 font-semibold">—</span>
                        )}
                      </td>

                      {/* Coluna: RETORNO (DIAS) */}
                      <td className="px-6 py-4 text-xs text-ink-soft">
                        {service.maintenance_days > 0 ? (
                          <span className="tabular-nums font-medium text-ink">
                            {service.maintenance_days} dias
                          </span>
                        ) : (
                          <span className="text-ink-soft/60 font-semibold">—</span>
                        )}
                      </td>

                      {/* Coluna: VALOR */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          {service.is_starting_price ? (
                            <span className="text-xs text-ink-soft font-normal">
                              A partir de <strong className="font-display text-base font-bold text-ink tabular-nums lining-nums">{formatCurrency(service.price)}</strong>
                            </span>
                          ) : (
                            <span className="font-display text-base font-bold text-ink tabular-nums lining-nums">
                              {formatCurrency(service.price)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Coluna: ATIVO (Switch) */}
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(service)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 shadow-2xs ${
                            service.is_active ? 'bg-brand' : 'bg-stone-300'
                          }`}
                          title={service.is_active ? 'Clique para desativar' : 'Clique para ativar'}
                        >
                          <div 
                            className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                              service.is_active ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Coluna: AÇÕES */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 relative service-actions-dropdown">
                          <button
                            onClick={() => handleEdit(service)}
                            className="px-3.5 py-1 rounded-full border border-line text-ink-soft hover:text-ink hover:border-ink-soft text-xs font-semibold transition-all cursor-pointer hover:bg-stone-50"
                          >
                            Editar
                          </button>

                          <div className="relative">
                            <button
                              onClick={() => setOpenDropdownId(openDropdownId === service.id ? null : service.id)}
                              className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink-soft hover:text-ink hover:border-ink-soft cursor-pointer transition-all hover:bg-stone-50"
                              title="Mais opções"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {openDropdownId === service.id && (
                              <div className="absolute right-0 top-9 w-40 rounded-xl bg-white border border-line shadow-lg py-1 z-30 animate-scale-up text-left">
                                <button
                                  onClick={() => handleToggleActive(service)}
                                  className="w-full px-4 py-2 text-xs font-medium text-ink hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                                >
                                  {service.is_active ? 'Desativar serviço' : 'Ativar serviço'}
                                </button>
                                <button
                                  onClick={() => handleDelete(service.id, service.name)}
                                  className="w-full px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 flex items-center gap-2 cursor-pointer border-t border-line/60"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Excluir serviço
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Visualização em Cartões para Telas Compactas / Mobile (< 768px) (§9.6 J8) */}
          <div className="md:hidden divide-y divide-line">
            {filteredServices.map((service) => (
              <div 
                key={service.id} 
                className={`p-4 space-y-3 transition-colors ${
                  !service.is_active ? 'bg-stone-50/40 opacity-70' : 'bg-white'
                }`}
              >
                {/* Linha Superior: Ícone + Nome + Switch */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-tint/60 text-brand flex items-center justify-center shrink-0">
                      <Scissors className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-ink">{service.name}</h3>
                      {service.short_description && (
                        <p className="text-xs text-ink-soft line-clamp-1 mt-0.5">
                          {service.short_description}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-xs text-ink-soft">{service.category || 'Sem categoria'}</span>
                        {service.variations && service.variations.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand bg-brand-tint/80 px-1.5 py-0.5 rounded-md">
                            <SlidersHorizontal className="w-2.5 h-2.5" />
                            {service.variations.length} {service.variations.length === 1 ? 'variação' : 'variações'}
                          </span>
                        )}
                        {service.extras && service.extras.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-soft bg-stone-100 px-1.5 py-0.5 rounded-md">
                            <Sparkles className="w-2.5 h-2.5 text-brand" />
                            {service.extras.length} {service.extras.length === 1 ? 'extra' : 'extras'}
                          </span>
                        )}
                        {service.requires_deposit && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand bg-brand-tint/70 px-1.5 py-0.5 rounded-md">
                            <CreditCard className="w-2.5 h-2.5" /> 
                            Sinal {service.deposit_type === 'percentage' ? `${service.deposit_amount}%` : formatCurrency(service.deposit_amount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(service)}
                    className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer p-0.5 shrink-0 ${
                      service.is_active ? 'bg-brand' : 'bg-stone-300'
                    }`}
                  >
                    <div 
                      className={`w-4.5 h-4.5 rounded-full bg-white shadow-xs transition-transform transform ${
                        service.is_active ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Métricas e Detalhes */}
                <div className="grid grid-cols-2 gap-2 text-xs text-ink-soft bg-stone-50 p-2.5 rounded-xl border border-line/50">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-ink-soft/70">Duração</span>
                    <span className="font-medium text-ink tabular-nums">{service.duration_minutes} min</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-ink-soft/70">Retorno</span>
                    <span className="font-medium text-ink tabular-nums">
                      {service.maintenance_days > 0 ? `${service.maintenance_days} dias` : '—'}
                    </span>
                  </div>
                </div>

                {/* Preço e Botão de Ação */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    {service.is_starting_price && (
                      <span className="text-[11px] text-ink-soft block leading-none">A partir de</span>
                    )}
                    <span className="font-display text-lg font-bold text-brand tabular-nums lining-nums">
                      {formatCurrency(service.price)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(service)}
                      className="px-4 py-2 min-h-[44px] rounded-full border border-line text-xs font-semibold text-ink-soft hover:text-ink hover:bg-stone-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* 4. Card de Dica Editorial (§9.6 J10 · Mockup G7) */}
      <div className="rounded-2xl border border-brand/15 bg-brand-tint/30 p-5 flex items-start gap-4 shadow-2xs">
        <div className="w-8 h-8 rounded-full bg-brand-tint flex items-center justify-center text-brand shrink-0 mt-0.5">
          <Star className="w-4 h-4" />
        </div>
        <div>
          <h2 className="font-bold text-sm text-ink">Dica</h2>
          <p className="text-xs text-ink-soft leading-relaxed mt-1">
            Informe os dias de retorno para a cliente receber o lembrete de manutenção, e o consumo de estoque para dar baixa automática ao concluir o atendimento.
          </p>
        </div>
      </div>

      {/* 5. Modal: Cadastrar ou Editar Serviço */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[24px] border border-line shadow-2xl p-6 md:p-8 relative animate-scale-up my-8">
            <div className="flex items-center justify-between pb-4 border-b border-line mb-5">
              <h2 className="font-display text-2xl font-bold text-ink">
                {editingId ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:text-ink cursor-pointer hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Nome do Procedimento *
                </label>
                <input 
                  required 
                  type="text"
                  placeholder="Ex: Corte Feminino, Escova Modelada"
                  value={newService.name} 
                  onChange={e => setNewService({ ...newService, name: e.target.value })}
                  className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Descrição Curta (opcional)
                </label>
                <input 
                  type="text"
                  maxLength={160}
                  placeholder="Ex: Lavagem relaxante, corte personalizado e finalização."
                  value={newService.short_description} 
                  onChange={e => setNewService({ ...newService, short_description: e.target.value })}
                  className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand outline-none shadow-2xs"
                />
                <span className="text-[11px] text-ink-soft mt-1 block">
                  Exibida no catálogo público para ajudar o cliente a escolher.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Categoria (opcional)
                  </label>
                  <input 
                    type="text"
                    placeholder="Ex: Cabelo, Unhas, Estética"
                    value={newService.category} 
                    onChange={e => setNewService({ ...newService, category: e.target.value })}
                    className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Duração (minutos) *
                  </label>
                  <input 
                    required 
                    type="number" 
                    min="5" 
                    step="5"
                    value={newService.duration_minutes} 
                    onChange={e => setNewService({ ...newService, duration_minutes: e.target.value })}
                    className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand outline-none tabular-nums shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Preço (R$) *
                  </label>
                  <div className="space-y-1.5">
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      placeholder="50,00"
                      value={newService.price} 
                      onChange={e => setNewService({ ...newService, price: e.target.value })}
                      className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand outline-none tabular-nums shadow-2xs"
                    />
                    <label className="flex items-center gap-2 text-xs text-ink-soft cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={newService.is_starting_price} 
                        onChange={e => setNewService({ ...newService, is_starting_price: e.target.checked })} 
                        className="rounded border-line text-brand focus:ring-brand accent-brand cursor-pointer"
                      />
                      <span>Preço "A partir de"</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Retorno Recomendado (Dias)
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    placeholder="0"
                    value={newService.maintenance_days} 
                    onChange={e => setNewService({ ...newService, maintenance_days: e.target.value })}
                    className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand outline-none tabular-nums shadow-2xs"
                  />
                  <span className="text-[11px] text-ink-soft mt-1 block">
                    Dispara lembrete de agendamento no WhatsApp.
                  </span>
                </div>
              </div>

              {/* Seção de Consumo de Estoque */}
              <div className="border-t border-line pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
                      <Package className="w-4 h-4 text-brand" />
                      Baixa Automática de Estoque
                    </h3>
                    <p className="text-xs text-ink-soft">Dá baixa nos insumos ao concluir o atendimento.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNewService({ ...newService, use_inventory: !newService.use_inventory })}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 shadow-2xs ${
                      newService.use_inventory ? 'bg-brand' : 'bg-stone-300'
                    }`}
                  >
                    <div 
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                        newService.use_inventory ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {newService.use_inventory && (
                  <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-line">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-ink-soft">Insumos Utilizados</span>
                      <button 
                        type="button" 
                        onClick={handleAddInput}
                        className="text-xs font-semibold text-brand hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar Insumo
                      </button>
                    </div>

                    {newService.inputs.length === 0 ? (
                      <p className="text-xs text-ink-soft italic">Nenhum insumo adicionado ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {newService.inputs.map((input, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <select
                              required
                              value={input.inventory_id}
                              onChange={e => handleInputUpdate(idx, 'inventory_id', e.target.value)}
                              className="flex-1 border border-line rounded-lg px-3 py-2 bg-white text-xs text-ink focus:border-brand outline-none"
                            >
                              <option value="">Selecione o produto...</option>
                              {inventoryItems.map(item => (
                                <option key={item.id} value={item.id}>
                                  {item.name} (Estoque: {item.quantity} {item.unit})
                                </option>
                              ))}
                            </select>

                            <input
                              required
                              type="number"
                              step="0.1"
                              min="0.1"
                              value={input.quantity_consumed}
                              onChange={e => handleInputUpdate(idx, 'quantity_consumed', e.target.value)}
                              className="w-20 border border-line rounded-lg px-3 py-2 bg-white text-xs text-ink focus:border-brand outline-none tabular-nums"
                              placeholder="Qtd"
                            />

                            <button
                              type="button"
                              onClick={() => handleRemoveInput(idx)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Seção de Variações de Preço e Tamanho (Item D12 P2) */}
              <div className="border-t border-line pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-brand" />
                      Variações de Tamanho / Preço
                    </h3>
                    <p className="text-xs text-ink-soft">Ex: Unha Curta, Média, Longa ou Cabelo Curto/Longo.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const nextHasVars = !newService.has_variations;
                      if (nextHasVars && newService.variations.length === 0) {
                        handleAddVariation();
                      } else {
                        setNewService({ ...newService, has_variations: nextHasVars });
                      }
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 shadow-2xs ${
                      newService.has_variations ? 'bg-brand' : 'bg-stone-300'
                    }`}
                  >
                    <div 
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                        newService.has_variations ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {newService.has_variations && (
                  <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-line animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-ink-soft">Tamanhos / Variações</span>
                      <button 
                        type="button" 
                        onClick={handleAddVariation}
                        className="text-xs font-semibold text-brand hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar Variação
                      </button>
                    </div>

                    {newService.variations.length === 0 ? (
                      <p className="text-xs text-ink-soft italic">Nenhuma variação adicionada ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {newService.variations.map((vItem, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-line/80 shadow-2xs">
                            <input
                              required
                              type="text"
                              value={vItem.name}
                              onChange={e => handleVariationUpdate(idx, 'name', e.target.value)}
                              className="flex-1 border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink focus:border-brand outline-none"
                              placeholder="Nome (ex: Curta, Média, Longa)"
                            />

                            <div className="flex items-center gap-1 w-24">
                              <span className="text-[11px] text-ink-soft">R$</span>
                              <input
                                required
                                type="number"
                                step="0.01"
                                min="0"
                                value={vItem.price}
                                onChange={e => handleVariationUpdate(idx, 'price', e.target.value)}
                                className="w-full border border-line rounded-lg px-2 py-1.5 text-xs text-ink focus:border-brand outline-none tabular-nums"
                                placeholder="Preço"
                              />
                            </div>

                            <div className="flex items-center gap-1 w-20">
                              <input
                                required
                                type="number"
                                step="5"
                                min="5"
                                value={vItem.duration_minutes}
                                onChange={e => handleVariationUpdate(idx, 'duration_minutes', e.target.value)}
                                className="w-full border border-line rounded-lg px-2 py-1.5 text-xs text-ink focus:border-brand outline-none tabular-nums"
                                placeholder="Min"
                              />
                              <span className="text-[11px] text-ink-soft">m</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveVariation(idx)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                              title="Remover variação"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <span className="text-[11px] text-ink-soft block leading-tight">
                      💡 Quando houver variações, a cliente escolherá uma delas no agendamento e o catálogo exibirá automaticamente "A partir de R$ [menor_preço]".
                    </span>
                  </div>
                )}
              </div>

              {/* Seção de Adicionais e Extras Opcionais (Item D12 P2) */}
              <div className="border-t border-line pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand" />
                      Adicionais e Extras Opcionais
                    </h3>
                    <p className="text-xs text-ink-soft">Ex: Nail Art, Esmaltação em Gel, Spa dos Pés, Massagem.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const nextHasExtras = !newService.has_extras;
                      if (nextHasExtras && newService.extras.length === 0) {
                        handleAddExtra();
                      } else {
                        setNewService({ ...newService, has_extras: nextHasExtras });
                      }
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 shadow-2xs ${
                      newService.has_extras ? 'bg-brand' : 'bg-stone-300'
                    }`}
                  >
                    <div 
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                        newService.has_extras ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {newService.has_extras && (
                  <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-line animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-ink-soft">Extras / Upsell</span>
                      <button 
                        type="button" 
                        onClick={handleAddExtra}
                        className="text-xs font-semibold text-brand hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar Extra
                      </button>
                    </div>

                    {newService.extras.length === 0 ? (
                      <p className="text-xs text-ink-soft italic">Nenhum adicional incluído ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {newService.extras.map((extraItem, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-line/80 shadow-2xs">
                            <input
                              required
                              type="text"
                              value={extraItem.name}
                              onChange={e => handleExtraUpdate(idx, 'name', e.target.value)}
                              className="flex-1 border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink focus:border-brand outline-none"
                              placeholder="Nome (ex: Nail Art, Esmaltação em Gel)"
                            />

                            <div className="flex items-center gap-1 w-24">
                              <span className="text-[11px] text-ink-soft">+R$</span>
                              <input
                                required
                                type="number"
                                step="0.01"
                                min="0"
                                value={extraItem.price}
                                onChange={e => handleExtraUpdate(idx, 'price', e.target.value)}
                                className="w-full border border-line rounded-lg px-2 py-1.5 text-xs text-ink focus:border-brand outline-none tabular-nums"
                                placeholder="Valor"
                              />
                            </div>

                            <div className="flex items-center gap-1 w-20">
                              <input
                                type="number"
                                step="5"
                                min="0"
                                value={extraItem.duration_minutes}
                                onChange={e => handleExtraUpdate(idx, 'duration_minutes', e.target.value)}
                                className="w-full border border-line rounded-lg px-2 py-1.5 text-xs text-ink focus:border-brand outline-none tabular-nums"
                                placeholder="+Min"
                              />
                              <span className="text-[11px] text-ink-soft">m</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveExtra(idx)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                              title="Remover adicional"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <span className="text-[11px] text-ink-soft block leading-tight">
                      💡 A cliente poderá marcar 1 ou mais extras opcionais no agendamento. O valor e o tempo serão somados automaticamente ao procedimento.
                    </span>
                  </div>
                )}
              </div>

              {/* Seção de Sinal por PIX (Item D3 P1) */}
              <div className="border-t border-line pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-brand" />
                      Sinal Antecipado por PIX
                    </h3>
                    <p className="text-xs text-ink-soft">Exige sinal para confirmar a vaga e combater faltas.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setNewService({ ...newService, requires_deposit: !newService.requires_deposit })}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 shadow-2xs ${
                      newService.requires_deposit ? 'bg-brand' : 'bg-stone-300'
                    }`}
                  >
                    <div 
                      className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                        newService.requires_deposit ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {newService.requires_deposit && (
                  <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-line animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1">
                          Tipo de Cobrança
                        </label>
                        <select
                          value={newService.deposit_type}
                          onChange={e => setNewService({ ...newService, deposit_type: e.target.value })}
                          className="w-full border border-line rounded-lg px-3 py-2 bg-white text-xs text-ink focus:border-brand outline-none"
                        >
                          <option value="percentage">Porcentagem (%)</option>
                          <option value="fixed">Valor Fixo (R$)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1">
                          {newService.deposit_type === 'percentage' ? 'Percentual do Sinal (%)' : 'Valor do Sinal (R$)'}
                        </label>
                        <input
                          type="number"
                          step={newService.deposit_type === 'percentage' ? '1' : '0.01'}
                          min="1"
                          max={newService.deposit_type === 'percentage' ? '100' : undefined}
                          value={newService.deposit_amount}
                          onChange={e => setNewService({ ...newService, deposit_amount: e.target.value })}
                          className="w-full border border-line rounded-lg px-3 py-2 bg-white text-xs text-ink focus:border-brand outline-none tabular-nums"
                          placeholder={newService.deposit_type === 'percentage' ? '30' : '50.00'}
                          required
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-brand-tint/30 border border-brand/10 text-[11px] text-ink leading-relaxed">
                      💡 <strong>Como funcionará para a cliente:</strong> Ao agendar online, a cliente receberá a chave PIX ou QR Code com prazo de 15 minutos. 
                      {newService.price ? (
                        <span> O sinal exigido será de <strong>{formatCurrency(newService.deposit_type === 'percentage' ? (Number(newService.price) * (Number(newService.deposit_amount || 0) / 100)) : Number(newService.deposit_amount || 0))}</strong>.</span>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-full border border-stone-300 text-ink-soft text-xs font-semibold hover:bg-stone-50 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-full bg-brand text-white text-xs font-semibold hover:bg-brand-hover shadow-xs disabled:opacity-50 cursor-pointer transition-all active:scale-98"
                >
                  {saving ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Cadastrar Serviço')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Importação de Serviços via Planilha (D10) */}
      <ModalImportarPlanilha
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        tipo="servicos"
        onSuccess={fetchData}
      />

      {/* Modal de Catálogo Modelo por Segmento (D11) */}
      <ModalCatalogoModelo
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSuccess={fetchData}
      />

    </div>
  );
};

export default GestaoServicos;
