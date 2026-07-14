import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';

const ControleEstoque = () => {
  const { tenant_slug } = useParams();
  const { tenant } = useTenant();
  const { showSuccess, showError } = useNotification();

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, professional, sale, low
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Forms
  const [formData, setFormData] = useState({ name: '', unit: 'un', type: 'professional', quantity: 0, min_quantity: 0, price: 0 });
  const [restockAmount, setRestockAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) fetchInventory();
  }, [tenant]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const data = await api.inventory.list();
      if (data) setInventory(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const openNewModal = () => {
    setEditingItem(null);
    setFormData({ name: '', unit: 'un', type: 'professional', quantity: '', min_quantity: '', price: '' });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({ 
      name: item.name, 
      unit: item.unit, 
      type: item.type || 'professional', 
      quantity: item.quantity, 
      min_quantity: item.min_quantity, 
      price: item.price || ''
    });
    setShowModal(true);
  };

  const openRestockModal = (item, e) => {
    e.stopPropagation();
    setEditingItem(item);
    setRestockAmount('');
    setShowRestockModal(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        unit: formData.unit,
        type: formData.type,
        quantity: Number(formData.quantity) || 0,
        min_quantity: Number(formData.min_quantity) || 0,
        price: formData.type === 'sale' ? (Number(formData.price) || 0) : 0
      };

      if (editingItem) {
        await api.inventory.update(editingItem.id, payload);
      } else {
        await api.inventory.create(payload);
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

  const handleRestock = async (e) => {
    e.preventDefault();
    if (!restockAmount || Number(restockAmount) <= 0) return;
    setSaving(true);
    try {
      const newQuantity = Number(editingItem.quantity) + Number(restockAmount);
      const payload = {
        name: editingItem.name,
        unit: editingItem.unit,
        type: editingItem.type || 'professional',
        min_quantity: editingItem.min_quantity,
        price: editingItem.price || 0,
        quantity: newQuantity
      };
      await api.inventory.update(editingItem.id, payload);
      setShowRestockModal(false);
      fetchInventory();
    } catch (err) {
      console.error(err);
      showError('Erro ao reabastecer.');
    } finally {
      setSaving(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    if (filter === 'professional') return item.type === 'professional';
    if (filter === 'sale') return item.type === 'sale';
    if (filter === 'low') return Number(item.quantity) <= Number(item.min_quantity);
    return true; // all
  });

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <>
        <div className="px-container-margin md:px-xl py-lg max-w-[1200px] mx-auto animate-fade-in-up">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl">
            <div>
              <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface mb-xs">Controle de Estoque</h2>
              <p className="font-body-md text-secondary">Gerencie suprimentos profissionais e produtos de varejo.</p>
            </div>
            
            <button 
              onClick={openNewModal}
              className="flex items-center justify-center gap-sm bg-primary text-on-primary px-lg py-sm rounded-lg font-label-md text-label-md hover:bg-on-primary-fixed-variant transition-colors shadow-sm self-start md:self-auto"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Novo Item
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-sm overflow-x-auto pb-2 scrollbar-hide mb-md">
            <button 
              onClick={() => setFilter('all')}
              className={`px-md py-sm rounded-full font-label-md text-label-md whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant border border-outline-variant'}`}
            >Todos os Itens</button>
            <button 
              onClick={() => setFilter('professional')}
              className={`px-md py-sm rounded-full font-label-md text-label-md whitespace-nowrap transition-colors ${filter === 'professional' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant border border-outline-variant'}`}
            >Uso Profissional</button>
            <button 
              onClick={() => setFilter('sale')}
              className={`px-md py-sm rounded-full font-label-md text-label-md whitespace-nowrap transition-colors ${filter === 'sale' ? 'bg-primary-container text-on-primary-container shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant border border-outline-variant'}`}
            >Venda</button>
            <button 
              onClick={() => setFilter('low')}
              className={`px-md py-sm rounded-full font-label-md text-label-md whitespace-nowrap transition-colors ${filter === 'low' ? 'bg-error-container text-on-error-container shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-variant border border-outline-variant'}`}
            >Baixo Estoque</button>
          </div>

          {/* Bento Grid for Inventory */}
          {loading ? (
             <div className="flex justify-center p-xl"><span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span></div>
          ) : filteredInventory.length === 0 ? (
             <div className="text-center p-xl text-secondary">Nenhum item encontrado no estoque.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
              {filteredInventory.map(item => {
                const isLow = Number(item.quantity) <= Number(item.min_quantity);
                const isSale = item.type === 'sale';
                
                return (
                  <div key={item.id} onClick={() => openEditModal(item)} className={`bg-surface-container-lowest rounded-xl p-md shadow-[0px_4px_20px_rgba(0,0,0,0.04)] relative overflow-hidden group cursor-pointer hover:shadow-[0px_10px_30px_rgba(0,0,0,0.08)] transition-all border ${isLow ? 'border-error-container' : 'border-transparent hover:border-surface-variant'}`}>
                    
                    {isLow && (
                      <div className="absolute top-0 right-0 bg-error text-on-error px-sm py-xs rounded-bl-lg font-label-sm text-label-sm flex items-center gap-1 shadow-sm z-10">
                        <span className="material-symbols-outlined text-[14px]">warning</span> Baixo Estoque
                      </div>
                    )}
                    
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <span className="material-symbols-outlined text-primary text-[20px]">edit</span>
                    </div>

                    <div className="flex items-start gap-md mb-md mt-sm relative z-0">
                      <div className="w-16 h-16 rounded-lg bg-surface-variant flex items-center justify-center shrink-0 overflow-hidden text-primary">
                        <span className="material-symbols-outlined text-2xl">{isSale ? 'shopping_bag' : 'science'}</span>
                      </div>
                      <div className="flex-1 pr-6">
                        <span className={`inline-block px-2 py-1 rounded-md font-label-sm text-label-sm mb-xs ${isSale ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-variant text-on-surface-variant'}`}>
                          {isSale ? 'Venda' : 'Profissional'}
                        </span>
                        <h3 className="font-label-md text-label-md text-on-surface mb-xs truncate">{item.name}</h3>
                        <p className="font-body-md text-secondary">Medida: {item.unit}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end border-t border-surface-variant pt-md">
                      <div>
                        <p className="font-label-sm text-label-sm text-secondary mb-xs">Estoque Atual</p>
                        <p className={`font-headline-md text-headline-md ${isLow ? 'text-error' : 'text-on-surface'}`}>
                          {item.quantity} <span className="font-body-md text-secondary">{item.unit}</span>
                        </p>
                      </div>
                      
                      {isSale ? (
                        <div className="text-right">
                          <p className="font-label-sm text-label-sm text-secondary mb-xs">Preço</p>
                          <p className="font-label-md text-label-md text-primary">{formatCurrency(item.price)}</p>
                        </div>
                      ) : (
                        <button onClick={(e) => openRestockModal(item, e)} className="text-primary hover:text-primary-container transition-colors flex items-center gap-xs z-10 relative">
                          <span className="font-label-md text-label-md">Repor</span>
                          <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        </button>
                      )}
                    </div>
                    
                    {/* Se for item de venda, colocar o botão repor em cima, caso contrário esconde ou coloca junto. Vamos forçar Repor em todos via footer ou botão absoluto */}
                    {isSale && (
                       <button onClick={(e) => openRestockModal(item, e)} className="absolute bottom-4 right-24 text-primary hover:text-primary-container transition-colors flex items-center gap-xs z-10 relative mt-2 opacity-0 group-hover:opacity-100">
                          <span className="font-label-md text-label-md">Repor</span>
                       </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: New/Edit */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-surface w-[90vw] max-w-[450px] rounded-xl shadow-xl p-md md:p-lg relative animate-fade-in-up">
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-secondary hover:text-error transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-md">
                {editingItem ? 'Editar Item' : 'Novo Item'}
              </h3>
              <form onSubmit={handleSaveItem} className="space-y-4">
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1">Nome do Produto</label>
                  <input required className="w-full border border-outline-variant rounded-lg px-3 py-2 bg-transparent focus:border-primary outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-md">
                  <div>
                    <label className="block text-sm text-on-surface-variant mb-1">Tipo</label>
                    <select className="w-full border border-outline-variant rounded-lg px-3 py-2 bg-transparent focus:border-primary outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                      <option value="professional">Uso Profissional</option>
                      <option value="sale">Produto para Venda</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-on-surface-variant mb-1">Unid. Medida</label>
                    <select className="w-full border border-outline-variant rounded-lg px-3 py-2 bg-transparent focus:border-primary outline-none" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                      <option value="un">Unidade (un)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="gr">Gramas (gr)</option>
                      <option value="l">Litro (L)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-md">
                  <div>
                    <label className="block text-sm text-on-surface-variant mb-1">Estoque Atual</label>
                    <input required type="number" min="0" step="0.1" className="w-full border border-outline-variant rounded-lg px-3 py-2 bg-transparent focus:border-primary outline-none" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm text-on-surface-variant mb-1">Aviso de Mínimo</label>
                    <input required type="number" min="0" step="0.1" className="w-full border border-outline-variant rounded-lg px-3 py-2 bg-transparent focus:border-primary outline-none" value={formData.min_quantity} onChange={e => setFormData({...formData, min_quantity: e.target.value})} />
                  </div>
                </div>

                {formData.type === 'sale' && (
                  <div>
                    <label className="block text-sm text-on-surface-variant mb-1">Preço de Venda (R$)</label>
                    <input required type="number" min="0" step="0.01" className="w-full border border-outline-variant rounded-lg px-3 py-2 bg-transparent focus:border-primary outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                  </div>
                )}

                <button type="submit" disabled={saving} className="w-full bg-primary text-on-primary py-2 rounded-lg font-bold disabled:opacity-50 mt-4">
                  {saving ? 'Salvando...' : 'Salvar Item'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Restock */}
        {showRestockModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-surface w-[90vw] max-w-[350px] rounded-xl shadow-xl p-md relative animate-fade-in-up">
              <button onClick={() => setShowRestockModal(false)} className="absolute top-4 right-4 text-secondary hover:text-error transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Reabastecer</h3>
              <p className="text-sm text-secondary mb-4">Adicione itens ao estoque de: <strong>{editingItem?.name}</strong></p>
              <form onSubmit={handleRestock} className="space-y-4">
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1">Quantidade a Adicionar ({editingItem?.unit})</label>
                  <input required type="number" min="0.1" step="0.1" className="w-full border border-outline-variant rounded-lg px-3 py-2 bg-transparent focus:border-primary outline-none" value={restockAmount} onChange={e => setRestockAmount(e.target.value)} placeholder="+ 0" />
                </div>
                <button type="submit" disabled={saving} className="w-full bg-primary-container text-on-primary-container py-2 rounded-lg font-bold disabled:opacity-50 mt-2 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                  Confirmar Reposição
                </button>
              </form>
            </div>
          </div>
        )}
    </>
  );
};

export default ControleEstoque;
