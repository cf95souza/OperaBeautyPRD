import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Scissors, 
  Plus, 
  Search, 
  Loader2,
  Trash2,
  Edit2,
  X,
  Package,
  PlusCircle,
  MinusCircle
} from 'lucide-react';
import { useNotification } from '../context/NotificationProvider';

const Services = ({ profile }) => {
  const { showSuccess, showError } = useNotification();
  const isProfessional = profile?.role === 'professional';
  const [services, setServices] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    duration_minutes: 60,
    price: '',
    maintenance_days: 30,
    inputs: [] // { inventory_id: '', quantity_consumed: '' }
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [servicesRes, inventoryRes] = await Promise.all([
      supabase.from('cap_services').select('*').order('name'),
      supabase.from('cap_inventory').select('*').order('name')
    ]);
    
    if (servicesRes.error) console.error('Error services:', servicesRes.error);
    else setServices(servicesRes.data);

    if (inventoryRes.error) console.error('Error inventory:', inventoryRes.error);
    else setInventory(inventoryRes.data);

    setLoading(false);
  };

  const fetchServiceInputs = async (serviceId) => {
    const { data, error } = await supabase
      .from('cap_service_inventory')
      .select('inventory_id, quantity_consumed')
      .eq('service_id', serviceId);
    
    if (error) console.error('Error fetching inputs:', error);
    return data || [];
  };

  const handleOpenModal = async (service = null) => {
    if (service) {
      const inputs = await fetchServiceInputs(service.id);
      setEditingService(service);
      setFormData({
        name: service.name,
        duration_minutes: service.duration_minutes,
        price: service.price,
        maintenance_days: service.maintenance_days || 30,
        inputs: inputs
      });
    } else {
      setEditingService(null);
      setFormData({ name: '', duration_minutes: 60, price: '', maintenance_days: 30, inputs: [] });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const serviceData = {
      name: formData.name,
      duration_minutes: parseInt(formData.duration_minutes),
      price: parseFloat(formData.price),
      maintenance_days: parseInt(formData.maintenance_days)
    };

    let serviceId;
    if (editingService) {
      const { error } = await supabase
        .from('cap_services')
        .update(serviceData)
        .eq('id', editingService.id);
      if (error) { showError(error.message); setLoading(false); return; }
      serviceId = editingService.id;
    } else {
      const { data, error } = await supabase
        .from('cap_services')
        .insert([serviceData])
        .select();
      if (error) { showError(error.message); setLoading(false); return; }
      serviceId = data[0].id;
    }

    // Update inventory links: delete old, insert new
    await supabase.from('cap_service_inventory').delete().eq('service_id', serviceId);
    
    if (formData.inputs.length > 0) {
      const links = formData.inputs
        .filter(i => i.inventory_id && i.quantity_consumed)
        .map(i => ({
          service_id: serviceId,
          inventory_id: i.inventory_id,
          quantity_consumed: parseFloat(i.quantity_consumed)
        }));
      
      if (links.length > 0) {
        const { error: linkErr } = await supabase.from('cap_service_inventory').insert(links);
        if (linkErr) console.error('Error linking inventory:', linkErr);
      }
    }

    setShowModal(false);
    showSuccess(editingService ? 'Serviço atualizado com sucesso!' : 'Novo serviço cadastrado!');
    fetchData();
  };

  const addInputRow = () => {
    setFormData({
      ...formData,
      inputs: [...formData.inputs, { inventory_id: '', quantity_consumed: '' }]
    });
  };

  const removeInputRow = (index) => {
    const newInputs = [...formData.inputs];
    newInputs.splice(index, 1);
    setFormData({ ...formData, inputs: newInputs });
  };

  const updateInputRow = (index, field, value) => {
    const newInputs = [...formData.inputs];
    newInputs[index][field] = value;
    setFormData({ ...formData, inputs: newInputs });
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl text-slate-900 tracking-tight leading-none">Serviços</h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie o catálogo e o consumo de estoque.</p>
        </div>
        {!isProfessional && (
          <button onClick={() => handleOpenModal()} className="btn-accent text-sm">
            <Plus size={16} /> Novo(a) Serviço
          </button>
        )}
      </div>

      <div className="card-base flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Filtrar serviços..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-md py-1.5 pl-9 pr-4 text-xs focus:ring-1 focus:ring-accent/50 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 font-bold text-[10px] text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-3 border-b border-slate-100">Nome do Procedimento</th>
                <th className="px-6 py-3 border-b border-slate-100 text-center">Duração</th>
                <th className="px-6 py-3 border-b border-slate-100 text-center">Manutenção</th>
                <th className="px-6 py-3 border-b border-slate-100 text-right">Valor Bruto</th>
                {!isProfessional && <th className="px-6 py-3 border-b border-slate-100 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && services.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="animate-spin inline-block mr-2" size={16} />
                    Carregando serviços...
                  </td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                    Nenhum serviço encontrado.
                  </td>
                </tr>
              ) : (
                filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-accent">
                          <Scissors size={14} />
                        </div>
                        <span className="text-sm font-bold text-slate-900">{service.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        {service.duration_minutes} min
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs text-slate-500 italic">
                        {service.maintenance_days ? `${service.maintenance_days} dias` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-slate-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}
                      </span>
                    </td>
                    {!isProfessional && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenModal(service)}
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-white border rounded transition-all"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-card w-full max-w-lg my-8 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingService ? 'Editar Serviço' : 'Novo(a) Serviço'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Nome do Serviço</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input-base"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Duração (min)</label>
                  <input 
                    type="number" 
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                    className="input-base"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Preço (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="input-base"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Manutenção (Dias)</label>
                  <input 
                    type="number" 
                    value={formData.maintenance_days}
                    onChange={(e) => setFormData({...formData, maintenance_days: e.target.value})}
                    className="input-base"
                    placeholder="Ex: 30"
                    required
                  />
                </div>
              </div>

              {/* Insumos Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter flex items-center gap-2">
                    <Package size={14} /> Insumos (Consumo de Estoque)
                  </label>
                  <button 
                    type="button" 
                    onClick={addInputRow}
                    className="text-accent text-xs font-bold flex items-center gap-1 hover:underline"
                  >
                    <PlusCircle size={14} /> Adicionar Item
                  </button>
                </div>
                
                <div className="space-y-2">
                  {formData.inputs.map((input, index) => (
                    <div key={index} className="flex items-center gap-2 bg-slate-50 p-2 rounded-md border border-slate-100">
                      <select 
                        className="flex-1 bg-transparent border-none text-xs outline-none"
                        value={input.inventory_id}
                        onChange={(e) => updateInputRow(index, 'inventory_id', e.target.value)}
                        required
                      >
                        <option value="">Selecionar Produto...</option>
                        {inventory.map(item => (
                          <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                        ))}
                      </select>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="Qtd"
                        className="w-16 bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none"
                        value={input.quantity_consumed}
                        onChange={(e) => updateInputRow(index, 'quantity_consumed', e.target.value)}
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => removeInputRow(index)}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <MinusCircle size={16} />
                      </button>
                    </div>
                  ))}
                  {formData.inputs.length === 0 && (
                    <p className="text-[10px] text-slate-400 italic text-center py-2">Nenhum insumo vinculado.</p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-md">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 btn-primary py-2">{loading ? 'Salvando...' : 'Salvar Serviço'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
