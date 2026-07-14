import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';

const SettingsAdmin = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [gateway, setGateway] = useState('mercadopago');
  const [apiKey, setApiKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [settingsId, setSettingsId] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.superadmin.getPlatformSettings();
      if (data) {
        setGateway(data.payment_gateway || 'mercadopago');
        setApiKey(data.gateway_api_key || '');
        setPublicKey(data.gateway_public_key || '');
        setSettingsId(data.id);
      }
    } catch (err) {
      console.log('Nenhuma configuração encontrada:', err);
    }
  };

  const handleSaveGateway = async () => {
    setSavingSettings(true);
    try {
      const payload = {
        payment_gateway: gateway,
        gateway_api_key: apiKey,
        gateway_public_key: publicKey
      };

      const data = await api.superadmin.savePlatformSettings(payload);
      if (data) {
        setSettingsId(data.id);
      }
      showSuccess('Configurações do Gateway salvas com sucesso!');
    } catch (error) {
      console.error(error);
      showError('Erro ao salvar as configurações.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogout = () => {
    api.auth.logout();
    navigate('/superadmin/login');
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
      <aside className={`flex flex-col h-screen w-72 fixed top-0 bg-surface shadow-md py-lg gap-sm z-50 transition-all duration-300 ${isDrawerOpen ? 'left-0' : '-left-72'} md:left-0`}>
        <div className="px-md mb-lg flex justify-between items-center">
          <h2 className="font-headline-md text-headline-md text-primary tracking-tight">OperaBeauty</h2>
        </div>
        <nav className="flex flex-col gap-xs flex-1">
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
          <Link to="/superadmin/configuracoes" className="flex items-center gap-md py-3 px-4 bg-primary-container text-on-primary-container rounded-lg mx-md font-label-md text-label-md transition-all duration-200 ease-in-out">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
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
          <div className="w-8 h-8"></div>
        </header>

        <div className="p-container-margin md:p-xl flex-1 flex flex-col gap-xl">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-lg">
            <div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">Configurações Globais</h1>
              <p className="font-body-md text-body-md text-secondary">Ajustes gerais da plataforma e segurança da sua conta Super Admin.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
            {/* Perfil */}
            <div className="bg-surface rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-lg border border-surface-variant">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-[32px] text-primary">manage_accounts</span>
                <h3 className="font-headline-sm text-headline-sm">Sua Conta</h3>
              </div>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block font-label-sm text-secondary mb-1">E-mail Principal</label>
                  <input 
                    type="email" 
                    readOnly
                    className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg p-3 outline-none text-secondary"
                    value="admin@sistema.com"
                  />
                  <p className="text-[12px] text-secondary mt-1">Email padrão do proprietário da plataforma. Não pode ser alterado por aqui.</p>
                </div>
              </div>
            </div>

            {/* Segurança */}
            <div className="bg-surface rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-lg border border-surface-variant">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-[32px] text-[#10b981]">security</span>
                <h3 className="font-headline-sm text-headline-sm">Segurança</h3>
              </div>
              
              <div className="flex flex-col gap-4">
                <p className="text-body-md text-secondary mb-2">Para alterar a sua senha master do sistema, clique no botão abaixo. Você receberá um e-mail com o link seguro de recuperação (Supabase Auth).</p>
                
                <button className="bg-surface-container-high text-on-surface px-6 py-3 rounded-lg font-label-md hover:bg-surface-variant transition-colors w-full md:w-auto self-start">
                  Enviar E-mail de Troca de Senha
                </button>
              </div>
            </div>

            {/* Gateway de Pagamento */}
            <div className="bg-surface rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-lg border border-surface-variant lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-[32px] text-primary">payments</span>
                <div>
                  <h3 className="font-headline-sm text-headline-sm">Gateway de Pagamento</h3>
                  <p className="text-secondary text-sm mt-1">Configure por onde os salões pagarão a mensalidade SaaS.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-label-sm text-secondary mb-1">Provedor Ativo</label>
                  <select 
                    className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg p-3 outline-none focus:border-primary"
                    value={gateway}
                    onChange={(e) => setGateway(e.target.value)}
                  >
                    <option value="mercadopago">Mercado Pago</option>
                    <option value="stripe">Stripe</option>
                    <option value="abacatepay">AbacatePay</option>
                  </select>
                </div>
                <div>
                  <label className="block font-label-sm text-secondary mb-1">Access Token / Secret Key</label>
                  <input 
                    type="password" 
                    className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg p-3 outline-none focus:border-primary"
                    placeholder="Cole a chave de API aqui"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-secondary mb-1">Public Key (Opcional, se exigido pelo provedor)</label>
                  <input 
                    type="text" 
                    className="w-full bg-surface-container-lowest border border-surface-variant rounded-lg p-3 outline-none focus:border-primary"
                    placeholder="Cole a chave pública aqui se houver"
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-6 border-t border-surface-variant pt-6 flex justify-end">
                <button onClick={handleSaveGateway} disabled={savingSettings} className="bg-primary text-on-primary px-6 py-3 rounded-full font-label-md hover:opacity-90 disabled:opacity-50 transition-colors shadow-sm">
                  {savingSettings ? 'Salvando...' : 'Salvar Gateway'}
                </button>
              </div>
            </div>
            
            {/* Encerramento */}
            <div className="bg-error-container rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-lg border border-error/20 lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-[32px] text-error">logout</span>
                <h3 className="font-headline-sm text-headline-sm text-error">Encerrar Sessão Mestre</h3>
              </div>
              <p className="text-body-md text-on-error-container mb-6">Finalize seu acesso atual ao Painel de Controle SaaS para garantir a segurança da plataforma ao sair do computador.</p>
              
              <button onClick={handleLogout} className="bg-error text-on-error px-6 py-3 rounded-full font-label-md hover:opacity-90 transition-colors">
                Sair do Sistema Agora
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsAdmin;
