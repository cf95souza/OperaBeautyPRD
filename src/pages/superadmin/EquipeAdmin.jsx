import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { 
  ShieldCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  User, 
  Mail, 
  Lock,
  Sparkles
} from 'lucide-react';
import { EstadoVazio } from '../../components/ui/EstadoVazio';

/**
 * Gestão da Equipe SaaS (Super Admins da Plataforma) - Rosé Editorial
 */
const EquipeAdmin = () => {
  const { showSuccess, showError, confirm } = useNotification();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const data = await api.superadmin.listAdmins();
      setAdmins(data || []);
    } catch (err) {
      console.error('Erro ao buscar administradores:', err);
      showError('Erro ao consultar lista de administradores.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (admin = null) => {
    if (admin) {
      setEditAdmin(admin);
      setForm({
        name: admin.name,
        email: admin.email,
        password: ''
      });
    } else {
      setEditAdmin(null);
      setForm({
        name: '',
        email: '',
        password: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editAdmin) {
        await api.superadmin.updateAdmin(editAdmin.id, form);
        showSuccess('Administrador atualizado com sucesso!');
      } else {
        await api.superadmin.createAdmin(form);
        showSuccess('Administrador criado com sucesso!');
      }
      setIsModalOpen(false);
      fetchAdmins();
    } catch (error) {
      console.error(error);
      showError(error.message || 'Erro ao salvar administrador.');
    }
  };

  const handleDelete = async (id) => {
    if (await confirm('Remover Administrador?', 'O acesso mestre desta conta à plataforma e a todos os salões será revogado imediatamente.')) {
      try {
        await api.superadmin.deleteAdmin(id);
        showSuccess('Administrador removido com sucesso!');
        fetchAdmins();
      } catch (error) {
        console.error(error);
        showError(error.message || 'Erro ao remover administrador.');
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16 max-w-5xl mx-auto">
      {/* Cabeçalho Editorial Rosé */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink tracking-tight">
            Equipe SaaS (Super Admins)
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Gerencie os administradores que possuem acesso master à infraestrutura da plataforma OperaBeauty.
          </p>
        </div>

        <button 
          onClick={() => handleOpenModal()}
          className="px-5 py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Administrador</span>
        </button>
      </div>

      {/* Tabela de Administradores */}
      <div className="rounded-[22px] border border-line bg-white shadow-xs overflow-hidden">
        <div className="p-5 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-tint flex items-center justify-center text-brand">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="font-display font-bold text-lg text-ink">Administradores Ativos</h2>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-ink-soft tabular-nums">
            {admins.length} membros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-line text-xs font-semibold uppercase tracking-wider text-ink-soft">
                <th className="p-4">Administrador</th>
                <th className="p-4">E-mail</th>
                <th className="p-4 text-center">Nível de Acesso</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-12 text-center text-xs text-ink-soft italic">
                    Carregando administradores...
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center">
                    <EstadoVazio
                      icone={<ShieldCheck className="w-7 h-7 text-brand" />}
                      titulo="Nenhum administrador encontrado"
                      descricao="Adicione outros administradores mestres para gerenciar a plataforma SaaS OperaBeauty."
                      textoAcao="+ Novo Administrador"
                      aoClicarAcao={() => handleOpenModal()}
                      className="my-2 border-0 shadow-none bg-transparent"
                    />
                  </td>
                </tr>
              ) : (
                admins.map(admin => (
                  <tr key={admin.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-tint text-brand flex items-center justify-center font-bold text-xs">
                          {admin.name?.charAt(0)?.toUpperCase() || 'A'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-ink">{admin.name}</p>
                          <p className="text-[11px] text-ink-soft">Super Admin</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-mono text-ink-soft">{admin.email}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Acesso Total Mestre
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => handleOpenModal(admin)} 
                          className="p-1.5 rounded-lg text-ink-soft hover:text-brand hover:bg-stone-100 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(admin.id)} 
                          className="p-1.5 rounded-lg text-ink-soft hover:text-rose-600 hover:bg-stone-100 transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div 
            className="relative w-full max-w-md bg-white rounded-[26px] shadow-2xl border border-line overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-[#FAF7F5] px-6 py-5 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-tint flex items-center justify-center text-brand">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-ink leading-tight">
                    {editAdmin ? 'Editar Administrador' : 'Novo Administrador'}
                  </h3>
                  <p className="text-xs text-ink-soft">
                    {editAdmin ? 'Altere as credenciais de acesso' : 'Cadastre um novo membro para gerenciar o SaaS'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 rounded-full text-ink-soft hover:text-ink hover:bg-stone-100 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Nome Completo</label>
                <div className="relative flex items-center">
                  <input 
                    type="text"
                    required
                    placeholder="ex: Gabriel Duarte"
                    className="w-full text-xs bg-stone-50 border border-line rounded-xl px-3.5 py-2.5 text-ink outline-none focus:border-brand"
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">E-mail de Acesso</label>
                <input 
                  type="email"
                  required
                  placeholder="admin@operabeauty.com.br"
                  className="w-full text-xs font-mono bg-stone-50 border border-line rounded-xl px-3.5 py-2.5 text-ink outline-none focus:border-brand"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Senha {editAdmin && <span className="text-[11px] font-normal text-ink-soft">(deixe em branco para manter a atual)</span>}
                </label>
                <input 
                  type="password"
                  required={!editAdmin}
                  placeholder={editAdmin ? '••••••••' : 'Digite uma senha segura'}
                  className="w-full text-xs font-mono bg-stone-50 border border-line rounded-xl px-3.5 py-2.5 text-ink outline-none focus:border-brand"
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                />
                <p className="text-[11px] text-ink-soft mt-1">Mínimo 8 caracteres com letras maiúsculas, minúsculas e números.</p>
              </div>

              <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2.5 rounded-full border border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editAdmin ? 'Salvar Alterações' : 'Criar Administrador'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipeAdmin;
