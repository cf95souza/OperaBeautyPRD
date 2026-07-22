import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';

const EquipeAdmin = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();
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
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.auth.logout();
    navigate('/superadmin/login');
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
    if (!(await confirm('Tem certeza que deseja remover este administrador? O acesso dele será revogado imediatamente.'))) return;
    try {
      await api.superadmin.deleteAdmin(id);
      showSuccess('Administrador removido com sucesso!');
      fetchAdmins();
    } catch (error) {
      console.error(error);
      showError(error.message || 'Erro ao remover administrador.');
    }
  };

  return (
    <div className="font-body-md text-body-md antialiased overflow-x-hidden min-h-screen flex bg-surface text-on-surface animate-fade-in-up">
      
      {/* Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        ></div>
      )}

      {/* Navigation Drawer */}
      <aside className={`flex flex-col h-screen w-80 fixed top-0 bg-surface-container-lowest border-r border-outline-variant/30 z-50 transition-all duration-300 ${isDrawerOpen ? 'left-0' : '-left-80'} md:left-0`}>
        <div className="p-xl border-b border-outline-variant/30 bg-surface-container-lowest flex flex-col gap-4">
          <h1 className="font-serif text-[28px] text-primary font-bold">OperaBeauty</h1>
          <div className="flex items-center gap-md">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
            </div>
            <div>
              <h2 className="font-title-md text-title-md font-semibold text-on-surface tracking-tight">Super Admin</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Gestão da Plataforma</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-md space-y-xs">
          <Link to="/superadmin" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>dashboard</span>
            Painel Geral
          </Link>
          <Link to="/superadmin/tenants" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>storefront</span>
            Salões e Clientes
          </Link>
          <Link to="/superadmin/planos" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>subscriptions</span>
            Gestão de Planos
          </Link>
          <Link to="/superadmin/equipe" className="flex items-center gap-md py-3 px-4 bg-primary-container text-on-primary-container rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
            Equipe SaaS
          </Link>
          <Link to="/superadmin/features" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>toggle_on</span>
            Feature Flags
          </Link>
          <Link to="/superadmin/avisos" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>campaign</span>
            Mural de Avisos
          </Link>
          <Link to="/superadmin/auditoria" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>security</span>
            Auditoria e Saúde
          </Link>
          <Link to="/superadmin/configuracoes" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>settings</span>
            Configurações
          </Link>
        </nav>
        <div className="px-md mt-auto flex flex-col gap-2">
          <button onClick={handleLogout} className="flex items-center gap-md py-3 px-4 text-error hover:bg-error-container rounded-lg font-label-md text-label-md transition-colors w-full text-left">
            <span className="material-symbols-outlined">logout</span>
            Sair do Sistema
          </button>
          
          <div className="flex items-center gap-sm p-4 bg-surface-container-low rounded-xl">
            <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden">
              <span className="material-symbols-outlined text-secondary">person</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface">Super Admin</span>
              <span className="font-label-sm text-label-sm text-secondary">Administrador do Sistema</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 flex flex-col min-h-screen bg-background">
        
        {/* Top App Bar (Mobile) */}
        <header className="md:hidden flex justify-between items-center px-gutter py-3 w-full max-w-full bg-surface shadow-sm sticky top-0 z-30 pt-[max(env(safe-area-inset-top),_0.75rem)] min-h-[4rem]">
          <div className="flex items-center gap-sm">
            <button onClick={() => setIsDrawerOpen(true)} className="material-symbols-outlined text-primary p-2">menu</button>
            <div className="flex items-center gap-xs cursor-pointer active:opacity-80">
              <span className="material-symbols-outlined text-primary font-headline-md text-headline-md">spa</span>
              <span className="font-headline-md text-[20px] text-primary tracking-tight">Admin Mestre</span>
            </div>
          </div>
        </header>

        <div className="p-container-margin md:p-xl flex-1 flex flex-col gap-xl">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-lg">
            <div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">Equipe SaaS (Super Admins)</h1>
              <p className="font-body-md text-body-md text-secondary">Gerencie quem tem acesso total à plataforma e a todos os salões.</p>
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="bg-primary text-on-primary font-label-md text-label-md py-3 px-6 rounded-full flex items-center gap-sm hover:opacity-90 shadow-sm transition-all duration-300"
            >
              <span className="material-symbols-outlined">add</span>
              Novo Administrador
            </button>
          </div>

          <section className="bg-surface rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-lowest border-b border-surface-variant">
                  <tr>
                    <th className="p-4 font-label-md text-secondary">Nome</th>
                    <th className="p-4 font-label-md text-secondary">E-mail</th>
                    <th className="p-4 font-label-md text-secondary">Acesso</th>
                    <th className="p-4 font-label-md text-secondary text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="4" className="p-8 text-center text-secondary">Carregando...</td></tr>
                  ) : admins.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-secondary">Nenhum administrador encontrado.</td></tr>
                  ) : (
                    admins.map(admin => (
                      <tr key={admin.id} className="border-b border-surface-variant hover:bg-surface-container-lowest transition-colors">
                        <td className="p-4 font-label-md text-on-surface">{admin.name}</td>
                        <td className="p-4 text-secondary">{admin.email}</td>
                        <td className="p-4">
                          <span className="px-3 py-1 bg-primary-container text-on-primary-container rounded-full text-[12px] font-label-sm">Acesso Total</span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleOpenModal(admin)} className="text-secondary hover:text-primary transition-colors p-2">
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button onClick={() => handleDelete(admin.id)} className="text-secondary hover:text-error transition-colors p-2 ml-2">
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </main>

      {/* Modal de Criação / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-surface rounded-2xl w-full max-w-[500px] flex flex-col p-lg shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">{editAdmin ? 'Editar Administrador' : 'Novo Administrador'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-secondary hover:text-error transition-colors p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block font-label-sm text-secondary mb-1">Nome Completo</label>
                <input 
                  type="text"
                  required
                  className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg p-3 outline-none focus:border-primary"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block font-label-sm text-secondary mb-1">E-mail</label>
                <input 
                  type="email"
                  required
                  className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg p-3 outline-none focus:border-primary"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block font-label-sm text-secondary mb-1">
                  Senha {editAdmin && <span className="text-xs font-normal">(deixe em branco para não alterar)</span>}
                </label>
                <input 
                  type="password"
                  required={!editAdmin}
                  placeholder={editAdmin ? '••••••••' : ''}
                  className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg p-3 outline-none focus:border-primary"
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                />
                <p className="text-[12px] text-secondary mt-1">Mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 especial.</p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-full font-label-md text-secondary hover:bg-surface-container transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-2.5 bg-primary text-on-primary rounded-full font-label-md hover:opacity-90 transition-colors shadow-sm">
                  {editAdmin ? 'Salvar' : 'Criar'}
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
