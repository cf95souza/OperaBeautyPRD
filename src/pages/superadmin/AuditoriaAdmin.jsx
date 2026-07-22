import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

const AuditoriaAdmin = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [storage, setStorage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('storage'); // 'storage' or 'logs'
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [storageData, logsData] = await Promise.all([
        api.superadmin.getStorageUsage(),
        api.superadmin.getAuditLogs()
      ]);
      setStorage(storageData || []);
      setLogs(logsData || []);
    } catch (err) {
      console.error('Erro ao buscar dados de auditoria', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.auth.logout();
    navigate('/superadmin/login');
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateString));
  };

  const renderSidebar = () => (
    <>
      {/* Drawer Overlay for Mobile */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
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
            Studios e Clientes
          </Link>
          <Link to="/superadmin/planos" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>subscriptions</span>
            Gestão de Planos
          </Link>
          <Link to="/superadmin/equipe" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>admin_panel_settings</span>
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
          <Link to="/superadmin/auditoria" className="flex items-center gap-md py-3 px-4 bg-primary-container text-on-primary-container rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
            Auditoria e Saúde
          </Link>
          <Link to="/superadmin/configuracoes" className="flex items-center gap-md py-3 px-4 text-on-surface-variant hover:bg-surface-container-high rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>settings</span>
            Configurações
          </Link>
        </nav>
        <div className="p-md mt-auto border-t border-outline-variant/30">
          <button onClick={handleLogout} className="flex items-center gap-md py-3 px-4 text-error hover:bg-error-container rounded-lg font-label-md text-label-md transition-colors w-full text-left">
            <span className="material-symbols-outlined">logout</span>
            Sair do Sistema
          </button>
        </div>
      </aside>
    </>
  );

  return (
    <div className="min-h-screen bg-surface md:pl-80 flex flex-col font-sans transition-all duration-300">
      {/* Mobile Top App Bar */}
      <header className="md:hidden flex items-center justify-between p-md bg-surface border-b border-outline-variant/30">
        <div className="flex items-center gap-sm">
          <button onClick={() => setIsDrawerOpen(true)} className="p-2 -ml-2 text-on-surface-variant rounded-full hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="font-serif text-[20px] text-primary font-bold">OperaBeauty</h1>
        </div>
      </header>

      {renderSidebar()}

      <main className="flex-1 flex flex-col p-lg md:p-xl max-w-[1200px] w-full mx-auto gap-xl">
        <header>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mb-2">Auditoria e Saúde</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Monitore o consumo de armazenamento dos studios e acompanhe os logs de segurança do painel mestre.
          </p>
        </header>

        <div className="flex gap-4 border-b border-outline-variant/30 pb-2">
          <button
            onClick={() => setActiveTab('storage')}
            className={`px-4 py-2 font-label-lg rounded-t-lg transition-colors ${activeTab === 'storage' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            Armazenamento (Studios)
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 font-label-lg rounded-t-lg transition-colors ${activeTab === 'logs' ? 'border-b-2 border-primary text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            Logs de Segurança
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-xl">
            <span className="material-symbols-outlined animate-spin text-primary text-[32px]">sync</span>
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
            {activeTab === 'storage' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant font-label-md border-b border-outline-variant/30">
                      <th className="py-4 px-6 font-medium">Studio</th>
                      <th className="py-4 px-6 font-medium">Uso Total (CRM)</th>
                      <th className="py-4 px-6 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storage.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="py-6 text-center text-on-surface-variant">Nenhum dado de armazenamento encontrado.</td>
                      </tr>
                    ) : (
                      storage.map((tenant) => (
                        <tr key={tenant.tenant_id} className="border-b border-outline-variant/30 last:border-0 hover:bg-surface-container-lowest/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-label-lg text-on-surface">{tenant.tenant_name}</div>
                            <div className="text-body-sm text-secondary">@{tenant.tenant_slug}</div>
                          </td>
                          <td className="py-4 px-6 font-display-sm text-primary">
                            {formatBytes(Number(tenant.total_bytes))}
                          </td>
                          <td className="py-4 px-6">
                            <div className="w-full bg-surface-container-high rounded-full h-2.5 max-w-[150px]">
                              <div className="bg-primary h-2.5 rounded-full" style={{ width: `${Math.min(100, (Number(tenant.total_bytes) / (50 * 1024 * 1024)) * 100)}%` }}></div>
                            </div>
                            <span className="text-[10px] text-secondary mt-1 block">Ref: 50MB</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant font-label-md border-b border-outline-variant/30">
                      <th className="py-4 px-6 font-medium">Data/Hora</th>
                      <th className="py-4 px-6 font-medium">Ação</th>
                      <th className="py-4 px-6 font-medium">Entidade Afetada</th>
                      <th className="py-4 px-6 font-medium">IP de Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-6 text-center text-on-surface-variant">Nenhum log encontrado.</td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="border-b border-outline-variant/30 last:border-0 hover:bg-surface-container-lowest/50 transition-colors">
                          <td className="py-4 px-6 font-body-md text-on-surface-variant">
                            {formatDate(log.created_at)}
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2 py-1 bg-secondary-container text-on-secondary-container text-xs rounded-full font-label-md">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-body-md text-on-surface">
                            {log.entity_name}
                          </td>
                          <td className="py-4 px-6 font-mono text-body-sm text-on-surface-variant">
                            {log.ip_address || 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AuditoriaAdmin;
