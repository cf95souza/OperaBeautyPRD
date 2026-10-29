import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { 
  Package, 
  Plus, 
  Search, 
  X, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  TrendingDown,
  Layers
} from 'lucide-react';
import { EstadoVazio } from '../../components/ui/EstadoVazio';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const ControleEstoque = () => {
  const { tenant_slug } = useParams();
  const { tenant } = useTenant();
  const { showSuccess, showError } = useNotification();

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, professional, sale, low
  const [search, setSearch] = useState('');

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [restockTargetItem, setRestockTargetItem] = useState(null);

  // Formulários
  const [formData, setFormData] = useState({
    name: '',
    unit: 'un',
    type: 'professional',
    quantity: '',
    min_quantity: '',
    price: ''
  });
  const [restockAmount, setRestockAmount] = useState('');
  const [selectedRestockItemId, setSelectedRestockItemId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (tenant) fetchInventory();
  }, [tenant]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const data = await api.inventory.list();
      if (Array.isArray(data)) {
        setInventory(data);
      }
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar dados do estoque.');
    } finally {
      setLoading(false);
    }
  };

  // KPIs
  const totalItems = inventory.length;
  const totalStockValue = useMemo(() => {
    return inventory
      .filter(item => item.type === 'sale')
      .reduce((acc, curr) => acc + (Number(curr.quantity || 0) * Number(curr.price || 0)), 0);
  }, [inventory]);

  const lowStockCount = useMemo(() => {
    return inventory.filter(item => Number(item.quantity) <= Number(item.min_quantity)).length;
  }, [inventory]);

  // Filtros & Busca
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      // Filtro de Categoria
      let matchesCategory = true;
      if (filter === 'professional') matchesCategory = item.type === 'professional';
      else if (filter === 'sale') matchesCategory = item.type === 'sale';
      else if (filter === 'low') matchesCategory = Number(item.quantity) <= Number(item.min_quantity);

      // Filtro de Texto
      const matchesSearch = search.trim() === '' || 
        item.name.toLowerCase().includes(search.toLowerCase().trim());

      return matchesCategory && matchesSearch;
    });
  }, [inventory, filter, search]);

  // Abertura de Modais
  const openNewModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      unit: 'un',
      type: 'professional',
      quantity: '',
      min_quantity: '',
      price: ''
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      unit: item.unit || 'un',
      type: item.type || 'professional',
      quantity: item.quantity,
      min_quantity: item.min_quantity,
      price: item.price ? Number(item.price) : ''
    });
    setShowModal(true);
  };

  const openRestockModal = (item) => {
    setRestockTargetItem(item);
    setSelectedRestockItemId(item ? item.id : (inventory[0]?.id || ''));
    setRestockAmount('');
    setShowRestockModal(true);
  };

  const openGlobalRestockModal = () => {
    setRestockTargetItem(null);
    setSelectedRestockItemId(inventory[0]?.id || '');
    setRestockAmount('');
    setShowRestockModal(true);
  };

  // Salvar Item (Novo ou Edição)
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError('Nome do produto é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        unit: formData.unit,
        type: formData.type,
        quantity: Number(formData.quantity) || 0,
        min_quantity: Number(formData.min_quantity) || 0,
        price: formData.type === 'sale' ? (Number(formData.price) || 0) : 0
      };

      if (editingItem) {
        await api.inventory.update(editingItem.id, payload);
        showSuccess('Item atualizado com sucesso.');
      } else {
        await api.inventory.create(payload);
        showSuccess('Novo item cadastrado no estoque.');
      }
      setShowModal(false);
      fetchInventory();
    } catch (err) {
      console.error(err);
      showError('Erro ao salvar item.');
    } finally {
      setSaving(false);
    }
  };

  // Registrar Entrada de Estoque
  const handleRestock = async (e) => {
    e.preventDefault();
    const target = restockTargetItem || inventory.find(i => i.id === selectedRestockItemId);
    const amount = Number(restockAmount);

    if (!target) {
      showError('Selecione um produto para reabastecer.');
      return;
    }
    if (!amount || amount <= 0) {
      showError('Informe uma quantidade válida para adicionar.');
      return;
    }

    setSaving(true);
    try {
      const newQuantity = Number(target.quantity) + amount;
      const payload = {
        name: target.name,
        unit: target.unit,
        type: target.type || 'professional',
        min_quantity: target.min_quantity,
        price: target.price || 0,
        quantity: newQuantity
      };
      await api.inventory.update(target.id, payload);
      showSuccess(`Entrada registrada! Novo estoque de ${target.name}: ${newQuantity} ${target.unit}`);
      setShowRestockModal(false);
      fetchInventory();
    } catch (err) {
      console.error(err);
      showError('Erro ao registrar entrada de estoque.');
    } finally {
      setSaving(false);
    }
  };

  // Excluir Item
  const handleDeleteItem = async () => {
    if (!editingItem) return;
    if (!window.confirm(`Tem certeza que deseja desativar "${editingItem.name}" do estoque?`)) return;

    setDeleting(true);
    try {
      await api.inventory.delete(editingItem.id);
      showSuccess('Item desativado com sucesso.');
      setShowModal(false);
      fetchInventory();
    } catch (err) {
      console.error(err);
      showError('Erro ao desativar item.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in text-ink">
      
      {/* 1. Cabeçalho Editorial (§9.6 J10 · Mockup G5) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">Estoque</h1>
          <p className="text-sm text-ink-soft mt-1">Suprimentos profissionais e produtos de venda.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={openGlobalRestockModal}
            className="px-5 py-2.5 rounded-full border border-brand text-brand hover:bg-brand-tint/30 transition-all font-semibold text-sm cursor-pointer shadow-2xs hover:shadow-xs active:scale-98"
          >
            Registrar entrada
          </button>
          
          <button 
            onClick={openNewModal}
            className="px-5 py-2.5 rounded-full bg-brand text-white hover:bg-brand-hover transition-all font-semibold text-sm flex items-center gap-2 cursor-pointer shadow-xs hover:shadow-md active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Novo item</span>
          </button>
        </div>
      </div>

      {/* 2. Grade de 3 KPIs Compactos (§9.6 J10 · Mockup G5) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* KPI 1: Itens Cadastrados */}
        <div className="rounded-[22px] border border-line bg-white p-6 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block">
            ITENS CADASTRADOS
          </span>
          <div className="font-display text-3xl font-bold text-ink tabular-nums lining-nums mt-2">
            {formatNumber(totalItems)}
          </div>
          <span className="text-xs text-ink-soft mt-1 block">
            Produtos e suprimentos
          </span>
        </div>

        {/* KPI 2: Valor em Estoque */}
        <div className="rounded-[22px] border border-line bg-white p-6 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block">
            VALOR EM ESTOQUE
          </span>
          <div className="font-display text-3xl font-bold text-ink tabular-nums lining-nums mt-2">
            {formatCurrency(totalStockValue)}
          </div>
          <span className="text-xs text-ink-soft mt-1 block">
            A preço de venda
          </span>
        </div>

        {/* KPI 3: Abaixo do Mínimo */}
        <div className="rounded-[22px] border border-line bg-white p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block">
              ABAIXO DO MÍNIMO
            </span>
            <div className="font-display text-3xl font-bold text-ink tabular-nums lining-nums mt-2">
              {formatNumber(lowStockCount)}
            </div>
          </div>
          <div className="mt-3">
            {lowStockCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF3DC] text-[#9A6B00]">
                Repor em breve
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32]">
                Tudo em dia
              </span>
            )}
          </div>
        </div>

      </div>

      {/* 3. Barra de Filtros e Busca (§9.6 J10 · Mockup G5) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        
        {/* Segmented Control em Chips */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'all'
                ? 'bg-brand text-white shadow-xs'
                : 'bg-white text-ink-soft hover:bg-stone-50 border border-line'
            }`}
          >
            Todos os itens
          </button>

          <button
            onClick={() => setFilter('professional')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'professional'
                ? 'bg-brand text-white shadow-xs'
                : 'bg-white text-ink-soft hover:bg-stone-50 border border-line'
            }`}
          >
            Uso profissional
          </button>

          <button
            onClick={() => setFilter('sale')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'sale'
                ? 'bg-brand text-white shadow-xs'
                : 'bg-white text-ink-soft hover:bg-stone-50 border border-line'
            }`}
          >
            Venda
          </button>

          <button
            onClick={() => setFilter('low')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              filter === 'low'
                ? 'bg-brand text-white shadow-xs'
                : 'bg-white text-ink-soft hover:bg-stone-50 border border-line'
            }`}
          >
            Abaixo do mínimo
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar item"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-sm rounded-full border border-line bg-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all text-ink placeholder:text-ink-soft/70 shadow-2xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* 4. Tabela Corporativa Rosé Editorial (§9.6 J10 · Mockup G5) */}
      <div className="rounded-[22px] border border-line bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-ink-soft flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            <span className="text-sm">Carregando itens de estoque...</span>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="py-12">
            <EstadoVazio
              icone={<Package className="w-8 h-8 text-brand" />}
              titulo={search ? 'Nenhum item encontrado' : filter === 'all' ? 'Nenhum item cadastrado' : 'Nenhum item neste filtro'}
              descricao={search ? `Nenhum produto corresponde à busca "${search}".` : 'Gerencie seus suprimentos e produtos de venda com baixa automática.'}
              textoAcao={search ? 'Limpar busca' : '+ Novo item'}
              aoClicarAcao={search ? () => setSearch('') : openNewModal}
            />
          </div>
        ) : (
          <>
            {/* Tabela Desktop & Tablet */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line bg-white">
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                      ITEM
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                      ESTOQUE
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                      MÍNIMO
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                      PREÇO
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                      SITUAÇÃO
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-ink-soft text-right">
                      AÇÕES
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredInventory.map((item) => {
                    const isLow = Number(item.quantity) <= Number(item.min_quantity);
                    const isSale = item.type === 'sale';

                    // Cálculo da barra de progresso horizontal
                    const maxStockRef = Math.max(Number(item.min_quantity) * 1.5, Number(item.quantity), 1);
                    const stockRatio = Math.min(100, Math.max(10, (Number(item.quantity) / maxStockRef) * 100));

                    return (
                      <tr 
                        key={item.id} 
                        className="hover:bg-brand-tint/15 transition-colors group"
                      >
                        {/* ITEM */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-brand-tint/60 text-brand flex items-center justify-center shrink-0 shadow-2xs">
                              <Package className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-sm text-ink block truncate group-hover:text-brand transition-colors">
                                {item.name}
                              </span>
                              <span className="text-xs text-ink-soft block">
                                {isSale ? 'Venda' : 'Uso profissional'} · medida: {item.unit}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* ESTOQUE COM BARRA DE PROGRESSO */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm text-brand tabular-nums lining-nums min-w-[36px]">
                              {formatNumber(item.quantity)} {item.unit}
                            </span>
                            <div className="w-24 h-2 bg-stone-100 rounded-full overflow-hidden flex shadow-inner">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isLow ? 'bg-[#A33842]' : 'bg-brand'
                                }`}
                                style={{ width: `${stockRatio}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* MÍNIMO */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-ink-soft tabular-nums lining-nums">
                            {formatNumber(item.min_quantity)} {item.unit}
                          </span>
                        </td>

                        {/* PREÇO */}
                        <td className="px-6 py-4">
                          <span className="font-semibold text-sm text-ink tabular-nums lining-nums">
                            {isSale && item.price ? formatCurrency(item.price) : '—'}
                          </span>
                        </td>

                        {/* SITUAÇÃO */}
                        <td className="px-6 py-4">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF3DC] text-[#9A6B00]">
                              Abaixo do mínimo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32]">
                              Normal
                            </span>
                          )}
                        </td>

                        {/* AÇÕES */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openRestockModal(item)}
                              className="px-4 py-1.5 rounded-full bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-98"
                            >
                              Entrada
                            </button>
                            <button
                              onClick={() => openEditModal(item)}
                              className="px-4 py-1.5 rounded-full border border-stone-300 text-ink-soft hover:text-ink text-xs font-semibold hover:bg-stone-50 transition-all cursor-pointer active:scale-98"
                            >
                              Ajustar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Versão Mobile em Cartões Ergonômicos (§9.6 J8) */}
            <div className="md:hidden divide-y divide-line">
              {filteredInventory.map((item) => {
                const isLow = Number(item.quantity) <= Number(item.min_quantity);
                const isSale = item.type === 'sale';
                const maxStockRef = Math.max(Number(item.min_quantity) * 1.5, Number(item.quantity), 1);
                const stockRatio = Math.min(100, Math.max(10, (Number(item.quantity) / maxStockRef) * 100));

                return (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-tint/60 text-brand flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-semibold text-sm text-ink block">
                            {item.name}
                          </span>
                          <span className="text-xs text-ink-soft">
                            {isSale ? 'Venda' : 'Uso profissional'} · {item.unit}
                          </span>
                        </div>
                      </div>
                      <div>
                        {isLow ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF3DC] text-[#9A6B00]">
                            Baixo
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8F5E9] text-[#2E7D32]">
                            Normal
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-stone-50/70 p-3 rounded-xl text-xs">
                      <div>
                        <span className="text-ink-soft block">Estoque</span>
                        <span className="font-bold text-sm text-brand tabular-nums">
                          {formatNumber(item.quantity)} {item.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-soft block">Mínimo</span>
                        <span className="font-semibold text-sm text-ink-soft tabular-nums">
                          {formatNumber(item.min_quantity)} {item.unit}
                        </span>
                      </div>
                      {isSale && (
                        <div>
                          <span className="text-ink-soft block">Preço</span>
                          <span className="font-semibold text-sm text-ink tabular-nums">
                            {formatCurrency(item.price)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Barra de Progresso Mobile */}
                    <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isLow ? 'bg-[#A33842]' : 'bg-brand'}`}
                        style={{ width: `${stockRatio}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => openRestockModal(item)}
                        className="w-full py-2.5 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-colors flex items-center justify-center gap-1 shadow-2xs"
                      >
                        Registrar Entrada
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        className="w-full py-2.5 rounded-xl border border-stone-300 text-ink-soft hover:text-ink text-xs font-semibold hover:bg-stone-50 transition-colors flex items-center justify-center gap-1"
                      >
                        Ajustar Item
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 5. Nota Explicativa no Rodapé (§9.6 J10 · Mockup G5) */}
      <p className="text-xs text-ink-soft leading-relaxed px-1">
        Itens abaixo do mínimo aparecem no dashboard com o botão “Repor”. O consumo por serviço dá baixa automática ao concluir o atendimento.
      </p>

      {/* 6. Modal: Novo Item ou Ajustar Item */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[24px] border border-line shadow-2xl p-6 sm:p-7 relative animate-scale-up">
            
            <div className="flex items-center justify-between pb-4 border-b border-line mb-5">
              <h2 className="font-display text-2xl font-bold text-ink">
                {editingItem ? 'Ajustar item de estoque' : 'Novo item de estoque'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:text-ink hover:bg-surface-variant transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              
              {/* Nome do Produto */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Nome do Produto *
                </label>
                <input 
                  required 
                  type="text"
                  placeholder="Ex: Perfume Árabe, Máscara Reconstrutora"
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all placeholder:text-ink-soft/60"
                />
              </div>

              {/* Segmented Control de Tipo */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Finalidade do Item
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'professional' })}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      formData.type === 'professional'
                        ? 'bg-white text-brand shadow-xs'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    Uso Profissional
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'sale' })}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      formData.type === 'sale'
                        ? 'bg-white text-brand shadow-xs'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    Produto para Venda
                  </button>
                </div>
              </div>

              {/* Unidade e Preço (se venda) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Unidade de Medida
                  </label>
                  <select 
                    value={formData.unit} 
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full border border-line rounded-xl px-3.5 py-2.5 bg-white text-sm text-ink focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all cursor-pointer"
                  >
                    <option value="un">Unidade (un)</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="gr">Gramas (gr)</option>
                    <option value="L">Litro (L)</option>
                    <option value="cx">Caixa (cx)</option>
                  </select>
                </div>

                {formData.type === 'sale' ? (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                      Preço de Venda (R$)
                    </label>
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      placeholder="0,00"
                      value={formData.price} 
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all tabular-nums lining-nums"
                    />
                  </div>
                ) : (
                  <div className="flex items-center text-xs text-ink-soft italic pt-6">
                    Insumo de cabine sem preço ao consumidor final.
                  </div>
                )}
              </div>

              {/* Estoque Atual e Mínimo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Estoque Atual ({formData.unit}) *
                  </label>
                  <input 
                    required 
                    type="number" 
                    min="0" 
                    step="0.1" 
                    placeholder="0"
                    value={formData.quantity} 
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all tabular-nums lining-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Aviso de Mínimo ({formData.unit}) *
                  </label>
                  <input 
                    required 
                    type="number" 
                    min="0" 
                    step="0.1" 
                    placeholder="Ex: 5"
                    value={formData.min_quantity} 
                    onChange={e => setFormData({ ...formData, min_quantity: e.target.value })}
                    className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-sm text-ink focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all tabular-nums lining-nums"
                  />
                </div>
              </div>

              {/* Rodapé com Ações */}
              <div className="pt-4 flex items-center justify-between border-t border-line mt-6">
                {editingItem ? (
                  <button
                    type="button"
                    onClick={handleDeleteItem}
                    disabled={deleting || saving}
                    className="text-xs font-semibold text-rose-700 hover:text-rose-900 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Desativar item</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-full border border-stone-300 text-ink-soft hover:text-ink text-xs font-semibold hover:bg-stone-50 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 rounded-full bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Salvar item'}
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 7. Modal: Registrar Entrada */}
      {showRestockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[24px] border border-line shadow-2xl p-6 sm:p-7 relative animate-scale-up">
            
            <div className="flex items-center justify-between pb-4 border-b border-line mb-5">
              <h2 className="font-display text-2xl font-bold text-ink">
                Registrar entrada
              </h2>
              <button 
                onClick={() => setShowRestockModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:text-ink hover:bg-surface-variant transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRestock} className="space-y-4">
              
              {/* Item Alvo */}
              {restockTargetItem ? (
                <div className="bg-brand-tint/25 p-3.5 rounded-2xl border border-brand-tint/60 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-tint text-brand flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-ink block">{restockTargetItem.name}</span>
                    <span className="text-xs text-ink-soft">
                      Estoque atual: <strong className="text-brand tabular-nums">{restockTargetItem.quantity} {restockTargetItem.unit}</strong>
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                    Selecione o Produto *
                  </label>
                  <select
                    value={selectedRestockItemId}
                    onChange={(e) => setSelectedRestockItemId(e.target.value)}
                    className="w-full border border-line rounded-xl px-3.5 py-2.5 bg-white text-sm text-ink focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all cursor-pointer"
                  >
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.quantity} {item.unit} atual)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantidade a Adicionar */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
                  Quantidade a Adicionar *
                </label>
                <input 
                  required
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="+ 0"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(e.target.value)}
                  className="w-full border border-line rounded-xl px-4 py-2.5 bg-white text-base font-semibold text-ink focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all tabular-nums lining-nums placeholder:text-ink-soft/40"
                />
              </div>

              {/* Atalhos Rápidos */}
              <div>
                <span className="text-[11px] font-semibold text-ink-soft block mb-1.5">Atalhos rápidos:</span>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 5, 10, 50].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => setRestockAmount(String((Number(restockAmount) || 0) + quick))}
                      className="py-1.5 rounded-lg border border-line bg-stone-50 hover:bg-brand-tint/30 hover:border-brand text-xs font-bold text-ink transition-colors cursor-pointer tabular-nums"
                    >
                      +{quick}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-line mt-6">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="px-4 py-2 rounded-full border border-stone-300 text-ink-soft hover:text-ink text-xs font-semibold hover:bg-stone-50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-full bg-brand text-white text-xs font-semibold hover:bg-brand-hover transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Registrando...' : 'Confirmar entrada'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default ControleEstoque;
