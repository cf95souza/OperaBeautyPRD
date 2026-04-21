import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  Plus, 
  Search, 
  Loader2,
  Trash2,
  Edit2,
  X,
  Phone,
  Cake,
  MessageCircle,
  ChevronRight
} from 'lucide-react';
import { useNotification } from '../context/NotificationProvider';

const Clients = () => {
  const { showSuccess, showError, confirm } = useNotification();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBirthdays, setShowBirthdays] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    birth_date: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cap_clients')
      .select('*')
      .order('name');
    
    if (error) console.error('Error fetching clients:', error);
    else setClients(data || []);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const clientData = {
      name: formData.name,
      phone: formData.phone,
      birth_date: formData.birth_date || null
    };

    try {
      let error;
      if (editingClient) {
        const { error: err } = await supabase
          .from('cap_clients')
          .update(clientData)
          .eq('id', editingClient.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from('cap_clients')
          .insert([clientData]);
        error = err;
      }

      if (error) {
        console.error('Erro de permissão ou banco:', error);
        showError(`Erro ao salvar cliente: ${error.message}`);
      } else {
        showSuccess(editingClient ? 'Cliente atualizado!' : 'Novo(a) cliente cadastrado(a)!');
        setShowModal(false);
        setFormData({ name: '', phone: '', birth_date: '' });
        await fetchClients();
      }
    } catch (err) {
      console.error('Crash in handleSave:', err);
      showError('Erro inesperado ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (await confirm('Deseja realmente excluir o cadastro deste cliente? Esta ação removerá o acesso ao histórico básico.')) {
      const { error } = await supabase
        .from('cap_clients')
        .delete()
        .eq('id', id);
      
      if (error) showError('Erro ao excluir: ' + error.message);
      else {
        showSuccess('Cadastro removido com sucesso!');
        fetchClients();
      }
    }
  };

  const openWhatsApp = (phone) => {
     window.open(`https://wa.me/55${phone.replace(/\D/g, '')}`, '_blank');
  };

  const filteredClients = clients.filter(c => {
    const nameMatch = c.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = c.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const searchMatch = nameMatch || phoneMatch;

    if (showBirthdays) {
      if (!c.birth_date) return false;
      const birthMonth = new Date(c.birth_date + 'T12:00:00').getMonth();
      const currentMonth = new Date().getMonth();
      return searchMatch && birthMonth === currentMonth;
    }

    return searchMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl text-slate-900 tracking-tight leading-none">Clientes</h2>
          <p className="text-sm text-slate-500 mt-1">Base de clientes e histórico de atendimento.</p>
        </div>
        <button 
          onClick={() => {
            setEditingClient(null);
            setFormData({ name: '', phone: '', birth_date: '' });
            setShowModal(true);
          }}
          className="btn-accent text-sm"
        >
          <Plus size={16} /> Novo(a) Cliente
        </button>
      </div>

      <div className="card-base flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou telefone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-md py-1.5 pl-9 pr-4 text-xs focus:ring-1 focus:ring-accent/50 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
             <button 
                onClick={() => setShowBirthdays(!showBirthdays)}
                className={`text-xs font-bold transition-all flex items-center gap-1.5 border px-3 py-1.5 rounded-md ${
                   showBirthdays 
                     ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm' 
                     : 'text-slate-500 hover:text-slate-900 border-slate-200 bg-white hover:bg-slate-50'
                }`}
             >
                <Cake size={14} className={showBirthdays ? 'text-rose-500' : 'text-slate-300'} /> 
                {showBirthdays ? 'Exibindo Aniversariantes' : 'Aniversariantes do Mês'}
             </button>
          </div>
        </div>

        <div className="md:block hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 font-bold text-[10px] text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-3 border-b border-slate-100">Cliente</th>
                <th className="px-6 py-3 border-b border-slate-100">Contato</th>
                <th className="px-6 py-3 border-b border-slate-100">Nascimento</th>
                <th className="px-6 py-3 border-b border-slate-100 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && clients.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="animate-spin inline-block mr-2" size={16} />
                    Carregando clientes...
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                    Nenhum cliente cadastrado.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                          {client.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-slate-900 uppercase">{client.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                         <Phone size={12} className="text-slate-400" />
                         {client.phone}
                         <button 
                          onClick={() => openWhatsApp(client.phone)}
                          className="ml-2 text-emerald-500 hover:text-emerald-600 transition-colors"
                         >
                            <MessageCircle size={14} />
                         </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Cake size={12} /> {client.birth_date ? new Date(client.birth_date + 'T12:00:00').toLocaleDateString('pt-BR') : '--/--'}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingClient(client);
                            setFormData({
                              name: client.name,
                              phone: client.phone,
                              birth_date: client.birth_date || ''
                            });
                            setShowModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-white border rounded transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Edit2 size={14} />
                        </button>
                        <Link 
                          to={`/clientes/${client.id}`}
                          className="flex items-center gap-1.5 text-xs font-bold text-accent hover:underline pl-4 border-l border-slate-100 ml-2"
                        >
                           CRM <ChevronRight size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden p-4 space-y-4 bg-slate-50/30">
          {loading && clients.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
               <Loader2 className="animate-spin inline-block mb-2" size={24} />
               <p className="text-xs font-bold uppercase tracking-widest">Carregando...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
               Nenhum cliente encontrado
            </div>
          ) : (
            filteredClients.map((client) => (
              <div key={client.id} className="responsive-table-row">
                <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/5 text-accent flex items-center justify-center font-bold text-sm">
                      {client.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 uppercase">{client.name}</p>
                      <button 
                        onClick={() => openWhatsApp(client.phone)}
                        className="text-[10px] font-bold text-emerald-500 flex items-center gap-1"
                      >
                        <MessageCircle size={10} /> {client.phone}
                      </button>
                    </div>
                  </div>
                  <Link to={`/clientes/${client.id}`} className="p-2 bg-slate-50 text-slate-400 rounded-lg"><ChevronRight size={18} /></Link>
                </div>
                
                <div className="responsive-table-cell">
                   <span className="responsive-table-label text-slate-400 font-bold uppercase tracking-widest">Nascimento</span>
                   <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Cake size={12} className="text-rose-400" /> {client.birth_date ? new Date(client.birth_date + 'T12:00:00').toLocaleDateString('pt-BR') : '--/--'}</span>
                </div>

                <div className="pt-3 flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingClient(client);
                      setFormData({ name: client.name, phone: client.phone, birth_date: client.birth_date || '' });
                      setShowModal(true);
                    }}
                    className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2"
                  >
                    <Edit2 size={12} /> Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(client.id)}
                    className="flex-1 py-2 bg-rose-50 text-rose-500 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2"
                  >
                    <Trash2 size={12} /> Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-card w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingClient ? 'Editar Cliente' : 'Novo(a) Cliente'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Nome Completo</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-base"
                  placeholder="Ex: Maria Júlia Santos"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Telefone (WhatsApp)</label>
                <input 
                  type="text" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="input-base"
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Data de Nascimento</label>
                <input 
                  type="date" 
                  value={formData.birth_date}
                  onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                  className="input-base"
                />
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-md">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 btn-primary py-2">{loading ? 'Salvando...' : 'Salvar Cliente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
