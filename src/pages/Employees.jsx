import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  Plus, 
  Search, 
  Loader2,
  Trash2,
  Edit2,
  X,
  Crown,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Key,
  ShieldOff
} from 'lucide-react';
import { useNotification } from '../context/NotificationProvider';

const Employees = () => {
  const { showSuccess, showError, confirm } = useNotification();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    role: 'professional',
    is_active: true,
    email: '',
    password: ''
  });

  const [resetModal, setResetModal] = useState({ show: false, employee: null, newPassword: '' });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cap_profiles')
      .select('*')
      .order('full_name');
    
    if (error) console.error('Error fetching employees:', error);
    else setEmployees(data);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (editingEmployee) {
      // APENAS ATUALIZAR PERFIL
      const { error } = await supabase
        .from('cap_profiles')
        .update({
          full_name: formData.full_name,
          role: formData.role
        })
        .eq('id', editingEmployee.id);

      if (error) showError('Erro ao atualizar: ' + error.message);
      else {
        // Se preencheu nova senha no modal de edição, faz o reset automático
        if (formData.password) {
           const { error: resetErr } = await supabase.rpc('cap_admin_set_password', {
             p_user_id: editingEmployee.id,
             p_new_password: formData.password
           });
           if (resetErr) showError('Nome atualizado, mas erro ao resetar senha: ' + resetErr.message);
           else showSuccess('Profissional atualizado com sucesso!');
        } else {
          showSuccess('Profissional atualizado com sucesso!');
        }
        setShowModal(false);
        fetchEmployees();
      }
    } else {
      // CRIAR NOVO USUÁRIO E PERFIL VIA RPC (Interno - Bypass permissão Auth)
      const { data, error } = await supabase.rpc('cap_admin_create_internal_user', {
        p_email: formData.email,
        p_password: formData.password,
        p_full_name: formData.full_name,
        p_role: formData.role
      });

      if (error) {
        showError('Erro ao criar profissional: ' + error.message);
      } else {
        showSuccess('Profissional cadastrado com sucesso!');
        setShowModal(false);
        fetchEmployees();
      }
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModal.newPassword) return;

    setLoading(true);
    const { data, error } = await supabase.rpc('cap_admin_set_password', {
      p_user_id: resetModal.employee.id,
      p_new_password: resetModal.newPassword
    });

    if (error) {
      showError('Erro ao resetar senha: ' + error.message);
    } else {
      showSuccess('Senha atualizada com sucesso!');
      setResetModal({ show: false, employee: null, newPassword: '' });
    }
    setLoading(false);
  };

  const handleDelete = async (emp) => {
    // 1. Verificar se tem agendamentos
    const { count, error: countErr } = await supabase
      .from('cap_appointments')
      .select('*', { count: 'exact', head: true })
      .eq('professional_id', emp.id);

    if (count > 0) {
      showError('Não é possível excluir este profissional pois ele possui histórico de atendimentos. Use a função "Inativar" para remover o acesso.');
      return;
    }

    if (await confirm(`Deseja excluir DEFINITIVAMENTE o registro de ${emp.full_name}?`)) {
      setLoading(true);
      const { error } = await supabase.from('cap_profiles').delete().eq('id', emp.id);
      
      if (error) showError('Erro ao excluir: ' + error.message);
      else {
        showSuccess('Profissional excluído com sucesso!');
        fetchEmployees();
      }
      setLoading(false);
    }
  };

  const toggleStatus = async (emp) => {
    const { error } = await supabase
      .from('cap_profiles')
      .update({ is_active: !emp.is_active })
      .eq('id', emp.id);
    
    if (error) showError('Erro ao atualizar status: ' + error.message);
    else {
      showSuccess(`Profissional ${!emp.is_active ? 'reativado' : 'inativado'} com sucesso!`);
      fetchEmployees();
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl text-slate-900 tracking-tight leading-none">Profissionais</h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie a equipe e cargos do salão.</p>
        </div>
        <button 
          onClick={() => {
            setEditingEmployee(null);
            setFormData({ full_name: '', role: 'professional', is_active: true, email: '', password: '' });
            setShowModal(true);
          }}
          className="btn-accent text-sm"
        >
          <Plus size={16} /> Novo(a) Profissional
        </button>
      </div>

      <div className="card-base flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Buscar profissionais..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-md py-1.5 pl-9 pr-4 text-xs focus:ring-1 focus:ring-accent/50 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-400">
               <Loader2 className="animate-spin inline-block mr-2" size={20} />
               Sincronizando equipe...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 italic">
               Nenhum profissional cadastrado no sistema.
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <div key={emp.id} className="card-base p-6 space-y-4 group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-lg font-bold">
                    {emp.full_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-slate-900 leading-none">{emp.full_name}</p>
                      {emp.role === 'admin' && <Crown size={12} className="text-amber-500" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-extrabold uppercase border px-2 py-0.5 rounded-full ${emp.role === 'admin' ? 'border-amber-200 text-amber-600 bg-amber-50' : 'border-slate-200 text-slate-500 bg-slate-50'}`}>
                        {emp.role === 'admin' ? 'Proprietário(a)' : 'Profissional'}
                      </span>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${emp.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                        {emp.is_active ? 'Habilitado' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </div>
                
                    <div className="flex items-center justify-end gap-3 transition-opacity">
                      <button 
                        onClick={() => setResetModal({ show: true, employee: emp, newPassword: '' })}
                        title="Resetar Senha"
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg bg-amber-50/30 border border-amber-100 shadow-sm transition-all"
                      >
                        <Key size={14} />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingEmployee(emp);
                          setFormData({ full_name: emp.full_name, role: emp.role, is_active: emp.is_active, password: '' });
                          setShowModal(true);
                        }}
                        title="Editar Perfil"
                        className="p-2 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg bg-white shadow-sm transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => toggleStatus(emp)}
                        title={emp.is_active ? "Inativar" : "Ativar"}
                        className={`p-1.5 border border-slate-100 rounded bg-white shadow-sm transition-all ${
                          emp.is_active ? 'text-rose-400 hover:text-rose-600' : 'text-emerald-400 hover:text-emerald-600'
                        }`}
                      >
                        {emp.is_active ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                      </button>
                      <button 
                        onClick={() => handleDelete(emp)}
                        title="Excluir"
                        className="p-1.5 text-slate-200 hover:text-rose-600 border border-slate-100 rounded bg-white shadow-sm"
                      >
                        <Trash2 size={14} />
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
              <h3 className="text-lg font-bold text-slate-900">Editar Perfil</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Nome Completo</label>
                <input 
                  type="text" 
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="input-base"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Cargo Principal</label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="input-base"
                >
                  <option value="professional">Profissional de Beleza</option>
                  <option value="admin">Gestor(a) / Proprietário(a)</option>
                </select>
              </div>

              {editingEmployee && (
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100/50 space-y-2">
                   <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Alterar Senha de Acesso</p>
                   <div className="space-y-1">
                      <input 
                        type="password" 
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="input-base !bg-white"
                        placeholder="Nova senha (opcional)"
                        minLength={6}
                      />
                      <p className="text-[9px] text-amber-600 font-medium italic">Deixe em branco para não alterar a senha atual.</p>
                   </div>
                </div>
              )}

              {!editingEmployee && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">E-mail de Acesso (Pode ser fictício)</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="input-base"
                      placeholder="ex: luana@capelli.com"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Senha Inicial</label>
                    <input 
                      type="password" 
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="input-base"
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                    />
                  </div>
                </>
              )}

              <div className="pt-4 flex items-center gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-md">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 btn-primary py-2">{loading ? 'Salvando...' : 'Salvar Alterações'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Reset de Senha */}
      {resetModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-card w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Resetar Senha</h3>
                <button onClick={() => setResetModal({ show: false, employee: null, newPassword: '' })}><X size={20} className="text-slate-400" /></button>
             </div>
             <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Definir nova senha para</p>
                   <p className="text-sm font-bold text-slate-900">{resetModal.employee?.full_name}</p>
                </div>
                <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500 uppercase">Nova Senha</label>
                   <input 
                    type="password" 
                    className="input-base text-center" 
                    value={resetModal.newPassword}
                    onChange={(e) => setResetModal({...resetModal, newPassword: e.target.value})}
                    required
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                   />
                </div>
                <button type="submit" disabled={loading} className="w-full btn-accent py-3">
                   {loading ? 'Processando...' : 'Confirmar Nova Senha'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
