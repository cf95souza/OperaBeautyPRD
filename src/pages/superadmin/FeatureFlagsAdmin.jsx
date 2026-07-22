import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';
import { Link } from 'react-router-dom';

const FeatureFlagsAdmin = () => {
  const { showSuccess, showError, confirm } = useNotification();
  const [flags, setFlags] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [tenantFlags, setTenantFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active_global: false
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      fetchTenantFlags(selectedTenantId);
    } else {
      setTenantFlags([]);
    }
  }, [selectedTenantId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [flagsData, tenantsData] = await Promise.all([
        api.superadmin.listFeatureFlags(),
        api.superadmin.listTenants()
      ]);
      setFlags(flagsData);
      setTenants(tenantsData || []);
    } catch (err) {
      showError('Erro ao carregar dados iniciais.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantFlags = async (tenantId) => {
    try {
      setTenantLoading(true);
      const data = await api.superadmin.listTenantFeatureFlags(tenantId);
      setTenantFlags(data);
    } catch (err) {
      showError('Erro ao buscar as flags do inquilino.');
      console.error(err);
    } finally {
      setTenantLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFlag) {
        await api.superadmin.updateFeatureFlag(editingFlag.id, formData);
        showSuccess('Feature Flag atualizada com sucesso!');
      } else {
        await api.superadmin.createFeatureFlag(formData);
        showSuccess('Feature Flag criada com sucesso!');
      }
      setIsModalOpen(false);
      fetchInitialData();
      if (selectedTenantId) {
        fetchTenantFlags(selectedTenantId);
      }
    } catch (err) {
      showError(err.message || 'Erro ao salvar Feature Flag.');
    }
  };

  const openModal = (flag = null) => {
    if (flag) {
      setEditingFlag(flag);
      setFormData({
        name: flag.name,
        description: flag.description || '',
        is_active_global: flag.is_active_global
      });
    } else {
      setEditingFlag(null);
      setFormData({
        name: '',
        description: '',
        is_active_global: false
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (await confirm('Tem certeza?', 'A Feature Flag será excluída permanentemente. Todos os salões perderão as configurações associadas a ela.')) {
      try {
        await api.superadmin.deleteFeatureFlag(id);
        showSuccess('Feature Flag excluída com sucesso!');
        fetchInitialData();
        if (selectedTenantId) {
          fetchTenantFlags(selectedTenantId);
        }
      } catch (err) {
        showError(err.message || 'Erro ao excluir Feature Flag.');
      }
    }
  };

  const handleToggleTenantFlag = async (flagId, isEnabled) => {
    if (!selectedTenantId) return;
    try {
      await api.superadmin.toggleTenantFeatureFlag({
        tenant_id: selectedTenantId,
        feature_flag_id: flagId,
        is_enabled: isEnabled
      });
      showSuccess('Configuração do salão atualizada com sucesso!');
      fetchTenantFlags(selectedTenantId);
    } catch (err) {
      showError('Erro ao atualizar flag do salão.');
    }
  };

  return (
    <div className="flex h-screen bg-surface font-sans text-on-surface overflow-hidden">
      {/* Sidebar - Navigation Drawer */}
      <aside className="w-80 bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col transition-all duration-300">
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
          <Link to="/superadmin" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface rounded-lg mx-md font-label-md transition-all duration-200 ease-in-out">
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
          <Link to="/superadmin/equipe" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>admin_panel_settings</span>
            Equipe SaaS
          </Link>
          <Link to="/superadmin/features" className="flex items-center gap-md py-3 px-4 bg-primary-container text-on-primary-container rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>toggle_on</span>
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-surface">
        {/* Header */}
        <div className="p-container-margin md:p-xl flex-1 flex flex-col gap-xl">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-lg border-b border-outline-variant/30 pb-lg">
            <div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">Feature Flags & Módulos Beta</h1>
              <p className="font-body-md text-body-md text-secondary">Controle a liberação de funcionalidades e módulos experimentais</p>
            </div>
            <button
              onClick={() => openModal()}
              className="bg-primary text-on-primary font-label-md text-label-md py-3 px-6 rounded-full flex items-center gap-sm hover:opacity-90 shadow-sm transition-all duration-300"
            >
              <span className="material-symbols-outlined text-md">add</span>
              Nova Feature Flag
            </button>
          </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-xl">
          {loading ? (
            <div className="text-center py-20 font-body-md text-on-surface-variant">Carregando Feature Flags...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
              
              {/* Left & Middle Column: Global Flags List */}
              <div className="lg:col-span-2 space-y-md">
                <h2 className="font-title-md text-title-md font-bold text-on-surface">Módulos Cadastrados</h2>
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant/30 text-on-surface-variant font-label-md text-label-md">
                        <th className="p-4">Identificador (Chave)</th>
                        <th className="p-4">Descrição</th>
                        <th className="p-4 text-center">Ativa Globalmente</th>
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flags.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-8 text-center text-on-surface-variant font-body-md">Nenhuma Feature Flag cadastrada ainda.</td>
                        </tr>
                      ) : (
                        flags.map((flag) => (
                          <tr key={flag.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/30 transition-colors font-body-md">
                            <td className="p-4">
                              <code className="px-2 py-1 bg-surface-container-high text-primary rounded-md font-mono text-sm">{flag.name}</code>
                            </td>
                            <td className="p-4 text-on-surface-variant text-sm">{flag.description}</td>
                            <td className="p-4 text-center">
                              <span className={`inline-flex items-center gap-xs px-2.5 py-0.5 rounded-full text-xs font-semibold ${flag.is_active_global ? 'bg-green-100 text-green-800' : 'bg-outline-variant/30 text-on-surface-variant'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${flag.is_active_global ? 'bg-green-600' : 'bg-on-surface-variant/40'}`}></span>
                                {flag.is_active_global ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-xs">
                              <button
                                onClick={() => openModal(flag)}
                                className="p-1.5 text-on-surface-variant hover:text-primary transition-all rounded-md"
                                title="Editar"
                              >
                                <span className="material-symbols-outlined text-md">edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(flag.id)}
                                className="p-1.5 text-on-surface-variant hover:text-error transition-all rounded-md"
                                title="Excluir"
                              >
                                <span className="material-symbols-outlined text-md">delete</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Tenant-Specific Activation */}
              <div className="space-y-md">
                <h2 className="font-title-md text-title-md font-bold text-on-surface">Liberação por Locatário (Salão)</h2>
                
                <div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant/30 space-y-md">
                  <div>
                    <label className="font-label-md text-label-md text-on-surface-variant block mb-sm">Selecione o Salão</label>
                    <select
                      value={selectedTenantId}
                      onChange={(e) => setSelectedTenantId(e.target.value)}
                      className="w-full px-md py-sm bg-surface-container-low border border-outline rounded-lg focus:outline-none focus:border-primary text-on-surface font-body-md"
                    >
                      <option value="">-- Escolha um salão --</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                      ))}
                    </select>
                  </div>

                  {selectedTenantId ? (
                    <div className="space-y-md">
                      <h3 className="font-title-sm text-title-sm font-semibold border-b border-outline-variant/20 pb-xs">Lista de Módulos</h3>
                      
                      {tenantLoading ? (
                        <div className="text-center py-md text-on-surface-variant">Carregando flags...</div>
                      ) : tenantFlags.length === 0 ? (
                        <div className="text-center py-md text-on-surface-variant">Crie feature flags primeiro.</div>
                      ) : (
                        <div className="space-y-sm">
                          {tenantFlags.map((tf) => (
                            <div key={tf.feature_flag_id} className="flex items-center justify-between p-md bg-surface-container-low rounded-lg border border-outline-variant/10">
                              <div>
                                <p className="font-title-sm text-sm font-semibold">{tf.name}</p>
                                <p className="text-xs text-on-surface-variant">{tf.description || 'Sem descrição'}</p>
                                {tf.is_active_global && (
                                  <span className="text-[10px] text-green-600 font-bold uppercase mt-xs block">Ativo Globalmente</span>
                                )}
                              </div>
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  disabled={tf.is_active_global}
                                  checked={tf.is_active}
                                  onChange={(e) => handleToggleTenantFlag(tf.feature_flag_id, e.target.checked)}
                                  className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2 disabled:opacity-50"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-xl text-on-surface-variant font-body-md">
                      Selecione um salão para gerenciar a liberação de módulos Beta especificamente para ele.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Modal: Nova / Editar Flag */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-scrim/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl border border-outline-variant/30 overflow-hidden shadow-xl flex flex-col max-h-[90vh] animate-scale-up">
              <header className="p-lg border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest">
                <h3 className="font-title-lg text-title-lg font-bold text-on-surface">{editingFlag ? 'Editar Feature Flag' : 'Nova Feature Flag'}</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-full hover:bg-surface-container-high transition-all text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-md">close</span>
                </button>
              </header>
              <form onSubmit={handleSubmit} className="p-lg space-y-md flex-1 overflow-y-auto">
                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant block mb-xs">Identificador da Flag (Sem espaços)</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingFlag}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    placeholder="ex: modulo_vip"
                    className="w-full px-md py-sm bg-surface-container-low border border-outline rounded-lg focus:outline-none focus:border-primary text-on-surface font-body-md disabled:opacity-60"
                  />
                  <p className="text-xs text-on-surface-variant mt-xs">Apenas letras minúsculas, números e sublinhados.</p>
                </div>

                <div>
                  <label className="font-label-md text-label-md text-on-surface-variant block mb-xs">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva o propósito dessa flag"
                    rows="3"
                    className="w-full px-md py-sm bg-surface-container-low border border-outline rounded-lg focus:outline-none focus:border-primary text-on-surface font-body-md"
                  ></textarea>
                </div>

                <div className="flex items-center gap-md p-md bg-surface-container-low rounded-lg border border-outline-variant/10">
                  <div className="flex-1">
                    <p className="font-title-sm text-sm font-semibold">Ativa Globalmente</p>
                    <p className="text-xs text-on-surface-variant">Libera o módulo para todos os salões da plataforma automaticamente</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.is_active_global}
                    onChange={(e) => setFormData({ ...formData, is_active_global: e.target.checked })}
                    className="w-5 h-5 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                  />
                </div>

                <div className="flex justify-end gap-sm pt-md border-t border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-outline rounded-lg font-label-md text-label-md hover:bg-surface-container-high transition-all text-on-surface"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-on-primary hover:bg-primary/90 transition-all rounded-lg font-label-md text-label-md"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
};

export default FeatureFlagsAdmin;
