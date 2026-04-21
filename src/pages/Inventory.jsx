import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Package, 
  Plus, 
  Search, 
  Loader2,
  Trash2,
  Edit2,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  History
} from 'lucide-react';
import { useNotification } from '../context/NotificationProvider';

const Inventory = ({ profile }) => {
  const { showSuccess, showError, confirm } = useNotification();
  const isProfessional = profile?.role === 'professional';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'un',
    min_quantity: '',
    is_active: true
  });

  const [replenishModal, setReplenishModal] = useState({ show: false, item: null, amount: '' });
  const [dependencyAlert, setDependencyAlert] = useState({ show: false, title: '', message: '', list: [] });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cap_inventory')
      .select('*')
      .order('name');
    
    if (error) console.error('Error fetching inventory:', error);
    else setItems(data);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const inventoryData = {
      name: formData.name,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      min_quantity: parseFloat(formData.min_quantity)
    };

    let error;
    if (editingItem) {
      const { error: err } = await supabase
        .from('cap_inventory')
        .update(inventoryData)
        .eq('id', editingItem.id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from('cap_inventory')
        .insert([inventoryData]);
      error = err;
    }

    if (error) {
      showError('Erro ao salvar item: ' + error.message);
    } else {
      showSuccess(editingItem ? 'Item atualizado com sucesso!' : 'Novo item cadastrado!');
      setShowModal(false);
      setEditingItem(null);
      setFormData({ name: '', quantity: '', unit: 'un', min_quantity: '' });
      fetchInventory();
    }
  };

  const checkDependencies = async (itemId) => {
    const { data } = await supabase
      .from('cap_service_inventory')
      .select('service_id, cap_services(name)')
      .eq('inventory_id', itemId);
    return data || [];
  };

  const handleToggleActive = async (item) => {
    if (item.is_active) {
      const dependencies = await checkDependencies(item.id);
      if (dependencies.length > 0) {
        setDependencyAlert({
          show: true,
          title: 'Atenção: Item em uso',
          message: 'Este item está vinculado aos seguintes serviços. Ao inativar, certifique-se de que não haverá falta durante os atendimentos:',
          list: dependencies.map(d => d.cap_services?.name)
        });
      }
    }

    const { error } = await supabase
      .from('cap_inventory')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);
    
    if (error) showError('Erro ao alterar status: ' + error.message);
    else {
      showSuccess(`Item ${!item.is_active ? 'ativado' : 'inativado'} com sucesso!`);
      fetchInventory();
    }
  };

  const handleDelete = async (item) => {
    const dependencies = await checkDependencies(item.id);
    if (dependencies.length > 0) {
      setDependencyAlert({
        show: true,
        title: 'Exclusão Bloqueada',
        message: 'Não é possível excluir este item pois ele está sendo utilizado nos serviços abaixo:',
        list: dependencies.map(d => d.cap_services?.name)
      });
      return;
    }

    if (await confirm(`Tem certeza que deseja excluir "${item.name}" definitivamente? Esta ação não pode ser desfeita.`)) {
      const { error } = await supabase
        .from('cap_inventory')
        .delete()
        .eq('id', item.id);
      
      if (error) showError('Erro ao excluir: ' + error.message);
      else {
        showSuccess('Item excluído com sucesso!');
        fetchInventory();
      }
    }
  };

  const handleReplenishSubmit = async (e) => {
    e.preventDefault();
    if (!replenishModal.amount || parseFloat(replenishModal.amount) <= 0) return;

    setLoading(true);
    const newQuantity = (replenishModal.item.quantity || 0) + parseFloat(replenishModal.amount);
    
    const { error } = await supabase
      .from('cap_inventory')
      .update({ quantity: newQuantity })
      .eq('id', replenishModal.item.id);

    if (error) {
      showError('Erro ao repor estoque: ' + error.message);
    } else {
      showSuccess(`Estoque de ${replenishModal.item.name} atualizado (+${replenishModal.amount})`);
      setReplenishModal({ show: false, item: null, amount: '' });
      fetchInventory();
    }
    setLoading(false);
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl text-slate-900 tracking-tight leading-none">Estoque</h2>
          <p className="text-sm text-slate-500 mt-1">Produtos, insumos e controle de quantidades.</p>
        </div>
        {!isProfessional && (
          <button 
            onClick={() => {
              setEditingItem(null);
              setFormData({ name: '', quantity: '', unit: 'un', min_quantity: '' });
              setShowModal(true);
            }}
            className="btn-accent text-sm"
          >
            <Plus size={16} /> Novo(a) Produto
          </button>
        )}
      </div>

      <div className="card-base flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Buscar no estoque..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-md py-1.5 pl-9 pr-4 text-xs focus:ring-1 focus:ring-accent/50 outline-none"
            />
          </div>
        </div>

        <div className="md:block hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 font-bold text-[10px] text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-3 border-b border-slate-100">Produto / Insumo</th>
                <th className="px-6 py-3 border-b border-slate-100 text-center">Unidade</th>
                <th className="px-6 py-3 border-b border-slate-100 text-center">Quantidade</th>
                <th className="px-6 py-3 border-b border-slate-100 text-center">Status</th>
                {!isProfessional && <th className="px-6 py-3 border-b border-slate-100 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="animate-spin inline-block mr-2" size={16} />
                    Carregando estoque...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLowStock = item.quantity <= item.min_quantity;
                  const isActive = item.is_active !== false;

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors group ${!isActive ? 'opacity-60 bg-slate-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${!isActive ? 'bg-slate-200 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>
                            <Package size={14} />
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-sm font-bold ${!isActive ? 'text-slate-500' : 'text-slate-900'}`}>{item.name}</span>
                            {!isActive && <span className="text-[10px] text-slate-400 font-medium uppercase">Desativado</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs text-slate-500 uppercase">{item.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-bold ${!isActive ? 'text-slate-400' : isLowStock ? 'text-rose-600' : 'text-slate-900'}`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {!isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">
                             Inativo
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold border border-rose-100">
                            <AlertTriangle size={10} /> Estoque Baixo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">
                            Referência Ideal
                          </span>
                        )}
                      </td>
                      {!isProfessional && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => setReplenishModal({ show: true, item, amount: '' })}
                              title="Reposição Rápida (+)"
                              className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-100 rounded transition-all bg-white"
                            >
                              <Plus size={14} />
                            </button>
                            <button 
                              onClick={() => {
                                setEditingItem(item);
                                setFormData({
                                  name: item.name,
                                  quantity: item.quantity,
                                  unit: item.unit,
                                  min_quantity: item.min_quantity
                                });
                                setShowModal(true);
                              }}
                              title="Editar Dados"
                              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-white border rounded transition-all bg-white"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleToggleActive(item)}
                              title={isActive ? "Inativar" : "Reativar"}
                              className={`p-1.5 border rounded transition-all bg-white ${isActive ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'}`}
                            >
                              {isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button 
                              onClick={() => handleDelete(item)}
                              title="Excluir Definitivamente"
                              className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 border rounded transition-all bg-white"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Inventory Cards */}
        <div className="md:hidden p-4 space-y-4 bg-slate-50/30">
          {loading && items.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
               <Loader2 className="animate-spin inline-block mb-2" size={24} />
               <p className="text-xs font-bold uppercase tracking-widest">Carregando estoque...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
               Nenhum item encontrado
            </div>
          ) : (
            filteredItems.map((item) => {
              const isLowStock = item.quantity <= item.min_quantity;
              const isActive = item.is_active !== false;

              return (
                <div key={item.id} className={`responsive-table-row relative overflow-hidden ${!isActive ? 'opacity-70 grayscale' : ''}`}>
                  {!isActive && (
                    <div className="absolute top-0 right-0 p-2">
                       <span className="text-[8px] font-black uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded tracking-tighter">Inativo</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLowStock && isActive ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'}`}>
                        <Package size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Unidade: {item.unit}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className={`text-lg font-bold leading-none ${isLowStock && isActive ? 'text-rose-500' : 'text-slate-900'}`}>{item.quantity}</p>
                       <p className="text-[8px] font-black uppercase text-slate-400 mt-1">Mín: {item.min_quantity}</p>
                    </div>
                  </div>

                  {isActive && isLowStock && (
                    <div className="flex items-center gap-2 text-rose-500 bg-rose-50/50 p-2 rounded-lg mb-3">
                       <AlertTriangle size={14} />
                       <span className="text-[10px] font-black uppercase tracking-tighter">Atenção: Estoque Crítico</span>
                    </div>
                  )}
                  
                  {!isProfessional && (
                    <div className="grid grid-cols-4 gap-2">
                      <button 
                        onClick={() => setReplenishModal({ show: true, item, amount: '' })}
                        className="flex flex-col items-center justify-center py-2 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase"
                      >
                        <Plus size={14} className="mb-1" /> Repor
                      </button>
                      <button 
                        onClick={() => {
                          setEditingItem(item);
                          setFormData({ name: item.name, quantity: item.quantity, unit: item.unit, min_quantity: item.min_quantity });
                          setShowModal(true);
                        }}
                        className="flex flex-col items-center justify-center py-2 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-black uppercase"
                      >
                        <Edit2 size={14} className="mb-1" /> Editar
                      </button>
                      <button 
                        onClick={() => handleToggleActive(item)}
                        className={`flex flex-col items-center justify-center py-2 rounded-lg text-[9px] font-black uppercase ${isActive ? 'bg-slate-50 text-slate-400' : 'bg-emerald-50 text-emerald-600'}`}
                      >
                        {isActive ? <EyeOff size={14} className="mb-1" /> : <Eye size={14} className="mb-1" />} Status
                      </button>
                      <button 
                        onClick={() => handleDelete(item)}
                        className="flex flex-col items-center justify-center py-2 bg-rose-50 text-rose-500 rounded-lg text-[9px] font-black uppercase"
                      >
                        <Trash2 size={14} className="mb-1" /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-card w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingItem ? 'Editar Produto / Insumo' : 'Entrada de Estoque'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-900"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Nome do Produto</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-base"
                  placeholder="Ex: Shampoo de Brilho 1L"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Quantidade Atual</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    className="input-base"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Unidade</label>
                  <select 
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="input-base"
                  >
                    <option value="un">un (unidades)</option>
                    <option value="ml">ml (mililitros)</option>
                    <option value="g">g (gramas)</option>
                    <option value="kg">kg (quilos)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Estoque Mínimo (Alerta)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.min_quantity}
                  onChange={(e) => setFormData({...formData, min_quantity: e.target.value})}
                  className="input-base"
                  placeholder="Aviso quando atingir esta quantia"
                  required
                />
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary py-2"
                >
                  {loading ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Reposição Rápida */}
      {replenishModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-card w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Reposição de Estoque</h3>
                <button onClick={() => setReplenishModal({ show: false, item: null, amount: '' })}><X size={20} className="text-slate-400" /></button>
             </div>
             <form onSubmit={handleReplenishSubmit} className="p-6 space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Item Selecionado</p>
                   <p className="text-sm font-bold text-slate-900">{replenishModal.item?.name}</p>
                   <p className="text-xs text-slate-500 mt-1">Saldo Atual: {replenishModal.item?.quantity} {replenishModal.item?.unit}</p>
                </div>
                <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500 uppercase">Quantidade a Adicionar</label>
                   <div className="relative">
                      <input 
                        type="number" 
                        step="0.01" 
                        autoFocus
                        className="input-base pr-12" 
                        value={replenishModal.amount}
                        onChange={(e) => setReplenishModal({...replenishModal, amount: e.target.value})}
                        required
                        placeholder="Ex: 500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-300">{replenishModal.item?.unit}</span>
                   </div>
                </div>
                <button type="submit" disabled={loading} className="w-full btn-primary py-3">
                   {loading ? 'Processando...' : 'Confirmar Reposição'}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Alerta de Dependências */}
      {dependencyAlert.show && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-100">
            <div className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-rose-50/50">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">{dependencyAlert.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">{dependencyAlert.message}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 max-h-48 overflow-y-auto border border-slate-100">
                 {dependencyAlert.list.map((item, idx) => (
                   <div key={idx} className="flex items-center gap-2 py-1.5 text-xs font-bold text-slate-700 border-b border-white last:border-0 italic">
                      • {item}
                   </div>
                 ))}
              </div>
              <button 
                onClick={() => setDependencyAlert({ show: false, title: '', message: '', list: [] })}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
